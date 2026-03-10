import { useRef, useState, useMemo, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float, Sphere, MeshDistortMaterial, MeshWobbleMaterial, Stars, Sparkles } from '@react-three/drei'
import { motion, useScroll, useTransform, useSpring, useMotionValue } from 'framer-motion'
import { ScanFace, HeartPulse, Stethoscope, Microscope, Dna, Shield, Play, Activity } from 'lucide-react'

// ─── 0. GLOBAL STYLES & ANIMATIONS ───
const GlobalStyles = () => (
    <style>{`
        .font-tech { font-family: 'Rajdhani', sans-serif; }
        .font-body { font-family: 'Inter', sans-serif; }
        body { overflow-x: hidden; background-color: #0f172a; }

        @keyframes gradient-x {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
        }
        .animate-gradient-x {
            background-size: 200% auto;
            animation: gradient-x 4s linear infinite;
        }
        
        .text-glow {
            text-shadow: 0 0 15px rgba(45,212,191,0.5);
        }

        @keyframes shimmer-fast {
            0% { transform: translateX(-150%) skewX(-20deg); }
            100% { transform: translateX(150%) skewX(-20deg); }
        }
        .animate-shimmer-fast {
            animation: shimmer-fast 2.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        
        @keyframes spin-border {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        .animate-spin-border {
            animation: spin-border 4s linear infinite;
        }

        @keyframes pulse-slow { 0%, 100% { opacity: 0.3; transform: scale(1); } 50% { opacity: 0.6; transform: scale(1.1); } }
        .animate-pulse-slow { animation: pulse-slow 6s infinite; }
        @keyframes scan { 0% { top: 0%; opacity: 0; } 50% { opacity: 1; } 100% { top: 100%; opacity: 0; } }
        .animate-scan { animation: scan 3s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin-slow { animation: spin-slow 60s linear infinite; }
        @keyframes spin-reverse { from { transform: rotate(360deg); } to { transform: rotate(0deg); } }
        .animate-spin-reverse { animation: spin-reverse 40s linear infinite; }
    `}</style>
)

// ─── 1. THREE.JS BACKGROUND ───
const OrganicCells = () => {
    const particles = useMemo(() => {
        return Array.from({ length: 10 }).map(() => ({
            scale: 0.08 + Math.random() * 0.1,
            position: [
                (Math.random() - 0.5) * 30,
                (Math.random() - 0.5) * 20,
                (Math.random() - 0.5) * 10 - 5
            ],
            speed: 0.8 + Math.random() * 0.5
        }))
    }, [])

    return (
        <group>
            <Float speed={2} rotationIntensity={0.2} floatIntensity={1}>
                <Sphere args={[1, 32, 32]} position={[8, 2, -5]} scale={2.2}>
                    <MeshDistortMaterial color="#2dd4bf" envMapIntensity={0.5} clearcoat={1} roughness={0.1} metalness={0.3} distort={0.3} speed={1.5} />
                </Sphere>
            </Float>

            <Float speed={3} rotationIntensity={0.5} floatIntensity={2}>
                <Sphere args={[1, 24, 24]} position={[-9, -4, -8]} scale={1.8}>
                    <MeshWobbleMaterial color="#38bdf8" factor={0.4} speed={1} roughness={0.1} transparent opacity={0.6} />
                </Sphere>
            </Float>

            {particles.map((data, i) => (
                <Float key={i} speed={data.speed} rotationIntensity={0.5} floatIntensity={0.8}>
                    <Sphere args={[data.scale, 16, 16]} position={data.position}>
                        <MeshDistortMaterial color="#ccfbf1" emissive="#2dd4bf" emissiveIntensity={0.5} distort={0.2} speed={2} roughness={0} />
                    </Sphere>
                </Float>
            ))}

            <Sparkles count={40} scale={25} size={3} speed={0.4} opacity={0.4} color="#ccfbf1" />
            <Stars radius={100} depth={50} count={600} factor={3} saturation={0} fade speed={0.5} />
        </group>
    )
}

function HealthBackground() {
    return (
        <div className="fixed inset-0 z-0 pointer-events-none">
            <div className="absolute inset-0 bg-[#0f172a]" />
            <div className="absolute inset-0 bg-gradient-to-tr from-[#0f172a] via-[#1e293b] to-[#134e4a] opacity-80" />
            <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-teal-500/10 blur-[120px] animate-pulse-slow will-change-transform" />
            <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-blue-500/10 blur-[120px] animate-pulse-slow delay-1000 will-change-transform" />

            <Canvas camera={{ position: [0, 0, 12], fov: 35 }} gl={{ antialias: false, powerPreference: "high-performance" }} dpr={[1, 1.2]} performance={{ min: 0.5 }}>
                <Suspense fallback={null}>
                    <ambientLight intensity={0.8} />
                    <pointLight position={[10, 10, 10]} intensity={1.2} color="#ffffff" />
                    <pointLight position={[-10, -10, -10]} intensity={0.8} color="#2dd4bf" />
                    <OrganicCells />
                </Suspense>
            </Canvas>
        </div>
    )
}

// ─── 2. 3D SCROLL REVEAL COMPONENT ───
const ScrollReveal3D = ({ children, delay = 0 }) => {
    return (
        <motion.div
            initial={{ opacity: 0, rotateX: 30, y: 50, scale: 0.95 }}
            whileInView={{ opacity: 1, rotateX: 0, y: 0, scale: 1 }}
            viewport={{ once: true, margin: "-10% 0px -10% 0px" }}
            transition={{ type: "spring", stiffness: 60, damping: 20, delay: delay, duration: 0.6 }}
            style={{ transformStyle: "preserve-3d", perspective: "800px" }}
        >
            {children}
        </motion.div>
    )
}

const TiltCard = ({ children, className = "" }) => {
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const rotateX = useTransform(y, [-100, 100], [3, -3]);
    const rotateY = useTransform(x, [-100, 100], [-3, 3]);

    function handleMouseMove(e) {
        const rect = e.currentTarget.getBoundingClientRect();
        x.set(e.clientX - (rect.left + rect.width / 2));
        y.set(e.clientY - (rect.top + rect.height / 2));
    }

    return (
        <motion.div style={{ rotateX, rotateY, transformStyle: "preserve-3d" }} onMouseMove={handleMouseMove} onMouseLeave={() => { x.set(0); y.set(0); }} className={`perspective-800 ${className}`}>
            {children}
        </motion.div>
    );
};

// ─── 3. UI COMPONENTS WITH RUNNING LIGHTS ───
const FeatureItem = ({ icon: Icon, title, desc, delay }) => (
    <ScrollReveal3D delay={delay}>
        <TiltCard className="h-full group">
            <div className="relative h-full rounded-2xl p-[1px] overflow-hidden">
                <div className="absolute top-1/2 left-1/2 w-[200%] h-[200%] -translate-x-1/2 -translate-y-1/2 animate-spin-border bg-[conic-gradient(from_0deg,transparent_0%,transparent_75%,#2dd4bf_85%,#3b82f6_100%)] opacity-40 group-hover:opacity-100 transition-opacity duration-500 z-0" />
                
                <div className="relative z-10 h-full w-full bg-[#0f172a]/95 backdrop-blur-lg rounded-[calc(1rem-1px)] p-5 md:p-6 flex flex-col items-start overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#1e293b]/50 to-transparent opacity-50" />
                    <div className="absolute inset-0 bg-gradient-to-br from-teal-500/0 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    
                    <div className="w-10 h-10 md:w-12 md:h-12 relative z-20 rounded-xl bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center mb-4 text-white shadow-[0_0_15px_rgba(45,212,191,0.3)] group-hover:scale-105 group-hover:shadow-[0_0_20px_rgba(45,212,191,0.5)] transition-all duration-300">
                        <Icon size={20} className="md:w-6 md:h-6" />
                    </div>
                    <h3 className="text-lg md:text-xl z-20 font-tech font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-200 group-hover:from-teal-300 group-hover:to-blue-400 transition-all duration-300 uppercase tracking-wide">{title}</h3>
                    <p className="text-slate-400 z-20 font-body leading-relaxed text-xs md:text-sm">{desc}</p>
                </div>
            </div>
        </TiltCard>
    </ScrollReveal3D>
);

const StatBox = ({ value, label, delay }) => (
    <ScrollReveal3D delay={delay}>
        <div className="relative rounded-2xl p-[1px] overflow-hidden group hover:-translate-y-0.5 transition-transform duration-300">
            <div className="absolute top-1/2 left-1/2 w-[200%] h-[200%] -translate-x-1/2 -translate-y-1/2 animate-spin-border bg-[conic-gradient(from_0deg,transparent_0%,transparent_60%,#2dd4bf_80%,#3b82f6_100%)] opacity-30 group-hover:opacity-100 transition-opacity duration-500 z-0" />
            <div className="relative h-full text-center p-4 md:p-5 rounded-[calc(1rem-1px)] bg-[#111827]/90 backdrop-blur-md z-10">
                <div className="text-2xl md:text-3xl font-tech font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-teal-300 mb-1 drop-shadow-sm group-hover:animate-gradient-x group-hover:bg-[length:200%_auto]">{value}</div>
                <div className="text-[9px] md:text-[10px] font-bold font-body uppercase tracking-[0.15em] text-teal-400">{label}</div>
            </div>
        </div>
    </ScrollReveal3D>
);

// ─── 4. MAIN HOME PAGE ───
export default function Home({ setPage }) {
    const containerRef = useRef(null)
    const { scrollYProgress } = useScroll({ target: containerRef })

    const yHero = useTransform(scrollYProgress, [0, 1], [0, 200])
    const opacityHero = useTransform(scrollYProgress, [0, 0.3], [1, 0])
    const rotateShowcase = useTransform(scrollYProgress, [0.6, 1], [10, 0])
    const scaleShowcase = useTransform(scrollYProgress, [0.6, 1], [0.9, 1])

    const analysisData = {
        image: "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&q=80",
        breed: "French Bulldog",
        confidence: 99.2,
        emotions: [
            { label: "Happy", emoji: "😊", value: 75, gradient: "from-emerald-400 to-green-600" },
            { label: "Angry", emoji: "😠", value: 5, gradient: "from-rose-400 to-red-600" },
            { label: "Sad", emoji: "😢", value: 10, gradient: "from-blue-400 to-indigo-600" },
            { label: "Other", emoji: "😐", value: 10, gradient: "from-slate-400 to-slate-600" }
        ]
    }

    return (
        <div className="relative bg-[#0f172a] text-white min-h-screen selection:bg-teal-400 selection:text-black font-body overflow-x-hidden">
            <GlobalStyles />
            <Suspense fallback={null}>
                <HealthBackground />
            </Suspense>

            <div ref={containerRef} className="relative z-10">

                {/* ── HERO SECTION ── */}
                <section className="min-h-[85vh] flex flex-col justify-center items-center px-4 sm:px-6 relative perspective-1000">
                    <motion.div style={{ y: yHero, opacity: opacityHero }} className="text-center relative z-20 max-w-4xl mt-16 md:mt-0">
                        
                        <motion.div
                            initial={{ y: -30, opacity: 0, rotateX: 90 }}
                            whileInView={{ y: 0, opacity: 1, rotateX: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.2, type: "spring" }}
                            className="inline-flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-1.5 rounded-full bg-teal-900/30 border border-teal-500/30 backdrop-blur-md mb-4 md:mb-6 shadow-[0_0_20px_rgba(45,212,191,0.2)]"
                        >
                            <HeartPulse size={14} className="text-teal-400 animate-pulse md:w-[14px] md:h-[14px]" />
                            <span className="text-[9px] md:text-xs font-tech font-bold tracking-[0.15em] uppercase text-teal-100">AI Health Diagnostics</span>
                        </motion.div>

                        <motion.h1
                            initial={{ scale: 0.9, opacity: 0 }}
                            whileInView={{ scale: 1, opacity: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, ease: "easeOut" }}
                            className="font-tech text-4xl sm:text-5xl md:text-6xl lg:text-8xl font-black tracking-tight md:leading-[0.9] mb-4 md:mb-5"
                        >
                            <span className="text-white drop-shadow-md">BETTER</span> <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-300 via-blue-400 to-teal-300 animate-gradient-x text-glow">
                                HEALTH
                            </span>
                        </motion.h1>

                        <motion.p
                            initial={{ y: 20, opacity: 0 }}
                            whileInView={{ y: 0, opacity: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.4 }}
                            className="text-sm sm:text-base md:text-lg text-slate-300 max-w-lg mx-auto mb-8 md:mb-10 font-light leading-relaxed px-2"
                        >
                            Elevate your pet's healthcare with Intelligent AI. <br className="hidden md:block" />
                            Analyze emotions and vital signs via <span className="text-teal-300 font-medium">Computer Vision</span>.
                        </motion.p>

                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            whileInView={{ y: 0, opacity: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.5 }}
                            className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center w-full sm:w-auto px-6 sm:px-0"
                        >
                            <button onClick={() => setPage('analyze')} className="w-full sm:w-auto relative px-6 py-3 md:px-8 md:py-3.5 bg-gradient-to-r from-teal-500 to-blue-600 text-white rounded-full font-tech font-bold text-base md:text-lg overflow-hidden group shadow-[0_0_30px_rgba(45,212,191,0.3)] hover:scale-105 transition-transform duration-300 border border-teal-400/50">
                                <span className="relative z-10 flex items-center justify-center gap-2">
                                    Start Scan <ScanFace size={18} />
                                </span>
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent w-full h-full animate-shimmer-fast mix-blend-overlay" />
                            </button>

                            <button onClick={() => setPage('plans')} className="w-full sm:w-auto px-6 py-3 md:px-8 md:py-3.5 bg-white/5 border border-white/20 rounded-full font-tech font-bold text-base md:text-lg hover:bg-white/10 hover:border-teal-400/50 backdrop-blur-md transition-all text-slate-200 hover:text-white hover:scale-105 shadow-none hover:shadow-[0_0_20px_rgba(45,212,191,0.2)]">
                                Explore Plan
                            </button>
                        </motion.div>
                    </motion.div>
                </section>

                {/* ── FLOATING STATS ── */}
                <section className="relative z-30 px-4 sm:px-6 -mt-10 md:-mt-16 mb-16 md:mb-24">
                    <div className="max-w-4xl mx-auto">
                        <TiltCard>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 p-3 md:p-4 rounded-[1.5rem] bg-[#1e293b]/40 border border-white/10 backdrop-blur-xl shadow-xl overflow-hidden">
                                <StatBox value="99.8%" label="Accuracy" delay={0.1} />
                                <StatBox value="< 3.0s" label="Rapid Scan" delay={0.2} />
                                <StatBox value="150+" label="Species & Breeds" delay={0.3} />
                            </div>
                        </TiltCard>
                    </div>
                </section>

                {/* ── CORE ENGINE ── */}
                <section className="max-w-5xl mx-auto px-4 sm:px-6 py-8 md:py-12 relative">
                    <ScrollReveal3D>
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 md:mb-12 border-b border-white/10 pb-4 md:pb-6">
                            <div>
                                <h2 className="text-3xl sm:text-4xl md:text-5xl font-tech font-black mb-2 text-transparent bg-clip-text bg-gradient-to-r from-white via-teal-200 to-white animate-gradient-x uppercase text-glow">CORE ENGINE</h2>
                                <p className="text-slate-400 text-sm md:text-base max-w-sm">Driven by advanced Neural Networks.</p>
                            </div>
                            <div className="hidden md:block text-teal-500 drop-shadow-[0_0_10px_rgba(45,212,191,0.6)]">
                                <Dna size={48} className="animate-spin-slow" />
                            </div>
                        </div>
                    </ScrollReveal3D>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 perspective-800 overflow-hidden">
                        <FeatureItem icon={ScanFace} title="Emotion AI" desc="Detects 4 core emotions (Happy, Sad, Angry, Other) using facial micro-expressions." delay={0.1} />
                        <FeatureItem icon={Shield} title="Species ID" desc="Universal identification — dogs, cats, birds, reptiles & more using ImageNet CNN." delay={0.2} />
                        <FeatureItem icon={Stethoscope} title="Vet Advisor" desc="Analyze their mood to get instant, actionable health and behavioral recommendations." delay={0.3} />
                    </div>
                </section>

                {/* ── DEEP ANALYSIS ── */}
                <section className="py-16 md:py-24 px-4 sm:px-6 overflow-hidden perspective-1000">
                    <ScrollReveal3D>
                        <div className="max-w-4xl mx-auto mb-10 md:mb-14 text-center">
                            <h2 className="text-3xl sm:text-4xl md:text-5xl font-tech font-black mb-2 text-transparent bg-clip-text bg-gradient-to-r from-teal-300 via-blue-400 to-teal-300 animate-gradient-x text-glow">DEEP ANALYSIS</h2>
                            <p className="text-slate-400 text-sm md:text-base">In-depth insights derived from Computer Vision.</p>
                        </div>
                    </ScrollReveal3D>

                    <motion.div style={{ rotateX: rotateShowcase, scale: scaleShowcase }} className="max-w-4xl mx-auto">
                        <TiltCard>
                            <div className="relative rounded-[1.5rem] md:rounded-[2rem] p-[1.5px] overflow-hidden group shadow-[0_10px_50px_-15px_rgba(45,212,191,0.2)]">
                                <div className="absolute top-1/2 left-1/2 w-[200%] h-[200%] -translate-x-1/2 -translate-y-1/2 animate-spin-border bg-[conic-gradient(from_0deg,transparent_0%,transparent_70%,#2dd4bf_80%,#3b82f6_100%)] opacity-70 group-hover:opacity-100 transition-opacity" />
                                
                                <div className="relative z-10 rounded-[calc(1.5rem-1.5px)] md:rounded-[calc(2rem-1.5px)] bg-[#0f172a]/95 backdrop-blur-lg overflow-hidden">
                                    <div className="grid md:grid-cols-2 md:min-h-[400px]">
                                        {/* Image Section */}
                                        <div className="relative overflow-hidden bg-black h-56 sm:h-72 md:h-auto">
                                            <img src={analysisData.image} alt="Analyzed Pet" loading="lazy" className="w-full h-full object-cover transition-transform duration-[3s] group-hover:scale-105 opacity-80" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-transparent to-transparent" />

                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                <div className="w-[80%] h-[80%] border border-teal-500/30 rounded-2xl relative overflow-hidden">
                                                    <div className="absolute top-0 left-0 w-full h-[2px] bg-teal-400 shadow-[0_0_20px_#2dd4bf] animate-scan" />
                                                    <div className="absolute top-0 left-0 w-4 h-4 md:w-6 md:h-6 border-t-2 border-l-2 border-teal-500" />
                                                    <div className="absolute top-0 right-0 w-4 h-4 md:w-6 md:h-6 border-t-2 border-r-2 border-teal-500" />
                                                    <div className="absolute bottom-0 left-0 w-4 h-4 md:w-6 md:h-6 border-b-2 border-l-2 border-teal-500" />
                                                    <div className="absolute bottom-0 right-0 w-4 h-4 md:w-6 md:h-6 border-b-2 border-r-2 border-teal-500" />
                                                </div>
                                            </div>

                                            <div className="absolute bottom-4 left-4 md:bottom-6 md:left-6 bg-black/60 backdrop-blur-md border border-teal-500/30 px-3 py-2 md:px-4 md:py-2.5 rounded-xl flex items-center gap-2 md:gap-3 shadow-lg transform group-hover:translate-y-[-3px] transition-transform duration-500">
                                                <div className="w-6 h-6 md:w-8 md:h-8 rounded-lg bg-teal-500/20 flex items-center justify-center text-sm md:text-base">🐕</div>
                                                <div>
                                                    <div className="font-bold text-white text-xs md:text-sm">{analysisData.breed}</div>
                                                    <div className="text-teal-400 text-[8px] md:text-[9px] font-mono tracking-wide">CONF: {analysisData.confidence}%</div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Result Section */}
                                        <div className="p-6 md:p-8 lg:p-10 flex flex-col justify-center relative">
                                            <h3 className="text-xl md:text-2xl font-tech font-bold mb-5 md:mb-6 text-white flex items-center gap-2">
                                                <Microscope className="text-teal-400 w-5 h-5 md:w-6 md:h-6" />
                                                ANALYSIS RESULT
                                            </h3>

                                            <div className="space-y-4 md:space-y-5">
                                                {analysisData.emotions.map((item, idx) => (
                                                    <div key={idx} className="group/bar">
                                                        <div className="flex justify-between items-center mb-1.5 md:mb-2">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-sm md:text-base bg-white/5 p-1 md:p-1.5 rounded-md">{item.emoji}</span>
                                                                <span className="text-xs md:text-sm font-medium text-slate-200">{item.label}</span>
                                                            </div>
                                                            <span className="font-tech text-transparent bg-clip-text bg-gradient-to-r from-white to-teal-300 animate-gradient-x text-sm md:text-base font-bold">{item.value}%</span>
                                                        </div>
                                                        <div className="h-1.5 md:h-2 w-full bg-black/60 rounded-full overflow-hidden border border-white/5 p-[1px]">
                                                            <motion.div
                                                                initial={{ width: 0 }}
                                                                whileInView={{ width: `${item.value}%` }}
                                                                viewport={{ once: true }}
                                                                transition={{ duration: 1, delay: 0.3 + idx * 0.1, type: "spring" }}
                                                                className={`h-full rounded-full bg-gradient-to-r ${item.gradient} shadow-[0_0_10px_rgba(255,255,255,0.2)] relative overflow-hidden`}
                                                            >
                                                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent w-full h-full animate-shimmer-fast" />
                                                            </motion.div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </TiltCard>
                    </motion.div>
                </section>

                {/* ── FOOTER ── */}
                <section className="relative py-24 md:py-40 overflow-hidden flex flex-col items-center justify-center">
                    <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="absolute w-[300px] h-[300px] md:w-[500px] md:h-[500px] border border-teal-500/5 rounded-full animate-spin-slow" />
                            <div className="absolute w-[200px] h-[200px] md:w-[350px] md:h-[350px] border-2 border-dashed border-teal-500/10 rounded-full animate-spin-reverse opacity-40" />
                            <div className="absolute w-[150px] h-[150px] md:w-[250px] md:h-[250px] rounded-full border border-white/5 animate-spin-border" />
                        </div>
                    </div>

                    <div className="relative z-10 text-center max-w-4xl px-4 w-full">
                        <ScrollReveal3D delay={0.2}>
                            <div className="flex flex-col sm:flex-row justify-center items-center gap-1.5 sm:gap-3 md:gap-4 mb-4 md:mb-6 font-mono text-[9px] md:text-[10px] text-teal-400/60 tracking-[0.15em] md:tracking-[0.25em]">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                                    <span>READY_STATUS</span>
                                </div>
                                <div className="hidden sm:block w-[1px] h-3 bg-white/10" />
                                <div className="flex items-center gap-1.5 font-bold text-teal-400">
                                    <Activity size={12} />
                                    <span>UPLINK_STABLE</span>
                                </div>
                            </div>

                            <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-tech font-black mb-4 md:mb-6 tracking-tight text-white leading-none">
                                <span className="opacity-30 font-medium text-2xl sm:text-3xl md:text-5xl">READY TO</span><br />
                                <span className="relative inline-block text-transparent bg-clip-text bg-gradient-to-r from-teal-300 via-blue-400 to-teal-300 animate-gradient-x text-glow mt-1 md:mt-2">
                                    Analyze?
                                </span>
                            </h2>
                        </ScrollReveal3D>

                        <ScrollReveal3D delay={0.3}>
                            <div className="relative inline-block group mt-6 md:mt-10">
                                <div className="relative p-[1.5px] rounded-full overflow-hidden hover:scale-105 transition-transform duration-300 cursor-pointer" onClick={() => setPage('analyze')}>
                                    <div className="absolute top-1/2 left-1/2 w-[300%] h-[300%] -translate-x-1/2 -translate-y-1/2 animate-spin-border bg-[conic-gradient(from_0deg,transparent_0%,transparent_60%,#2dd4bf_80%,#3b82f6_100%)]" />
                                    
                                    <button className="relative z-10 px-6 py-3 sm:px-8 sm:py-4 md:px-12 md:py-5 bg-[#0b1121] rounded-full font-tech font-black text-xl sm:text-2xl md:text-3xl flex items-center justify-center gap-2 md:gap-4 text-white w-full sm:w-auto">
                                        LAUNCH <Play fill="currentColor" className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-teal-400" />
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-teal-400/20 to-transparent w-full h-full animate-shimmer-fast mix-blend-overlay rounded-full" />
                                    </button>
                                </div>
                            </div>
                        </ScrollReveal3D>
                    </div>
                </section>
            </div>
        </div>
    )
}