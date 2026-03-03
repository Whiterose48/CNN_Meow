import { useState, useRef, useEffect, Suspense, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Canvas, useFrame } from '@react-three/fiber'
import { Points, PointMaterial, Stars, PerspectiveCamera, Grid } from '@react-three/drei'
import * as THREE from 'three'
import { Brain, Dog, Stethoscope, Upload, RefreshCcw, Zap, Target, Activity, ShieldAlert, Fingerprint, Info, Camera, LogIn, Layers } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useAnalysis } from '../context/AnalysisContext'

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
    useFrame((state) => { ref.current.rotation.y = state.clock.getElapsedTime() * 0.05 })
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
        <Canvas dpr={[1, 1.5]} gl={{ antialias: false, powerPreference: "high-performance" }}>
            <Suspense fallback={null}>
                <PerspectiveCamera makeDefault position={[0, 0, 10]} fov={50} />
                <ambientLight intensity={0.2} />
                <DataParticles />
                <Grid position={[0, -4, 0]} args={[40, 40]} cellColor="#1e293b" sectionColor="#2dd4bf" sectionOpacity={0.1} cellOpacity={0.05} fadeDistance={25} />
                <Stars radius={100} depth={50} count={500} factor={4} fade speed={0.5} />
            </Suspense>
        </Canvas>
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
                
                /* คลาสสำหรับทำข้อความให้มี Gradient วิ่งไปมา */
                .animate-text-flow {
                    background-size: 200% auto;
                    animation: text-flow 3s linear infinite;
                }
                @keyframes text-flow {
                    0% { background-position: 0% 50%; }
                    100% { background-position: 200% 50%; }
                }
            `}</style>

            <AnalysisBackground />

            <div className="relative z-10 max-w-6xl mx-auto px-6 pt-24 font-tech">

                {/* ── STEP INDICATOR ── */}
                <div className="flex justify-center mb-12">
                    <div className="glass-card px-16 py-5 rounded-full flex items-center gap-6 border-white/5 shadow-2xl">
                        {[{ id: -1, l: 'INPUT' }, { id: 0, l: 'SYNC' }, { id: 1, l: 'ANALYSIS' }, { id: 3, l: 'REPORT' }].map((s, i) => (
                            <div key={i} className="flex items-center gap-6">
                                <div className={`flex flex-col items-center transition-all ${step === s.id ? 'opacity-100 scale-105' : 'opacity-20'}`}>
                                    <div className={`w-4 h-4 rounded-full mb-1.5 ${step >= s.id ? 'bg-teal-400 shadow-[0_0_10px_#2dd4bf]' : 'bg-white'}`} />
                                    <span className="text-[19px] font-bold tracking-widest uppercase">{s.l}</span>
                                </div>
                                {i < 3 && <div className={`w-10 h-[5px] ${step > s.id ? 'bg-teal-400/40' : 'bg-white/10'}`} />}
                            </div>
                        ))}
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    {/* ── PHASE: UPLOAD ── */}
                    {step === -1 && (
                        <motion.div key="input" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="max-w-xl mx-auto text-center">
                            <h1 className="text-6xl md:text-7xl font-black tracking-tight uppercase mb-3">
                                NEURAL_
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-blue-400 to-teal-400 animate-text-flow">SCANNER</span>
                            </h1>
                            <p className="text-slate-400 text-xl tracking-[0.4em] uppercase font-bold opacity-70 mb-2">Initiating Subject Data Capture</p>
                            <span className={`inline-block px-4 py-1 rounded-full text-[18px] font-black uppercase tracking-widest mb-10 border ${plan === 'premium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-slate-500/10 text-slate-400 border-slate-500/30'}`}>
                                {plan === 'premium' ? '⚡ PREMIUM PLAN — Emotion + Breed + AI Advice' : '🆓 FREE PLAN — Emotion Analysis Only'}
                            </span>

                            {!user ? (
                                <div className="glass-card p-16 rounded-[3rem] border border-teal-500/20 text-center shadow-2xl relative overflow-hidden">
                                    <div className="absolute inset-0 bg-teal-500/5 blur-3xl rounded-full" />
                                    <ShieldAlert size={50} className="text-teal-400 mx-auto mb-6 relative z-10" />
                                    <h2 className="text-xl font-black uppercase tracking-widest text-white mb-2 relative z-10">Authentication Required</h2>
                                    <p className="text-sm font-body text-slate-400 mb-8 relative z-10">Access to the Neural Scanner is restricted. Please authenticate via Google.</p>
                                    <button onClick={loginWithGoogle} className="relative z-10 px-8 py-4 rounded-full bg-teal-500 text-black text-xs font-black uppercase tracking-widest hover:scale-105 transition-all shadow-[0_0_20px_rgba(45,212,191,0.3)] flex items-center justify-center gap-3 mx-auto cursor-pointer">
                                        <LogIn size={16} /> Authenticate_Now
                                    </button>
                                </div>
                            ) : !preview ? (
                                <div onClick={() => fileRef.current.click()} className="glass-card p-16 rounded-[3rem] border border-dashed border-teal-500/20 hover:border-teal-400/50 transition-all text-center cursor-pointer group shadow-2xl">
                                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => pick(e.target.files[0])} />
                                    <Upload size={44} className="text-teal-400 mx-auto mb-6 group-hover:scale-110 transition-transform" />
                                    <h2 className="text-lg font-bold uppercase tracking-widest text-slate-200">Connect Visual Signal</h2>
                                    <p className="text-slate-500 text-[17px] uppercase mt-2">Target_Input_Awaiting</p>
                                    {error && <p className="mt-4 text-rose-500 font-bold text-xs uppercase animate-pulse">{error}</p>}
                                </div>
                            ) : (
                                <div className="glass-card p-6 rounded-[3rem] border-white/10 shadow-2xl">
                                    <div className="relative rounded-[2rem] overflow-hidden mb-6 bg-black shadow-inner border border-white/5">
                                        <img src={preview} className="w-full max-h-[350px] object-contain" alt="Preview" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                                    </div>
                                    <div className="flex gap-4">
                                        <button onClick={reset} className="flex-1 py-4 rounded-2xl glass-card hover:bg-white/5 text-[17px] font-bold uppercase tracking-widest transition-all">Reject</button>
                                        <button onClick={runAnalysis} className="flex-[2] py-4 rounded-2xl bg-teal-500 text-black text-[17px] font-black uppercase tracking-widest hover:shadow-[0_0_25px_rgba(45,212,191,0.5)] transition-all">Initialize</button>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* ── PHASE: ANALYZING ── */}
                    {step >= 0 && step < 3 && (
                        <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-sm mx-auto text-center py-10">
                            <div className="relative aspect-square w-full mb-10 rounded-[3rem] overflow-hidden border border-teal-500/30 shadow-[0_0_60px_rgba(45,212,191,0.2)] bg-black/40">
                                <img src={preview} className="w-full h-full object-cover opacity-30 grayscale blur-[1px]" alt="Processing" />
                                <div className="scan-line" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Activity size={60} className="text-teal-400 opacity-20 animate-pulse" />
                                </div>
                            </div>
                            <h2 className="text-xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-blue-400 animate-text-flow font-tech">Processing_Neural_Array...</h2>
                            <p className="text-slate-500 text-[10px] tracking-[0.5em] uppercase mt-2">Core_Synapse_Active</p>
                        </motion.div>
                    )}

                    {/* ── PHASE: REPORT (SYMMETRICAL & COLORED) ── */}
                    {step === 3 && result && (
                        <motion.div key="report" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 font-tech">

                            <div className="flex justify-between items-center flex-wrap gap-6 border-b border-white/5 pb-8">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="badge bg-teal-500/10 text-teal-400 border border-teal-500/20 px-4 py-1 rounded-full text-[17px] font-black tracking-widest uppercase">Diagnostic_Final_Log</div>
                                        {result.llm_used && (
                                            <div className="badge bg-amber-500/10 text-amber-400 border border-amber-500/20 px-4 py-1 rounded-full text-[17px] font-black tracking-widest uppercase">⚡ GPT-4o AI</div>
                                        )}
                                        {!result.llm_used && (
                                            <div className="badge bg-slate-500/10 text-slate-400 border border-slate-500/20 px-4 py-1 rounded-full text-[17px] font-black tracking-widest uppercase">CNN Only</div>
                                        )}
                                    </div>
                                    <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white via-teal-300 to-white animate-text-flow">Animal_Neural_Diagnostics</h1>
                                </div>
                                <button onClick={reset} className="px-10 py-5 bg-white text-black font-black text-lg rounded-full shadow-[0_0_40px_rgba(255,255,255,0.4)] hover:scale-105 transition-all flex items-center gap-3 group">
                                    <Camera size={24} className="group-hover:rotate-12 transition-transform" />
                                    <span>NEW_SCAN_INITIATE</span>
                                </button>
                            </div>

                            <div className={`grid grid-cols-1 ${plan === 'premium' ? 'lg:grid-cols-12' : 'lg:grid-cols-2'} gap-6 items-stretch`}>

                                {/* 1. Visual Capture Cell (WITH EMOTION COLOR) */}
                                {(() => {
                                    const eLabel = (result.emotion?.label || 'other').toLowerCase();
                                    const eCfg = EMO_MAP[eLabel] || EMO_MAP.other;
                                    return (
                                        <div className={`${plan === 'premium' ? 'lg:col-span-4' : ''} glass-card p-6 rounded-[3rem] flex flex-col items-center border-white/5 shadow-2xl relative overflow-hidden`}>
                                            {/* Emotion-Based Inner Glow */}
                                            <div className={`absolute inset-0 bg-gradient-to-br ${eCfg.grad} opacity-5 blur-[80px] pointer-events-none`} />
                                            <div className="relative w-full rounded-2xl overflow-hidden border border-white/10 mb-6 group z-10 shadow-2xl">
                                                <img src={preview} className="w-full aspect-[4/5] object-cover" alt="Captured Subject" />
                                                <div className="absolute top-4 left-4 p-2 bg-black/80 rounded-lg text-[9px] border border-white/10 uppercase font-black tracking-widest text-teal-400 shadow-xl">Subject_Locked</div>
                                            </div>
                                            <div className="w-full grid grid-cols-2 gap-4 z-10">
                                                <div className="bg-white/5 p-3 rounded-2xl text-center border border-white/5"><p className="text-[15px] text-slate-500 uppercase font-bold mb-1">Status</p><p className="text-xl font-black text-teal-400 uppercase tracking-widest">Verified</p></div>
                                                <div className="bg-white/5 p-3 rounded-2xl text-center border border-white/5"><p className="text-[15px] text-slate-500 uppercase font-bold mb-1">Plan</p><p className={`text-xl font-black uppercase tracking-widest ${plan === 'premium' ? 'text-amber-400' : 'text-slate-400'}`}>{plan === 'premium' ? '⚡ PRO' : '🆓 FREE'}</p></div>
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* 2. Emotion Neural Hub (BALANCED) */}
                                {(() => {
                                    const eLabel = (result.emotion?.label || 'other').toLowerCase();
                                    const eCfg = EMO_MAP[eLabel] || EMO_MAP.other;
                                    return (
                                        <div className={`${plan === 'premium' ? 'lg:col-span-5' : ''} glass-card rounded-[3rem] overflow-hidden border-t-8 shadow-2xl`} style={{ borderTopColor: eCfg.color }}>
                                            <div className={`h-48 w-full bg-gradient-to-br ${eCfg.grad} bg-animate flex flex-col items-center justify-center relative`}>
                                                <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" />
                                                <motion.span animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 3 }} className="text-8xl relative z-10 drop-shadow-[0_0_30px_rgba(255,255,255,0.4)] select-none">
                                                    {eCfg.emoji}
                                                </motion.span>
                                                <h3 className="text-4xl font-black text-white relative z-10 uppercase tracking-tighter mt-2 drop-shadow-lg">{eCfg.label}</h3>
                                            </div>

                                            <div className="p-8">
                                                <div className="flex justify-between items-end mb-8 border-b border-white/5 pb-6">
                                                    <div className="border-l-4 border-teal-500/50 pl-5">
                                                        <p className="text-[17px] text-slate-500 uppercase tracking-widest mb-1 font-black font-tech">Neural_Synapse_State</p>
                                                        <p className="text-slate-200 text-xm font-bold leading-relaxed font-body">"{eCfg.desc}"</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-6xl font-black text-teal-400 leading-none">{Math.round((result.emotion?.confidence || 0) * 100)}%</p>
                                                        <p className="text-[15px] text-slate-500 uppercase font-black mt-1">Accuracy</p>
                                                    </div>
                                                </div>

                                                <div className="space-y-4">
                                                    {Object.entries(result.emotion?.all_scores || {}).map(([key, score]) => {
                                                        const cfg = EMO_MAP[key.toLowerCase()] || EMO_MAP.other;
                                                        return (
                                                            <div key={key} className="flex items-center gap-5 group">
                                                                <span className="text-3xl w-10 text-center transition-transform group-hover:scale-125">{cfg.emoji}</span>
                                                                <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden border border-white/5 shadow-inner">
                                                                    <motion.div initial={{ width: 0 }} animate={{ width: score }} transition={{ duration: 1.5, ease: "circOut" }} className={`h-full bg-gradient-to-r ${cfg.grad} bg-animate`} />
                                                                </div>
                                                                <span className="text-[17px] font-mono w-10 text-right opacity-60 font-black">{score}</span>
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
                                <div className="lg:col-span-3 glass-card p-8 rounded-[3rem] border-white/5 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity rotate-12 pointer-events-none"><Fingerprint size={120} /></div>
                                    <div className="relative z-10 flex flex-col h-full justify-between">
                                        <div>
                                            <div className="flex items-center gap-2 mb-6 text-teal-400">
                                                <Target size={18} className="animate-pulse" />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Genomic_Data</span>
                                            </div>
                                            <h4 className="text-3xl font-black uppercase text-white leading-tight mb-2 tracking-tight font-tech">{result.breed?.breed || 'UNKNOWN'}</h4>
                                            <p className="text-slate-500 uppercase tracking-[0.3em] text-[10px] font-bold mb-4">{result.breed?.species || 'DNA_SEQUENCE_N/A'}</p>
                                            {result.breed?.traits && (
                                                <p className="text-slate-400 text-xs font-body leading-relaxed mb-4 normal-case tracking-normal">{result.breed.traits}</p>
                                            )}
                                            {result.breed?.top_predictions && (
                                                <div className="mb-6">
                                                    <p className="text-[9px] text-slate-500 uppercase tracking-widest font-black mb-2">Top_Matches</p>
                                                    {result.breed.top_predictions.map((pred, i) => (
                                                        <p key={i} className="text-slate-400 text-[11px] font-body leading-relaxed normal-case tracking-normal">
                                                            {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'} {pred}
                                                        </p>
                                                    ))}
                                                </div>
                                            )}
                                            {result.breed?.imagenet_score && (
                                                <p className="text-[10px] text-teal-400/60 uppercase font-bold tracking-wide">Score: {result.breed.imagenet_score}</p>
                                            )}
                                        </div>
                                        <div className="bg-teal-500/10 border border-teal-500/20 p-5 rounded-[2rem] shadow-inner text-center">
                                            <span className="text-[10px] text-teal-400 font-black uppercase tracking-widest mb-1 block opacity-60">Match_Confidence</span>
                                            <p className="text-2xl font-black text-white uppercase tracking-tighter">{(() => {
                                                const c = result.breed?.confidence || 'N/A';
                                                if (c === 'high') return '🟢 HIGH';
                                                if (c === 'medium') return '🟡 MEDIUM';
                                                if (c === 'low') return '🔴 LOW';
                                                return c;
                                            })()}</p>
                                        </div>
                                    </div>
                                </div>
                                )}

                                {/* 4. Advisory Terminal (PREMIUM = GPT-4o / FREE = fallback advice) */}
                                <div className={`${plan === 'premium' ? 'lg:col-span-12' : 'lg:col-span-2'} glass-card p-10 md:p-12 rounded-[4rem] border-l-[12px] border-l-teal-500 relative overflow-hidden bg-gradient-to-br from-teal-500/[0.04] to-transparent shadow-2xl`}>
                                    <div className="absolute -top-10 -right-10 p-12 opacity-5 text-white pointer-events-none rotate-12"><ShieldAlert size={180} /></div>
                                    <div className="flex items-center gap-5 mb-8">
                                        <div className="p-4 bg-teal-500/20 rounded-2xl text-teal-400 shadow-2xl border border-teal-500/20"><Stethoscope size={32} /></div>
                                        <div>
                                            <h3 className="text-xl font-bold uppercase tracking-[0.4em] text-white leading-none">Neural_Advisory_Output</h3>
                                            <p className="text-[17px] text-slate-500 uppercase font-black mt-2 tracking-widest opacity-70">
                                                {plan === 'premium' ? 'GPT-4o // LangChain Vet Agent' : 'Fallback_Mode // CNN Basic Advice'}
                                            </p>
                                        </div>
                                    </div>
                                    {/* ปรับให้ text ในส่วนคำแนะนำเล็กลง (text-sm md:text-base) */}
                                    <div className="text-slate-200 text-sm md:text-base leading-[1.8] font-body whitespace-pre-line bg-black/40 p-8 rounded-[2.5rem] border border-white/5 shadow-[inset_0_0_50px_rgba(0,0,0,0.4)] relative z-10">
                                        <Typewriter text={result.advice || 'Extracting neural data artifacts...'} />
                                        <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 0.8 }} className="inline-block w-2 h-5 bg-teal-400 align-middle ml-2 shadow-[0_0_10px_#2dd4bf]" />
                                    </div>
                                    {plan !== 'premium' && (
                                        <div className="mt-6 text-center">
                                            <button onClick={() => setPage('plans')} className="px-8 py-3 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xm font-black uppercase tracking-widest hover:bg-amber-500/20 transition-all cursor-pointer">
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