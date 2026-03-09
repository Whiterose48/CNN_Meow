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
        const p = new Float32Array(600 * 3) // ลดจำนวน particle ลงเล็กน้อย
        for (let i = 0; i < 600; i++) {
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
                <PointMaterial transparent color="#2dd4bf" size={0.03} sizeAttenuation={true} depthWrite={false} blending={THREE.AdditiveBlending} />
            </Points>
        </group>
    )
}

const AnalysisBackground = () => (
    <div className="fixed inset-0 z-0 bg-[#010409]">
        <ErrorBoundary fallback={<div className="fixed inset-0 bg-[#010409]" />}>
            <Canvas dpr={[1, 1.2]} gl={{ antialias: false, powerPreference: "high-performance" }}>
                <Suspense fallback={null}>
                    <PerspectiveCamera makeDefault position={[0, 0, 10]} fov={50} />
                    <ambientLight intensity={0.2} />
                    <DataParticles />
                    <Grid position={[0, -4, 0]} args={[40, 40]} cellColor="#1e293b" sectionColor="#2dd4bf" sectionOpacity={0.1} cellOpacity={0.05} fadeDistance={25} />
                    <Stars radius={100} depth={50} count={400} factor={3} fade speed={0.5} />
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
        <div className="min-h-screen relative font-tech text-white overflow-x-hidden pb-16">
            <style>{`
                .font-tech { font-family: 'Rajdhani', sans-serif; }
                .font-body { font-family: 'Plus Jakarta Sans', sans-serif; }
                body { background-color: #010409; }
                .glass-card { background: rgba(10, 15, 30, 0.85); backdrop-filter: blur(25px); border: 1px solid rgba(255,255,255,0.08); }
                .scan-line { position: absolute; top: 0; left: 0; width: 100%; height: 2px; background: #2dd4bf; box-shadow: 0 0 10px #2dd4bf; animation: scan 2s linear infinite; z-index: 10; }
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

                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>

            <AnalysisBackground />

            <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 pt-20 font-tech">

                {/* ── STEP INDICATOR ── */}
                <div className="flex justify-center mb-6 md:mb-8 w-full px-2">
                    <div className="glass-card px-4 sm:px-6 md:px-10 py-2.5 md:py-3.5 rounded-full flex items-center gap-2 sm:gap-3 md:gap-5 border-white/5 shadow-xl overflow-x-auto no-scrollbar max-w-full">
                        {[{ id: -1, l: 'INPUT' }, { id: 0, l: 'SYNC' }, { id: 1, l: 'ANALYSIS' }, { id: 3, l: 'REPORT' }].map((s, i) => (
                            <div key={i} className="flex items-center gap-2 sm:gap-3 md:gap-5 flex-shrink-0">
                                <div className={`flex flex-col items-center transition-all ${step === s.id ? 'opacity-100 scale-105' : 'opacity-40'}`}>
                                    <div className={`w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3 rounded-full mb-1 ${step >= s.id ? 'bg-teal-400 shadow-[0_0_8px_#2dd4bf]' : 'bg-white'}`} />
                                    <span className="text-[8px] sm:text-[9px] md:text-xs font-bold tracking-widest uppercase">{s.l}</span>
                                </div>
                                {i < 3 && <div className={`w-3 sm:w-5 md:w-8 h-[2px] ${step > s.id ? 'bg-teal-400/40' : 'bg-white/10'}`} />}
                            </div>
                        ))}
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    {/* ── PHASE: UPLOAD ── */}
                    {step === -1 && (
                        <motion.div key="input" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="max-w-md md:max-w-lg mx-auto text-center w-full px-2">
                            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight uppercase mb-2">
                                NEURAL_
                                <br className="sm:hidden" />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-blue-400 to-teal-400 animate-text-flow">SCANNER</span>
                            </h1>
                            <p className="text-slate-400 text-[10px] sm:text-xs md:text-sm tracking-[0.2em] md:tracking-[0.3em] uppercase font-bold opacity-70 mb-4">Initiating Subject Data Capture</p>
                            
                            <span className={`inline-block px-3 py-1 md:px-4 md:py-1.5 rounded-full text-[9px] sm:text-[10px] md:text-xs font-black uppercase tracking-widest mb-6 md:mb-8 border ${plan === 'premium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-slate-500/10 text-slate-400 border-slate-500/30'}`}>
                                {plan === 'premium' ? '⚡ PREMIUM — Emotion + Breed + Vet AI' : '🆓 FREE — Emotion Analysis Only'}
                            </span>

                            {!user ? (
                                <div className="glass-card p-6 md:p-10 rounded-[1.5rem] md:rounded-[2rem] border border-teal-500/20 text-center shadow-2xl relative overflow-hidden">
                                    <div className="absolute inset-0 bg-teal-500/5 blur-3xl rounded-full" />
                                    <ShieldAlert size={32} className="text-teal-400 mx-auto mb-3 md:mb-4 relative z-10" />
                                    <h2 className="text-sm md:text-base font-black uppercase tracking-widest text-white mb-2 relative z-10">Authentication Required</h2>
                                    <p className="text-[10px] md:text-xs font-body text-slate-400 mb-5 md:mb-6 relative z-10 px-4">Access to the Neural Scanner is restricted. Please authenticate via Google.</p>
                                    <button onClick={loginWithGoogle} className="relative z-10 px-5 sm:px-6 py-2.5 md:py-3 rounded-full bg-teal-500 text-black text-[9px] md:text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-[0_0_15px_rgba(45,212,191,0.3)] flex items-center justify-center gap-2 mx-auto cursor-pointer">
                                        <LogIn size={14} /> Authenticate_Now
                                    </button>
                                </div>
                            ) : !preview ? (
                                <div onClick={() => fileRef.current.click()} className="glass-card p-8 md:p-12 rounded-[1.5rem] md:rounded-[2rem] border border-dashed border-teal-500/20 hover:border-teal-400/50 transition-all text-center cursor-pointer group shadow-xl">
                                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => pick(e.target.files[0])} />
                                    <Upload size={32} className="text-teal-400 mx-auto mb-3 md:mb-4 group-hover:scale-110 transition-transform" />
                                    <h2 className="text-sm md:text-base font-bold uppercase tracking-widest text-slate-200">Connect Visual Signal</h2>
                                    <p className="text-slate-500 text-[10px] md:text-xs uppercase mt-2 tracking-wider">Target_Input_Awaiting</p>
                                    {error && <p className="mt-3 text-rose-500 font-bold text-[9px] md:text-[10px] uppercase animate-pulse">{error}</p>}
                                </div>
                            ) : (
                                <div className="glass-card p-3 md:p-5 rounded-[1.5rem] md:rounded-[2rem] border-white/10 shadow-xl">
                                    <div className="relative rounded-xl md:rounded-2xl overflow-hidden mb-3 md:mb-5 bg-black shadow-inner border border-white/5">
                                        <img src={preview} className="w-full h-40 sm:h-56 md:max-h-[250px] object-contain" alt="Preview" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                                    </div>
                                    <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
                                        <button onClick={reset} className="w-full sm:w-auto flex-1 py-2.5 md:py-3 rounded-xl glass-card hover:bg-white/5 text-[10px] md:text-xs font-bold uppercase tracking-widest transition-all">Reject</button>
                                        <button onClick={runAnalysis} className="w-full sm:w-auto flex-[2] py-2.5 md:py-3 rounded-xl bg-teal-500 text-black text-[10px] md:text-xs font-black uppercase tracking-widest hover:shadow-[0_0_15px_rgba(45,212,191,0.4)] transition-all">Initialize</button>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* ── PHASE: ANALYZING ── */}
                    {step >= 0 && step < 3 && (
                        <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-xs mx-auto text-center py-6 md:py-8 px-4">
                            <div className="relative aspect-square w-full mb-5 md:mb-8 rounded-[1.5rem] md:rounded-[2rem] overflow-hidden border border-teal-500/30 shadow-[0_0_40px_rgba(45,212,191,0.2)] bg-black/40">
                                <img src={preview} className="w-full h-full object-cover opacity-30 grayscale blur-[1px]" alt="Processing" />
                                <div className="scan-line" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Activity size={40} className="text-teal-400 opacity-20 animate-pulse" />
                                </div>
                            </div>
                            <h2 className="text-xs md:text-sm font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-blue-400 animate-text-flow font-tech">Processing_Neural_Array...</h2>
                            <p className="text-slate-500 text-[8px] md:text-[9px] tracking-[0.2em] md:tracking-[0.3em] uppercase mt-1">Core_Synapse_Active</p>
                        </motion.div>
                    )}

                    {/* ── PHASE: REPORT ── */}
                    {step === 3 && result && (
                        <motion.div key="report" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 md:space-y-6 font-tech w-full">

                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center flex-wrap gap-3 md:gap-4 border-b border-white/5 pb-4 md:pb-6">
                                <div>
                                    <div className="flex flex-wrap items-center gap-1.5 md:gap-2 mb-1 md:mb-2">
                                        <div className="badge bg-teal-500/10 text-teal-400 border border-teal-500/20 px-2 py-0.5 md:px-2.5 md:py-1 rounded-full text-[8px] md:text-[9px] font-black tracking-widest uppercase">Diagnostic_Final_Log</div>
                                        {result.llm_used ? (
                                            <div className="badge bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 md:px-2.5 md:py-1 rounded-full text-[8px] md:text-[9px] font-black tracking-widest uppercase">⚡ GPT-4o AI</div>
                                        ) : (
                                            <div className="badge bg-slate-500/10 text-slate-400 border border-slate-500/20 px-2 py-0.5 md:px-2.5 md:py-1 rounded-full text-[8px] md:text-[9px] font-black tracking-widest uppercase">CNN Only</div>
                                        )}
                                    </div>
                                    <h1 className="text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-teal-300 to-white animate-text-flow">Animal_Neural_Diagnostics</h1>
                                </div>
                                <button onClick={reset} className="w-full sm:w-auto justify-center px-4 md:px-6 py-2.5 md:py-3 bg-white text-black font-black text-xs md:text-sm rounded-full shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:scale-105 transition-all flex items-center gap-2 group mt-2 sm:mt-0">
                                    <Camera size={14} className="group-hover:rotate-12 transition-transform" />
                                    <span>NEW_SCAN_INITIATE</span>
                                </button>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-5 items-start w-full">

                                {/* 1. Visual Capture Cell (left 4 cols) */}
                                {(() => {
                                    const eLabel = (result.emotion?.label || 'other').toLowerCase();
                                    const eCfg = EMO_MAP[eLabel] || EMO_MAP.other;
                                    return (
                                        <div className="lg:col-span-4 glass-card rounded-[1.5rem] md:rounded-[2rem] flex flex-col border-white/5 shadow-xl relative overflow-hidden w-full">
                                            <div className={`absolute inset-0 bg-gradient-to-br ${eCfg.grad} opacity-5 blur-[60px] pointer-events-none`} />
                                            <div className="relative w-full overflow-hidden rounded-t-[1.5rem] md:rounded-t-[2rem] z-10" style={{ aspectRatio: '1/1' }}>
                                                <img src={preview} className="absolute inset-0 w-full h-full object-cover" alt="Captured Subject" />
                                                <div className="absolute top-2 left-2 md:top-3 md:left-3 p-1.5 bg-black/80 rounded-lg text-[7px] md:text-[8px] border border-white/10 uppercase font-black tracking-widest text-teal-400 shadow-md">Subject_Locked</div>
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
                                            </div>
                                            <div className="grid grid-cols-2 z-10 border-t border-white/5">
                                                <div className="p-3 md:p-4 text-center border-r border-white/5">
                                                    <p className="text-[9px] md:text-[10px] text-slate-500 uppercase font-bold mb-0.5">Status</p>
                                                    <p className="text-xs sm:text-sm md:text-base font-black text-teal-400 uppercase tracking-widest">Verified</p>
                                                </div>
                                                <div className="p-3 md:p-4 text-center">
                                                    <p className="text-[9px] md:text-[10px] text-slate-500 uppercase font-bold mb-0.5">Plan</p>
                                                    <p className={`text-xs sm:text-sm md:text-base font-black uppercase tracking-widest ${plan === 'premium' ? 'text-amber-400' : 'text-slate-400'}`}>{plan === 'premium' ? '⚡ PRO' : 'FREE'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* 2. Emotion Neural Hub (right 8 cols) */}
                                {(() => {
                                    const eLabel = (result.emotion?.label || 'other').toLowerCase();
                                    const eCfg = EMO_MAP[eLabel] || EMO_MAP.other;
                                    return (
                                        <div className="lg:col-span-8 glass-card rounded-[1.5rem] md:rounded-[2rem] overflow-hidden shadow-xl flex flex-col h-full w-full">
                                            <div className={`py-6 md:py-10 w-full bg-gradient-to-br ${eCfg.grad} bg-animate flex flex-col items-center justify-center relative shrink-0`}>
                                                <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px]" />
                                                <motion.span
                                                    animate={{ scale: [1, 1.1, 1] }}
                                                    transition={{ repeat: Infinity, duration: 3 }}
                                                    className="text-[4rem] sm:text-[5rem] md:text-[6rem] relative z-10 drop-shadow-[0_0_20px_rgba(255,255,255,0.4)] select-none leading-none"
                                                >
                                                    {eCfg.emoji}
                                                </motion.span>
                                                <h3 className="text-2xl sm:text-3xl md:text-4xl font-black text-white relative z-10 uppercase tracking-tighter mt-2 md:mt-3 drop-shadow-xl">{eCfg.label}</h3>
                                            </div>

                                            <div className="p-4 sm:p-6 md:p-8 flex-grow flex flex-col justify-center">
                                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 mb-6 md:mb-8 border-b border-white/5 pb-4 md:pb-6">
                                                    <div className="border-l-[3px] md:border-l-[4px] border-teal-500/50 pl-3 w-full sm:w-auto">
                                                        <p className="text-[10px] md:text-[11px] text-slate-500 uppercase tracking-widest mb-1 font-black font-tech">Neural_Synapse_State</p>
                                                        <p className="text-slate-200 text-xs md:text-sm font-bold leading-relaxed font-body">"{eCfg.desc}"</p>
                                                    </div>
                                                    <div className="text-left sm:text-right w-full sm:w-auto mt-2 sm:mt-0">
                                                        <p className="text-3xl sm:text-4xl md:text-5xl font-black text-teal-400 leading-none drop-shadow-md">{Math.round((result.emotion?.confidence || 0) * 100)}%</p>
                                                        <p className="text-[9px] md:text-[10px] text-slate-500 uppercase font-black mt-1">Accuracy</p>
                                                    </div>
                                                </div>

                                                <div className="space-y-3 md:space-y-4">
                                                    {Object.entries(result.emotion?.all_scores || {}).map(([key, score]) => {
                                                        const cfg = EMO_MAP[key.toLowerCase()] || EMO_MAP.other;
                                                        return (
                                                            <div key={key} className="flex items-center gap-2 md:gap-3 group">
                                                                <span className="text-lg sm:text-xl md:text-2xl w-8 md:w-10 text-center transition-transform group-hover:scale-110">{cfg.emoji}</span>
                                                                <div className="flex-1 h-1.5 md:h-2 bg-white/5 rounded-full overflow-hidden border border-white/10 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                                                                    <motion.div initial={{ width: 0 }} animate={{ width: score }} transition={{ duration: 1.5, ease: "circOut" }} className={`h-full bg-gradient-to-r ${cfg.grad} bg-animate shadow-[0_0_15px_rgba(255,255,255,0.2)]`} />
                                                                </div>
                                                                <span className="text-[10px] sm:text-xs md:text-sm font-mono w-8 md:w-10 text-right opacity-80 font-black">{score}</span>
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
                                <div className="lg:col-span-12 glass-card p-5 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border-white/5 relative overflow-hidden group flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-8">
                                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity rotate-12 pointer-events-none"><Fingerprint size={80} className="md:w-[100px] md:h-[100px]" /></div>
                                    <div className="relative z-10 flex-1 w-full">
                                        <div className="flex items-center gap-1.5 md:gap-2 mb-3 text-teal-400">
                                            <Target size={14} className="animate-pulse" />
                                            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest">Genomic_Data</span>
                                        </div>
                                        <h4 className="text-xl sm:text-2xl md:text-3xl font-black uppercase text-white leading-tight mb-1 tracking-tight font-tech">{result.breed?.breed || 'UNKNOWN'}</h4>
                                        <p className="text-slate-500 uppercase tracking-[0.2em] text-[10px] md:text-xs font-bold mb-3 md:mb-4">{result.breed?.species || 'DNA_SEQUENCE_N/A'}</p>
                                        {result.breed?.traits && (
                                            <p className="text-slate-300 text-[10px] sm:text-xs md:text-sm font-body leading-relaxed mb-3 md:mb-4 normal-case tracking-normal max-w-3xl">{result.breed.traits}</p>
                                        )}
                                        {result.breed?.top_predictions && (
                                            <div className="mb-2 flex flex-col sm:flex-row flex-wrap gap-1.5 md:gap-4 text-[9px] sm:text-[10px] md:text-xs">
                                                <span className="text-slate-500 uppercase font-black">Top Matches:</span>
                                                <div className="flex flex-wrap gap-2 md:gap-3">
                                                {result.breed.top_predictions.map((pred, i) => (
                                                    <span key={i} className="text-slate-200 font-body">
                                                        {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'} {pred}
                                                    </span>
                                                ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="bg-teal-500/10 border border-teal-500/20 p-4 md:p-6 rounded-xl md:rounded-[1.5rem] shadow-inner text-center shrink-0 min-w-full md:min-w-[180px] lg:min-w-[200px] z-10">
                                        <span className="text-[8px] md:text-[10px] text-teal-400 font-black uppercase tracking-widest mb-1 block opacity-80">Match_Confidence</span>
                                        <p className="text-lg md:text-2xl font-black text-white uppercase tracking-tighter">{(() => {
                                            const c = result.breed?.confidence || 'N/A';
                                            if (c === 'high') return '🟢 HIGH';
                                            if (c === 'medium') return '🟡 MEDIUM';
                                            if (c === 'low') return '🔴 LOW';
                                            return c;
                                        })()}</p>
                                    </div>
                                </div>
                                )}

                                {/* 4. Advisory Terminal */}
                                <div className="lg:col-span-12 glass-card p-5 md:p-10 rounded-[1.5rem] md:rounded-[2rem] border-l-[6px] md:border-l-[10px] border-l-teal-500 relative overflow-hidden bg-gradient-to-br from-teal-500/[0.04] to-transparent shadow-xl w-full">
                                    <div className="absolute -top-6 -right-6 p-6 opacity-5 text-white pointer-events-none rotate-12"><ShieldAlert size={80} className="md:w-[120px] md:h-[120px]" /></div>
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 md:gap-4 mb-4 md:mb-6">
                                        <div className="p-2.5 md:p-4 bg-teal-500/20 rounded-xl text-teal-400 shadow-md border border-teal-500/20"><Stethoscope size={20} /></div>
                                        <div>
                                            <h3 className="text-sm sm:text-base md:text-xl font-bold uppercase tracking-[0.15em] md:tracking-[0.2em] text-white leading-none">Neural_Advisory_Output</h3>
                                            <p className="text-[9px] md:text-[10px] text-slate-500 uppercase font-black mt-1 tracking-widest opacity-80">
                                                {plan === 'premium' ? 'GPT-4o // LangChain Vet Agent' : 'Fallback_Mode // CNN Basic Advice'}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div className="text-slate-200 text-[10px] sm:text-xs md:text-sm leading-[1.6] md:leading-[1.7] font-body whitespace-pre-line bg-black/50 p-4 md:p-6 rounded-xl border border-white/5 shadow-[inset_0_0_30px_rgba(0,0,0,0.5)] relative z-10">
                                        <Typewriter text={result.advice || 'Extracting neural data artifacts...'} />
                                        <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 0.8 }} className="inline-block w-1.5 h-3 bg-teal-400 align-middle ml-1 shadow-[0_0_10px_#2dd4bf]" />
                                    </div>
                                    {plan !== 'premium' && (
                                        <div className="mt-4 md:mt-6 text-center">
                                            <button onClick={() => setPage('plans')} className="w-full sm:w-auto px-5 md:px-8 py-2.5 md:py-3 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[9px] md:text-[10px] font-black uppercase tracking-widest hover:bg-amber-500/20 transition-all cursor-pointer">
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