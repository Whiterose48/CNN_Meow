import { motion } from 'framer-motion'
import { ExternalLink, Activity, Zap, Database, Code, Brain, Target } from 'lucide-react'

// ปรับข้อมูลและไอคอนให้ตรงกับ Personal Profile ล่าสุด
const members = [
    { id: 'phruk', name: 'Phruk', role: 'AI Data Engineer & Full-Stack', short: 'DATA ENG', icon: Database },
    { id: 'poom', name: 'Poom', role: 'Project Manager & AI Engineer', short: 'PM / AI', icon: Code },
    { id: 'boss', name: 'Boss', role: 'UX/UI Designer', short: 'UX / UI', icon: Target },
    { id: 'nut', name: 'Nut', role: 'Cloud Developer & Software Tester', short: 'CLOUD DEV / Tester', icon: Zap },
]

export default function Footer({ setPage }) {
    return (
        <footer className="relative z-20 mt-32 pb-12 px-4 md:px-6 overflow-hidden">
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

            <div className="max-w-7xl mx-auto relative group/footer perspective-1000">

                {/* ─── 3D LAYER 1: The Underlying Running Glow (แสงฟุ้งด้านหลัง) ─── */}
                <div className="absolute -inset-4 bg-gradient-to-r from-teal-500/40 via-blue-600/40 to-purple-600/40 rounded-[3rem] blur-3xl opacity-40 group-hover/footer:opacity-60 transition-opacity duration-1000 animate-pulse" style={{ transform: 'translateZ(-50px)' }} />

                {/* ─── 3D LAYER 2: The Running Border Beam (เส้นแสงวิ่งรอบขอบ) ─── */}
                <div className="absolute -inset-[2px] rounded-[2.5rem] overflow-hidden" style={{ transform: 'translateZ(-10px)' }}>
                    <div className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent_0deg_270deg,#2dd4bf_360deg)] animate-spin-slow opacity-80" />
                </div>

                {/* ─── 3D LAYER 3: The Main Glass Dock Container ─── */}
                <div className="relative bg-[#0a0f1c]/90 backdrop-blur-3xl rounded-[2.5rem] border border-white/10 p-8 md:p-12 overflow-hidden transform-style-3d shadow-2xl">
                    {/* Subtle inner diagonal shine */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-black/20 pointer-events-none" />

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 relative z-10">

                        {/* ─── LEFT COLUMN: BRANDING ─── */}
                        <div className="lg:col-span-1 flex flex-col justify-center">
                            <div className="flex items-center gap-4 mb-6">
                                {/* 3D Logo Container */}
                                <div className="relative w-16 h-16 flex items-center justify-center bg-gradient-to-br from-teal-500 to-blue-700 rounded-2xl shadow-[0_0_30px_rgba(45,212,191,0.3)] transform rotate-6 group-hover/footer:rotate-12 transition-transform duration-500 border border-white/20">
                                    <Activity size={32} className="text-white drop-shadow" />
                                    {/* Inner reflection */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-white/20 rounded-2xl" />
                                </div>
                                <div>
                                    <span className="font-tech font-black text-3xl tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-teal-200 drop-shadow-sm">
                                        PetInsight
                                    </span>
                                    <span className="block text-teal-400 text-xs tracking-[0.35em] font-tech uppercase font-bold">
                                        AI Diagnostics Core
                                    </span>
                                </div>
                            </div>
                            <p className="text-slate-300 text-base leading-relaxed font-body relative pl-4 border-l-2 border-teal-500/50 max-w-sm">
                                Pioneering the intersection of artificial intelligence and veterinary care. <br /> Let's build a healthier future for pets.
                            </p>
                        </div>

                        {/* ─── RIGHT COLUMN: TEAM MEMBERS (DATA CHIPS) ─── */}
                        <div className="lg:col-span-2">
                            <h3 className="font-tech text-lg font-bold text-slate-400 tracking-[0.2em] mb-8 flex items-center gap-4 uppercase">
                                <span className="w-12 h-[6px] bg-teal-500/50 inline-block" />
                                Core Development Unit
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                                {members.map((m) => (
                                    <motion.button
                                        key={m.id}
                                        onClick={() => setPage(m.id)}
                                        whileHover={{ y: -4, scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="relative group/card text-left perspective-500"
                                    >
                                        {/* Card Glow on Hover */}
                                        <div className="absolute -inset-[1px] bg-gradient-to-br from-teal-500/60 to-blue-600/60 rounded-xl blur-md opacity-0 group-hover/card:opacity-100 transition-opacity duration-500" />

                                        {/* Card Body */}
                                        <div className="relative bg-[#111827] border border-white/10 p-4 md:p-5 rounded-xl overflow-hidden group-hover/card:border-teal-500/50 transition-all duration-300 shadow-lg">
                                            {/* Background Tech Pattern */}
                                            <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />

                                            {/* Role Tag & Icon */}
                                            <div className="flex justify-between items-start mb-3">
                                                <span className="font-tech font-bold text-[0.65rem] text-teal-400/80 tracking-widest uppercase bg-teal-950/50 px-2 py-1 rounded-md border border-teal-500/20">
                                                    [{m.short}]
                                                </span>
                                                <m.icon size={18} className="text-slate-500 group-hover/card:text-teal-400 transition-colors" />
                                            </div>

                                            {/* Name & Full Role */}
                                            <div className="font-tech font-black text-xl text-white flex items-center justify-between relative z-10">
                                                {m.name}
                                                <ExternalLink size={18} className="text-teal-500 opacity-0 -translate-x-4 group-hover/card:opacity-100 group-hover/card:translate-x-0 transition-all duration-500 ease-out" />
                                            </div>
                                            <span className="text-slate-400 text-xs font-body block mt-1 truncate">{m.role}</span>

                                            {/* Bottom Running Light Strip */}
                                            <div className="absolute bottom-0 left-0 h-[3px] w-0 bg-gradient-to-r from-teal-400 to-blue-500 group-hover/card:w-full transition-all duration-700 ease-in-out shadow-[0_-2px_10px_rgba(45,212,191,0.5)]" />
                                        </div>
                                    </motion.button>
                                ))}
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            {/* ─── BOTTOM COPYRIGHT BAR ─── */}
            <div className="max-w-2xl mx-auto text-center mt-16 relative z-10 pb-8">
                <div className="relative inline-block px-12 py-6">
                    {/* Background Glow */}
                    <div className="absolute inset-0 bg-teal-500/5 blur-xl rounded-full pointer-events-none" />

                    {/* Top Line (Brighter) */}
                    <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-teal-400/50 to-transparent shadow-[0_0_10px_rgba(45,212,191,0.5)]"></div>

                    {/* Text Content */}
                    <p className="text-slate-300 text-sm md:text-base font-tech tracking-[0.2em] uppercase font-bold drop-shadow-sm">
                        © 2026 Pet Insight 360
                        <span className="hidden md:inline text-teal-500 mx-3">•</span>
                        <span className="block md:inline mt-2 md:mt-0 text-teal-400/80">System Integrity Secured</span>
                    </p>

                    {/* Bottom Line (Brighter) */}
                    <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-teal-400/50 to-transparent shadow-[0_0_10px_rgba(45,212,191,0.5)]"></div>
                </div>
            </div>

            {/* Environment Floor Glow */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-[200px] bg-teal-500/10 blur-[120px] pointer-events-none" style={{ transform: 'rotateX(70deg) translateZ(-100px)' }} />
        </footer>
    )
}