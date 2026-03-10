import { useState, useRef, useMemo, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float, Environment, Stars, Sparkles, PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'
import { Check, Crown, Star, ChevronLeft, Rocket, QrCode, ShieldCheck, Cpu } from 'lucide-react'
import ErrorBoundary from '../components/ErrorBoundary'

// ─── 1. HIGH-GLOSS 3D WEALTH ASSETS ───
const GoldBar = ({ position, rotation }) => (
    <Float speed={2} rotationIntensity={1.5} floatIntensity={2}>
        <mesh position={position} rotation={rotation}>
            <boxGeometry args={[2.2, 0.5, 1]} />
            <meshStandardMaterial
                color="#FFD700"
                metalness={1}
                roughness={0.05}
                emissive="#FFD700"
                emissiveIntensity={0.3}
            />
        </mesh>
    </Float>
)

const SilverCoin = ({ position, rotation }) => (
    <Float speed={3} rotationIntensity={2} floatIntensity={1}>
        <mesh position={position} rotation={rotation}>
            <cylinderGeometry args={[0.6, 0.6, 0.1, 32]} />
            <meshStandardMaterial
                color="#F8FAFC"
                metalness={1}
                roughness={0.1}
                emissive="#CBD5E1"
                emissiveIntensity={0.2}
            />
        </mesh>
    </Float>
)

const WealthVault = () => {
    const group = useRef()
    useFrame((s) => (group.current.rotation.y = s.clock.elapsedTime * 0.04))
    const items = useMemo(() => Array.from({ length: 30 }).map((_, i) => ({
        pos: [(Math.random() - 0.5) * 35, (Math.random() - 0.5) * 25, (Math.random() - 0.5) * 15 - 5],
        rot: [Math.random() * Math.PI, Math.random() * Math.PI, 0],
        type: i % 2 === 0 ? 'gold' : 'silver'
    })), [])
    return (
        <group ref={group}>
            {items.map((item, i) => (
                item.type === 'gold' ? <GoldBar key={i} position={item.pos} rotation={item.rot} /> : <SilverCoin key={i} position={item.pos} rotation={item.rot} />
            ))}
            <Sparkles count={100} scale={30} size={4} speed={0.5} color="#FFD700" />
        </group>
    )
}

// ─── 2. DATA (2 PLANS) ───
const PLANS = [
    { id: 'free', name: 'Essential', sub: 'FREE_ACCESS', price: '0', icon: Rocket, color: '#94A3B8', features: ['วิเคราะห์อารมณ์สัตว์เลี้ยง (CNN Emotion)', 'แสดงผลอารมณ์ + ค่าความมั่นใจ', 'คำแนะนำเบื้องต้นจากระบบ Fallback', 'ไม่จำกัดจำนวนการสแกน'], target: 'Standard Unit' },
    { id: 'premium', name: 'Pro Parent', sub: 'PREMIUM_CORE', price: '299', icon: Crown, color: '#FFD700', popular: true, features: ['วิเคราะห์อารมณ์แบบ Deep Neural Scan', 'ระบุสายพันธุ์ด้วย ImageNet AI (150+ สายพันธุ์)', 'คำแนะนำสัตวแพทย์โดย Gemini-2.5-Flash + LangChain', 'บันทึกประวัติ 30 วัน (Dashboard Sync)', 'AI Agent ให้คำปรึกษา 24/7'], target: 'Elite Unit' },
]

export default function Plans({ setPage, setPlan }) {
    const [selPlan, setSelPlan] = useState(null)
    const [isOverlayOpen, setIsOverlayOpen] = useState(false)
    const [verifying, setVerifying] = useState(false)

    const handleSelect = (plan) => {
        if (plan.id === 'free') {
            setPlan('free'); setPage('analyze')
        } else {
            setSelPlan(plan); setIsOverlayOpen(true)
        }
    }

    const handleConfirm = () => {
        setVerifying(true)
        setTimeout(() => { setPlan(selPlan.id); setPage('analyze') }, 2000)
    }

    return (
        <div className="min-h-screen relative bg-[#010409] text-white overflow-x-hidden pb-24 font-body">
            <style>{`
                .font-tech { font-family: 'Rajdhani', sans-serif; }
                .font-body { font-family: 'Plus Jakarta Sans', sans-serif; }
                
                .glass-card { background: rgba(10, 15, 30, 0.8); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.08); }
                @keyframes glow-run { 0% { background-position: 0% 50%; } 100% { background-position: 200% 50%; } }
                
                /* เอฟเฟกต์ไฟวิ่งของตัวอักษร Plan */
                .animate-text-glow {
                    background-size: 200% auto;
                    animation: glow-run 3s linear infinite;
                }
                
                /* ขอบไฟวิ่งของ Premium Plan (สีทอง) */
                .premium-border { position: relative; }
                .premium-border::after {
                    content: ""; position: absolute; inset: -2.5px; border-radius: 3.1rem; padding: 2.5px;
                    background: linear-gradient(90deg, transparent, #FFD700, #fff, #FFD700, transparent);
                    background-size: 200% auto; -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
                    -webkit-mask-composite: xor; mask-composite: exclude; animation: glow-run 4s linear infinite;
                    pointer-events: none;
                }

                /* ขอบไฟวิ่งของ Free Plan (สีฟ้า/เงิน) */
                .free-border { position: relative; }
                .free-border::after {
                    content: ""; position: absolute; inset: -2.5px; border-radius: 3.1rem; padding: 2.5px;
                    background: linear-gradient(90deg, transparent, #38bdf8, #fff, #38bdf8, transparent);
                    background-size: 200% auto; -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
                    -webkit-mask-composite: xor; mask-composite: exclude; animation: glow-run 4s linear infinite reverse;
                    pointer-events: none;
                }
            `}</style>

            {/* ── 3D SCENE (SOLID BLACK) ── */}
            <div className="fixed inset-0 z-0">
                <div className="absolute inset-0 bg-[#010409]" />
                <ErrorBoundary fallback={<div className="fixed inset-0 bg-[#010409]" />}>
                    <Canvas shadows dpr={[1, 2]}>
                        <Suspense fallback={null}>
                            <PerspectiveCamera makeDefault position={[0, 0, 12]} fov={40} />
                            <ambientLight intensity={0.8} />
                            <pointLight position={[10, 10, 10]} intensity={3.5} color="#FFD700" />
                            <pointLight position={[-10, -10, -10]} intensity={2} color="#ffffff" />
                            <WealthVault />
                            <Stars radius={100} count={3000} factor={4} fade speed={1} />
                            <Environment preset="city" />
                        </Suspense>
                    </Canvas>
                </ErrorBoundary>
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-24 pb-40 font-tech">

                {/* HEADER */}
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-20 flex flex-col items-center">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 mb-6 font-tech tracking-[0.4em] text-[17px] text-teal-400 uppercase shadow-lg">
                        <Cpu size={12} className="animate-pulse" /> Neural_Network_Upgrade
                    </div>
                    <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black text-white tracking-tighter mb-4 uppercase drop-shadow-2xl flex flex-wrap justify-center gap-4">
                        CHOOSE 
                        {/* เพิ่มคลาส animate-text-glow ที่นี่ */}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-teal-300 animate-text-glow">
                            Plan
                        </span>
                    </h1>
                    <p className="text-white/70 text-base max-w-lg mx-auto font-body font-light leading-relaxed drop-shadow-md">
                        Activate premium neural links for advanced veterinary analysis.
                    </p>
                </motion.div>

                {/* ── PLANS GRID ── */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto items-stretch h-full">
                    {PLANS.map((p) => (
                        <motion.div
                            key={p.id}
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            whileHover={{ y: -10, scale: 1.01 }}
                            // เพิ่มเงื่อนไขให้ Free Plan แสดงขอบวิ่งแบบ free-border พร้อมแสง glow สีฟ้าจางๆ
                            className={`glass-card p-8 md:p-10 rounded-[3rem] flex flex-col h-full transition-all duration-500 
                                ${p.id === 'premium' 
                                    ? 'premium-border shadow-[0_0_60px_rgba(255,215,0,0.15)]' 
                                    : 'free-border shadow-[0_0_60px_rgba(56,189,248,0.12)]'}`}
                        >
                            <div className="mb-8 flex-shrink-0">
                                <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mb-6 border border-white/20 shadow-xl">
                                    <p.icon style={{ color: p.color }} size={28} className={p.popular ? "animate-pulse" : ""} />
                                </div>
                                <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-1">{p.name}</h3>
                                <span className="text-[10px] font-bold tracking-[0.3em] text-teal-400 uppercase opacity-70">{p.sub}</span>
                            </div>

                            <div className="mb-8 flex-shrink-0">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-4xl font-black text-white drop-shadow-md">฿{p.price}</span>
                                    <span className="text-white/30 text-xs tracking-widest uppercase font-bold">/ CYCLE</span>
                                </div>
                            </div>

                            <ul className="space-y-4 mb-12 flex-grow font-body">
                                {p.features.map((f, i) => (
                                    <li key={i} className="flex items-start gap-3 group">
                                        <div className="mt-0.5 w-5 h-5 rounded-full bg-teal-500/10 flex items-center justify-center border border-teal-500/40">
                                            <Check size={12} className="text-teal-300" />
                                        </div>
                                        <span className="text-sm text-slate-200 font-medium group-hover:text-teal-200 transition-colors">{f}</span>
                                    </li>
                                ))}
                            </ul>

                            <div className="pt-6 border-t border-white/5 mt-auto relative z-20">
                                <button
                                    onClick={() => handleSelect(p)}
                                    className={`w-full py-4 rounded-full font-tech font-black transition-all tracking-[0.2em] uppercase cursor-pointer relative overflow-hidden group/btn
                                        ${p.popular
                                            ? 'bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-500 text-black shadow-[0_0_40px_rgba(255,215,0,0.3)]'
                                            : 'bg-white/10 border border-white/20 text-white hover:bg-white/20 shadow-xl'}`}
                                >
                                    <span className="relative z-10 text-base">
                                        {p.id === 'free' ? 'DEPLOY_FREE' : 'AUTHORIZE_UNIT'}
                                    </span>
                                    <div className="absolute inset-0 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-[-20deg]" />
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* ── PAYMENT OVERLAY ── */}
            <AnimatePresence>
                {isOverlayOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#010409]/80 backdrop-blur-2xl">
                        <motion.div initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }} className="glass-card max-w-sm w-full p-8 rounded-[3rem] text-center border-white/30 shadow-[0_0_80px_rgba(255,255,255,0.05)] font-tech">
                            {!verifying ? (
                                <>
                                    <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-4">
                                        <div className="text-left">
                                            <h2 className="text-2xl font-black text-white uppercase tracking-tighter">{selPlan?.name}</h2>
                                            <p className="text-teal-400 font-bold tracking-widest text-[8px] uppercase">Secure_Neural_Payment</p>
                                        </div>
                                        <div className="text-2xl font-black text-white">฿{selPlan?.price}</div>
                                    </div>

                                    <div className="relative p-5 bg-white rounded-[2.5rem] mb-8 shadow-[0_0_40px_rgba(255,255,255,0.15)] mx-auto max-w-[220px]">
                                        <img src="/qrcode.png" alt="Payment QR" className="w-full aspect-square object-contain" />
                                        <div className="absolute inset-0 border-[8px] border-[#0a0f1e] rounded-[2.5rem] pointer-events-none" />
                                    </div>

                                    <div className="space-y-3">
                                        <button onClick={handleConfirm} className="w-full py-4 bg-teal-500 text-[#010409] rounded-full font-black text-lg hover:shadow-[0_0_30px_rgba(45,212,191,0.4)] transition-all flex items-center justify-center gap-3 cursor-pointer">
                                            <ShieldCheck size={20} /> CONFIRM_AUTH
                                        </button>
                                        <button onClick={() => setIsOverlayOpen(false)} className="text-white/40 hover:text-white text-xs w-full transition-colors tracking-widest uppercase cursor-pointer py-1 font-bold">
                                            ABORT_ACCESS
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="py-16 flex flex-col items-center">
                                    <div className="w-20 h-20 border-t-2 border-teal-500 border-solid rounded-full animate-spin mb-8 shadow-[0_0_30px_rgba(45,212,191,0.2)]" />
                                    <h2 className="text-xl font-black text-white mb-2 tracking-widest animate-pulse uppercase">Verifying_Ledger...</h2>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}