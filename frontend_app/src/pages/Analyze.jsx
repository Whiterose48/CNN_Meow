import { useState, useRef, useEffect, Suspense, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Canvas, useFrame } from '@react-three/fiber'
import { Points, PointMaterial, Stars, PerspectiveCamera, Grid } from '@react-three/drei'
import * as THREE from 'three'
import { Brain, Dog, Stethoscope, Upload, RefreshCcw, Zap, Target, Activity, ShieldAlert, Fingerprint, Info, Camera, LogIn, Layers } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useAnalysis } from '../context/AnalysisContext'
import ErrorBoundary from '../components/ErrorBoundary'

// ─── 1. THREE.JS ANALYSIS BACKGROUND ───
const DataParticles = () => {
    const points = useMemo(() => {
        const p = new Float32Array(800 * 3)
        for (let i = 0; i < 800; i++) {
            p[i * 3] = (Math.random() - 0.5) * 20
            p[i * 3 + 1] = (Math.random() - 0.5) * 20
            p[i * 3 + 2] = (Math.random() - 0.5) * 10
        }
        return p
    }, [])
    const ref = useRef()
    useFrame((state) => { if (ref.current) ref.current.rotation.y = state.clock.getElapsedTime() * 0.05 })
    return (
        <group ref={ref}>
            <Points positions={points}>
                <PointMaterial transparent color="#2dd4bf" size={0.04} sizeAttenuation={true} depthWrite={false} blending={THREE.AdditiveBlending} />
            </Points>
        </group>
    )
}

const AnalysisBackground = () => (
    <div className="fixed inset-0 z-0 bg-[#010409]">
        <ErrorBoundary fallback={<div className="fixed inset-0 bg-[#010409]" />}>
            <Canvas dpr={[1, 1.5]} gl={{ antialias: false, powerPreference: "high-performance" }}>
                <Suspense fallback={null}>
                    <PerspectiveCamera makeDefault position={[0, 0, 10]} fov={50} />
                    <ambientLight intensity={0.2} />
                    <DataParticles />
                    <Grid position={[0, -4, 0]} args={[40, 40]} cellColor="#1e293b" sectionColor="#2dd4bf" sectionOpacity={0.1} cellOpacity={0.05} fadeDistance={25} />
                    <Stars radius={100} depth={50} count={500} factor={4} fade speed={0.5} />
                </Suspense>
            </Canvas>
        </ErrorBoundary>
    </div>
)

// ─── 2. UTILS & DATA ───
const EMO_MAP = {
    happy: { emoji: '😊', label: 'HAPPY', grad: 'from-teal-500 via-emerald-400 to-cyan-500', color: '#2dd4bf', desc: 'ตรวจพบสภาวะจิตใจที่มีความสุขและผ่อนคลาย' },
    angry: { emoji: '😡', label: 'ANGRY', grad: 'from-rose-600 via-red-500 to-orange-600', color: '#fb7185', desc: 'ตรวจพบสัญญาณความเครียดสะสมหรือความโกรธ' },
    sad: { emoji: '😢', label: 'SAD', grad: 'from-blue-600 via-indigo-500 to-cyan-600', color: '#60a5fa', desc: 'ตรวจพบสภาวะซึมเศร้า หรือมีระดับพลังงานต่ำ' },
    other: { emoji: '😐', label: 'NEUTRAL', grad: 'from-slate-500 via-gray-400 to-slate-600', color: '#94a3b8', desc: 'ไม่พบความผันผวนทางอารมณ์ที่รุนแรง' },
}

function Typewriter({ text }) {
    const [displayed, setDisplayed] = useState('')
    useEffect(() => {
        setDisplayed(''); let i = 0;
        const timer = setInterval(() => {
            if (i < text.length) { setDisplayed(p => p + text.charAt(i)); i++ }
            else clearInterval(timer)
        }, 12);
        return () => clearInterval(timer)
    }, [text])
    return <span>{displayed}</span>
}

export default function Analyze({ plan: rawPlan, api, setPage }) {
    const plan = rawPlan || 'free'
    const { user, loginWithGoogle } = useAuth()
    const { addResult } = useAnalysis()
    const [preview, setPrev] = useState(null)
    const [file, setFile] = useState(null)
    const [step, setStep] = useState(-1)
    const [result, setRes] = useState(null)
    const [error, setError] = useState(null)
    const fileRef = useRef()

    const pick = f => {
        if (!f) return; setError(null); setFile(f);
        const r = new FileReader(); r.onload = e => setPrev(e.target.result); r.readAsDataURL(f)
    }

    const reset = () => { setPrev(null); setFile(null); setStep(-1); setRes(null); setError(null) }

    const runAnalysis = async () => {
        if (!file) return;
        setStep(0);
        const fd = new FormData(); fd.append('file', file);
        try {
            const res = await fetch(`${api}/analyze?plan=${plan || 'free'}`, { method: 'POST', body: fd });
            if (!res.ok) throw new Error("Neural Link Failure");
            setStep(1);
            const data = await res.json();
            setRes(data);
            addResult(data, preview);
            setStep(3);
        } catch (err) {
            setError(err.message);
            setStep(-1);
        }
    }

    return (
        <div className="min-h-screen relative font-tech text-white overflow-x-hidden pb-24">
            <style>{`
                .font-tech { font-family: 'Rajdhani', sans-serif; }
                .font-body { font-family: 'Plus Jakarta Sans', sans-serif; }
                body { background-color: #010409; }
                .glass-card { background: rgba(10, 15, 30, 0.85); backdrop-filter: blur(25px); border: 1px solid rgba(255,255,255,0.08); }
                .scan-line { position: absolute; top: 0; left: 0; width: 100%; height: 2px; background: #2dd4bf; box-shadow: 0 0 15px #2dd4bf; animation: scan 2s linear infinite; z-index: 10; }
                @keyframes scan { 0% { top: 0%; } 100% { top: 100%; } }
                .bg-animate { background-size: 200% 200%; animation: grad-flow 4s ease infinite; }
                @keyframes grad-flow { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
                
                .animate-text-flow {
                    background-size: 200% auto;
                    animation: text-flow 3s linear infinite;
                }
                @keyframes text-flow {
                    0% { background-position: 0% 50%; }
                    100% { background-position: 200% 50%; }
                }

                /* ซ่อน Scrollbar สำหรับตัว Step Indicator บนมือถือ */
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>

            <AnalysisBackground />

            <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pt-24 font-tech">

                {/* ── STEP INDICATOR (แก้ไขให้ Responsive) ── */}
                <div className="flex justify-center mb-8 md:mb-12 w-full px-2">
                    <div className="glass-card px-4 sm:px-8 md:px-16 py-3 md:py-5 rounded-full flex items-center gap-2 sm:gap-4 md:gap-6 border-white/5 shadow-2xl overflow-x-auto no-scrollbar max-w-full">
                        {[{ id: -1, l: 'INPUT' }, { id: 0, l: 'SYNC' }, { id: 1, l: 'ANALYSIS' }, { id: 3, l: 'REPORT' }].map((s, i) => (
                            <div key={i} className="flex items-center gap-2 sm:gap-4 md:gap-6 flex-shrink-0">
                                <div className={`flex flex-col items-center transition-all ${step === s.id ? 'opacity-100 scale-105' : 'opacity-30'}`}>
                                    <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-4 md:h-4 rounded-full mb-1 md:mb-1.5 ${step >= s.id ? 'bg-teal-400 shadow-[0_0_10px_#2dd4bf]' : 'bg-white'}`} />
                                    <span className="text-[9px] sm:text-xs md:text-[19px] font-bold tracking-widest uppercase">{s.l}</span>
                                </div>
                                {i < 3 && <div className={`w-4 sm:w-6 md:w-10 h-[2px] md:h-[5px] ${step > s.id ? 'bg-teal-400/40' : 'bg-white/10'}`} />}
                            </div>
                        ))}
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    {/* ── PHASE: UPLOAD ── */}
                    {step === -1 && (
                        <motion.div key="input" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="max-w-xl mx-auto text-center w-full px-2">
                            <h1 className="text-4xl sm:text-5xl md:text-7xl font-black tracking-tight uppercase mb-2 md:mb-3">
                                NEURAL_
                                <br className="sm:hidden" />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-blue-400 to-teal-400 animate-text-flow">SCANNER</span>
                            </h1>
                            <p className="text-slate-400 text-sm sm:text-lg md:text-xl tracking-[0.2em] md:tracking-[0.4em] uppercase font-bold opacity-70 mb-4 md:mb-2">Initiating Subject Data Capture</p>
                            <span className={`inline-block px-3 py-1.5 md:px-4 md:py-1 rounded-full text-[10px] sm:text-sm md:text-[18px] font-black uppercase tracking-widest mb-8 md:mb-10 border ${plan === 'premium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-slate-500/10 text-slate-400 border-slate-500/30'}`}>
                                {plan === 'premium' ? '⚡ PREMIUM PLAN — Emotion + Breed + AI Advice' : '🆓 FREE PLAN — Emotion Analysis Only'}
                            </span>

                            {!user ? (
                                <div className="glass-card p-8 md:p-16 rounded-[2rem] md:rounded-[3rem] border border-teal-500/20 text-center shadow-2xl relative overflow-hidden">
                                    <div className="absolute inset-0 bg-teal-500/5 blur-3xl rounded-full" />
                                    <ShieldAlert size={40} className="text-teal-400 mx-auto mb-4 md:mb-6 relative z-10 w-10 h-10 md:w-[50px] md:h-[50px]" />
                                    <h2 className="text-lg md:text-xl font-black uppercase tracking-widest text-white mb-2 relative z-10">Authentication Required</h2>
                                    <p className="text-xs md:text-sm font-body text-slate-400 mb-6 md:mb-8 relative z-10">Access to the Neural Scanner is restricted. Please authenticate via Google.</p>
                                    <button onClick={loginWithGoogle} className="relative z-10 px-6 sm:px-8 py-3 md:py-4 rounded-full bg-teal-500 text-black text-[10px] md:text-xs font-black uppercase tracking-widest hover:scale-105 transition-all shadow-[0_0_20px_rgba(45,212,191,0.3)] flex items-center justify-center gap-2 md:gap-3 mx-auto cursor-pointer">
                                        <LogIn size={16} /> Authenticate_Now
                                    </button>
                                </div>
                            ) : !preview ? (
                                <div onClick={() => fileRef.current.click()} className="glass-card p-10 md:p-16 rounded-[2rem] md:rounded-[3rem] border border-dashed border-teal-500/20 hover:border-teal-400/50 transition-all text-center cursor-pointer group shadow-2xl">
                                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => pick(e.target.files[0])} />
                                    <Upload size={40} className="text-teal-400 mx-auto mb-4 md:mb-6 group-hover:scale-110 transition-transform w-10 h-10 md:w-[44px] md:h-[44px]" />
                                    <h2 className="text-base md:text-lg font-bold uppercase tracking-widest text-slate-200">Connect Visual Signal</h2>
                                    <p className="text-slate-500 text-xs md:text-[17px] uppercase mt-2">Target_Input_Awaiting</p>
                                    {error && <p className="mt-4 text-rose-500 font-bold text-[10px] md:text-xs uppercase animate-pulse">{error}</p>}
                                </div>
                            ) : (
                                <div className="glass-card p-4 md:p-6 rounded-[2rem] md:rounded-[3rem] border-white/10 shadow-2xl">
                                    <div className="relative rounded-2xl md:rounded-[2rem] overflow-hidden mb-4 md:mb-6 bg-black shadow-inner border border-white/5">
                                        <img src={preview} className="w-full h-48 sm:h-64 md:max-h-[350px] object-contain" alt="Preview" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                                    </div>
                                    <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                                        <button onClick={reset} className="w-full sm:w-auto flex-1 py-3 md:py-4 rounded-xl md:rounded-2xl glass-card hover:bg-white/5 text-xs md:text-[17px] font-bold uppercase tracking-widest transition-all">Reject</button>
                                        <button onClick={runAnalysis} className="w-full sm:w-auto flex-[2] py-3 md:py-4 rounded-xl md:rounded-2xl bg-teal-500 text-black text-xs md:text-[17px] font-black uppercase tracking-widest hover:shadow-[0_0_25px_rgba(45,212,191,0.5)] transition-all">Initialize</button>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* ── PHASE: ANALYZING ── */}
                    {step >= 0 && step < 3 && (
                        <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-sm mx-auto text-center py-6 md:py-10 px-4">
                            <div className="relative aspect-square w-full mb-6 md:mb-10 rounded-[2rem] md:rounded-[3rem] overflow-hidden border border-teal-500/30 shadow-[0_0_60px_rgba(45,212,191,0.2)] bg-black/40">
                                <img src={preview} className="w-full h-full object-cover opacity-30 grayscale blur-[1px]" alt="Processing" />
                                <div className="scan-line" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Activity size={50} className="text-teal-400 opacity-20 animate-pulse md:w-[60px] md:h-[60px]" />
                                </div>
                            </div>
                            <h2 className="text-sm md:text-xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-blue-400 animate-text-flow font-tech">Processing_Neural_Array...</h2>
                            <p className="text-slate-500 text-[8px] md:text-[10px] tracking-[0.3em] md:tracking-[0.5em] uppercase mt-2">Core_Synapse_Active</p>
                        </motion.div>
                    )}

                    {/* ── PHASE: REPORT (SYMMETRICAL & COLORED) ── */}
                    {step === 3 && result && (
                        <motion.div key="report" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 md:space-y-8 font-tech w-full">

                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center flex-wrap gap-4 md:gap-6 border-b border-white/5 pb-4 md:pb-8">
                                <div>
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                        <div className="badge bg-teal-500/10 text-teal-400 border border-teal-500/20 px-3 py-1 rounded-full text-[10px] md:text-[17px] font-black tracking-widest uppercase">Diagnostic_Final_Log</div>
                                        {result.llm_used && (
                                            <div className="badge bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1 rounded-full text-[10px] md:text-[17px] font-black tracking-widest uppercase">⚡ GPT-4o AI</div>
                                        )}
                                        {!result.llm_used && (
                                            <div className="badge bg-slate-500/10 text-slate-400 border border-slate-500/20 px-3 py-1 rounded-full text-[10px] md:text-[17px] font-black tracking-widest uppercase">CNN Only</div>
                                        )}
                                    </div>
                                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white via-teal-300 to-white animate-text-flow">Animal_Neural_Diagnostics</h1>
                                </div>
                                <button onClick={reset} className="w-full sm:w-auto justify-center px-6 md:px-10 py-3 md:py-5 bg-white text-black font-black text-sm md:text-lg rounded-full shadow-[0_0_40px_rgba(255,255,255,0.4)] hover:scale-105 transition-all flex items-center gap-2 md:gap-3 group mt-2 sm:mt-0">
                                    <Camera size={18} className="group-hover:rotate-12 transition-transform md:w-[24px] md:h-[24px]" />
                                    <span>NEW_SCAN_INITIATE</span>
                                </button>
                            </div>

                            <div className={`grid grid-cols-1 ${plan === 'premium' ? 'lg:grid-cols-12' : 'lg:grid-cols-2'} gap-6 items-stretch w-full`}>

                                {/* 1. Visual Capture Cell (WITH EMOTION COLOR) */}
                                {(() => {
                                    const eLabel = (result.emotion?.label || 'other').toLowerCase();
                                    const eCfg = EMO_MAP[eLabel] || EMO_MAP.other;
                                    return (
                                        <div className={`${plan === 'premium' ? 'lg:col-span-4' : 'lg:col-span-1'} glass-card p-4 sm:p-6 rounded-[2rem] md:rounded-[3rem] flex flex-col items-center border-white/5 shadow-2xl relative overflow-hidden h-full w-full`}>
                                            {/* Emotion-Based Inner Glow */}
                                            <div className={`absolute inset-0 bg-gradient-to-br ${eCfg.grad} opacity-5 blur-[80px] pointer-events-none`} />
                                            <div className="relative w-full max-w-sm md:max-w-md mx-auto aspect-[4/5] rounded-[1.5rem] md:rounded-[2rem] overflow-hidden border border-white/10 mb-4 md:mb-6 group z-10 shadow-2xl">
                                                <img src={preview} className="absolute inset-0 w-full h-full object-cover" alt="Captured Subject" />
                                                <div className="absolute top-3 left-3 md:top-4 md:left-4 p-1.5 md:p-2 bg-black/80 rounded-lg text-[8px] md:text-[9px] border border-white/10 uppercase font-black tracking-widest text-teal-400 shadow-xl">Subject_Locked</div>
                                            </div>
                                            <div className="w-full grid grid-cols-2 gap-3 md:gap-4 z-10 mt-auto shrink-0">
                                                <div className="bg-white/5 p-3 md:p-4 rounded-xl md:rounded-2xl text-center border border-white/5"><p className="text-[10px] md:text-[13px] text-slate-500 uppercase font-bold mb-0.5 md:mb-1">Status</p><p className="text-sm sm:text-base md:text-xl font-black text-teal-400 uppercase tracking-widest">Verified</p></div>
                                                <div className="bg-white/5 p-3 md:p-4 rounded-xl md:rounded-2xl text-center border border-white/5"><p className="text-[10px] md:text-[13px] text-slate-500 uppercase font-bold mb-0.5 md:mb-1">Plan</p><p className={`text-sm sm:text-base md:text-xl font-black uppercase tracking-widest ${plan === 'premium' ? 'text-amber-400' : 'text-slate-400'}`}>{plan === 'premium' ? '⚡ PRO' : '🆓 FREE'}</p></div>
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* 2. Emotion Neural Hub (BALANCED) */}
                                {(() => {
                                    const eLabel = (result.emotion?.label || 'other').toLowerCase();
                                    const eCfg = EMO_MAP[eLabel] || EMO_MAP.other;
                                    return (
                                        <div className={`${plan === 'premium' ? 'lg:col-span-8' : 'lg:col-span-1'} glass-card rounded-[2rem] md:rounded-[3rem] overflow-hidden border-t-[8px] md:border-t-8 shadow-2xl flex flex-col h-full w-full`} style={{ borderTopColor: eCfg.color }}>
                                            <div className={`py-10 md:py-16 w-full bg-gradient-to-br ${eCfg.grad} bg-animate flex flex-col items-center justify-center relative shrink-0`}>
                                                <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" />
                                                <motion.span animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 3 }} className="text-[5rem] sm:text-[7rem] md:text-8xl relative z-10 drop-shadow-[0_0_30px_rgba(255,255,255,0.4)] select-none">
                                                    {eCfg.emoji}
                                                </motion.span>
                                                <h3 className="text-3xl sm:text-4xl md:text-5xl font-black text-white relative z-10 uppercase tracking-tighter mt-2 md:mt-4 drop-shadow-2xl">{eCfg.label}</h3>
                                            </div>

                                            <div className="p-6 sm:p-8 md:p-12 flex-grow flex flex-col justify-center">
                                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-8 md:mb-12 border-b border-white/5 pb-6 md:pb-10">
                                                    <div className="border-l-[4px] md:border-l-[6px] border-teal-500/50 pl-4 md:pl-6 w-full sm:w-auto">
                                                        <p className="text-xs md:text-[17px] text-slate-500 uppercase tracking-widest mb-1 md:mb-2 font-black font-tech">Neural_Synapse_State</p>
                                                        <p className="text-slate-200 text-sm md:text-xl font-bold leading-relaxed font-body">"{eCfg.desc}"</p>
                                                    </div>
                                                    <div className="text-left sm:text-right w-full sm:w-auto mt-2 sm:mt-0">
                                                        <p className="text-5xl sm:text-[4rem] md:text-6xl font-black text-teal-400 leading-none drop-shadow-lg">{Math.round((result.emotion?.confidence || 0) * 100)}%</p>
                                                        <p className="text-xs md:text-[15px] text-slate-500 uppercase font-black mt-1 md:mt-2">Accuracy</p>
                                                    </div>
                                                </div>

                                                <div className="space-y-4 md:space-y-6">
                                                    {Object.entries(result.emotion?.all_scores || {}).map(([key, score]) => {
                                                        const cfg = EMO_MAP[key.toLowerCase()] || EMO_MAP.other;
                                                        return (
                                                            <div key={key} className="flex items-center gap-3 md:gap-5 group">
                                                                <span className="text-2xl sm:text-3xl md:text-4xl w-10 md:w-16 text-center transition-transform group-hover:scale-125">{cfg.emoji}</span>
                                                                <div className="flex-1 h-2 md:h-3 bg-white/5 rounded-full overflow-hidden border border-white/10 shadow-[inset_0_0_15px_rgba(0,0,0,0.5)]">
                                                                    <motion.div initial={{ width: 0 }} animate={{ width: score }} transition={{ duration: 1.5, ease: "circOut" }} className={`h-full bg-gradient-to-r ${cfg.grad} bg-animate shadow-[0_0_20px_rgba(255,255,255,0.2)]`} />
                                                                </div>
                                                                <span className="text-xs sm:text-sm md:text-[17px] font-mono w-10 md:w-16 text-right opacity-80 font-black">{score}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* 3. Genomic Signature Box (PREMIUM ONLY) */}
                                {plan === 'premium' && (
                                <div className="lg:col-span-12 glass-card p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] border-white/5 relative overflow-hidden group flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-10">
                                    <div className="absolute top-0 right-0 p-4 md:p-8 opacity-5 group-hover:opacity-10 transition-opacity rotate-12 pointer-events-none"><Fingerprint size={120} className="md:w-[160px] md:h-[160px]" /></div>
                                    <div className="relative z-10 flex-1 w-full">
                                        <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6 text-teal-400">
                                            <Target size={20} className="animate-pulse md:w-[24px] md:h-[24px]" />
                                            <span className="text-[10px] md:text-[14px] font-black uppercase tracking-widest">Genomic_Data</span>
                                        </div>
                                        <h4 className="text-2xl sm:text-3xl md:text-5xl font-black uppercase text-white leading-tight mb-1 md:mb-2 tracking-tight font-tech">{result.breed?.breed || 'UNKNOWN'}</h4>
                                        <p className="text-slate-500 uppercase tracking-[0.2em] md:tracking-[0.3em] text-xs md:text-[15px] font-bold mb-4 md:mb-6">{result.breed?.species || 'DNA_SEQUENCE_N/A'}</p>
                                        {result.breed?.traits && (
                                            <p className="text-slate-300 text-xs sm:text-sm md:text-base font-body leading-relaxed mb-4 md:mb-6 normal-case tracking-normal max-w-4xl">{result.breed.traits}</p>
                                        )}
                                        {result.breed?.top_predictions && (
                                            <div className="mb-4 flex flex-col sm:flex-row flex-wrap gap-2 md:gap-6 text-xs sm:text-sm md:text-base">
                                                <span className="text-slate-500 uppercase font-black">Top Matches:</span>
                                                <div className="flex flex-wrap gap-2 md:gap-4">
                                                {result.breed.top_predictions.map((pred, i) => (
                                                    <span key={i} className="text-slate-200 font-body">
                                                        {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'} {pred}
                                                    </span>
                                                ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="bg-teal-500/10 border border-teal-500/20 p-6 md:p-8 rounded-2xl md:rounded-[2.5rem] shadow-inner text-center shrink-0 min-w-full md:min-w-[250px] lg:min-w-[300px] z-10">
                                        <span className="text-[10px] md:text-[14px] text-teal-400 font-black uppercase tracking-widest mb-1 md:mb-2 block opacity-80">Match_Confidence</span>
                                        <p className="text-2xl md:text-5xl font-black text-white uppercase tracking-tighter">{(() => {
                                            const c = result.breed?.confidence || 'N/A';
                                            if (c === 'high') return '🟢 HIGH';
                                            if (c === 'medium') return '🟡 MEDIUM';
                                            if (c === 'low') return '🔴 LOW';
                                            return c;
                                        })()}</p>
                                    </div>
                                </div>
                                )}

                                {/* 4. Advisory Terminal (PREMIUM = GPT-4o / FREE = fallback advice) */}
                                <div className={`lg:col-span-12 glass-card p-6 md:p-14 rounded-[2rem] md:rounded-[3rem] border-l-[8px] md:border-l-[16px] border-l-teal-500 relative overflow-hidden bg-gradient-to-br from-teal-500/[0.04] to-transparent shadow-2xl w-full`}>
                                    <div className="absolute -top-10 -right-10 p-8 md:p-12 opacity-5 text-white pointer-events-none rotate-12"><ShieldAlert size={120} className="md:w-[200px] md:h-[200px]" /></div>
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 md:gap-6 mb-6 md:mb-10">
                                        <div className="p-3 md:p-5 bg-teal-500/20 rounded-xl md:rounded-[2rem] text-teal-400 shadow-2xl border border-teal-500/20"><Stethoscope size={24} className="md:w-[36px] md:h-[36px]" /></div>
                                        <div>
                                            <h3 className="text-lg sm:text-xl md:text-3xl font-bold uppercase tracking-[0.2em] md:tracking-[0.4em] text-white leading-none">Neural_Advisory_Output</h3>
                                            <p className="text-[10px] md:text-[15px] text-slate-500 uppercase font-black mt-1 md:mt-2 tracking-widest opacity-80">
                                                {plan === 'premium' ? 'GPT-4o // LangChain Vet Agent' : 'Fallback_Mode // CNN Basic Advice'}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div className="text-slate-200 text-xs sm:text-sm md:text-base leading-[1.6] md:leading-[1.8] font-body whitespace-pre-line bg-black/50 p-5 md:p-10 rounded-xl md:rounded-[2rem] border border-white/5 shadow-[inset_0_0_50px_rgba(0,0,0,0.5)] relative z-10">
                                        <Typewriter text={result.advice || 'Extracting neural data artifacts...'} />
                                        <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 0.8 }} className="inline-block w-1.5 md:w-3 h-3 md:h-6 bg-teal-400 align-middle ml-1 md:ml-2 shadow-[0_0_15px_#2dd4bf]" />
                                    </div>
                                    {plan !== 'premium' && (
                                        <div className="mt-6 md:mt-10 text-center">
                                            <button onClick={() => setPage('plans')} className="w-full sm:w-auto px-6 md:px-12 py-3 md:py-5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] md:text-sm font-black uppercase tracking-widest hover:bg-amber-500/20 transition-all cursor-pointer">
                                                ⚡ อัพเกรดเป็น Premium เพื่อรับคำวิเคราะห์จาก GPT-4o + ระบุสายพันธุ์
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}