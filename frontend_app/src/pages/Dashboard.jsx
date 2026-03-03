import { useState, useRef, useMemo, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Canvas, useFrame } from '@react-three/fiber'
import { Points, PointMaterial, Stars, PerspectiveCamera, Float, Sphere, MeshDistortMaterial, Grid, Torus, Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import { LayoutDashboard, Activity, Users, Heart, AlertCircle, ArrowUpRight, History, Search, Filter, ShieldAlert, LogIn, Trash2, Eye } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useAnalysis } from '../context/AnalysisContext'

// ─── 1. THREE.JS GRAND NEURAL CORE (SPECTACULAR 3D BACKGROUND) ───
const GrandNeuralCore = () => {
    const coreRef = useRef()
    const ringsRef = useRef()

    useFrame((state) => {
        const t = state.clock.getElapsedTime()
        
        // หมุนแกนกลางและทำให้ขยับขึ้นลงแบบมีชีวิต
        if (coreRef.current) {
            coreRef.current.rotation.y = t * 0.15
            coreRef.current.rotation.z = t * 0.1
            coreRef.current.position.y = Math.sin(t * 0.5) * 0.3
        }
        
        // หมุนวงแหวน Gyroscope สลับแกน
        if (ringsRef.current) {
            ringsRef.current.rotation.x = t * 0.1
            ringsRef.current.rotation.y = t * 0.05
            ringsRef.current.rotation.z = t * 0.08
        }
    })

    return (
        <group>
            {/* 1. Massive Energy Core */}
            <Float speed={2} rotationIntensity={0.5} floatIntensity={1.5}>
                <group ref={coreRef}>
                    {/* Outer Distorted Energy */}
                    <Sphere args={[2.5, 32, 32]}>
                        <MeshDistortMaterial 
                            color="#0d9488" 
                            emissive="#0f766e" 
                            emissiveIntensity={2} 
                            distort={0.4} 
                            speed={3} 
                            roughness={0.2} 
                            metalness={0.8} 
                            transparent 
                            opacity={0.6}
                        />
                    </Sphere>
                    {/* Inner Wireframe Core */}
                    <Sphere args={[1.8, 32, 32]}>
                        <meshBasicMaterial color="#5eead4" wireframe transparent opacity={0.15} />
                    </Sphere>
                </group>
            </Float>

            {/* 2. Quantum Gyroscope Rings */}
            <group ref={ringsRef}>
                <Torus args={[4.5, 0.015, 12, 64]} rotation={[Math.PI / 2, 0, 0]}>
                    <meshStandardMaterial color="#2dd4bf" emissive="#2dd4bf" emissiveIntensity={2} />
                </Torus>
                <Torus args={[5.5, 0.03, 12, 64]} rotation={[0, Math.PI / 3, 0]}>
                    <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={1} transparent opacity={0.4} wireframe />
                </Torus>
                <Torus args={[6.8, 0.01, 12, 64]} rotation={[0, 0, Math.PI / 4]}>
                    <meshStandardMaterial color="#818cf8" emissive="#818cf8" emissiveIntensity={2} />
                </Torus>
            </group>

            {/* 3. Infinite Data Particles (ละอองแสง) */}
            <Sparkles count={200} scale={20} size={2} speed={0.5} opacity={0.8} color="#5eead4" />
            <Sparkles count={100} scale={30} size={4} speed={1} opacity={0.4} color="#38bdf8" />
            
            {/* Deep Space Stars */}
            <Stars radius={100} depth={50} count={1500} factor={4} saturation={1} fade speed={1.5} />
        </group>
    )
}

const DashboardBackground = () => (
    <div className="fixed inset-0 z-0 bg-[#010409]">
        <Canvas dpr={[1, 1.5]} gl={{ antialias: false }} camera={{ position: [0, 0, 15], fov: 45 }}>
            <color attach="background" args={['#010409']} />
            {/* ใส่ Fog ให้กลืนไปกับความมืด */}
            <fog attach="fog" args={['#010409', 10, 35]} />
            <Suspense fallback={null}>
                <ambientLight intensity={0.3} />
                <pointLight position={[10, 10, 10]} intensity={2} color="#2dd4bf" />
                <pointLight position={[-10, -10, -10]} intensity={1} color="#38bdf8" />
                
                <GrandNeuralCore />
                
                {/* Holographic Floor Grid */}
                <Grid 
                    position={[0, -6, 0]} 
                    args={[60, 60]} 
                    cellSize={1} 
                    cellThickness={0.5} 
                    cellColor="#1e293b" 
                    sectionSize={5} 
                    sectionThickness={1} 
                    sectionColor="#2dd4bf" 
                    fadeDistance={35} 
                    fadeStrength={1}
                />
            </Suspense>
        </Canvas>

        {/* เลเยอร์ Gradient และ Blur Glass เพื่อให้ UI อ่านง่าย */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#010409] via-transparent to-[#010409] pointer-events-none" />
        <div className="absolute inset-0 backdrop-blur-[2px] pointer-events-none" />
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
    const { history, stats, emotionCounts, last7DaysActivity, clearHistory } = useAnalysis()
    const [selectedEntry, setSelectedEntry] = useState(null)

    // Chart data from real analysis history
    const chartData = last7DaysActivity
    const maxV = Math.max(...chartData.map(d => d.count), 1)

    const statCards = [
        { l: 'TOTAL_DIAGNOSTICS', v: stats.totalDiagnostics.toLocaleString(), d: `+${Math.min(stats.totalDiagnostics, 99)}`, icon: Activity, color: '#2dd4bf' },
        { l: 'UNIQUE_BREEDS', v: String(stats.uniqueBreeds).padStart(2, '0'), d: `+${stats.uniqueBreeds}`, icon: Users, color: '#fbbf24' },
        { l: 'AVG_ACCURACY', v: `${stats.avgAccuracy}%`, d: stats.avgAccuracy > 50 ? '+' + stats.avgAccuracy + '%' : '—', icon: Heart, color: '#f472b6' },
        { l: 'ALERT_NODES', v: String(stats.alertCount).padStart(2, '0'), d: stats.alertCount > 0 ? `${stats.alertCount}` : '0', icon: AlertCircle, color: '#f87171' },
    ]

    const EMO_MAP = {
        happy: { emoji: '😊', color: 'text-teal-400', bg: 'bg-teal-500/20', label: 'Stable' },
        angry: { emoji: '😡', color: 'text-rose-400', bg: 'bg-rose-500/20', label: 'Stressed' },
        sad: { emoji: '😢', color: 'text-blue-400', bg: 'bg-blue-500/20', label: 'Low Energy' },
        other: { emoji: '😐', color: 'text-slate-400', bg: 'bg-slate-500/20', label: 'Neutral' },
    }

    // Average emotion for the insight ring
    const avgAcc = stats.avgAccuracy
    const dominantEmo = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1])[0]
    const dominantLabel = dominantEmo ? dominantEmo[0] : null
    const dominantCfg = dominantLabel ? (EMO_MAP[dominantLabel] || EMO_MAP.other) : null

    // Recent entries (last 6)
    const recentEntries = history.slice(0, 6)

    // Format time
    const formatTime = (iso) => {
        const d = new Date(iso)
        const now = new Date()
        const diffMs = now - d
        const diffMin = Math.floor(diffMs / 60000)
        if (diffMin < 1) return 'Just now'
        if (diffMin < 60) return `${diffMin}m ago`
        const diffHr = Math.floor(diffMin / 60)
        if (diffHr < 24) return `${diffHr}h ago`
        const diffDay = Math.floor(diffHr / 24)
        if (diffDay === 1) return 'Yesterday'
        return `${diffDay}d ago`
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
                    {statCards.map((s, i) => (
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
                                <button onClick={clearHistory} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all flex items-center gap-2">
                                    <Trash2 size={12} /> Clear_All
                                </button>
                                <button className="p-2 rounded-xl bg-white/5 border border-white/10"><Filter size={14} /></button>
                            </div>
                        </div>

                        {history.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-72 text-center relative z-10">
                                <Activity size={48} className="text-slate-600 mb-4" />
                                <p className="text-slate-500 text-sm font-black uppercase tracking-widest">No_Data_Recorded</p>
                                <p className="text-slate-600 text-xs mt-2">Analyze images to populate the Neural Activity Stream</p>
                            </div>
                        ) : (
                            <div className="flex items-end justify-between h-72 gap-4 md:gap-8 px-6 relative z-10">
                                {chartData.map((d, i) => (
                                    <div key={i} className="flex-1 flex flex-col items-center group cursor-pointer h-full justify-end">
                                        <div className="text-[10px] font-black text-teal-400 opacity-0 group-hover:opacity-100 transition-opacity mb-2">{d.count}</div>
                                        <motion.div
                                            initial={{ height: 0 }} animate={{ height: d.count > 0 ? `${(d.count / maxV) * 100}%` : '2%' }}
                                            transition={{ duration: 1.2, delay: 0.5 + i * 0.1, ease: "circOut" }}
                                            className={`w-full max-w-[45px] chart-glow rounded-t-2xl relative transition-all group-hover:brightness-125 ${d.count === 0 ? 'opacity-20' : ''}`}
                                            style={{ background: `linear-gradient(to top, rgba(45,212,191,0.05), rgba(45,212,191,0.6))` }}
                                        >
                                            {d.count > 0 && <div className="absolute top-0 left-0 w-full h-1 bg-teal-400 rounded-full shadow-[0_0_15px_#2dd4bf]" />}
                                        </motion.div>
                                        <span className="mt-8 text-[11px] font-black text-slate-500 group-hover:text-white transition-colors">{d.day}</span>
                                    </div>
                                ))}
                            </div>
                        )}
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
                                    <span className="text-6xl font-black text-teal-400 leading-none tracking-tighter">{avgAcc}%</span>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-2">
                                        {history.length === 0 ? 'Awaiting' : avgAcc >= 70 ? 'Optimal' : avgAcc >= 40 ? 'Moderate' : 'Low'}
                                    </p>
                                </div>
                            </div>
                            <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none drop-shadow-[0_0_10px_rgba(45,212,191,0.5)]">
                                <circle cx="88" cy="88" r="80" fill="none" stroke="#2dd4bf" strokeWidth="8" strokeDasharray="502" strokeDashoffset={502 * (1 - avgAcc / 100)} strokeLinecap="round" />
                            </svg>
                        </div>
                        {history.length === 0 ? (
                            <p className="text-sm font-body text-slate-400 leading-relaxed max-w-[240px]">
                                No analysis data yet. <span className="text-white font-bold">Upload images</span> to see insights here.
                            </p>
                        ) : (
                            <div className="w-full space-y-3">
                                {dominantCfg && (
                                    <p className="text-sm font-body text-slate-400 leading-relaxed">
                                        Dominant emotion: <span className={`font-bold ${dominantCfg.color}`}>{dominantCfg.emoji} {dominantCfg.label}</span>
                                    </p>
                                )}
                                <div className="flex flex-wrap justify-center gap-2">
                                    {Object.entries(emotionCounts).map(([emo, count]) => {
                                        const cfg = EMO_MAP[emo] || EMO_MAP.other
                                        return (
                                            <div key={emo} className={`${cfg.bg} px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${cfg.color}`}>
                                                {cfg.emoji} {count}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                    </motion.div>

                    {/* ── RECENT ACTIVITY ARCHIVE ── */}
                    <motion.div variants={cardVariants} className="lg:col-span-12 glass-card p-12 rounded-[4rem] border-white/10 shadow-2xl relative overflow-hidden">
                        <div className="flex items-center justify-between mb-10 font-tech">
                            <h3 className="text-2xl font-black uppercase tracking-widest flex items-center gap-4 italic text-white">
                                <History size={24} className="text-teal-400" /> Recent_Diagnostics
                            </h3>
                            <div className="text-[10px] font-black text-teal-500/50 uppercase tracking-[0.3em]">
                                {history.length > 0 ? `${history.length} Records` : 'No_Records'}
                            </div>
                        </div>

                        {recentEntries.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <History size={48} className="text-slate-600 mb-4" />
                                <p className="text-slate-500 text-sm font-black uppercase tracking-widest">Archive_Empty</p>
                                <p className="text-slate-600 text-xs mt-2 font-body">ไปที่หน้า Analyze เพื่ออัปโหลดรูปสัตว์เลี้ยง ผลจะแสดงที่นี่อัตโนมัติ</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {recentEntries.map((entry, i) => {
                                    const emoLabel = (entry.emotion?.label || 'other').toLowerCase()
                                    const em = EMO_MAP[emoLabel] || EMO_MAP.other
                                    const breedName = entry.breed?.breed || 'Unknown'
                                    const conf = entry.emotion?.confidence ? Math.round(entry.emotion.confidence * 100) + '%' : 'N/A'
                                    return (
                                        <motion.div
                                            key={entry.id} whileHover={{ y: -8, backgroundColor: 'rgba(255,255,255,0.03)' }}
                                            className="p-8 rounded-[2.5rem] bg-white/[0.01] border border-white/5 transition-all cursor-pointer group flex flex-col gap-6"
                                            onClick={() => setSelectedEntry(selectedEntry?.id === entry.id ? null : entry)}
                                        >
                                            <div className="flex justify-between items-start">
                                                {entry.image ? (
                                                    <div className="w-16 h-16 rounded-2xl overflow-hidden border border-white/10 shadow-inner group-hover:scale-110 transition-transform duration-500">
                                                        <img src={entry.image} alt="" className="w-full h-full object-cover" />
                                                    </div>
                                                ) : (
                                                    <div className={`w-16 h-16 ${em.bg} rounded-2xl flex items-center justify-center text-4xl shadow-inner border border-white/5 group-hover:scale-110 transition-transform duration-500`}>
                                                        {em.emoji}
                                                    </div>
                                                )}
                                                <div className="text-right">
                                                    <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest mb-1">Processed_Time</p>
                                                    <p className="text-sm font-black text-white font-tech">{formatTime(entry.timestamp)}</p>
                                                </div>
                                            </div>
                                            <div>
                                                <h4 className="text-2xl font-black uppercase tracking-tighter text-white mb-1">{breedName}</h4>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">{entry.breed?.species || 'Species_Unknown'}</p>
                                            </div>
                                            <div className="pt-6 border-t border-white/5 flex justify-between items-center">
                                                <div className={`px-3 py-1 rounded-full ${em.bg} text-[9px] font-black uppercase tracking-widest ${em.color}`}>{em.emoji} {em.label}</div>
                                                <div className="text-right">
                                                    <p className={`text-xl font-black ${em.color} leading-none`}>{conf}</p>
                                                    <p className="text-[8px] text-slate-600 uppercase font-black tracking-widest mt-1">Confidence</p>
                                                </div>
                                            </div>

                                            {/* Expanded detail */}
                                            <AnimatePresence>
                                                {selectedEntry?.id === entry.id && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        className="overflow-hidden"
                                                    >
                                                        <div className="pt-4 border-t border-white/5 space-y-3">
                                                            {entry.breed?.top_predictions && (
                                                                <div>
                                                                    <p className="text-[9px] text-slate-500 uppercase tracking-widest font-black mb-1">Top_Matches</p>
                                                                    {entry.breed.top_predictions.map((pred, j) => (
                                                                        <p key={j} className="text-slate-400 text-[11px] font-body">
                                                                            {j === 0 ? '🥇' : j === 1 ? '🥈' : '🥉'} {pred}
                                                                        </p>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            {entry.emotion?.all_scores && (
                                                                <div>
                                                                    <p className="text-[9px] text-slate-500 uppercase tracking-widest font-black mb-1">Emotion_Scores</p>
                                                                    {Object.entries(entry.emotion.all_scores).map(([key, score]) => {
                                                                        const cfg = EMO_MAP[key.toLowerCase()] || EMO_MAP.other
                                                                        return (
                                                                            <div key={key} className="flex items-center gap-2 mb-1">
                                                                                <span className="text-sm">{cfg.emoji}</span>
                                                                                <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                                                    <div className="h-full bg-teal-400/60 rounded-full" style={{ width: score }} />
                                                                                </div>
                                                                                <span className="text-[10px] text-slate-500 font-mono w-10 text-right">{score}</span>
                                                                            </div>
                                                                        )
                                                                    })}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </motion.div>
                                    )
                                })}
                            </div>
                        )}
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