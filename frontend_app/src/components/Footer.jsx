import { motion } from 'framer-motion'
import { ExternalLink, Activity, Zap, Database, Code, Brain, Target } from 'lucide-react'

// ปรับข้อมูลและไอคอนให้ตรงกับ Personal Profile ล่าสุด
const members = [
    { id: 'phruk', name: 'Phruk', role: 'AI Data Engineer & Full-Stack', short: 'DATA ENG', icon: Database },
    { id: 'poom', name: 'Poom', role: 'Project Manager & AI Engineer', short: 'PM / AI', icon: Code },
    { id: 'boss', name: 'Boss', role: 'UX/UI Designer', short: 'UX / UI', icon: Target },
    { id: 'nut', name: 'Nut', role: 'Cloud Developer & Software Tester', short: 'CLOUD DEV / TESTER', icon: Zap },
]

export default function Footer({ setPage }) {
    return (
        <footer className="relative z-20 mt-16 pb-8 px-4 sm:px-6 overflow-hidden">
            {/* CSS สำหรับ Animation ไฟวิ่งเฉพาะส่วนนี้ */}
            <style>{`
                @keyframes spin-slow {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .animate-spin-slow {
                    animation: spin-slow 8s linear infinite;
                }
            `}</style>

            <div className="max-w-5xl mx-auto relative group/footer perspective-1000">

                {/* ─── 3D LAYER 1: The Underlying Running Glow (แสงฟุ้งด้านหลัง) ─── */}
                <div className="absolute -inset-2 bg-gradient-to-r from-teal-500/30 via-blue-600/30 to-purple-600/30 rounded-[2rem] blur-2xl opacity-40 group-hover/footer:opacity-60 transition-opacity duration-1000 animate-pulse" style={{ transform: 'translateZ(-30px)' }} />

                {/* ─── 3D LAYER 2: The Running Border Beam (เส้นแสงวิ่งรอบขอบ) ─── */}
                <div className="absolute -inset-[1.5px] rounded-[1.5rem] overflow-hidden" style={{ transform: 'translateZ(-5px)' }}>
                    <div className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent_0deg_270deg,#2dd4bf_360deg)] animate-spin-slow opacity-80" />
                </div>

                {/* ─── 3D LAYER 3: The Main Glass Dock Container ─── */}
                <div className="relative bg-[#0a0f1c]/90 backdrop-blur-2xl rounded-[1.5rem] border border-white/10 p-6 md:p-8 overflow-hidden transform-style-3d shadow-xl">
                    {/* Subtle inner diagonal shine */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-black/20 pointer-events-none" />

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">

                        {/* ─── LEFT COLUMN: BRANDING ─── */}
                        <div className="lg:col-span-1 flex flex-col justify-center">
                            <div className="flex items-center gap-3 mb-4">
                                {/* 3D Logo Container */}
                                <div className="relative w-10 h-10 flex items-center justify-center bg-gradient-to-br from-teal-500 to-blue-700 rounded-xl shadow-[0_0_20px_rgba(45,212,191,0.3)] transform rotate-6 group-hover/footer:rotate-12 transition-transform duration-500 border border-white/20">
                                    <Activity size={20} className="text-white drop-shadow" />
                                    {/* Inner reflection */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-white/20 rounded-xl" />
                                </div>
                                <div>
                                    <span className="font-tech font-black text-xl tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-teal-200 drop-shadow-sm">
                                        PetInsight
                                    </span>
                                    <span className="block text-teal-400 text-[9px] tracking-[0.2em] font-tech uppercase font-bold mt-0.5">
                                        AI Diagnostics Core
                                    </span>
                                </div>
                            </div>
                            <p className="text-slate-400 text-[11px] sm:text-xs leading-relaxed font-body relative pl-3 border-l-2 border-teal-500/50 max-w-xs">
                                Pioneering the intersection of artificial intelligence and veterinary care. Let's build a healthier future for pets.
                            </p>
                        </div>

                        {/* ─── RIGHT COLUMN: TEAM MEMBERS (DATA CHIPS) ─── */}
                        <div className="lg:col-span-2">
                            <h3 className="font-tech text-xs sm:text-sm font-bold text-slate-400 tracking-[0.15em] mb-4 flex items-center gap-3 uppercase">
                                <span className="w-8 h-[4px] bg-teal-500/50 inline-block" />
                                Core Development Unit
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                                {members.map((m) => (
                                    <motion.button
                                        key={m.id}
                                        onClick={() => setPage(m.id)}
                                        whileHover={{ y: -2, scale: 1.01 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="relative group/card text-left perspective-500"
                                    >
                                        {/* Card Glow on Hover */}
                                        <div className="absolute -inset-[1px] bg-gradient-to-br from-teal-500/60 to-blue-600/60 rounded-xl blur-sm opacity-0 group-hover/card:opacity-100 transition-opacity duration-500" />

                                        {/* Card Body */}
                                        <div className="relative bg-[#111827] border border-white/10 p-3 md:p-4 rounded-xl overflow-hidden group-hover/card:border-teal-500/50 transition-all duration-300 shadow-md">
                                            {/* Background Tech Pattern */}
                                            <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:12px_12px]" />

                                            {/* Role Tag & Icon */}
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="font-tech font-bold text-[8px] sm:text-[9px] text-teal-400/80 tracking-widest uppercase bg-teal-950/50 px-1.5 py-0.5 rounded border border-teal-500/20">
                                                    [{m.short}]
                                                </span>
                                                <m.icon size={14} className="text-slate-500 group-hover/card:text-teal-400 transition-colors" />
                                            </div>

                                            {/* Name & Full Role */}
                                            <div className="font-tech font-black text-sm sm:text-base text-white flex items-center justify-between relative z-10">
                                                {m.name}
                                                <ExternalLink size={14} className="text-teal-500 opacity-0 -translate-x-3 group-hover/card:opacity-100 group-hover/card:translate-x-0 transition-all duration-300 ease-out" />
                                            </div>
                                            <span className="text-slate-400 text-[10px] sm:text-xs font-body block mt-0.5 truncate">{m.role}</span>

                                            {/* Bottom Running Light Strip */}
                                            <div className="absolute bottom-0 left-0 h-[2px] w-0 bg-gradient-to-r from-teal-400 to-blue-500 group-hover/card:w-full transition-all duration-500 ease-in-out shadow-[0_-1px_5px_rgba(45,212,191,0.5)]" />
                                        </div>
                                    </motion.button>
                                ))}
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            {/* ─── BOTTOM COPYRIGHT BAR ─── */}
            <div className="max-w-xl mx-auto text-center mt-10 relative z-10 pb-4">
                <div className="relative inline-block px-8 py-4">
                    {/* Background Glow */}
                    <div className="absolute inset-0 bg-teal-500/5 blur-md rounded-full pointer-events-none" />

                    {/* Top Line (Brighter) */}
                    <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-teal-400/30 to-transparent"></div>

                    {/* Text Content */}
                    <p className="text-slate-400 text-[9px] sm:text-[10px] font-tech tracking-[0.15em] uppercase font-bold">
                        © 2026 Pet Insight 360
                        <span className="hidden md:inline text-teal-500/50 mx-2">•</span>
                        <span className="block md:inline mt-1 md:mt-0 text-teal-400/60">System Integrity Secured</span>
                    </p>

                    {/* Bottom Line (Brighter) */}
                    <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-teal-400/30 to-transparent"></div>
                </div>
            </div>

            {/* Environment Floor Glow */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-[100px] bg-teal-500/10 blur-[80px] pointer-events-none" style={{ transform: 'rotateX(70deg) translateZ(-50px)' }} />
        </footer>
    )
}