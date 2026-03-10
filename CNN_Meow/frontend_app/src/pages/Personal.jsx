import { useRef, useState, useMemo, Suspense, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float, MeshDistortMaterial, MeshWobbleMaterial, TorusKnot, Icosahedron, Box, Sphere, Points, PointMaterial, Environment, ContactShadows, Stars, Sparkles, PerspectiveCamera, Dodecahedron } from '@react-three/drei'
import * as THREE from 'three'
import { motion, useScroll, useTransform, useSpring } from 'framer-motion'
import { Brain, Code2, Database, Zap, Target, Cpu, Network, Users, CheckCircle2, Microscope, Briefcase, Trophy, Award } from 'lucide-react'
import ErrorBoundary from '../components/ErrorBoundary'

// ─── 0. SUB-COMPONENT: LOOPING TYPING TEXT ───
const LoopingTypingText = ({ text, className }) => {
    const [displayText, setDisplayText] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);
    const [speed, setSpeed] = useState(150);

    useEffect(() => {
        const handleTyping = () => {
            if (!isDeleting) {
                setDisplayText(text.substring(0, displayText.length + 1));
                setSpeed(120);
                if (displayText === text) {
                    setSpeed(3000);
                    setIsDeleting(true);
                }
            } else {
                setDisplayText(text.substring(0, displayText.length - 1));
                setSpeed(60);
                if (displayText === "") {
                    setIsDeleting(false);
                    setSpeed(500);
                }
            }
        };
        const timer = setTimeout(handleTyping, speed);
        return () => clearTimeout(timer);
    }, [displayText, isDeleting, speed, text]);

    return (
        <div className={className}>
            <span className="relative flex items-center justify-center">
                {displayText}
                <motion.span
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{ repeat: Infinity, duration: 0.8 }}
                    className="inline-block ml-1 w-1.5 h-6 md:h-10 bg-white align-middle shadow-[0_0_15px_#fff]"
                />
            </span>
        </div>
    );
};

// ─── 1. GLOBAL STYLES ───
const GlobalStyles = () => (
    <style>{`
        .font-tech { font-family: 'Rajdhani', sans-serif; }
        .font-body { font-family: 'Plus Jakarta Sans', sans-serif; }
        body { background-color: #010409; color: #f8fafc; overflow-x: hidden; }
        
        .glass-panel { 
            background: rgba(10, 15, 30, 0.75); 
            backdrop-filter: blur(24px); 
            border: 1px solid rgba(255, 255, 255, 0.08); 
        }

        .text-intense-neon {
            color: #ffffff;
            filter: drop-shadow(0 0 8px var(--member-color)) drop-shadow(0 0 20px var(--member-color-glow));
            text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
        }
    `}</style>
)

// ─── 2. HIGH-SPEC 3D CORES ───
const AICore = ({ color }) => { const ref = useRef(); useFrame((s) => (ref.current.rotation.set(s.clock.elapsedTime / 1.5, s.clock.elapsedTime / 2, 0))); return (<group scale={0.8}> <TorusKnot ref={ref} args={[1, 0.35, 256, 64]}> <MeshDistortMaterial color={color} distort={0.6} speed={3} metalness={1} roughness={0} emissive={color} emissiveIntensity={1.2} /> </TorusKnot> <Sparkles count={100} scale={4} size={2} speed={0.4} color={color} /> </group>) }
const FECore = ({ color }) => { const ref = useRef(); useFrame((s) => (ref.current.rotation.y = s.clock.elapsedTime / 1.2)); return (<group ref={ref} scale={0.8}> <Dodecahedron args={[1.2, 0]}> <MeshWobbleMaterial color={color} factor={0.6} speed={3} metalness={0.9} roughness={0.1} emissive={color} emissiveIntensity={1.5} /> </Dodecahedron> <Icosahedron args={[1.8, 1]}> <meshStandardMaterial color={color} wireframe transparent opacity={0.6} /> </Icosahedron> <Sparkles count={80} scale={6} size={1.5} color="#fff" /> </group>) }
const BECore = ({ color }) => { const ref = useRef(); useFrame((s) => { ref.current.rotation.y = s.clock.elapsedTime * 0.4; ref.current.children.forEach((c, i) => (c.rotation.x = s.clock.elapsedTime * (i + 1) * 0.2)) }); return (<group ref={ref} scale={0.8}> <Box args={[1.3, 1.3, 1.3]}> <MeshDistortMaterial color={color} distort={0.3} speed={2} metalness={1} roughness={0.1} emissive={color} emissiveIntensity={1.2} /> </Box> {[1.8, 2.3].map((r, i) => (<TorusKnot key={i} args={[r, 0.03, 128, 16]}> <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} /> </TorusKnot>))} </group>) }
const DSCore = ({ color }) => { const ref = useRef(); const positions = useMemo(() => new Float32Array([...Array(3000)].map(() => (Math.random() - 0.5) * 6.5)), []); useFrame((s) => (ref.current.rotation.y = s.clock.elapsedTime / 3)); return (<group ref={ref} scale={0.8}> <Sphere args={[0.8, 64, 64]}> <meshStandardMaterial color={color} emissive={color} emissiveIntensity={4} /> </Sphere> <Points positions={positions} stride={3}> <PointMaterial transparent color={color} size={0.03} sizeAttenuation={true} depthWrite={false} blending={THREE.AdditiveBlending} /> </Points> </group>) }

// ─── 3. DATA ───
const MEMBER_DATA = {
    phruk: {
        role: "AI Data Engineer & Full-Stack", 
        skills: ["Data Engineering (ETL)", "Databricks & Spark", "Machine Learning & DL", "Full-Stack Web"], 
        passion: "เปลี่ยนข้อมูลดิบที่ซับซ้อนให้เป็นระบบอัจฉริยะและแอปพลิเคชันที่สร้างอิมแพคได้จริงตั้งแต่ต้นน้ำถึงปลายน้ำ", 
        exp: "เชี่ยวชาญการวางสถาปัตยกรรมข้อมูล (Medallion Architecture) และการผสานโมเดล AI ขั้นสูงเข้ากับ Web Platform", 
        experiences: [
            "Databricks - AI Data Engineer Bootcamp",
            "Co-Founder & Full Stack Developer - STARGAZE",
            "Teacher Director & Head Workshop Data Science",
            "Teacher Assistant (DGA 305)"
        ],
        competitions: [
            "Outstanding Student Award, 30th Anniversary IT KMITL",
            "Top 3 Ranking – KGI Securities Algo Trading",
            "Finalist – Smart Irrigation Recommendation",
            "Special Award – Lung Pathology Detection"
        ],
        contribution: "ออกแบบและพัฒนา Full-stack Web App แบบ End-to-End บูรณาการ AI/LLM สร้างระบบอัจฉริยะตอบโจทย์ใช้งานจริง", 
        synergy: "สะพานเชื่อมระหว่าง AI Engineer และ Full-Stack ผมออกแบบสถาปัตยกรรมเว็บที่พร้อมรองรับและสเกลโมเดลซับซ้อนให้สมบูรณ์แบบ", 
        color: "#3b82f6", colorGlow: "rgba(59, 130, 246, 0.8)", gradient: "linear-gradient(to right, #1d4ed8, #3b82f6, #1d4ed8)", 
        icon: Database, CoreComponent: AICore
    },
    poom: {
        role: "Project Manager & AI Engineer", 
        skills: ["Data Engineering", "Data Science", "Data Visualization", "AI & Vision Models"], 
        passion: "มุ่งมั่นพัฒนาระบบ AI เพื่อเปลี่ยนข้อมูลซับซ้อนเป็นระบบอัจฉริยะ วิเคราะห์อารมณ์สัตว์ได้ลึกกว่าการจำแนกสายพันธุ์", 
        exp: "ประสบการณ์สร้าง Web Application และสถาปัตยกรรมระบบ ตั้งแต่ออกแบบโครงสร้างถึงสเกลระบบ", 
        experiences: [
            "ระบบ E-Commerce บริหารจัดการออนไลน์",
            "ระบบ Booking จองที่พักธุรกิจโรงแรม",
            "สร้างระบบ Pet Insight 360 แบบ End-to-End"
        ],
        competitions: [],
        contribution: "บริหารโปรเจกต์ AI ออกแบบระบบ พัฒนาโมเดล และประสานงานทีมให้ทำงานตามเป้าหมายและมีประสิทธิภาพ", 
        synergy: "รับผิดชอบสูง ตรงต่อเวลา บริหารเวลาได้ดี มีทักษะสื่อสารและทำงานร่วมกับทีมอย่างมีประสิทธิภาพ", 
        color: "#38bdf8", colorGlow: "rgba(56, 189, 248, 0.8)", gradient: "linear-gradient(to right, #0284c7, #38bdf8, #0284c7)", 
        icon: Code2, CoreComponent: FECore 
    },
    boss: { 
        role: "UX/UI Designer", 
        skills: ["UX/UI Design", "User Flow & Interaction", "Visual Design", "Responsive Web"], 
        passion: "ออกแบบประสบการณ์ผู้ใช้ ทำให้ AI ซับซ้อนกลายเป็นระบบที่เข้าใจง่าย ใช้งานได้จริงในแพลตฟอร์มเดียว", 
        exp: "เชี่ยวชาญการออกแบบ UX/UI สำหรับ Web App และ Dashboard เน้นนำเสนอข้อมูลซับซ้อนให้เข้าใจง่าย", 
        experiences: [
            "ออกแบบ UX/UI Web Application & Dashboard",
            "สร้าง Data Visualization Dashboard วิเคราะห์ธุรกิจ",
            "พัฒนา Interface แสดงผล Data Analytics",
            "Pizza Sales Data Visualization"
        ],
        competitions: [],
        contribution: "ออกแบบ UX/UI ของระบบ Pet Insight 360 พัฒนา Layout และ Visual ให้ใช้งานง่ายและเป็นมิตร", 
        synergy: "เชื่อมต่อวิเคราะห์ข้อมูลเชิงลึกและการออกแบบประสบการณ์ผู้ใช้ นำเสนอผลลัพธ์ให้ผู้ใช้งานเข้าใจได้จริง", 
        color: "#60a5fa", colorGlow: "rgba(96, 165, 250, 0.8)", gradient: "linear-gradient(to right, #2563eb, #60a5fa, #2563eb)", 
        icon: Target, CoreComponent: BECore 
    },
    nut: { 
        role: "Cloud Developer", 
        skills: ["Data Engineering", "Data Science", "Data Visualization", "Backend Dev"], 
        passion: "ทำระบบที่เข้าใจสัตว์ไม่เพียงแค่สายพันธุ์ แต่เข้าใจลึกถึงความรู้สึกและอารมณ์ผ่าน Vision Model", 
        exp: "ประสบการณ์จัดการโครงสร้างข้อมูลและสกัด Insight ใช้ประโยชน์ร่วมกับ Cloud", 
        experiences: [
            "ออกแบบสถาปัตยกรรม/Database ระบบจองตั๋วภาพยนตร์",
            "สร้าง Data Visualization นำเสนอสถิติอุบัติเหตุ",
            "พัฒนา Data Warehouse บริหารจัดการร้านโทรศัพท์"
        ],
        competitions: [],
        contribution: "ดูแล Backend และ Cloud Infrastructure จัดการฐานข้อมูลรองรับการทำงานของ Vision Model", 
        synergy: "รับผิดชอบสูง ตรงต่อเวลา สื่อสารเยี่ยม ช่วยให้การประสานงานกับสมาชิกทีมราบรื่น", 
        color: "#10b981", colorGlow: "rgba(16, 185, 129, 0.8)", gradient: "linear-gradient(to right, #059669, #10b981, #059669)", 
        icon: Zap, CoreComponent: DSCore 
    }
}

// ─── 4. MAIN COMPONENT ───
export default function Personal({ name, setPage }) {
    const id = name?.toLowerCase() || 'phruk';
    const data = MEMBER_DATA[id] || MEMBER_DATA['phruk'];
    const Core = data.CoreComponent;

    const containerRef = useRef(null);
    const { scrollYProgress } = useScroll({ target: containerRef });
    const smoothProgress = useSpring(scrollYProgress, { stiffness: 80, damping: 25 });

    const heroY = useTransform(smoothProgress, [0, 0.5], ["0%", "30%"]);
    const heroOpacity = useTransform(smoothProgress, [0, 0.3], [1, 0]);
    const contentY = useTransform(smoothProgress, [0.1, 0.6], [80, 0]);
    const contentOpacity = useTransform(smoothProgress, [0.1, 0.4], [0, 1]);

    return (
        <div ref={containerRef} className="min-h-[120vh] relative font-body pb-24 overflow-x-hidden"
            style={{ '--member-color': data.color, '--member-gradient': data.gradient, '--member-color-glow': data.colorGlow }}>
            <GlobalStyles />

            {/* ── BACKGROUND ── */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-[#010409]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(2,6,23,0.6)_0%,#010409_100%)]" />
                <div className="absolute inset-0 bg-gradient-to-b from-[#010409]/60 via-transparent to-[#010409]/90 z-10" />

                <ErrorBoundary fallback={<div className="fixed inset-0 bg-[#010409]" />}>
                    <Canvas shadows dpr={[1, 1.5]}>
                        <PerspectiveCamera makeDefault position={[0, 0, 8]} fov={35} />
                        <Suspense fallback={null}>
                            <Stars radius={100} depth={40} count={3000} factor={3} saturation={0} fade speed={1} />
                            <ambientLight intensity={0.4} />
                            <pointLight position={[10, 10, 10]} color={data.color} intensity={10} />
                            <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
                                <Core color={data.color} />
                            </Float>
                            <Environment preset="night" />
                            <ContactShadows opacity={0.4} scale={15} blur={2} far={4} color={data.color} />
                        </Suspense>
                    </Canvas>
                </ErrorBoundary>
            </div>

            <div className="relative z-20 max-w-4xl mx-auto px-4 sm:px-6 pt-32 md:pt-40">

                {/* ── HERO SECTION ── */}
                <motion.div style={{ y: heroY, opacity: heroOpacity }} className="flex flex-col items-center mb-20 text-center">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20 mb-6 z-30 backdrop-blur-md">
                        <Users size={12} className="text-teal-400" />
                        <span className="text-xs font-tech font-bold tracking-[0.3em] uppercase text-white">My Team</span>
                    </div>

                    <div className="relative mb-8 z-30 group">
                        <div className="absolute inset-0 blur-[50px] opacity-30 animate-pulse" style={{ background: data.color }} />
                        <div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl p-[2px] bg-gradient-to-br from-white/30 to-transparent relative z-10 shadow-xl flex items-center justify-center border border-white/10 overflow-hidden bg-[#0a0f1e]">
                            {data.image ? (
                                <motion.img initial={{ opacity: 0 }} animate={{ opacity: 1 }} src={data.image} alt={name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            ) : (
                                <span className="text-4xl md:text-5xl font-tech font-black text-white">{(name || id).charAt(0).toUpperCase()}</span>
                            )}
                        </div>
                        <div className="absolute -bottom-2 -right-2 glass-panel p-2.5 rounded-2xl border-2 shadow-xl z-20" style={{ borderColor: data.color }}>
                            <data.icon size={18} style={{ color: data.color }} />
                        </div>
                    </div>

                    <div className="relative z-40">
                        <LoopingTypingText text={(name || id).toUpperCase()} className="text-4xl md:text-6xl font-tech font-black uppercase text-intense-neon leading-none tracking-tight mb-4" />
                        <div className="inline-flex items-center gap-2 px-5 py-1.5 rounded-full glass-panel border border-white/10">
                            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: data.color }} />
                            <span className="font-tech text-sm md:text-base font-bold tracking-wider text-white">{data.role}</span>
                        </div>
                    </div>
                </motion.div>

                {/* ── BENTO CONTENT ── */}
                <motion.div style={{ y: contentY, opacity: contentOpacity }} className="grid grid-cols-1 md:grid-cols-12 gap-4 relative z-30">

                    {/* 🔥 PASSION */}
                    <div className="md:col-span-7 group relative glass-panel p-6 md:p-8 rounded-3xl overflow-hidden border border-white/5 hover:border-rose-500/30 transition-all duration-300 flex flex-col justify-center">
                        <div className="absolute -top-16 -right-16 w-40 h-40 blur-[60px] rounded-full bg-rose-500/10 group-hover:bg-rose-500/20 transition-colors" />
                        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-rose-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-3 font-tech font-bold tracking-[0.15em] text-xs uppercase text-rose-400">
                                <span>🔥</span> PASSION
                            </div>
                            <p className="text-lg md:text-xl font-bold text-white leading-[1.4] font-body tracking-tight">
                                "{data.passion}"
                            </p>
                        </div>
                    </div>

                    {/* 👥 ความรับผิดชอบ */}
                    <div className="md:col-span-5 glass-panel p-6 rounded-3xl flex flex-col justify-between border border-white/5 hover:border-violet-500/30 border-l-[3px] border-l-violet-500/50 transition-all group">
                        <div>
                            <div className="flex items-center gap-2 mb-3 font-tech text-xs tracking-widest text-violet-400 uppercase font-bold">
                                <span>👥</span> RESPONSIBILITY
                            </div>
                            <p className="text-sm md:text-base text-slate-200 font-medium leading-relaxed font-body line-clamp-4 md:line-clamp-none">
                                {data.contribution}
                            </p>
                        </div>
                        <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-end">
                            <span className="text-slate-400 text-[10px] font-bold uppercase font-tech">Integrity</span>
                            <span className="text-lg font-tech font-black text-violet-400 group-hover:scale-110 origin-right transition-transform">100%</span>
                        </div>
                    </div>

                    {/* ⚙️ SKILLS */}
                    <div className="md:col-span-12 glass-panel p-6 md:p-8 rounded-3xl border border-white/5 relative hover:border-sky-500/20 transition-all">
                        <div className="flex items-center gap-3 mb-5 text-white">
                            <Cpu size={18} className="text-sky-400" />
                            <h3 className="font-tech text-base md:text-lg font-bold tracking-wider uppercase text-white">Core Skills</h3>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            {data.skills.map((s, i) => (
                                <div key={i} className="px-4 py-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center gap-3 hover:border-sky-500/30 hover:bg-sky-500/[0.05] transition-all group shadow-sm">
                                    <CheckCircle2 size={14} className="text-sky-400 opacity-60 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                                    <span className="font-body font-medium text-xs md:text-sm text-slate-200 group-hover:text-white transition-colors truncate">{s}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 💼 ประสบการณ์ และ 🏆 รางวัล */}
                    {data.experiences ? (
                        <>
                            <div className="md:col-span-6 glass-panel p-6 md:p-8 rounded-3xl border border-white/5 border-l-[3px] border-l-emerald-500 hover:border-emerald-500/30 transition-all group">
                                <div className="absolute -left-8 -bottom-8 w-24 h-24 bg-emerald-500/5 blur-[40px] rounded-full pointer-events-none group-hover:bg-emerald-500/10" />
                                <div className="flex items-center gap-2.5 mb-5 relative z-10">
                                    <Briefcase size={18} className="text-emerald-400" />
                                    <h4 className="font-tech font-bold text-base uppercase tracking-wider text-slate-100">Experience</h4>
                                </div>
                                <ul className="space-y-3 relative z-10">
                                    {data.experiences.map((item, i) => (
                                        <li key={i} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-start gap-3 hover:border-emerald-500/20 hover:bg-emerald-500/[0.03] transition-colors">
                                            <span className="text-emerald-400 text-xs mt-0.5 flex-shrink-0 opacity-80">▹</span>
                                            <span className="text-xs md:text-sm text-slate-200 font-body font-light leading-snug">{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="md:col-span-6 glass-panel p-6 md:p-8 rounded-3xl border border-white/5 border-l-[3px] border-l-amber-500 relative overflow-hidden group hover:border-amber-500/30 transition-all">
                                <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-amber-500/10 blur-[50px] rounded-full pointer-events-none group-hover:bg-amber-500/15" />
                                <div className="flex items-center gap-2.5 mb-5 relative z-10">
                                    <Trophy size={18} className="text-amber-400" />
                                    <h4 className="font-tech font-bold text-base uppercase tracking-wider text-white">Awards</h4>
                                </div>
                                <ul className="space-y-3 relative z-10">
                                    {data.competitions && data.competitions.length > 0 ? (
                                        data.competitions.map((item, i) => (
                                            <li key={i} className="p-3 rounded-xl bg-gradient-to-r from-amber-500/[0.03] to-transparent border border-amber-500/10 flex items-start gap-3 hover:border-amber-500/30 hover:bg-amber-500/[0.05] transition-all">
                                                <Award size={14} className="text-amber-400 mt-0.5 flex-shrink-0" />
                                                <span className="text-xs md:text-sm text-slate-100 font-body font-light leading-snug">{item}</span>
                                            </li>
                                        ))
                                    ) : (
                                        <li className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-center min-h-[80px]">
                                            <span className="text-xs text-slate-400 font-body font-light italic">
                                                Building impactful projects.
                                            </span>
                                        </li>
                                    )}
                                </ul>
                            </div>
                        </>
                    ) : (
                        <div className="md:col-span-12 glass-panel p-6 md:p-8 rounded-3xl border border-white/5 border-l-[3px] border-l-emerald-500 hover:border-emerald-500/30 transition-all">
                            <div className="flex items-center gap-2.5 mb-4 text-emerald-400">
                                <Briefcase size={18} />
                                <h4 className="font-tech font-bold text-base uppercase tracking-wider">Experience</h4>
                            </div>
                            <p className="text-xs md:text-sm text-slate-200 leading-relaxed font-body font-light">{data.exp}</p>
                        </div>
                    )}

                    {/* 🤝 COMPLEMENTARY SKILLS */}
                    <div className={`glass-panel p-6 md:p-8 rounded-3xl border border-white/5 border-l-[3px] group transition-all hover:border-white/20 md:col-span-12`} style={{ borderLeftColor: data.color }}>
                        <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-b from-transparent to-white/[0.01] pointer-events-none rounded-[2rem]" />
                        <div className="flex items-center gap-2.5 mb-3 text-white relative z-10">
                            <Network size={18} style={{ color: data.color }} />
                            <h4 className="font-tech font-bold text-base uppercase tracking-wider">Complementary Skills</h4>
                        </div>
                        <p className="text-xs md:text-sm text-slate-200 leading-relaxed font-body font-light max-w-3xl relative z-10">{data.synergy}</p>
                    </div>

                </motion.div>

            </div>
        </div>
    );
}