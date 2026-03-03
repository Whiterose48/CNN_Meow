import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { User, LogIn, LogOut, LayoutDashboard, Home, Layers, ScanLine, Clock, Activity } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

// ─── UTILS: DATE FORMATTER ───
const getOrdinal = (n) => {
    const s = ["TH", "ST", "ND", "RD"];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
};

const formatTimeUTC7 = () => {
    const now = new Date();
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    const bkkTime = new Date(utcTime + (3600000 * 7));

    const date = bkkTime.getDate();
    const month = bkkTime.toLocaleString('en-US', { month: 'short' });

    let hours = bkkTime.getHours();
    const minutes = bkkTime.getMinutes().toString().padStart(2, '0');
    const seconds = bkkTime.getSeconds().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';

    hours = hours % 12;
    hours = hours ? hours : 12;
    const strHours = hours.toString().padStart(2, '0');

    return `${date}${getOrdinal(date)}, ${month} ${strHours}:${minutes}:${seconds} ${ampm}`;
};

// ─── SUB-COMPONENT: REALTIME CLOCK ───
const RealtimeClock = () => {
    const [timeString, setTimeString] = useState(formatTimeUTC7());

    useEffect(() => {
        const interval = setInterval(() => {
            setTimeString(formatTimeUTC7());
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="hidden xl:flex flex-col items-end justify-center mr-6 border-r border-white/10 pr-6 h-10">
            <div className="flex items-center gap-2 text-slate-400 mb-0.5">
                <Clock size={12} className="animate-pulse" />
                <span className="text-[10px] font-tech font-bold tracking-[0.2em] uppercase">Bangkok (UTC+7)</span>
            </div>
            <div className="font-tech text-sm font-semibold text-slate-200 tracking-wider tabular-nums drop-shadow-md">
                {timeString}
            </div>
        </div>
    );
};

// ─── MAIN COMPONENT ───
export default function Nav({ page, setPage }) {
    const { user, loginWithGoogle, logout } = useAuth();

    // กำหนดสีและเงาแยกตามแต่ละหน้า
    const links = [
        { id: 'home', label: 'HOME', icon: Home, color: 'bg-teal-400', shadow: 'shadow-teal-400/50', hover: 'hover:text-teal-300' },
        { id: 'plans', label: 'PLANS', icon: Layers, color: 'bg-amber-400', shadow: 'shadow-amber-400/50', hover: 'hover:text-amber-300' },
        { id: 'analyze', label: 'ANALYZE', icon: ScanLine, color: 'bg-blue-400', shadow: 'shadow-blue-400/50', hover: 'hover:text-blue-300' },
        { id: 'dashboard', label: 'DASHBOARD', icon: LayoutDashboard, color: 'bg-fuchsia-400', shadow: 'shadow-fuchsia-400/50', hover: 'hover:text-fuchsia-300' },
    ];

    return (
        <>
            <style>{`
                .font-tech { font-family: 'Rajdhani', sans-serif; }
                .font-body { font-family: 'Plus Jakarta Sans', sans-serif; }

                @property --angle {
                    syntax: '<angle>';
                    initial-value: 0deg;
                    inherits: false;
                }
                @keyframes rotate-gradient {
                    to { --angle: 360deg; }
                }
                /* Border วิ่งรวมสีทุกหน้าเข้าด้วยกัน */
                .gradient-border-mask {
                    position: absolute;
                    inset: -2px;
                    border-radius: 9999px;
                    padding: 2px;
                    background: conic-gradient(from var(--angle), #2dd4bf, #fbbf24, #60a5fa, #e879f9, #2dd4bf);
                    animation: rotate-gradient 4s linear infinite;
                    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
                    -webkit-mask-composite: xor;
                    mask-composite: exclude;
                    pointer-events: none;
                }
            `}</style>

            <div className="fixed top-6 left-0 right-0 z-50 flex justify-center px-4 font-body">

                {/* ─── NAV CONTAINER ─── */}
                <motion.nav
                    initial={{ y: -100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 100, damping: 20 }}
                    className="relative w-full max-w-6xl"
                >
                    {/* 1. Multi-color Animated Border */}
                    <div className="gradient-border-mask opacity-70" />

                    {/* 2. Glass Background */}
                    <div className="relative flex items-center justify-between w-full px-4 py-3 bg-[#0f172a]/90 backdrop-blur-2xl rounded-full border border-white/5 shadow-2xl overflow-hidden">

                        {/* ── LEFT: LOGO ── */}
                        <div
                            className="flex items-center gap-3 cursor-pointer group pl-2"
                            onClick={() => setPage('home')}
                        >
                            <div className="relative w-12 h-12 flex items-center justify-center bg-gradient-to-br group-hover:rotate-12 transition-transform duration-300">
                                <img
                                    src="/logo.png"
                                    onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
                                    alt="Logo"
                                    className="w-10 h-10 object-contain"
                                />
                                <Activity size={24} className="text-white hidden" style={{ display: 'none' }} />
                                <div className="absolute inset-0 bg-white/20 rounded-xl blur-sm opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <div className="hidden md:flex flex-col">
                                <span className="text-xl font-tech font-black tracking-tighter text-white leading-none">
                                    PET<span className="text-teal-400">INSIGHT</span>
                                </span>
                                <span className="text-[0.6rem] text-slate-400 tracking-[0.3em] uppercase font-tech font-bold">AI Diagnostics</span>
                            </div>
                        </div>

                        {/* ── CENTER: COLORFUL PILLS ── */}
                        <div className="hidden lg:flex items-center gap-1 bg-black/40 p-1.5 rounded-full border border-white/5">
                            {links.map((l) => {
                                const isActive = page === l.id;
                                return (
                                    <button
                                        key={l.id}
                                        onClick={() => setPage(l.id)}
                                        className={`relative px-6 py-2 rounded-full text-sm font-bold transition-all duration-300 z-10 flex items-center gap-2 font-tech tracking-wide ${isActive ? 'text-[#0b1121]' : `text-slate-400 ${l.hover}`
                                            }`}
                                    >
                                        {isActive && (
                                            <motion.div
                                                layoutId="active-pill"
                                                className={`absolute inset-0 rounded-full ${l.color} shadow-[0_0_25px] ${l.shadow}`}
                                                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                                            />
                                        )}
                                        <l.icon size={16} className={`relative z-10 ${isActive ? 'text-[#0b1121]' : ''}`} />
                                        <span className={`relative z-10 ${isActive ? 'translate-y-[1px]' : ''}`}>{l.label}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* ── RIGHT: CLOCK & AUTH ── */}
                        <div className="flex items-center gap-4 pr-2">

                            {/* Clock */}
                            <RealtimeClock />

                            {/* User / Login */}
                            <AnimatePresence mode="wait">
                                {user ? (
                                    <motion.div
                                        key="logged-in"
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        className="flex items-center gap-3 pl-2"
                                    >
                                        <div className="hidden sm:flex flex-col items-end text-right">
                                            <span className="text-sm font-bold text-white leading-none font-tech tracking-wide uppercase">{user.name || 'User'}</span>
                                            <span className="text-[9px] text-teal-400 uppercase tracking-widest font-black font-tech">Online</span>
                                        </div>
                                        <div className="relative group cursor-pointer" onClick={logout}>
                                            <div className="absolute -inset-0.5 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full blur opacity-50 group-hover:opacity-100 transition duration-300"></div>
                                            <img
                                                src={user.image || "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"}
                                                alt="Profile"
                                                className="relative w-9 h-9 rounded-full border-2 border-[#0f172a] bg-zinc-800 object-cover"
                                            />
                                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-[#0f172a] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <LogOut size={6} className="text-white" />
                                            </div>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <motion.button
                                        key="login-btn"
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={loginWithGoogle}
                                        className="relative group overflow-hidden rounded-full bg-teal-500 px-6 py-2 transition-all duration-300 cursor-pointer shadow-[0_0_20px_rgba(45,212,191,0.2)] hover:shadow-[0_0_30px_rgba(45,212,191,0.4)]"
                                    >
                                        <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-teal-300 via-white to-teal-300 opacity-0 group-hover:opacity-20 transition-opacity"></span>
                                        <div className="relative flex items-center gap-2">
                                            <LogIn size={16} className="text-[#0b1121]" />
                                            <span className="text-sm font-black text-[#0b1121] tracking-widest font-tech">LOGIN</span>
                                        </div>
                                    </motion.button>
                                )}
                            </AnimatePresence>
                        </div>

                    </div>
                </motion.nav>
            </div>
        </>
    )
}