import { useRef, useState, useMemo, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float, Sphere, MeshDistortMaterial, MeshWobbleMaterial, Environment, Stars, Sparkles, Cylinder, Torus, Html } from '@react-three/drei'
import { motion, useScroll, useTransform, useSpring, useMotionValue } from 'framer-motion'
import { ArrowRight, ScanFace, HeartPulse, Stethoscope, Microscope, Dna, ChevronRight, Play, Shield, Activity, Zap } from 'lucide-react'

// ─── 0. GLOBAL STYLES ───
const GlobalStyles = () => (
    <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600&family=Rajdhani:wght@500;600;700;800;900&display=swap');
        .font-tech { font-family: 'Rajdhani', sans-serif; }
        .font-body { font-family: 'Inter', sans-serif; }
        body { overflow-x: hidden; background-color: #0f172a; }

        /* ─── NEW ANIMATIONS FOR RUNNING LIGHTS ─── */
        @keyframes spin-border {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        .animate-spin-border {
            animation: spin-border 4s linear infinite;
        }

        @keyframes shimmer-fast {
            0% { transform: translateX(-150%) skewX(-20deg); }
            100% { transform: translateX(150%) skewX(-20deg); }
        }
        .animate-shimmer-fast {
            animation: shimmer-fast 2.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
    `}</style>
)

// ─── OPTIMIZATION: Memoize random values outside render cycle ───
const OrganicCells = () => {
    const particles = useMemo(() => {
        return Array.from({ length: 20 }).map(() => ({
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
                <Sphere args={[1, 64, 64]} position={[8, 2, -5]} scale={2.8}>
                    <MeshDistortMaterial
                        color="#2dd4bf"
                        envMapIntensity={1}
                        clearcoat={1}
                        roughness={0.1}
                        metalness={0.3}
                        distort={0.3}
                        speed={1.5}
                    />
                </Sphere>
            </Float>

            <Float speed={3} rotationIntensity={0.5} floatIntensity={2}>
                <Sphere args={[1, 48, 48]} position={[-9, -4, -8]} scale={2.2}>
                    <MeshWobbleMaterial
                        color="#38bdf8"
                        factor={0.4}
                        speed={1}
                        roughness={0.1}
                        transparent
                        opacity={0.6}
                    />
                </Sphere>
            </Float>

            {particles.map((data, i) => (
                <Float key={i} speed={data.speed} rotationIntensity={0.5} floatIntensity={0.8}>
                    <Sphere args={[data.scale, 16, 16]} position={data.position}>
                        <MeshDistortMaterial
                            color="#ccfbf1"
                            emissive="#2dd4bf"
                            emissiveIntensity={0.5}
                            distort={0.2}
                            speed={2}
                            roughness={0}
                        />
                    </Sphere>
                </Float>
            ))}

            <Sparkles count={80} scale={25} size={4} speed={0.4} opacity={0.4} color="#ccfbf1" />
            <Stars radius={100} depth={50} count={2000} factor={4} saturation={0} fade speed={0.5} />
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

            <Canvas
                camera={{ position: [0, 0, 12], fov: 35 }}
                gl={{ antialias: true, powerPreference: "high-performance" }}
                dpr={[1, 2]}
                performance={{ min: 0.5 }}
            >
                <Suspense fallback={null}>
                    <ambientLight intensity={0.8} />
                    <pointLight position={[10, 10, 10]} intensity={1.2} color="#ffffff" />
                    <pointLight position={[-10, -10, -10]} intensity={0.8} color="#2dd4bf" />
                    <OrganicCells />
                    <Environment preset="city" />
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
            viewport={{ once: false, margin: "-10% 0px -10% 0px" }}
            transition={{
                type: "spring",
                stiffness: 50,
                damping: 20,
                delay: delay,
                duration: 0.8
            }}
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
        <motion.div
            style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => { x.set(0); y.set(0); }}
            className={`perspective-1000 ${className}`}
        >
            {children}
        </motion.div>
    );
};

// ─── 3. UI COMPONENTS ───

// ─── FIX: FeatureItem rendering issue ───
const FeatureItem = ({ icon: Icon, title, desc, delay }) => (
    <ScrollReveal3D delay={delay}>
        <TiltCard className="h-full group">
            <div className="relative h-full rounded-[2rem] overflow-hidden flex flex-col">

                {/* 1. The Moving Gradient Beam (Background) */}
                <div className="absolute inset-0 z-0">
                    <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[conic-gradient(from_0deg,transparent_0deg_300deg,#2dd4bf_360deg)] animate-spin-border opacity-60" />
                </div>

                {/* 2. Inner Content Container (Using relative and flex to ensure height) */}
                <div className="relative z-10 flex-1 m-[1.5px] rounded-[2rem] bg-[#0f172a] overflow-hidden flex flex-col">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#1e293b] to-[#0f172a] opacity-90" />

                    {/* Glass Shine Effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-teal-500/0 to-teal-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                    <div className="relative z-20 p-8 h-full flex flex-col">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center mb-6 text-white shadow-lg shadow-teal-500/30 group-hover:scale-110 transition-transform duration-300">
                            <Icon size={32} />
                        </div>
                        <h3 className="text-2xl font-tech font-bold mb-3 text-white uppercase tracking-wide">{title}</h3>
                        <p className="text-slate-400 font-body leading-relaxed text-sm">{desc}</p>
                    </div>
                </div>
            </div>
        </TiltCard>
    </ScrollReveal3D>
);

const StatBox = ({ value, label, delay }) => (
    <ScrollReveal3D delay={delay}>
        <div className="relative group rounded-3xl overflow-hidden hover:-translate-y-2 transition-transform duration-300">
            {/* Moving Border */}
            <div className="absolute inset-0 opacity-30 group-hover:opacity-60 transition-opacity">
                <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[conic-gradient(from_180deg,transparent_0deg_280deg,#2dd4bf_360deg)] animate-spin-border" />
            </div>

            <div className="relative m-[1px] text-center p-8 rounded-3xl bg-[#111827] border border-white/5 backdrop-blur-md z-10 h-full">
                <div className="text-5xl font-tech font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-teal-300 mb-2 drop-shadow-md">{value}</div>
                <div className="text-xs font-bold font-body uppercase tracking-[0.2em] text-teal-400">{label}</div>
            </div>
        </div>
    </ScrollReveal3D>
);

// ─── 4. MAIN HOME PAGE ───
export default function Home({ setPage }) {
    const containerRef = useRef(null)
    const { scrollYProgress } = useScroll({ target: containerRef })

    // Parallax configs
    const yHero = useTransform(scrollYProgress, [0, 1], [0, 300])
    const opacityHero = useTransform(scrollYProgress, [0, 0.3], [1, 0])

    // Showcase 3D Rotation
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
                    <motion.div
                        style={{ y: yHero, opacity: opacityHero }}
                        className="text-center relative z-20 max-w-5xl"
                    >
                        <motion.div
                            initial={{ y: -50, opacity: 0, rotateX: 90 }}
                            whileInView={{ y: 0, opacity: 1, rotateX: 0 }}
                            viewport={{ once: false }}
                            transition={{ delay: 0.2, type: "spring" }}
                            className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-teal-900/30 border border-teal-500/30 backdrop-blur-md mb-8 shadow-[0_0_30px_rgba(45,212,191,0.2)]"
                        >
                            <HeartPulse size={18} className="text-teal-400 animate-pulse" />
                            <span className="text-xs font-tech font-bold tracking-[0.2em] uppercase text-teal-100">AI Health Diagnostics</span>
                        </motion.div>

                        <motion.h1
                            initial={{ scale: 0.8, opacity: 0 }}
                            whileInView={{ scale: 1, opacity: 1 }}
                            viewport={{ once: false }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className="font-tech text-7xl md:text-[9rem] font-black tracking-tighter leading-[0.85] mb-8 text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-200 to-slate-500 drop-shadow-2xl"
                        >
                            BETTER <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-300 to-teal-400 animate-gradient-text">
                                HEALTH
                            </span>
                        </motion.h1>

                        <motion.p
                            initial={{ y: 20, opacity: 0 }}
                            whileInView={{ y: 0, opacity: 1 }}
                            viewport={{ once: false }}
                            transition={{ delay: 0.5 }}
                            className="text-xl md:text-2xl text-slate-300 max-w-2xl mx-auto mb-12 font-light leading-relaxed"
                        >
                            Elevate your pet's healthcare with Intelligent AI. <br className="hidden md:block" />
                            Analyze emotions and vital signs via <span className="text-teal-300 font-semibold">Computer Vision</span>.
                        </motion.p>

                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            whileInView={{ y: 0, opacity: 1 }}
                            viewport={{ once: false }}
                            transition={{ delay: 0.7 }}
                            className="flex flex-col sm:flex-row gap-6 justify-center items-center"
                        >
                            <button onClick={() => setPage('analyze')} className="relative px-10 py-5 bg-teal-500 text-[#0b1121] rounded-full font-tech font-bold text-2xl overflow-hidden group shadow-[0_0_50px_rgba(45,212,191,0.4)] hover:scale-105 transition-transform duration-300">
                                <span className="relative z-10 flex items-center gap-3">
                                    Start Scan <ScanFace size={24} />
                                </span>
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent w-full h-full animate-shimmer-fast mix-blend-overlay" />
                            </button>

                            <button onClick={() => setPage('plans')} className="px-10 py-5 bg-white/5 border border-white/10 rounded-full font-tech font-bold text-2xl hover:bg-white/10 backdrop-blur-md transition-all text-slate-200 hover:scale-105">
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
                                <StatBox value="200+" label="Breeds" delay={0.3} />
                            </div>
                        </TiltCard>
                    </div>
                </section>

                {/* ── CORE ENGINE ── */}
                <section className="max-w-7xl mx-auto px-6 py-20 relative">
                    <ScrollReveal3D>
                        <div className="flex flex-col md:flex-row justify-between items-end mb-20 border-b border-white/10 pb-10">
                            <div>
                                <h2 className="text-5xl md:text-7xl font-tech font-black mb-4 text-white uppercase">CORE ENGINE</h2>
                                <p className="text-slate-400 text-lg max-w-md">Driven by advanced Neural Networks.</p>
                            </div>
                            <div className="hidden md:block text-teal-500">
                                <Dna size={80} className="animate-spin-slow" />
                            </div>
                        </div>
                    </ScrollReveal3D>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 perspective-1000">
                        <FeatureItem
                            icon={ScanFace}
                            title="Emotion AI"
                            desc="Detects 4 core emotions (Happy, Sad, Angry, Other) using facial micro-expressions."
                            delay={0.1}
                        />
                        <FeatureItem
                            icon={Shield}
                            title="Breed ID"
                            desc="Precise breed identification using Gemini Vision with zero-shot learning capability."
                            delay={0.2}
                        />
                        <FeatureItem
                            icon={Stethoscope}
                            title="Vet Advisor"
                            desc="Personalized preliminary health guidance based on breed, age, and emotional data."
                            delay={0.3}
                        />
                    </div>
                </section>

                {/* ── DEEP ANALYSIS ── */}
                <section className="py-40 px-6 overflow-hidden perspective-2000">
                    <ScrollReveal3D>
                        <div className="max-w-6xl mx-auto mb-20 text-center">
                            <h2 className="text-5xl md:text-7xl font-tech font-black mb-4 text-white">DEEP ANALYSIS</h2>
                            <p className="text-slate-400 text-xl">In-depth insights derived from Computer Vision.</p>
                        </div>
                    </ScrollReveal3D>

                    <motion.div
                        style={{ rotateX: rotateShowcase, scale: scaleShowcase }}
                        className="max-w-6xl mx-auto"
                    >
                        <TiltCard>
                            <div className="rounded-[3rem] bg-[#0f172a] border border-white/10 shadow-[0_20px_100px_-20px_rgba(45,212,191,0.2)] overflow-hidden relative group">
                                <div className="grid md:grid-cols-2 min-h-[650px]">
                                    {/* IMAGE SIDE */}
                                    <div className="relative overflow-hidden group bg-black">
                                        <img
                                            src={analysisData.image}
                                            alt="Analyzed Pet"
                                            loading="lazy"
                                            decoding="async"
                                            className="w-full h-full object-cover transition-transform duration-[3s] group-hover:scale-110 opacity-80"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-transparent to-transparent" />

                                        {/* Medical Overlay UI */}
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                            <div className="w-[85%] h-[85%] border-2 border-teal-500/30 rounded-3xl relative overflow-hidden">
                                                <div className="absolute top-0 left-0 w-full h-[3px] bg-teal-400 shadow-[0_0_30px_var(--color-sage)] animate-scan" />
                                                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-teal-500" />
                                                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-teal-500" />
                                                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-teal-500" />
                                                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-teal-500" />
                                            </div>
                                        </div>

                                        {/* Floating Tag */}
                                        <div className="absolute bottom-8 left-8 bg-black/60 backdrop-blur-xl border border-teal-500/30 px-6 py-3 rounded-2xl flex items-center gap-4 shadow-xl transform group-hover:translate-y-[-10px] transition-transform duration-500">
                                            <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center text-2xl">🐕</div>
                                            <div>
                                                <div className="font-bold text-white text-lg">{analysisData.breed}</div>
                                                <div className="text-teal-400 text-xs font-mono tracking-wider">CONFIDENCE: {analysisData.confidence}%</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* DATA SIDE */}
                                    <div className="p-12 md:p-16 flex flex-col justify-center bg-[#0f172a] relative">
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
                                                        <span className="font-tech text-white text-xl font-bold">{item.value}%</span>
                                                    </div>
                                                    <div className="h-3 w-full bg-black/60 rounded-full overflow-hidden border border-white/5 p-[2px]">
                                                        <motion.div
                                                            initial={{ width: 0 }}
                                                            whileInView={{ width: `${item.value}%` }}
                                                            viewport={{ once: false }}
                                                            transition={{ duration: 1.2, delay: 0.5 + idx * 0.1, type: "spring" }}
                                                            className={`h-full rounded-full bg-gradient-to-r ${item.gradient} shadow-[0_0_15px_rgba(255,255,255,0.3)] relative overflow-hidden`}
                                                        >
                                                            {/* Running light on bar */}
                                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent w-full h-full animate-shimmer-fast" />
                                                            <div className="absolute inset-0 bg-white/20" style={{ clipPath: 'polygon(0 0, 100% 0, 80% 100%, 0% 100%)' }} />
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
                        </TiltCard>
                    </motion.div>
                </section>

                {/* ── FOOTER (WOW Portal Effect - REFINED SCALE) ── */}
                <section className="relative py-72 overflow-hidden flex flex-col items-center justify-center">

                    {/* 1. LOCALIZED INTERFACE FX */}
                    <div className="absolute inset-0 pointer-events-none">
                        {/* Deep Glow Aura */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(45,212,191,0.12)_0%,transparent_70%)]" />

                        {/* Holographic Perspective Floor */}
                        <div className="absolute bottom-0 left-0 w-full h-[50%] opacity-30"
                            style={{
                                perspective: '1000px',
                                background: 'radial-gradient(ellipse at bottom, rgba(45,212,191,0.15), transparent 70%)'
                            }}>
                            <div className="absolute inset-0"
                                style={{
                                    backgroundImage: 'linear-gradient(to right, #2dd4bf 1px, transparent 1px), linear-gradient(to bottom, #2dd4bf 1px, transparent 1px)',
                                    backgroundSize: '50px 50px',
                                    transform: 'rotateX(75deg) translateY(15%)',
                                    maskImage: 'linear-gradient(to top, black, transparent)'
                                }} />
                        </div>

                        {/* Rotating Energy Rings - Smaller Scale */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="absolute w-[800px] h-[800px] border border-teal-500/5 rounded-full animate-spin-slow" />
                            <div className="absolute w-[600px] h-[600px] border-2 border-dashed border-teal-500/10 rounded-full animate-spin-reverse opacity-40" />
                            <div className="absolute w-[450px] h-[450px] rounded-full border border-white/5 bg-[conic-gradient(from_0deg,transparent_0deg_300deg,rgba(45,212,191,0.2)_360deg)] animate-spin-border" />
                        </div>

                        {/* Corner HUD Decorations - Subtle */}
                        <div className="absolute inset-20 border-t border-l border-teal-500/20 w-24 h-24 rounded-tl-2xl" />
                        <div className="absolute inset-20 left-auto border-t border-r border-teal-500/20 w-24 h-24 rounded-tr-2xl" />
                    </div>

                    <div className="relative z-10 text-center max-w-5xl px-4">
                        <ScrollReveal3D delay={0.2}>
                            {/* System Status Indicators */}
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
                                <span className="relative inline-block drop-shadow-[0_0_30px_rgba(45,212,191,0.5)]">
                                    ASCEND
                                    <div className="absolute inset-0 bg-gradient-to-t from-teal-400/0 via-teal-400/10 to-teal-400/0 h-full animate-scan pointer-events-none" />
                                </span>
                            </h2>

                            <p className="text-lg md:text-2xl text-teal-100/50 font-body font-light mb-16 tracking-[0.3em] uppercase">
                                Initialize <span className="text-white font-semibold">Evolutionary</span> Bio-Sync
                            </p>
                        </ScrollReveal3D>

                        <ScrollReveal3D delay={0.4}>
                            <div className="relative inline-block group">
                                {/* Magnetic Core Effect */}
                                <div className="absolute inset-0 bg-teal-500/20 rounded-full blur-[40px] opacity-0 group-hover:opacity-100 transition-all duration-700 scale-75 group-hover:scale-110" />

                                {/* THE REFINED BUTTON */}
                                <motion.button
                                    whileHover={{ scale: 1.05, y: -5 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setPage('analyze')}
                                    className="relative px-16 py-8 bg-white text-[#0b1121] rounded-full font-tech font-black text-4xl overflow-hidden shadow-[0_20px_60px_-10px_rgba(45,212,191,0.5)] transition-all"
                                >
                                    <span className="relative z-10 flex items-center gap-4">
                                        LAUNCH <Play fill="currentColor" size={32} />
                                    </span>

                                    {/* Glossy Overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-teal-200/30 to-transparent translate-x-[-150%] group-hover:translate-x-[150%] transition-transform duration-700 ease-in-out" />
                                </motion.button>

                                {/* Status Micro-text */}
                                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-full">
                                    <span className="font-mono text-[9px] text-teal-500/40 tracking-[0.5em] uppercase">Secure_Handshake_Required</span>
                                </div>
                            </div>
                        </ScrollReveal3D>

                        {/* Global Footer Signature */}
                        <div className="mt-40 pt-12 border-t border-white/5 flex flex-col items-center gap-6 opacity-30">
                            <div className="text-[10px] font-tech font-medium tracking-[1.5em] text-slate-500 uppercase ml-[1.5em]">
                                PetInsight Intelligence Operations © 2026
                            </div>
                        </div>
                    </div>
                </section>

            </div>

            <style jsx>{`
                .perspective-1000 { perspective: 1000px; }
                .perspective-2000 { perspective: 2000px; }
                
                @keyframes pulse-slow {
                    0%, 100% { opacity: 0.3; transform: scale(1); }
                    50% { opacity: 0.6; transform: scale(1.1); }
                }
                .animate-pulse-slow { animation: pulse-slow 6s infinite; }

                @keyframes scan {
                    0% { top: 0%; opacity: 0; }
                    50% { opacity: 1; }
                    100% { top: 100%; opacity: 0; }
                }
                .animate-scan { animation: scan 3s cubic-bezier(0.4, 0, 0.2, 1) infinite; }

                @keyframes gradient-text {
                    0% { background-position: 0% 50%; }
                    100% { background-position: 200% 50%; }
                }
                .animate-gradient-text { background-size: 200% auto; animation: gradient-text 3s linear infinite; }
                
                @keyframes spin-slow {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .animate-spin-slow { animation: spin-slow 60s linear infinite; }

                @keyframes spin-reverse {
                    from { transform: rotate(360deg); }
                    to { transform: rotate(0deg); }
                }
                .animate-spin-reverse { animation: spin-reverse 25s linear infinite; }

                @keyframes shimmer {
                    0% { transform: translateX(0%); }
                    100% { transform: translateX(200%); }
                }
                .group:hover .group-hover\\:animate-shimmer {
                    animation: shimmer 1.5s infinite;
                }
                .will-change-transform { will-change: transform; }
            `}</style>
        </div>
    )
}