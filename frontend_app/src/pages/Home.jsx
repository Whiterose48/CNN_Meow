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
            text-shadow: 0 0 20px rgba(45,212,191,0.5);
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
            scale: 0.1 + Math.random() * 0.15,
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
                <Sphere args={[1, 32, 32]} position={[8, 2, -5]} scale={2.8}>
                    <MeshDistortMaterial color="#2dd4bf" envMapIntensity={0.5} clearcoat={1} roughness={0.1} metalness={0.3} distort={0.3} speed={1.5} />
                </Sphere>
            </Float>

            <Float speed={3} rotationIntensity={0.5} floatIntensity={2}>
                <Sphere args={[1, 24, 24]} position={[-9, -4, -8]} scale={2.2}>
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

            <Sparkles count={40} scale={25} size={4} speed={0.4} opacity={0.4} color="#ccfbf1" />
            <Stars radius={100} depth={50} count={800} factor={4} saturation={0} fade speed={0.5} />
        </group>
    )
}

function HealthBackground() {
    return (
        <div className="fixed inset-0 z-0 pointer-events-none">
            <div className="absolute inset-0 bg-[#0f172a]" />
            <div className="absolute inset-0 bg-gradient-to-tr from-[#0f172a] via-[#1e293b] to-[#134e4a] opacity-80" />
            <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-teal-500/10 blur-[150px] animate-pulse-slow will-change-transform" />
            <div className="absolute bottom-[-20%] left-[-10%] w-[800px] h-[800px] bg-blue-500/10 blur-[150px] animate-pulse-slow delay-1000 will-change-transform" />

            <Canvas camera={{ position: [0, 0, 12], fov: 35 }} gl={{ antialias: false, powerPreference: "high-performance" }} dpr={[1, 1.5]} performance={{ min: 0.5 }}>
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
            initial={{ opacity: 0, rotateX: 45, y: 100, scale: 0.9 }}
            whileInView={{ opacity: 1, rotateX: 0, y: 0, scale: 1 }}
            viewport={{ once: true, margin: "-10% 0px -10% 0px" }}
            transition={{ type: "spring", stiffness: 50, damping: 20, delay: delay, duration: 0.8 }}
            style={{ transformStyle: "preserve-3d", perspective: "1000px" }}
        >
            {children}
        </motion.div>
    )
}

const TiltCard = ({ children, className = "" }) => {
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const rotateX = useTransform(y, [-100, 100], [10, -10]);
    const rotateY = useTransform(x, [-100, 100], [-10, 10]);

    function handleMouseMove(e) {
        const rect = e.currentTarget.getBoundingClientRect();
        x.set(e.clientX - (rect.left + rect.width / 2));
        y.set(e.clientY - (rect.top + rect.height / 2));
    }

    return (
        <motion.div style={{ rotateX, rotateY, transformStyle: "preserve-3d" }} onMouseMove={handleMouseMove} onMouseLeave={() => { x.set(0); y.set(0); }} className={`perspective-1000 ${className}`}>
            {children}
        </motion.div>
    );
};

// ─── 3. UI COMPONENTS WITH RUNNING LIGHTS ───

const FeatureItem = ({ icon: Icon, title, desc, delay }) => (
    <ScrollReveal3D delay={delay}>
        <TiltCard className="h-full group">
            <div className="relative h-full rounded-[2rem] p-[1.5px] overflow-hidden">
                <div className="absolute top-1/2 left-1/2 w-[250%] h-[250%] -translate-x-1/2 -translate-y-1/2 animate-spin-border bg-[conic-gradient(from_0deg,transparent_0%,transparent_75%,#2dd4bf_85%,#3b82f6_100%)] opacity-40 group-hover:opacity-100 transition-opacity duration-500 z-0" />
                
                <div className="relative z-10 h-full w-full bg-[#0f172a]/95 backdrop-blur-xl rounded-[calc(2rem-1.5px)] p-8 flex flex-col items-start overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#1e293b]/50 to-transparent opacity-50" />
                    <div className="absolute inset-0 bg-gradient-to-br from-teal-500/0 to-teal-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    
                    <div className="w-16 h-16 relative z-20 rounded-2xl bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center mb-6 text-white shadow-[0_0_20px_rgba(45,212,191,0.3)] group-hover:scale-110 group-hover:shadow-[0_0_30px_rgba(45,212,191,0.6)] transition-all duration-300">
                        <Icon size={32} />
                    </div>
                    <h3 className="text-2xl z-20 font-tech font-bold mb-3 text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-200 group-hover:from-teal-300 group-hover:to-blue-400 transition-all duration-300 uppercase tracking-wide">{title}</h3>
                    <p className="text-slate-400 z-20 font-body leading-relaxed text-sm">{desc}</p>
                </div>
            </div>
        </TiltCard>
    </ScrollReveal3D>
);

const StatBox = ({ value, label, delay }) => (
    <ScrollReveal3D delay={delay}>
        <div className="relative rounded-3xl p-[1.5px] overflow-hidden group hover:-translate-y-2 transition-transform duration-300">
            <div className="absolute top-1/2 left-1/2 w-[250%] h-[250%] -translate-x-1/2 -translate-y-1/2 animate-spin-border bg-[conic-gradient(from_0deg,transparent_0%,transparent_60%,#2dd4bf_80%,#3b82f6_100%)] opacity-30 group-hover:opacity-100 transition-opacity duration-500 z-0" />
            <div className="relative h-full text-center p-8 rounded-[calc(1.5rem-1.5px)] bg-[#111827]/90 backdrop-blur-md z-10">
                <div className="text-5xl font-tech font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-teal-300 mb-2 drop-shadow-md group-hover:animate-gradient-x group-hover:bg-[length:200%_auto]">{value}</div>
                <div className="text-xs font-bold font-body uppercase tracking-[0.2em] text-teal-400">{label}</div>
            </div>
        </div>
    </ScrollReveal3D>
);

// ─── 4. MAIN HOME PAGE ───
export default function Home({ setPage }) {
    const containerRef = useRef(null)
    const { scrollYProgress } = useScroll({ target: containerRef })

    const yHero = useTransform(scrollYProgress, [0, 1], [0, 300])
    const opacityHero = useTransform(scrollYProgress, [0, 0.3], [1, 0])
    const rotateShowcase = useTransform(scrollYProgress, [0.6, 1], [15, 0])
    const scaleShowcase = useTransform(scrollYProgress, [0.6, 1], [0.8, 1])

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
                <section className="min-h-screen flex flex-col justify-center items-center px-6 relative perspective-1000">
                    <motion.div style={{ y: yHero, opacity: opacityHero }} className="text-center relative z-20 max-w-5xl">
                        
                        <motion.div
                            initial={{ y: -50, opacity: 0, rotateX: 90 }}
                            whileInView={{ y: 0, opacity: 1, rotateX: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.2, type: "spring" }}
                            className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-teal-900/30 border border-teal-500/30 backdrop-blur-md mb-8 shadow-[0_0_30px_rgba(45,212,191,0.2)]"
                        >
                            <HeartPulse size={18} className="text-teal-400 animate-pulse" />
                            <span className="text-xs font-tech font-bold tracking-[0.2em] uppercase text-teal-100">AI Health Diagnostics</span>
                        </motion.div>

                        <motion.h1
                            initial={{ scale: 0.8, opacity: 0 }}
                            whileInView={{ scale: 1, opacity: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className="font-tech text-7xl md:text-[9rem] font-black tracking-tighter leading-[0.85] mb-8"
                        >
                            <span className="text-white drop-shadow-lg">BETTER</span> <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-300 via-blue-400 to-teal-300 animate-gradient-x text-glow">
                                HEALTH
                            </span>
                        </motion.h1>

                        <motion.p
                            initial={{ y: 20, opacity: 0 }}
                            whileInView={{ y: 0, opacity: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.5 }}
                            className="text-xl md:text-2xl text-slate-300 max-w-2xl mx-auto mb-12 font-light leading-relaxed"
                        >
                            Elevate your pet's healthcare with Intelligent AI. <br className="hidden md:block" />
                            Analyze emotions and vital signs via <span className="text-teal-300 font-semibold">Computer Vision</span>.
                        </motion.p>

                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            whileInView={{ y: 0, opacity: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.7 }}
                            className="flex flex-col sm:flex-row gap-6 justify-center items-center"
                        >
                            <button onClick={() => setPage('analyze')} className="relative px-10 py-5 bg-gradient-to-r from-teal-500 to-blue-600 text-white rounded-full font-tech font-bold text-2xl overflow-hidden group shadow-[0_0_50px_rgba(45,212,191,0.4)] hover:scale-105 transition-transform duration-300 border border-teal-400/50">
                                <span className="relative z-10 flex items-center gap-3">
                                    Start Scan <ScanFace size={24} />
                                </span>
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent w-full h-full animate-shimmer-fast mix-blend-overlay" />
                            </button>

                            <button onClick={() => setPage('plans')} className="px-10 py-5 bg-white/5 border border-white/20 rounded-full font-tech font-bold text-2xl hover:bg-white/10 hover:border-teal-400/50 backdrop-blur-md transition-all text-slate-200 hover:text-white hover:scale-105 shadow-[0_0_20px_rgba(0,0,0,0)] hover:shadow-[0_0_30px_rgba(45,212,191,0.2)]">
                                Explore Tech
                            </button>
                        </motion.div>
                    </motion.div>
                </section>

                {/* ── FLOATING STATS ── */}
                <section className="relative z-30 px-6 -mt-32 mb-32">
                    <div className="max-w-5xl mx-auto">
                        <TiltCard>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 rounded-[2.5rem] bg-[#1e293b]/40 border border-white/10 backdrop-blur-2xl shadow-2xl">
                                <StatBox value="99.8%" label="Accuracy" delay={0.1} />
                                <StatBox value="< 0.2s" label="Rapid Scan" delay={0.2} />
                                <StatBox value="400+" label="Species & Breeds" delay={0.3} />
                            </div>
                        </TiltCard>
                    </div>
                </section>

                {/* ── CORE ENGINE ── */}
                <section className="max-w-7xl mx-auto px-6 py-20 relative">
                    <ScrollReveal3D>
                        <div className="flex flex-col md:flex-row justify-between items-end mb-20 border-b border-white/10 pb-10">
                            <div>
                                <h2 className="text-5xl md:text-7xl font-tech font-black mb-4 text-transparent bg-clip-text bg-gradient-to-r from-white via-teal-200 to-white animate-gradient-x uppercase text-glow">CORE ENGINE</h2>
                                <p className="text-slate-400 text-lg max-w-md">Driven by advanced Neural Networks.</p>
                            </div>
                            <div className="hidden md:block text-teal-500 drop-shadow-[0_0_15px_rgba(45,212,191,0.8)]">
                                <Dna size={80} className="animate-spin-slow" />
                            </div>
                        </div>
                    </ScrollReveal3D>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 perspective-1000">
                        <FeatureItem icon={ScanFace} title="Emotion AI" desc="Detects 4 core emotions (Happy, Sad, Angry, Other) using facial micro-expressions." delay={0.1} />
                        <FeatureItem icon={Shield} title="Species & Breed ID" desc="Universal animal identification — dogs, cats, birds, reptiles, fish, mammals & more using ImageNet CNN classifier." delay={0.2} />
                        <FeatureItem icon={Stethoscope} title="Vet Advisor" desc="Personalized preliminary health guidance based on breed, age, and emotional data." delay={0.3} />
                    </div>
                </section>

                {/* ── DEEP ANALYSIS ── */}
                <section className="py-40 px-6 overflow-hidden perspective-2000">
                    <ScrollReveal3D>
                        <div className="max-w-6xl mx-auto mb-20 text-center">
                            <h2 className="text-5xl md:text-7xl font-tech font-black mb-4 text-transparent bg-clip-text bg-gradient-to-r from-teal-300 via-blue-400 to-teal-300 animate-gradient-x text-glow">DEEP ANALYSIS</h2>
                            <p className="text-slate-400 text-xl">In-depth insights derived from Computer Vision.</p>
                        </div>
                    </ScrollReveal3D>

                    <motion.div style={{ rotateX: rotateShowcase, scale: scaleShowcase }} className="max-w-6xl mx-auto">
                        <TiltCard>
                            <div className="relative rounded-[3.2rem] p-[2px] overflow-hidden group shadow-[0_20px_100px_-20px_rgba(45,212,191,0.3)]">
                                <div className="absolute top-1/2 left-1/2 w-[200%] h-[200%] -translate-x-1/2 -translate-y-1/2 animate-spin-border bg-[conic-gradient(from_0deg,transparent_0%,transparent_70%,#2dd4bf_80%,#3b82f6_100%)] opacity-70 group-hover:opacity-100 transition-opacity" />
                                
                                <div className="relative z-10 rounded-[3rem] bg-[#0f172a]/95 backdrop-blur-xl overflow-hidden">
                                    <div className="grid md:grid-cols-2 min-h-[650px]">
                                        <div className="relative overflow-hidden bg-black">
                                            <img src={analysisData.image} alt="Analyzed Pet" loading="lazy" className="w-full h-full object-cover transition-transform duration-[3s] group-hover:scale-110 opacity-80" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-transparent to-transparent" />

                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                <div className="w-[85%] h-[85%] border-2 border-teal-500/30 rounded-3xl relative overflow-hidden">
                                                    <div className="absolute top-0 left-0 w-full h-[3px] bg-teal-400 shadow-[0_0_30px_var(--color-sage)] animate-scan" />
                                                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-teal-500" />
                                                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-teal-500" />
                                                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-teal-500" />
                                                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-teal-500" />
                                                </div>
                                            </div>

                                            <div className="absolute bottom-8 left-8 bg-black/60 backdrop-blur-xl border border-teal-500/30 px-6 py-3 rounded-2xl flex items-center gap-4 shadow-xl transform group-hover:translate-y-[-10px] transition-transform duration-500">
                                                <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center text-2xl">🐕</div>
                                                <div>
                                                    <div className="font-bold text-white text-lg">{analysisData.breed}</div>
                                                    <div className="text-teal-400 text-xs font-mono tracking-wider">CONFIDENCE: {analysisData.confidence}%</div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-12 md:p-16 flex flex-col justify-center relative">
                                            <div className="absolute top-10 right-10 w-20 h-1 bg-teal-500/20" />

                                            <h3 className="text-4xl font-tech font-bold mb-8 text-white flex items-center gap-3">
                                                <Microscope className="text-teal-400" size={36} />
                                                ANALYSIS RESULT
                                            </h3>

                                            <div className="space-y-8">
                                                {analysisData.emotions.map((item, idx) => (
                                                    <div key={idx} className="group/bar">
                                                        <div className="flex justify-between items-center mb-3">
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-2xl bg-white/5 p-2 rounded-lg">{item.emoji}</span>
                                                                <span className="text-lg font-medium text-slate-200">{item.label}</span>
                                                            </div>
                                                            <span className="font-tech text-transparent bg-clip-text bg-gradient-to-r from-white to-teal-300 animate-gradient-x text-2xl font-bold">{item.value}%</span>
                                                        </div>
                                                        <div className="h-3 w-full bg-black/60 rounded-full overflow-hidden border border-white/5 p-[2px]">
                                                            <motion.div
                                                                initial={{ width: 0 }}
                                                                whileInView={{ width: `${item.value}%` }}
                                                                viewport={{ once: true }}
                                                                transition={{ duration: 1.2, delay: 0.5 + idx * 0.1, type: "spring" }}
                                                                className={`h-full rounded-full bg-gradient-to-r ${item.gradient} shadow-[0_0_15px_rgba(255,255,255,0.3)] relative overflow-hidden`}
                                                            >
                                                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent w-full h-full animate-shimmer-fast" />
                                                            </motion.div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="mt-12 pt-8 border-t border-white/10">
                                                <p className="text-slate-500 text-sm font-mono leading-relaxed">
                                                    * SYSTEM ID: #8829-AX <br />
                                                    * AI MODEL: MOBILENET-V2 (FINE-TUNED) <br />
                                                    * LATENCY: 142ms
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </TiltCard>
                    </motion.div>
                </section>

                {/* ── FOOTER ── */}
                <section className="relative py-72 overflow-hidden flex flex-col items-center justify-center">
                    <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(45,212,191,0.12)_0%,transparent_70%)]" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="absolute w-[800px] h-[800px] border border-teal-500/5 rounded-full animate-spin-slow" />
                            <div className="absolute w-[600px] h-[600px] border-2 border-dashed border-teal-500/10 rounded-full animate-spin-reverse opacity-40" />
                            <div className="absolute w-[450px] h-[450px] rounded-full border border-white/5 bg-[conic-gradient(from_0deg,transparent_0deg_300deg,rgba(45,212,191,0.2)_360deg)] animate-spin-border" />
                        </div>
                    </div>

                    <div className="relative z-10 text-center max-w-5xl px-4">
                        <ScrollReveal3D delay={0.2}>
                            <div className="flex justify-center items-center gap-6 mb-8 font-mono text-[10px] text-teal-400/60 tracking-[0.4em]">
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                                    <span>READY_STATUS</span>
                                </div>
                                <div className="w-[1px] h-3 bg-white/10" />
                                <div className="flex items-center gap-2 font-bold text-teal-400">
                                    <Activity size={12} />
                                    <span>UPLINK_STABLE</span>
                                </div>
                            </div>

                            <h2 className="text-5xl md:text-[7.5rem] font-tech font-black mb-6 tracking-tighter leading-[0.85] text-white">
                                <span className="opacity-30 font-medium text-4xl md:text-6xl">READY TO</span><br />
                                <span className="relative inline-block text-transparent bg-clip-text bg-gradient-to-r from-teal-300 via-blue-400 to-teal-300 animate-gradient-x text-glow">
                                    ASCEND
                                </span>
                            </h2>
                        </ScrollReveal3D>

                        <ScrollReveal3D delay={0.4}>
                            <div className="relative inline-block group mt-12">
                                <div className="absolute inset-0 bg-teal-500/20 rounded-full blur-[40px] opacity-0 group-hover:opacity-100 transition-all duration-700 scale-75 group-hover:scale-110" />

                                <div className="relative p-[2px] rounded-full overflow-hidden hover:scale-105 transition-transform duration-300 cursor-pointer" onClick={() => setPage('analyze')}>
                                    <div className="absolute top-1/2 left-1/2 w-[300%] h-[300%] -translate-x-1/2 -translate-y-1/2 animate-spin-border bg-[conic-gradient(from_0deg,transparent_0%,transparent_60%,#2dd4bf_80%,#3b82f6_100%)]" />
                                    
                                    <button className="relative z-10 px-16 py-8 bg-[#0b1121] rounded-full font-tech font-black text-4xl shadow-[0_20px_60px_-10px_rgba(45,212,191,0.5)] flex items-center gap-4 text-white">
                                        LAUNCH <Play fill="currentColor" size={32} className="text-teal-400" />
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-teal-400/20 to-transparent w-full h-full animate-shimmer-fast mix-blend-overlay rounded-full" />
                                    </button>
                                </div>

                                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-full">
                                    <span className="font-mono text-[9px] text-teal-500/40 tracking-[0.5em] uppercase">Secure_Handshake_Required</span>
                                </div>
                            </div>
                        </ScrollReveal3D>
                    </div>
                </section>
            </div>
            

        </div>
    )
}