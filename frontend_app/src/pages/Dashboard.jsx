import { useState, useRef, useMemo, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Canvas, useFrame } from '@react-three/fiber'
import { Points, PointMaterial, Stars, PerspectiveCamera, Float, Sphere, MeshDistortMaterial, Grid } from '@react-three/drei'
import * as THREE from 'three'
import { LayoutDashboard, Activity, Users, Heart, AlertCircle, ArrowUpRight, History, Search, Filter, ShieldAlert, LogIn } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

// ─── 1. THREE.JS NEURAL CORE (3D BACKGROUND) ───
const NeuralCore = () => {
    const ref = useRef()
    useFrame((state) => {
        ref.current.rotation.y = state.clock.getElapsedTime() * 0.05
        ref.current.rotation.z = state.clock.getElapsedTime() * 0.02
    })
    return (
        <group ref={ref}>
            <Float speed={3} rotationIntensity={0.5} floatIntensity={1}>
                <mesh opacity={0.1}>
                    <sphereGeometry args={[2, 64, 64]} />
                    <MeshDistortMaterial color="#2dd4bf" speed={3} distort={0.4} radius={1} wireframe transparent opacity={0.05} />
                </mesh>
            </Float>
            <Stars radius={100} depth={50} count={3000} factor={4} fade speed={1} />
        </group>
    )
}

const DashboardBackground = () => (
    <div className="fixed inset-0 z-0 bg-[#010409]">
        <Canvas dpr={[1, 2]}>
            <Suspense fallback={null}>
                <PerspectiveCamera makeDefault position={[0, 0, 10]} fov={50} />
                <ambientLight intensity={0.2} />
                <pointLight position={[10, 10, 10]} intensity={1} color="#2dd4bf" />
                <NeuralCore />
                <Grid position={[0, -4, 0]} args={[40, 40]} cellColor="#1e293b" sectionColor="#2dd4bf" sectionOpacity={0.05} cellOpacity={0.03} fadeDistance={25} />
            </Suspense>
        </Canvas>
        {/* เลเยอร์ Blur Glass พื้นหลังเพื่อความนวล */}
        <div className="absolute inset-0 bg-[#010409]/40 backdrop-blur-[2px]" />
    </div>
)

// ─── 2. VARIANTS FOR TRANSITIONS ───
const containerVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } }
}

const cardVariants = {
    initial: { opacity: 0, y: 30, scale: 0.95 },
    animate: {
        opacity: 1, y: 0, scale: 1,
        transition: { type: "spring", stiffness: 100, damping: 15 }
    }
}

// ─── 3. MAIN DASHBOARD ───
export default function Dashboard() {
    const weekData = [65, 72, 68, 80, 75, 90, 85]
    const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
    const maxV = Math.max(...weekData)

    const stats = [
        { l: 'TOTAL_DIAGNOSTICS', v: '1,247', d: '+12%', icon: Activity, color: '#2dd4bf' },
        { l: 'PET_DATABASE', v: '38', d: '+3', icon: Users, color: '#fbbf24' },
        { l: 'NEURAL_ACCURACY', v: '78%', d: '+5%', icon: Heart, color: '#f472b6' },
        { l: 'ALERT_NODES', v: '02', d: '-1', icon: AlertCircle, color: '#f87171' },
    ]

    const EMO_MAP = {
        happy: { emoji: '😊', color: 'text-teal-400', bg: 'bg-teal-500/20', label: 'Stable' },
        angry: { emoji: '😡', color: 'text-rose-400', bg: 'bg-rose-500/20', label: 'Stressed' },
        sad: { emoji: '😢', color: 'text-blue-400', bg: 'bg-blue-500/20', label: 'Low Energy' },
    }

    const { user, loginWithGoogle } = useAuth()

    if (!user) {
        return (
            <div className="min-h-screen relative font-body text-white flex items-center justify-center bg-[#010409]">
                <DashboardBackground />
                <div className="glass-card p-16 rounded-[3rem] border border-teal-500/20 text-center shadow-2xl relative overflow-hidden z-10 max-w-lg mx-auto">
                    <div className="absolute inset-0 bg-teal-500/5 blur-3xl rounded-full" />
                    <ShieldAlert size={50} className="text-teal-400 mx-auto mb-6 relative z-10" />
                    <h2 className="text-xl font-black uppercase tracking-widest text-white mb-2 relative z-10">Authentication Required</h2>
                    <p className="text-sm font-body text-slate-400 mb-8 relative z-10">Access to the Control Center Terminal is restricted. Please authenticate via Google.</p>
                    <button onClick={loginWithGoogle} className="relative z-10 px-8 py-4 rounded-full bg-teal-500 text-black text-xs font-black uppercase tracking-widest hover:scale-105 transition-all shadow-[0_0_20px_rgba(45,212,191,0.3)] flex items-center justify-center gap-3 mx-auto">
                        <LogIn size={16} /> Authenticate_Now
                    </button>
                    <style>{`.glass-card { background: rgba(10, 15, 30, 0.6); backdrop-filter: blur(30px); border: 1px solid rgba(255,255,255,0.06); box-shadow: 0 20px 50px rgba(0,0,0,0.3); }`}</style>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen relative font-body text-white overflow-x-hidden pb-24">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;600;800&family=Rajdhani:wght@500;600;700;900&display=swap');
                .font-tech { font-family: 'Rajdhani', sans-serif; }
                .font-body { font-family: 'Plus Jakarta Sans', sans-serif; }
                
                .glass-card { 
                    background: rgba(10, 15, 30, 0.6); 
                    backdrop-filter: blur(30px); 
                    border: 1px solid rgba(255,255,255,0.06); 
                    box-shadow: 0 20px 50px rgba(0,0,0,0.3);
                }

                .running-border { position: relative; overflow: hidden; }
                .running-border::after {
                    content: ''; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%;
                    background: conic-gradient(transparent, transparent, transparent, var(--border-color));
                    animation: rotate 5s linear infinite;
                }
                .card-content { position: relative; background: rgba(8, 12, 24, 0.9); border-radius: 1.9rem; margin: 1.5px; height: calc(100% - 3px); width: calc(100% - 3px); z-index: 10; }
                @keyframes rotate { 100% { transform: rotate(360deg); } }
                
                .chart-glow { filter: drop-shadow(0 0 10px rgba(45,212,191,0.4)); }
            `}</style>

            <DashboardBackground />

            <motion.div
                variants={containerVariants} initial="initial" animate="animate"
                className="relative z-10 max-w-7xl mx-auto px-6 pt-24 font-tech"
            >

                {/* ── HEADER ── */}
                <motion.div variants={cardVariants} className="flex justify-between items-end mb-12">
                    <div>
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-[11px] font-black tracking-widest uppercase mb-4 shadow-lg">
                            <LayoutDashboard size={14} /> Control_Center_Terminal
                        </div>
                        <h1 className="text-5xl md:text-6xl font-black uppercase tracking-tighter italic leading-none">Pet_<span className="text-teal-400">Analytics</span></h1>
                    </div>
                    <div className="hidden md:flex gap-4 items-center">
                        <div className="text-right border-r border-white/10 pr-6">
                            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Server_Status</p>
                            <p className="text-green-400 text-sm font-black uppercase tracking-tighter mt-1">Operational_v2.6</p>
                        </div>
                        <div className="w-12 h-12 rounded-2xl glass-card flex items-center justify-center border-white/10 shadow-xl">
                            <Search size={20} className="text-slate-400" />
                        </div>
                    </div>
                </motion.div>

                {/* ── STATS CARDS (NEON RUNNING) ── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                    {stats.map((s, i) => (
                        <motion.div
                            key={i} variants={cardVariants} whileHover={{ scale: 1.03, y: -5 }}
                            className="running-border h-44 rounded-[2rem] shadow-2xl"
                            style={{ '--border-color': s.color }}
                        >
                            <div className="card-content p-8 flex flex-col justify-between">
                                <div className="flex justify-between items-start">
                                    <div className="p-3 rounded-2xl bg-white/5 border border-white/10 shadow-inner">
                                        <s.icon size={22} style={{ color: s.color }} />
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-[10px] font-black text-green-400 flex items-center gap-1"><ArrowUpRight size={10} />{s.d}</span>
                                        <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">This_Week</span>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">{s.l}</p>
                                    <h2 className="text-4xl font-black text-white leading-none tracking-tight">{s.v}</h2>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">

                    {/* ── MAIN CHART (HOLOGRAPHIC) ── */}
                    <motion.div variants={cardVariants} className="lg:col-span-8 glass-card p-10 rounded-[3.5rem] relative overflow-hidden border-white/10">
                        <div className="flex justify-between items-center mb-16 relative z-10">
                            <h3 className="text-xl font-black uppercase tracking-widest flex items-center gap-3 italic">
                                <Activity size={20} className="text-teal-400 animate-pulse" /> Neural_Activity_Stream
                            </h3>
                            <div className="flex gap-2">
                                <button className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest hover:bg-teal-500 hover:text-black transition-all">Export_Log</button>
                                <button className="p-2 rounded-xl bg-white/5 border border-white/10"><Filter size={14} /></button>
                            </div>
                        </div>

                        <div className="flex items-end justify-between h-72 gap-4 md:gap-8 px-6 relative z-10">
                            {weekData.map((v, i) => (
                                <div key={i} className="flex-1 flex flex-col items-center group cursor-pointer h-full justify-end">
                                    <div className="text-[10px] font-black text-teal-400 opacity-0 group-hover:opacity-100 transition-opacity mb-2">{v}%</div>
                                    <motion.div
                                        initial={{ height: 0 }} animate={{ height: `${(v / maxV) * 100}%` }}
                                        transition={{ duration: 1.2, delay: 0.5 + i * 0.1, ease: "circOut" }}
                                        className="w-full max-w-[45px] chart-glow rounded-t-2xl relative transition-all group-hover:brightness-125"
                                        style={{ background: `linear-gradient(to top, rgba(45,212,191,0.05), rgba(45,212,191,0.6))` }}
                                    >
                                        <div className="absolute top-0 left-0 w-full h-1 bg-teal-400 rounded-full shadow-[0_0_15px_#2dd4bf]" />
                                    </motion.div>
                                    <span className="mt-8 text-[11px] font-black text-slate-500 group-hover:text-white transition-colors">{days[i]}</span>
                                </div>
                            ))}
                        </div>
                        {/* Background subtle lines */}
                        <div className="absolute inset-x-10 top-40 h-px bg-white/5" />
                        <div className="absolute inset-x-10 top-60 h-px bg-white/5" />
                    </motion.div>

                    {/* ── INSIGHT RING (SYMMETRICAL) ── */}
                    <motion.div variants={cardVariants} className="lg:col-span-4 glass-card p-10 rounded-[3.5rem] flex flex-col items-center justify-center text-center border-white/10">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] mb-12">Average_State</p>
                        <div className="relative mb-12 group cursor-pointer">
                            <div className="w-44 h-44 rounded-full border-[8px] border-teal-500/10 flex items-center justify-center shadow-[0_0_100px_rgba(45,212,191,0.1)] transition-all group-hover:shadow-[0_0_120px_rgba(45,212,191,0.2)]">
                                <div className="flex flex-col items-center">
                                    <span className="text-6xl font-black text-teal-400 leading-none tracking-tighter">78%</span>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-2">Optimal</p>
                                </div>
                            </div>
                            <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none drop-shadow-[0_0_10px_rgba(45,212,191,0.5)]">
                                <circle cx="88" cy="88" r="80" fill="none" stroke="#2dd4bf" strokeWidth="8" strokeDasharray="502" strokeDashoffset={502 * (1 - 0.78)} strokeLinecap="round" />
                            </svg>
                        </div>
                        <p className="text-sm font-body text-slate-400 leading-relaxed max-w-[240px]">
                            Neural frequency analysis indicates <span className="text-white font-bold">Stable Biological States</span> across all active pet units.
                        </p>
                    </motion.div>

                    {/* ── RECENT ACTIVITY ARCHIVE ── */}
                    <motion.div variants={cardVariants} className="lg:col-span-12 glass-card p-12 rounded-[4rem] border-white/10 shadow-2xl relative overflow-hidden">
                        <div className="flex items-center justify-between mb-10 font-tech">
                            <h3 className="text-2xl font-black uppercase tracking-widest flex items-center gap-4 italic text-white">
                                <History size={24} className="text-teal-400" /> Recent_Diagnostics
                            </h3>
                            <div className="text-[10px] font-black text-teal-500/50 uppercase tracking-[0.3em]">Vault_Access_Protocol_01</div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {[
                                { pet: 'Buddy', breed: 'Golden', emo: 'happy', time: '10:45 AM', conf: '92%' },
                                { pet: 'Mochi', breed: 'Persian', emo: 'sad', time: '09:20 AM', conf: '87%' },
                                { pet: 'Luna', breed: 'Shiba', emo: 'angry', time: 'Yesterday', conf: '78%' }
                            ].map((s, i) => {
                                const em = EMO_MAP[s.emo]
                                return (
                                    <motion.div
                                        key={i} whileHover={{ y: -8, backgroundColor: 'rgba(255,255,255,0.03)' }}
                                        className="p-8 rounded-[2.5rem] bg-white/[0.01] border border-white/5 transition-all cursor-pointer group flex flex-col gap-6"
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className={`w-16 h-16 ${em.bg} rounded-2xl flex items-center justify-center text-4xl shadow-inner border border-white/5 group-hover:scale-110 transition-transform duration-500`}>
                                                {em.emoji}
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest mb-1">Processed_Time</p>
                                                <p className="text-sm font-black text-white font-tech">{s.time}</p>
                                            </div>
                                        </div>
                                        <div>
                                            <h4 className="text-2xl font-black uppercase tracking-tighter text-white mb-1">{s.pet}</h4>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">{s.breed} Diagnostic</p>
                                        </div>
                                        <div className="pt-6 border-t border-white/5 flex justify-between items-center">
                                            <div className={`px-3 py-1 rounded-full ${em.bg} text-[9px] font-black uppercase tracking-widest ${em.color}`}>{em.label}</div>
                                            <div className="text-right">
                                                <p className={`text-xl font-black ${em.color} leading-none`}>{s.conf}</p>
                                                <p className="text-[8px] text-slate-600 uppercase font-black tracking-widest mt-1">Confidence</p>
                                            </div>
                                        </div>
                                    </motion.div>
                                )
                            })}
                        </div>
                    </motion.div>
                </div>

                {/* ── FOOTER SIGNATURE ── */}
                <div className="mt-24 text-center opacity-10 flex flex-col items-center gap-6 font-tech tracking-[2em] text-[12px] text-white pb-10 uppercase">
                    <div className="w-px h-24 bg-gradient-to-b from-white/60 to-transparent" />
                    Secure_Node_PetInsight_2026
                </div>
            </motion.div>
        </div>
    )
}