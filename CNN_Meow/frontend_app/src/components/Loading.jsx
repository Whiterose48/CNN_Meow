import { useState, useEffect, useRef, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float, Stars, PerspectiveCamera, Torus, Sphere, MeshDistortMaterial } from '@react-three/drei'
import { Zap, ShieldCheck, Database } from 'lucide-react'
import ErrorBoundary from './ErrorBoundary'

// ─── 1. 3D GYROSCOPE SCENE ───
const Gyroscope = () => {
    const ring1 = useRef()
    const ring2 = useRef()
    const ring3 = useRef()
    const core = useRef()

    useFrame((state) => {
        const t = state.clock.getElapsedTime()

        // หมุนวงแหวนแต่ละชั้นในแกนที่ต่างกัน
        if (ring1.current) {
            ring1.current.rotation.x = t * 0.5
            ring1.current.rotation.y = t * 0.2
        }
        if (ring2.current) {
            ring2.current.rotation.x = t * 0.3
            ring2.current.rotation.z = t * 0.6
        }
        if (ring3.current) {
            ring3.current.rotation.y = t * 0.4
            ring3.current.rotation.z = t * 0.3
        }
        // แกนกลางเต้นตามจังหวะ
        if (core.current) {
            const scale = 1 + Math.sin(t * 3) * 0.1
            core.current.scale.set(scale, scale, scale)
        }
    })

    return (
        <group scale={0.8}> {/* ย่อขนาด 3D รวมลง */}
            <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>

                {/* Core Energy Ball */}
                <mesh ref={core}>
                    <sphereGeometry args={[0.8, 32, 32]} />
                    <MeshDistortMaterial
                        color="#2dd4bf"
                        emissive="#0d9488"
                        emissiveIntensity={2}
                        distort={0.4}
                        speed={3}
                        roughness={0}
                    />
                </mesh>

                {/* Ring 1 (Inner) */}
                <group ref={ring1}>
                    <Torus args={[1.4, 0.04, 12, 64]}> {/* ลดความหนาวงแหวน */}
                        <meshStandardMaterial color="#5eead4" emissive="#2dd4bf" emissiveIntensity={1} metalness={1} roughness={0.1} />
                    </Torus>
                </group>

                {/* Ring 2 (Middle) */}
                <group ref={ring2}>
                    <Torus args={[1.9, 0.02, 12, 64]}> {/* ลดความหนาวงแหวน */}
                        <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={0.5} transparent opacity={0.5} />
                    </Torus>
                </group>

                {/* Ring 3 (Outer) */}
                <group ref={ring3}>
                    <Torus args={[2.4, 0.06, 4, 64]} rotation={[1.5, 0, 0]}> {/* ลดความหนาวงแหวน */}
                        <meshStandardMaterial color="#0f766e" emissive="#115e59" emissiveIntensity={1} wireframe />
                    </Torus>
                </group>

            </Float>
            <Stars radius={50} depth={50} count={800} factor={3} fade speed={1} />
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} intensity={2} color="#2dd4bf" />
        </group>
    )
}

// ─── 2. MAIN COMPONENT ───
export default function Loading({ isLoading }) {
    const [progress, setProgress] = useState(0)

    useEffect(() => {
        if (isLoading) {
            const i = setInterval(() => setProgress(p => {
                if (p >= 100) { clearInterval(i); return 100; }
                const jump = p < 70 ? Math.floor(Math.random() * 5) + 2 : 1;
                return Math.min(p + jump, 100);
            }), 100)
            return () => clearInterval(i)
        } else {
            setProgress(100)
        }
    }, [isLoading])

    return (
        <AnimatePresence>
            {isLoading && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, transition: { duration: 0.8, ease: "easeInOut" } }}
                    className="fixed inset-0 z-[9999] bg-[#010409] flex flex-col items-center justify-center font-tech overflow-hidden"
                >
                    <style>{`
                        .font-tech { font-family: 'Rajdhani', sans-serif; }
                        .scan-grid {
                            background-image: linear-gradient(rgba(45, 212, 191, 0.05) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(45, 212, 191, 0.05) 1px, transparent 1px);
                            background-size: 40px 40px; /* ย่อขนาดช่องกริดลง */
                        }
                    `}</style>

                    {/* 3D Layer */}
                    <div className="absolute inset-0 z-0">
                        <ErrorBoundary fallback={<div className="absolute inset-0 bg-[#010409]" />}>
                            <Canvas dpr={[1, 1.2]} gl={{ antialias: false, powerPreference: "high-performance" }}>
                                <Suspense fallback={null}>
                                    <PerspectiveCamera makeDefault position={[0, 0, 8]} /> {/* ถอยกล้องออกนิดนึง */}
                                    <Gyroscope />
                                </Suspense>
                            </Canvas>
                        </ErrorBoundary>
                    </div>

                    {/* Background Grid */}
                    <div className="absolute inset-0 z-0 scan-grid pointer-events-none opacity-40" />
                    <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,transparent_0%,#010409_85%)]" />

                    {/* UI Layer */}
                    <div className="relative z-10 flex flex-col items-center justify-end h-full pb-12 sm:pb-16 w-full max-w-3xl px-6 sm:px-10">

                        {/* Center Title (Floating) */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none mt-20 sm:mt-24">
                            <motion.div
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="flex flex-col items-center gap-1.5"
                            >
                                <h2 className="text-xl md:text-3xl font-black text-white tracking-[0.2em] uppercase drop-shadow-[0_0_10px_rgba(45,212,191,0.5)]">
                                    System Initializing
                                </h2>
                                <div className="flex items-center gap-2 text-teal-400 text-[8px] md:text-[10px] font-bold tracking-[0.3em] uppercase opacity-80">
                                    <Zap size={10} className="animate-pulse" />
                                    <span>Establishing Secure Uplink</span>
                                    <Database size={10} className="animate-pulse" />
                                </div>
                            </motion.div>
                        </div>

                        {/* Bottom Stats & Progress */}
                        <div className="w-full flex flex-col gap-1.5">
                            <div className="flex justify-between items-end text-slate-400 text-[9px] sm:text-[10px] font-bold tracking-widest uppercase">
                                <div className="flex gap-3">
                                    <span>Core: <span className="text-white">Active</span></span>
                                    <span>Memory: <span className="text-white">Allocated</span></span>
                                </div>
                                <div className="text-teal-400 text-sm">{progress}%</div>
                            </div>

                            {/* Thin Progress Line */}
                            <div className="h-[1.5px] w-full bg-white/10 overflow-hidden relative rounded-full">
                                <motion.div
                                    className="h-full bg-teal-400 shadow-[0_0_15px_#2dd4bf] rounded-full"
                                    animate={{ width: `${progress}%` }}
                                    transition={{ ease: "linear" }}
                                />
                            </div>

                            <div className="flex justify-between text-[8px] sm:text-[9px] text-slate-600 uppercase tracking-widest mt-1">
                                <span>PetInsight Protocol v2.6.4</span>
                                <span className="flex items-center gap-1"><ShieldCheck size={8} /> Verified Secure</span>
                            </div>
                        </div>

                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}