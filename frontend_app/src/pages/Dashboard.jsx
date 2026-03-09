import { useState, useRef, useMemo, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Canvas, useFrame } from '@react-three/fiber'
import { Stars, PerspectiveCamera, Float, Sphere, MeshDistortMaterial, Grid, Torus, Sparkles } from '@react-three/drei'
import { LayoutDashboard, Activity, Users, ArrowUpRight, History, ShieldAlert, LogIn, Trash2, ScanLine, X, BarChart3 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useAnalysis } from '../context/AnalysisContext'

// ─── 1. THREE.JS BACKGROUND (OPTIMIZED) ───
const GrandNeuralCore = () => {
    const coreRef = useRef()
    const ringsRef = useRef()

    useFrame((state) => {
        const t = state.clock.getElapsedTime()
        if (coreRef.current) {
            coreRef.current.rotation.y = t * 0.15
            coreRef.current.rotation.z = t * 0.1
            coreRef.current.position.y = Math.sin(t * 0.5) * 0.3
        }
        if (ringsRef.current) {
            ringsRef.current.rotation.x = t * 0.1
            ringsRef.current.rotation.y = t * 0.05
            ringsRef.current.rotation.z = t * 0.08
        }
    })

    return (
        <group>
            <Float speed={2} rotationIntensity={0.5} floatIntensity={1.5}>
                <group ref={coreRef}>
                    <Sphere args={[2.0, 32, 32]}>
                        <MeshDistortMaterial color="#0d9488" emissive="#0f766e" emissiveIntensity={2} distort={0.4} speed={3} roughness={0.2} metalness={0.8} transparent opacity={0.6} />
                    </Sphere>
                    <Sphere args={[1.4, 32, 32]}>
                        <meshBasicMaterial color="#5eead4" wireframe transparent opacity={0.15} />
                    </Sphere>
                </group>
            </Float>
            <group ref={ringsRef}>
                <Torus args={[3.8, 0.015, 12, 64]} rotation={[Math.PI / 2, 0, 0]}>
                    <meshStandardMaterial color="#2dd4bf" emissive="#2dd4bf" emissiveIntensity={2} />
                </Torus>
                <Torus args={[4.8, 0.03, 12, 64]} rotation={[0, Math.PI / 3, 0]}>
                    <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={1} transparent opacity={0.4} wireframe />
                </Torus>
                <Torus args={[5.8, 0.01, 12, 64]} rotation={[0, 0, Math.PI / 4]}>
                    <meshStandardMaterial color="#818cf8" emissive="#818cf8" emissiveIntensity={2} />
                </Torus>
            </group>
            <Sparkles count={150} scale={15} size={1.5} speed={0.5} opacity={0.8} color="#5eead4" />
            <Stars radius={80} depth={40} count={1000} factor={3} saturation={1} fade speed={1.5} />
        </group>
    )
}

const DashboardBackground = () => (
    <div className="fixed inset-0 z-0 bg-[#010409]">
        <Canvas dpr={[1, 1.2]} gl={{ antialias: false }} camera={{ position: [0, 0, 15], fov: 45 }}>
            <color attach="background" args={['#010409']} />
            <fog attach="fog" args={['#010409', 10, 35]} />
            <Suspense fallback={null}>
                <ambientLight intensity={0.3} />
                <pointLight position={[10, 10, 10]} intensity={2} color="#2dd4bf" />
                <pointLight position={[-10, -10, -10]} intensity={1} color="#38bdf8" />
                <GrandNeuralCore />
                <Grid position={[0, -6, 0]} args={[50, 50]} cellSize={1} cellThickness={0.5} cellColor="#1e293b" sectionSize={5} sectionThickness={1} sectionColor="#2dd4bf" fadeDistance={30} fadeStrength={1} />
            </Suspense>
        </Canvas>
        <div className="absolute inset-0 bg-gradient-to-t from-[#010409] via-transparent to-[#010409] pointer-events-none" />
        <div className="absolute inset-0 backdrop-blur-[2px] pointer-events-none" />
    </div>
)

// ─── 2. VARIANTS ───
const containerVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.1 } }
}
const cardVariants = {
    initial: { opacity: 0, y: 15, scale: 0.98 },
    animate: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 120, damping: 15 } }
}

// ─── 3. MAIN DASHBOARD ───
export default function Dashboard() {
    const { history, stats, emotionCounts, emotionConfidence, last7DaysActivity, clearHistory, deleteEntry } = useAnalysis()
    const [selectedEntry, setSelectedEntry] = useState(null)
    const { user, loginWithGoogle } = useAuth()

    const chartData = last7DaysActivity
    const maxV = Math.max(...chartData.map(d => d.count), 1)

    const statCards = [
        { l: 'TOTAL_SCANS', v: stats.totalDiagnostics.toLocaleString(), d: `+${Math.min(stats.totalDiagnostics, 99)}`, icon: Activity, color: '#2dd4bf' },
        { l: 'UNIQUE_BREEDS', v: String(stats.uniqueBreeds).padStart(2, '0'), d: `+${stats.uniqueBreeds}`, icon: Users, color: '#fbbf24' },
    ]

    const EMO_MAP = {
        happy: { emoji: '😊', color: 'text-teal-400', bg: 'bg-teal-500/20', hex: '#2dd4bf', label: 'Happy' },
        angry: { emoji: '😡', color: 'text-rose-400', bg: 'bg-rose-500/20', hex: '#fb7185', label: 'Angry' },
        sad: { emoji: '😢', color: 'text-blue-400', bg: 'bg-blue-500/20', hex: '#60a5fa', label: 'Sad' },
        other: { emoji: '😐', color: 'text-slate-400', bg: 'bg-slate-500/20', hex: '#94a3b8', label: 'Other' },
    }

    const dominantEmo = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1])[0]
    const dominantLabel = dominantEmo ? dominantEmo[0] : null
    const dominantCfg = dominantLabel ? (EMO_MAP[dominantLabel] || EMO_MAP.other) : null

    const recentEntries = history.slice(0, 9)

    const formatTime = (iso) => {
        const d = new Date(iso)
        const now = new Date()
        const diffMin = Math.floor((now - d) / 60000)
        if (diffMin < 1) return 'Just now'
        if (diffMin < 60) return `${diffMin}m ago`
        const diffHr = Math.floor(diffMin / 60)
        if (diffHr < 24) return `${diffHr}h ago`
        const diffDay = Math.floor(diffHr / 24)
        if (diffDay === 1) return 'Yesterday'
        return `${diffDay}d ago`
    }

    // ── AUTH GATE ──
    if (!user) {
        return (
            <div className="min-h-screen relative font-body text-white flex items-center justify-center bg-[#010409] px-6 pt-20">
                <DashboardBackground />
                <div className="glass-card p-12 sm:p-16 rounded-[2.5rem] border border-teal-500/20 text-center shadow-2xl relative overflow-hidden z-10 max-w-lg mx-auto w-full">
                    <div className="absolute inset-0 bg-teal-500/5 blur-3xl rounded-full" />
                    <ShieldAlert size={40} className="text-teal-400 mx-auto mb-6 relative z-10" />
                    <h2 className="text-sm sm:text-base font-black uppercase tracking-widest text-white mb-3 relative z-10">Authentication Required</h2>
                    <p className="text-[10px] sm:text-xs font-body text-slate-400 mb-8 relative z-10">กรุณาเข้าสู่ระบบด้วย Google เพื่อเข้าถึง Control Center</p>
                    <button onClick={loginWithGoogle} className="relative z-10 px-8 py-3.5 sm:py-4 rounded-full bg-teal-500 text-black text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-[0_0_20px_rgba(45,212,191,0.3)] flex items-center justify-center gap-3 mx-auto cursor-pointer">
                        <LogIn size={14} /> Authenticate_Now
                    </button>
                    <style>{`.glass-card { background: rgba(10, 15, 30, 0.6); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.06); box-shadow: 0 15px 40px rgba(0,0,0,0.3); }`}</style>
                </div>
            </div>
        )
    }

    // ── MAIN DASHBOARD ──
    return (
        <div className="min-h-screen relative font-body text-white overflow-x-hidden pb-16 sm:pb-24">
            <style>{`
                .font-tech { font-family: 'Rajdhani', sans-serif; }
                .font-body { font-family: 'Plus Jakarta Sans', sans-serif; }
                .glass-card { background: rgba(10, 15, 30, 0.65); backdrop-filter: blur(25px); border: 1px solid rgba(255,255,255,0.08); box-shadow: 0 20px 50px rgba(0,0,0,0.4); }
                .running-border { position: relative; overflow: hidden; }
                .running-border::after {
                    content: ''; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%;
                    background: conic-gradient(transparent, transparent, transparent, var(--border-color));
                    animation: rotate 5s linear infinite;
                }
                .card-content { position: relative; background: rgba(8, 12, 24, 0.9); border-radius: 1.4rem; margin: 1px; height: calc(100% - 2px); width: calc(100% - 2px); z-index: 10; }
                @media (min-width: 640px) { .card-content { border-radius: 1.9rem; } }
                @keyframes rotate { 100% { transform: rotate(360deg); } }
                .chart-glow { filter: drop-shadow(0 0 10px rgba(45,212,191,0.3)); }
                
                .animate-text-glow {
                    background-size: 200% auto;
                    animation: text-glow-flow 3s linear infinite;
                }
                @keyframes text-glow-flow {
                    0% { background-position: 0% 50%; }
                    100% { background-position: 200% 50%; }
                }
            `}</style>

            <DashboardBackground />

            {/* เพิ่ม max-w-6xl และ px-6 sm:px-10 เพื่อสร้างพื้นที่ขอบจอให้กว้างขึ้น */}
            <motion.div
                variants={containerVariants} initial="initial" animate="animate"
                className="relative z-10 max-w-6xl mx-auto px-6 sm:px-10 pt-28 md:pt-32 font-tech"
            >
                {/* ── HEADER ── */}
                <motion.div variants={cardVariants} className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-6 mb-12 sm:mb-16">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-[9px] sm:text-[10px] font-black tracking-widest uppercase mb-4 shadow-md">
                            <LayoutDashboard size={12} /> Control_Center
                        </div>
                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tighter leading-none">
                            Pet_
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-300 via-blue-400 to-teal-300 animate-text-glow">
                                Analytics
                            </span>
                        </h1>
                    </div>
                    <div className="hidden sm:flex gap-5 items-center">
                        <div className="text-right border-r border-white/10 pr-5">
                            <p className="text-slate-500 text-[8px] font-bold uppercase tracking-widest">Status</p>
                            <p className="text-green-400 text-xs font-black uppercase tracking-tighter mt-1">Online_v2.6</p>
                        </div>
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl glass-card flex items-center justify-center border-white/10 shadow-md">
                            <ScanLine size={16} className="text-teal-400 animate-pulse" />
                        </div>
                    </div>
                </motion.div>

                {/* ── STATS CARDS ── */}
                {/* ขยาย gap เป็น 6 หรือ 8 ให้มีช่องว่างระหว่างกล่อง */}
                <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:gap-8 mb-8 sm:mb-12">
                    {statCards.map((s, i) => (
                        <motion.div
                            key={i} variants={cardVariants} whileHover={{ scale: 1.02, y: -2 }}
                            className="running-border h-32 sm:h-36 lg:h-40 rounded-[1.5rem] sm:rounded-[2rem] shadow-xl"
                            style={{ '--border-color': s.color }}
                        >
                            {/* เพิ่ม Padding ในการ์ด p-6 sm:p-8 */}
                            <div className="card-content p-5 sm:p-8 flex flex-col justify-between h-full">
                                <div className="flex justify-between items-start">
                                    <div className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-white/5 border border-white/10 shadow-inner">
                                        <s.icon size={14} className="sm:w-[16px] sm:h-[16px]" style={{ color: s.color }} />
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-[8px] sm:text-[9px] font-black text-green-400 flex items-center gap-1"><ArrowUpRight size={10} />{s.d}</span>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[7px] sm:text-[8px] text-slate-500 font-black uppercase tracking-widest mb-1 truncate">{s.l}</p>
                                    <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white leading-none tracking-tight">{s.v}</h2>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* ── CHART + INSIGHT RING ROW ── */}
                {/* ขยาย Grid Gap เป็น gap-6 lg:gap-8 */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-8 items-stretch mb-8 sm:mb-12">

                    {/* ── ACTIVITY CHART ── */}
                    {/* เพิ่ม Padding p-6 sm:p-10 */}
                    <motion.div variants={cardVariants} className="lg:col-span-8 glass-card p-6 sm:p-10 rounded-[2rem] relative overflow-hidden flex flex-col">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8 sm:mb-12 relative z-10">
                            <h3 className="text-xs sm:text-sm lg:text-base font-black uppercase tracking-widest flex items-center gap-2 sm:gap-3 text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 animate-text-glow">
                                <Activity size={14} className="text-teal-400 animate-pulse" /> Activity_Stream
                            </h3>
                            <div className="flex gap-2">
                                <button onClick={clearHistory} className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-[8px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer">
                                    <Trash2 size={10} /> Clear
                                </button>
                            </div>
                        </div>

                        {history.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center min-h-[150px] sm:min-h-[200px] text-center relative z-10">
                                <Activity size={24} className="text-slate-600 mb-4" />
                                <p className="text-slate-500 text-[9px] sm:text-[10px] font-black uppercase tracking-widest">No_Data_Recorded</p>
                                <p className="text-slate-600 text-[8px] mt-2">ไปสแกนที่หน้า Analyze แล้วข้อมูลจะแสดงที่นี่อัตโนมัติ</p>
                            </div>
                        ) : (
                            <div className="flex-1 flex items-end justify-between min-h-[150px] sm:min-h-[200px] gap-2 sm:gap-4 px-2 relative z-10">
                                {chartData.map((d, i) => (
                                    <div key={i} className="flex-1 flex flex-col items-center group cursor-pointer h-full justify-end min-w-0">
                                        <div className="text-[7px] sm:text-[8px] font-black text-teal-400 opacity-0 group-hover:opacity-100 transition-opacity mb-2">{d.count}</div>
                                        <motion.div
                                            initial={{ height: 0 }} animate={{ height: d.count > 0 ? `${(d.count / maxV) * 100}%` : '3%' }}
                                            transition={{ duration: 1.2, delay: 0.3 + i * 0.1, ease: "circOut" }}
                                            className={`w-full max-w-[20px] sm:max-w-[30px] chart-glow rounded-t-lg sm:rounded-t-xl relative transition-all group-hover:brightness-125 ${d.count === 0 ? 'opacity-20' : ''}`}
                                            style={{ background: `linear-gradient(to top, rgba(45,212,191,0.05), rgba(45,212,191,0.6))` }}
                                        >
                                            {d.count > 0 && <div className="absolute top-0 left-0 w-full h-[2px] bg-teal-400 rounded-full shadow-[0_0_10px_#2dd4bf]" />}
                                        </motion.div>
                                        <span className="mt-4 text-[7px] sm:text-[8px] font-black text-slate-500 group-hover:text-white transition-colors uppercase tracking-widest">{d.day}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="absolute inset-x-6 sm:inset-x-10 top-1/2 h-px bg-white/5" />
                    </motion.div>

                    {/* ── EMOTION CONFIDENCE PANEL ── */}
                    {/* เพิ่ม Padding p-6 sm:p-10 */}
                    <motion.div variants={cardVariants} className="lg:col-span-4 glass-card p-6 sm:p-10 rounded-[2rem] flex flex-col border-white/10">
                        <p className="text-[8px] sm:text-[9px] font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-200 to-blue-300 animate-text-glow uppercase tracking-[0.3em] mb-8 flex items-center gap-2">
                            <BarChart3 size={12} className="text-teal-400" /> Emotion_Confidence
                        </p>

                        {history.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center">
                                <BarChart3 size={24} className="text-slate-600 mb-4" />
                                <p className="text-[9px] sm:text-[10px] font-body text-slate-400 leading-relaxed max-w-[180px]">
                                    ยังไม่มีข้อมูล — <span className="text-white font-bold">สแกนรูปสัตว์</span> เพื่อดูค่า
                                </p>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col justify-between gap-6 sm:gap-8">
                                {/* Per-emotion bars */}
                                <div className="space-y-4 sm:space-y-5">
                                    {['happy', 'angry', 'sad', 'other'].map(emo => {
                                        const cfg = EMO_MAP[emo]
                                        const conf = emotionConfidence[emo] || 0
                                        const count = emotionCounts[emo] || 0
                                        if (count === 0) return null
                                        return (
                                            <div key={emo}>
                                                <div className="flex justify-between items-center mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs sm:text-sm">{cfg.emoji}</span>
                                                        <span className={`text-[7px] sm:text-[8px] font-black uppercase tracking-widest ${cfg.color}`}>{cfg.label}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[7px] text-slate-500 font-bold">{count} scans</span>
                                                        <span className={`text-[10px] sm:text-xs font-black ${cfg.color}`}>{conf}%</span>
                                                    </div>
                                                </div>
                                                <div className="h-1.5 sm:h-2 bg-white/5 rounded-full overflow-hidden">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${conf}%` }}
                                                        transition={{ duration: 1.2, delay: 0.2, ease: 'circOut' }}
                                                        className="h-full rounded-full"
                                                        style={{ background: `linear-gradient(to right, ${cfg.hex}40, ${cfg.hex})`, boxShadow: `0 0 8px ${cfg.hex}60` }}
                                                    />
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>

                                {/* Dominant emotion summary */}
                                {dominantCfg && (
                                    <div className="pt-5 border-t border-white/5">
                                        <p className="text-[7px] sm:text-[8px] text-slate-500 uppercase tracking-widest font-black mb-3">Dominant_Emotion</p>
                                        <div className="flex items-center gap-4">
                                            <div className={`${dominantCfg.bg} w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-xl sm:text-2xl`}>
                                                {dominantCfg.emoji}
                                            </div>
                                            <div>
                                                <p className={`text-xs sm:text-sm font-black uppercase tracking-widest ${dominantCfg.color}`}>{dominantCfg.label}</p>
                                                <p className="text-[7px] sm:text-[8px] text-slate-500 font-bold mt-1">{emotionConfidence[dominantLabel] || 0}% avg · {emotionCounts[dominantLabel] || 0} scans</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </motion.div>
                </div>

                {/* ── RECENT DIAGNOSTICS ── */}
                {/* เพิ่ม Padding p-6 sm:p-10 lg:p-12 */}
                <motion.div variants={cardVariants} className="glass-card p-6 sm:p-10 lg:p-12 rounded-[2rem] sm:rounded-[2.5rem] border-white/10 shadow-xl relative overflow-hidden">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 sm:mb-10 font-tech">
                        <h3 className="text-xs sm:text-sm lg:text-base font-black uppercase tracking-widest flex items-center gap-3 text-transparent bg-clip-text bg-gradient-to-r from-teal-200 via-blue-300 to-teal-200 animate-text-glow">
                            <History size={16} className="text-teal-400" /> Recent_Diagnostics
                        </h3>
                        <div className="text-[8px] font-black text-teal-500/50 uppercase tracking-[0.3em] bg-teal-500/10 px-3 py-1.5 rounded-full">
                            {history.length > 0 ? `${history.length} Records` : 'No_Records'}
                        </div>
                    </div>

                    {recentEntries.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 sm:py-20 text-center">
                            <History size={28} className="text-slate-600 mb-4" />
                            <p className="text-slate-500 text-[9px] sm:text-[10px] font-black uppercase tracking-widest">Archive_Empty</p>
                            <p className="text-slate-600 text-[8px] sm:text-[9px] mt-2 font-body">ไปที่หน้า Analyze เพื่อสแกนรูปสัตว์เลี้ยง</p>
                        </div>
                    ) : (
                        /* ขยาย gap ของ Item ข้างในเป็น gap-4 sm:gap-6 */
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
                            {recentEntries.map((entry) => {
                                const emoLabel = (entry.emotion?.label || 'other').toLowerCase()
                                const em = EMO_MAP[emoLabel] || EMO_MAP.other
                                const breedName = entry.breed?.breed || 'Unknown'
                                const conf = entry.emotion?.confidence ? Math.round(entry.emotion.confidence * 100) + '%' : 'N/A'
                                const isOpen = selectedEntry?.id === entry.id
                                return (
                                    <motion.div
                                        key={entry.id}
                                        whileHover={{ y: -4, backgroundColor: 'rgba(255,255,255,0.03)' }}
                                        /* Item Card padding p-5 sm:p-6 */
                                        className="p-5 sm:p-6 rounded-xl sm:rounded-[1.5rem] bg-white/[0.01] border border-white/5 transition-all cursor-pointer group flex flex-col gap-5 relative"
                                        onClick={() => setSelectedEntry(isOpen ? null : entry)}
                                    >
                                        {/* Delete button */}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); deleteEntry(entry.id) }}
                                            className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-500 hover:bg-rose-500/20 hover:text-rose-400 hover:border-rose-500/30 transition-all opacity-0 group-hover:opacity-100 z-20 cursor-pointer"
                                            title="ลบรายการนี้"
                                        >
                                            <X size={12} />
                                        </button>

                                        {/* Row 1: Image + Time */}
                                        <div className="flex justify-between items-start gap-4">
                                            {entry.image ? (
                                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl overflow-hidden border border-white/10 shadow-inner flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
                                                    <img src={entry.image} alt="" className="w-full h-full object-cover" />
                                                </div>
                                            ) : (
                                                <div className={`w-10 h-10 sm:w-12 sm:h-12 ${em.bg} rounded-lg sm:rounded-xl flex items-center justify-center text-xl sm:text-2xl shadow-inner border border-white/5 flex-shrink-0 group-hover:scale-105 transition-transform duration-300`}>
                                                    {em.emoji}
                                                </div>
                                            )}
                                            <div className="text-right min-w-0">
                                                <p className="text-[7px] text-slate-500 uppercase font-black tracking-widest mb-1">Time</p>
                                                <p className="text-[9px] sm:text-[10px] font-black text-white font-tech truncate">{formatTime(entry.timestamp)}</p>
                                            </div>
                                        </div>

                                        {/* Row 2: Breed + Species */}
                                        <div className="min-w-0">
                                            <h4 className="text-sm sm:text-base font-black uppercase tracking-tight text-white mb-1 truncate">{breedName}</h4>
                                            <p className="text-[7px] sm:text-[8px] text-slate-400 font-bold uppercase tracking-widest truncate">{entry.breed?.species || 'Species_Unknown'}</p>
                                        </div>

                                        {/* Row 3: Emotion + Confidence */}
                                        <div className="pt-4 border-t border-white/5 flex justify-between items-center">
                                            <div className={`px-2.5 py-1 rounded-full ${em.bg} text-[7px] sm:text-[8px] font-black uppercase tracking-widest ${em.color} flex-shrink-0`}>
                                                {em.emoji} {em.label}
                                            </div>
                                            <div className="text-right">
                                                <p className={`text-xs sm:text-sm font-black ${em.color} leading-none`}>{conf}</p>
                                                <p className="text-[6px] sm:text-[7px] text-slate-600 uppercase font-black tracking-widest mt-1">Confidence</p>
                                            </div>
                                        </div>

                                        {/* Expanded detail */}
                                        <AnimatePresence>
                                            {isOpen && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="pt-4 border-t border-white/5 space-y-3">
                                                        {entry.breed?.top_predictions && (
                                                            <div>
                                                                <p className="text-[7px] sm:text-[8px] text-slate-500 uppercase tracking-widest font-black mb-1.5">Top_Matches</p>
                                                                {entry.breed.top_predictions.map((pred, j) => (
                                                                    <p key={j} className="text-slate-400 text-[8px] sm:text-[9px] font-body truncate mb-0.5">
                                                                        {j === 0 ? '🥇' : j === 1 ? '🥈' : '🥉'} {pred}
                                                                    </p>
                                                                ))}
                                                            </div>
                                                        )}
                                                        {entry.emotion?.all_scores && (
                                                            <div>
                                                                <p className="text-[7px] sm:text-[8px] text-slate-500 uppercase tracking-widest font-black mb-1.5">Emotion_Scores</p>
                                                                {Object.entries(entry.emotion.all_scores).map(([key, score]) => {
                                                                    const cfg = EMO_MAP[key.toLowerCase()] || EMO_MAP.other
                                                                    return (
                                                                        <div key={key} className="flex items-center gap-2 mb-1.5">
                                                                            <span className="text-[10px] sm:text-xs">{cfg.emoji}</span>
                                                                            <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                                                <div className="h-full bg-teal-400/60 rounded-full" style={{ width: score }} />
                                                                            </div>
                                                                            <span className="text-[7px] sm:text-[8px] text-slate-500 font-mono w-8 text-right">{score}</span>
                                                                        </div>
                                                                    )
                                                                })}
                                                            </div>
                                                        )}
                                                        {entry.advice && (
                                                            <div>
                                                                <p className="text-[7px] sm:text-[8px] text-slate-500 uppercase tracking-widest font-black mb-1.5">Advisory</p>
                                                                <p className="text-slate-400 text-[8px] sm:text-[9px] font-body leading-relaxed line-clamp-3">{entry.advice}</p>
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
            </motion.div>
        </div>
    )
}