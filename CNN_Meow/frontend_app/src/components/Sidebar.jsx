import { motion } from 'framer-motion'

export default function Sidebar({ page, plan }) {
    const steps = [
        { n: '01', t: 'อัปโหลดรูป', d: 'Upload Image', icon: '\u{1F4F7}' },
        { n: '02', t: 'วิเคราะห์อารมณ์', d: 'Emotion CNN', icon: '\u{1F9E0}' },
        { n: '03', t: 'ระบุสายพันธุ์', d: 'LangChain Vision', icon: '\u{1F43E}' },
        { n: '04', t: 'คำแนะนำ AI', d: 'LangGraph Agent', icon: '\u{1F3E5}' },
    ]

    const pipeline = [
        { icon: '\u{1F9E0}', name: 'Emotion', tech: 'Custom CNN', color: 'text-indigo-400' },
        { icon: '\u{1F43E}', name: 'Breed', tech: 'LangChain+GPT-4o', color: 'text-cyan-400' },
        { icon: '\u{1F3E5}', name: 'Advisor', tech: 'LangGraph Agent', color: 'text-emerald-400' },
    ]

    return (
        <motion.aside
            initial={{ x: -280, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="w-[260px] min-h-[calc(100vh-64px)] glass-bg border-r border-white/5 p-6 flex-shrink-0"
        >
            {/* Plan Badge */}
            {plan && (
                <div className="glass rounded-xl px-3 py-2 mb-6 text-center">
                    <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Current Plan</div>
                    <div className="text-sm font-bold gradient-text">
                        {plan === 'free' ? '\u{1F193} Free' : plan === 'premium' ? '\u{1F48E} Premium' : '\u{1F451} Plus+'}
                    </div>
                </div>
            )}

            {/* Workflow Steps */}
            <div className="text-[10px] text-slate-500 uppercase tracking-[0.2em] mb-4 font-mono">Workflow</div>
            <div className="space-y-3 mb-8">
                {steps.map((s, i) => (
                    <div key={i} className="flex items-center gap-3 opacity-40 hover:opacity-80 transition-opacity">
                        <div className="w-8 h-8 rounded-lg border border-white/8 flex items-center justify-center text-sm flex-shrink-0">
                            {s.icon}
                        </div>
                        <div>
                            <div className="text-xs font-semibold text-slate-300">{s.t}</div>
                            <div className="text-[10px] text-slate-500">{s.d}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* AI Pipeline */}
            <div className="text-[10px] text-slate-500 uppercase tracking-[0.2em] mb-3 font-mono">AI Pipeline</div>
            <div className="glass rounded-xl p-4 space-y-2.5">
                {pipeline.map((p, i) => (
                    <div key={i} className="flex items-center justify-between">
                        <span className={`text-sm font-semibold ${p.color}`}>{p.icon} {p.name}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{p.tech}</span>
                    </div>
                ))}
            </div>
        </motion.aside>
    )
}
