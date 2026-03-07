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
            <span className="relative">
                {displayText}
                <motion.span
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{ repeat: Infinity, duration: 0.8 }}
                    className="inline-block ml-1 w-2 h-10 md:h-14 bg-white align-middle shadow-[0_0_20px_#fff]"
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
            filter: drop-shadow(0 0 10px var(--member-color)) drop-shadow(0 0 30px var(--member-color-glow));
            text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
        }
    `}</style>
)

// ─── 2. HIGH-SPEC 3D CORES ───
const AICore = ({ color }) => { const ref = useRef(); useFrame((s) => (ref.current.rotation.set(s.clock.elapsedTime / 1.5, s.clock.elapsedTime / 2, 0))); return (<group> <TorusKnot ref={ref} args={[1, 0.35, 256, 64]}> <MeshDistortMaterial color={color} distort={0.6} speed={3} metalness={1} roughness={0} emissive={color} emissiveIntensity={1.2} /> </TorusKnot> <Sparkles count={150} scale={4} size={3} speed={0.4} color={color} /> </group>) }
const FECore = ({ color }) => { const ref = useRef(); useFrame((s) => (ref.current.rotation.y = s.clock.elapsedTime / 1.2)); return (<group ref={ref}> <Dodecahedron args={[1.2, 0]}> <MeshWobbleMaterial color={color} factor={0.6} speed={3} metalness={0.9} roughness={0.1} emissive={color} emissiveIntensity={1.5} /> </Dodecahedron> <Icosahedron args={[1.8, 1]}> <meshStandardMaterial color={color} wireframe transparent opacity={0.6} /> </Icosahedron> <Sparkles count={100} scale={6} size={2} color="#fff" /> </group>) }
const BECore = ({ color }) => { const ref = useRef(); useFrame((s) => { ref.current.rotation.y = s.clock.elapsedTime * 0.4; ref.current.children.forEach((c, i) => (c.rotation.x = s.clock.elapsedTime * (i + 1) * 0.2)) }); return (<group ref={ref}> <Box args={[1.3, 1.3, 1.3]}> <MeshDistortMaterial color={color} distort={0.3} speed={2} metalness={1} roughness={0.1} emissive={color} emissiveIntensity={1.2} /> </Box> {[1.8, 2.3].map((r, i) => (<TorusKnot key={i} args={[r, 0.03, 128, 16]}> <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} /> </TorusKnot>))} </group>) }
const DSCore = ({ color }) => { const ref = useRef(); const positions = useMemo(() => new Float32Array([...Array(4500)].map(() => (Math.random() - 0.5) * 6.5)), []); useFrame((s) => (ref.current.rotation.y = s.clock.elapsedTime / 3)); return (<group ref={ref}> <Sphere args={[0.8, 64, 64]}> <meshStandardMaterial color={color} emissive={color} emissiveIntensity={4} /> </Sphere> <Points positions={positions} stride={3}> <PointMaterial transparent color={color} size={0.04} sizeAttenuation={true} depthWrite={false} blending={THREE.AdditiveBlending} /> </Points> </group>) }

// ─── 3. DATA ───
const MEMBER_DATA = {
    phruk: {
        role: "AI Data Engineer & Full-Stack Developer", 
        skills: ["Data Engineering (ETL)", "Databricks & Spark", "Machine Learning & Deep Learning", "Full-Stack Development"], 
        passion: "เปลี่ยนข้อมูลดิบที่ซับซ้อนให้เป็นระบบอัจฉริยะและแอปพลิเคชันที่สร้างอิมแพคได้จริงตั้งแต่ต้นน้ำถึงปลายน้ำ", 
        
        exp: "เชี่ยวชาญการวางสถาปัตยกรรมข้อมูล (Medallion Architecture) และการผสานโมเดล AI ขั้นสูง (GenAI, CNN) เข้ากับ Web Platform ระดับโปรดักชัน", 
        
        experiences: [
            "Databricks - AI Data Engineer Bootcamp",
            "Co-Founder & Full Stack Developer - STARGAZE",
            "Teacher Director & Head Workshop Data Science - IT Open House 2025",
            "Teacher Assistant (DGA 305 - Batches 1-3)"
        ],
        competitions: [
            "Outstanding Student Award, 30th Anniversary IT KMITL",
            "Top 3 Ranking – KGI Securities Algo Trading Competition",
            "Finalist (Top 36 Teams) – Smart Irrigation Recommendation",
            "Special Award Winner – Lung Pathology Detection",
            "Finalist (Top 20 Teams) – Contactless Gaze Input System"
        ],

        contribution: "ออกแบบและพัฒนา Full-stack Web Application แบบ End-to-End พร้อมบูรณาการโมเดล AI (CNN) และ Large Language Models (LLM) เพื่อสร้างระบบอัจฉริยะที่ตอบโจทย์การใช้งานจริง", 
        synergy: "เป็นสะพานเชื่อมระหว่าง AI Engineer และ Full-Stack Development ด้วยแพสชันที่อยากเห็น AI ทำงานได้จริง ผมจึงออกแบบสถาปัตยกรรมเว็บที่พร้อมรองรับและสเกลโมเดลซับซ้อนให้ทำงานได้อย่างสมบูรณ์แบบ", 
        color: "#3b82f6", 
        colorGlow: "rgba(59, 130, 246, 0.9)", 
        gradient: "linear-gradient(to right, #1d4ed8, #3b82f6, #1d4ed8)", 
        icon: Database, 
        CoreComponent: AICore
    },
    poom: {
        role: "Project Manager & AI Engineer", 
        skills: ["Data Engineering", "Data Science", "Data Visualization", "Project Management", "AI Modeling"], 
        passion: "มุ่งมั่นพัฒนาและบริหารโปรเจกต์ด้าน AI เพื่อเปลี่ยนข้อมูลที่ซับซ้อนให้กลายเป็นระบบอัจฉริยะที่ใช้งานได้จริง พร้อมนำเทคโนโลยีด้าน Machine Learning และ Vision Models มาประยุกต์ใช้เพื่อสร้างนวัตกรรมที่สามารถเข้าใจพฤติกรรมและอารมณ์ของสัตว์ได้ลึกกว่าการจำแนกเพียงสายพันธุ์", 
        
        exp: "มีประสบการณ์ในการบริหารจัดการโปรเจกต์เทคโนโลยีตั้งแต่เริ่มต้นจนจบกระบวนการ พร้อมทั้งมีความเข้าใจในวงจรการพัฒนา AI และสถาปัตยกรรมระบบเป็นอย่างดี", 
        
        experiences: [
            "สร้างระบบ E-Commerce สำหรับขายสินค้าออนไลน์",
            "สร้างระบบจองที่พักและจัดการข้อมูลสำหรับโรงแรม",
            "วางแผนและพัฒนาระบบ Pet Insight 360 แบบ End-to-End สำเร็จภายใน 3 วัน"
        ],
        competitions: [
            "1st place in KMUTT Hackathon 2024",
            "2nd place KGI Algo trading 2025"
        ],

        contribution: "วางแผนและบริหารการพัฒนาโปรเจกต์ด้านเทคโนโลยีและ AI ตั้งแต่การออกแบบระบบ การวิเคราะห์ข้อมูล ไปจนถึงการพัฒนาโมเดลและนำระบบไปใช้งานจริง พร้อมทั้งประสานงานกับทีมเพื่อให้การทำงานบรรลุเป้าหมาย", 
        synergy: "มีความเป็นผู้นำ มีความรับผิดชอบ และสื่อสารได้ดี มีความสามารถในการแก้ปัญหาที่ซับซ้อน สามารถแก้ไขปัญหาเฉพาะหน้าได้รวดเร็ว และบริหารจัดการอารมณ์ในการทำงานร่วมกับทีมได้อย่างมีประสิทธิภาพ", 
        color: "#38bdf8", 
        colorGlow: "rgba(56, 189, 248, 0.9)", 
        gradient: "linear-gradient(to right, #0284c7, #38bdf8, #0284c7)", 
        icon: Code2, 
        CoreComponent: FECore 
    },
    boss: { 
        role: "UX/UI Designer", 
        skills: ["UX/UI Design", "User Flow & Interaction Design", "Visual Design & Layout", "Responsive Web Design"], 
        passion: "ออกแบบประสบการณ์ผู้ใช้ที่ทำให้เทคโนโลยี AI ที่ซับซ้อน กลายเป็นระบบที่เข้าใจง่าย ใช้งานได้จริง และช่วยให้เจ้าของสัตว์เลี้ยงเข้าถึงข้อมูลสำคัญได้อย่างชัดเจนในแพลตฟอร์มเดียว", 
        
        exp: "เชี่ยวชาญการออกแบบ UX/UI สำหรับ Web Application และ Data Dashboard ที่เน้นการนำเสนอข้อมูลซับซ้อนให้เข้าใจง่าย", 
        
        experiences: [
            "ออกแบบ UX/UI สำหรับ Web Application และ Dashboard",
            "สร้าง Data Visualization Dashboard เพื่อวิเคราะห์ข้อมูลธุรกิจ",
            "พัฒนา interface สำหรับแสดงผล Data Analytics และ Business Insights",
            "Pizza Sales Data Visualization Dashboard",
            "Data Imputation & Customer Preference Prediction",
            "Data Pipeline Architecture Project",
            "Student Sleep Pattern Analysis",
            "Two-Way ANOVA Analysis of Smoking Behavior in Thailand"
        ],
        competitions: [],

        contribution: "ออกแบบ User Experience และ User Interface ของระบบ Pet Insight 360 พัฒนา layout และ visual elements ให้ระบบใช้งานง่ายและเป็นมิตรกับผู้ใช้", 
        synergy: "เชื่อมต่อระหว่างการวิเคราะห์ข้อมูลเชิงลึกและการออกแบบประสบการณ์ผู้ใช้ ทำให้สามารถสร้างระบบที่ไม่เพียงแค่ประมวลผลข้อมูลอย่างมีประสิทธิภาพ แต่ยังนำเสนอผลลัพธ์ให้ผู้ใช้งานเข้าใจและนำไปใช้ประโยชน์ได้จริง", 
        color: "#60a5fa", 
        colorGlow: "rgba(96, 165, 250, 0.9)", 
        gradient: "linear-gradient(to right, #2563eb, #60a5fa, #2563eb)", 
        icon: Target,
        CoreComponent: BECore 
    },
    nut: { 
        role: "Cloud Developer", 
        skills: ["Data Engineering", "Data Science", "Data Visualization", "Backend Development"], 
        passion: "ทำระบบที่เข้าใจสัตว์ไม่เพียงเข้าใจแค่สายพันธุ์ แต่เข้าใจลึกถึงความรู้สึกและอารมณ์ผ่านทาง Vision Model", 
        
        exp: "มีประสบการณ์ในการจัดการโครงสร้างข้อมูลและสกัด Insight เพื่อนำไปใช้ประโยชน์ร่วมกับเทคโนโลยี Cloud", 
        
        experiences: [
            "ออกแบบสถาปัตยกรรมและฐานข้อมูล (Database) สำหรับระบบจองตั๋วภาพยนตร์",
            "สร้างระบบ Data Visualization เพื่อวิเคราะห์และนำเสนอข้อมูลสถิติอุบัติเหตุ",
            "พัฒนาโปรเจกต์ Data Warehouse สำหรับการบริหารจัดการข้อมูลร้านขายโทรศัพท์มือถือ"
        ],
        competitions: [],

        contribution: "ดูแลระบบ Backend และ Cloud Infrastructure พร้อมทั้งจัดการระบบฐานข้อมูลเพื่อรองรับการทำงานของ Vision Model", 
        synergy: "มีความรับผิดชอบต่องานที่ได้รับมอบหมายสูง มีความตรงต่อเวลา และมีทักษะการสื่อสารที่ดีเยี่ยม ช่วยให้การประสานงานกับสมาชิกในทีมเป็นไปอย่างราบรื่น", 
        color: "#10b981", 
        colorGlow: "rgba(16, 185, 129, 0.9)", 
        gradient: "linear-gradient(to right, #059669, #10b981, #059669)", 
        icon: Zap, 
        CoreComponent: DSCore 
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

    const heroY = useTransform(smoothProgress, [0, 0.5], ["0%", "40%"]);
    const heroOpacity = useTransform(smoothProgress, [0, 0.3], [1, 0]);
    const contentY = useTransform(smoothProgress, [0.1, 0.6], [100, 0]);
    const contentOpacity = useTransform(smoothProgress, [0.1, 0.4], [0, 1]);

    return (
        <div ref={containerRef} className="min-h-[150vh] relative font-body pb-40 overflow-x-hidden"
            style={{ '--member-color': data.color, '--member-gradient': data.gradient, '--member-color-glow': data.colorGlow }}>
            <GlobalStyles />

            {/* ── BACKGROUND ── */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-[#010409]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(2,6,23,0.6)_0%,#010409_100%)]" />
                <div className="absolute inset-0 bg-gradient-to-b from-[#010409]/60 via-transparent to-[#010409]/90 z-10" />

                <ErrorBoundary fallback={<div className="fixed inset-0 bg-[#010409]" />}>
                    <Canvas shadows dpr={[1, 2]}>
                        <PerspectiveCamera makeDefault position={[0, 0, 7]} fov={30} />
                        <Suspense fallback={null}>
                            <Stars radius={130} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
                            <ambientLight intensity={0.5} />
                            <pointLight position={[10, 10, 10]} color={data.color} intensity={12} />
                            <Float speed={3} rotationIntensity={1} floatIntensity={2}>
                                <Core color={data.color} />
                            </Float>
                            <Environment preset="night" />
                            <ContactShadows opacity={0.6} scale={20} blur={2.5} far={4.5} color={data.color} />
                        </Suspense>
                    </Canvas>
                </ErrorBoundary>
            </div>

            <div className="relative z-20 max-w-5xl mx-auto px-6 pt-52">

                {/* ── HERO SECTION ── */}
                <motion.div style={{ y: heroY, opacity: heroOpacity }} className="flex flex-col items-center mb-40 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 mb-10 z-30 backdrop-blur-md">
                        <Users size={14} className="text-teal-400" />
                        <span className="text-[11px] font-tech font-bold tracking-[0.4em] uppercase text-white">สมาชิกในทีม</span>
                    </div>

                    <div className="relative mb-12 z-30 group">
                        <div className="absolute inset-0 blur-[80px] opacity-40 animate-pulse" style={{ background: data.color }} />
                        <div className="w-40 h-40 rounded-[2.8rem] p-1 bg-gradient-to-br from-white/30 to-transparent relative z-10 shadow-2xl flex items-center justify-center border border-white/10 overflow-hidden bg-[#0a0f1e]">
                            {data.image ? (
                                <motion.img initial={{ opacity: 0 }} animate={{ opacity: 1 }} src={data.image} alt={name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                            ) : (
                                <span className="text-7xl font-tech font-black text-white">{(name || id).charAt(0).toUpperCase()}</span>
                            )}
                        </div>
                        <div className="absolute -bottom-3 -right-3 glass-panel p-4 rounded-3xl border-2 shadow-2xl z-20" style={{ borderColor: data.color }}>
                            <data.icon size={28} style={{ color: data.color }} />
                        </div>
                    </div>

                    <div className="relative z-40">
                        <LoopingTypingText text={(name || id).toUpperCase()} className="text-6xl md:text-7xl lg:text-8xl font-tech font-black uppercase text-intense-neon leading-none tracking-tighter mb-6" />
                        <div className="inline-flex items-center gap-3 px-8 py-2 rounded-full glass-panel border border-white/10">
                            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: data.color }} />
                            <span className="font-tech text-xl font-bold tracking-[0.1em] text-white">บทบาท: {data.role}</span>
                        </div>
                    </div>
                </motion.div>

                {/* ── BENTO CONTENT ── */}
                <motion.div style={{ y: contentY, opacity: contentOpacity }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 relative z-30">

                    {/* 🔥 PASSION */}
                    <div className="lg:col-span-8 group relative glass-panel p-8 md:p-12 rounded-[2.5rem] overflow-hidden border border-white/5 hover:border-rose-500/30 transition-all duration-500 flex flex-col justify-center">
                        <div className="absolute -top-24 -right-24 w-64 h-64 blur-[80px] rounded-full bg-rose-500/10 group-hover:bg-rose-500/20 transition-colors" />
                        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-rose-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-6 font-tech font-bold tracking-[0.2em] text-sm uppercase text-rose-400">
                                <span>🔥</span> PASSION
                            </div>
                            <p className="text-xl md:text-2xl lg:text-3xl font-bold text-white leading-[1.4] font-body tracking-tight">
                                "{data.passion}"
                            </p>
                        </div>
                    </div>

                    {/* 👥 ความรับผิดชอบ */}
                    <div className="lg:col-span-4 glass-panel p-8 rounded-[2.5rem] flex flex-col justify-between border border-white/5 hover:border-violet-500/30 border-l-4 border-l-violet-500/50 transition-all group">
                        <div>
                            <div className="flex items-center gap-3 mb-6 font-tech text-sm tracking-widest text-violet-400 uppercase font-bold">
                                <span>👥</span> ความรับผิดชอบ
                            </div>
                            <p className="text-base md:text-lg text-white font-medium leading-relaxed font-body">
                                {data.contribution}
                            </p>
                        </div>
                        <div className="mt-8 pt-6 border-t border-white/5 flex justify-between items-end">
                            <span className="text-slate-400 text-[12px] font-bold uppercase font-tech">Integrity</span>
                            <span className="text-2xl font-tech font-black text-violet-400 group-hover:scale-110 origin-right transition-transform">100%</span>
                        </div>
                    </div>

                    {/* ⚙️ SKILLS */}
                    <div className="lg:col-span-12 glass-panel p-8 md:p-10 rounded-[2.5rem] border border-white/5 relative hover:border-sky-500/20 transition-all">
                        <div className="flex items-center gap-4 mb-8 text-white">
                            <Cpu size={24} className="text-sky-400" />
                            <h3 className="font-tech text-xl font-bold tracking-[0.1em] uppercase text-white">Core Skills</h3>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {data.skills.map((s, i) => (
                                <div key={i} className="px-6 py-5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center gap-4 hover:border-sky-500/30 hover:bg-sky-500/[0.05] hover:-translate-y-1 transition-all duration-300 group shadow-lg">
                                    <CheckCircle2 size={18} className="text-sky-400 opacity-60 group-hover:opacity-100 transition-opacity" />
                                    <span className="font-body font-medium text-sm md:text-base text-slate-200 group-hover:text-white transition-colors">{s}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 💼 ประสบการณ์ และ 🏆 รางวัล */}
                    {data.experiences ? (
                        <>
                            {/* กล่อง Experience - บังคับขนาดเป็นครึ่งนึง (lg:col-span-6) เสมอ */}
                            <div className="lg:col-span-6 glass-panel p-8 md:p-10 rounded-[2.5rem] border border-white/5 border-l-4 border-l-emerald-500 hover:border-emerald-500/30 transition-all group">
                                <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-emerald-500/5 blur-[60px] rounded-full pointer-events-none group-hover:bg-emerald-500/10 transition-all" />
                                <div className="flex items-center gap-3 mb-6 relative z-10">
                                    <Briefcase size={22} className="text-emerald-400" />
                                    <h4 className="font-tech font-bold text-xl uppercase tracking-[0.1em] text-slate-100">Experience</h4>
                                </div>
                                <ul className="space-y-4 relative z-10">
                                    {data.experiences.map((item, i) => (
                                        <li key={i} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-start gap-4 hover:border-emerald-500/20 hover:bg-emerald-500/[0.03] transition-colors">
                                            <span className="text-emerald-400 mt-1 flex-shrink-0 opacity-80">▹</span>
                                            <span className="text-base text-slate-200 font-body font-light leading-relaxed">{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* กล่อง Competitions & Awards - แสดงเสมอ ถึงไม่มีข้อมูลก็ขึ้นข้อความ Fallback */}
                            <div className="lg:col-span-6 glass-panel p-8 md:p-10 rounded-[2.5rem] border border-white/5 border-l-4 border-l-amber-500 relative overflow-hidden group hover:border-amber-500/30 transition-all">
                                <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-amber-500/10 blur-[80px] rounded-full pointer-events-none group-hover:bg-amber-500/20 transition-all" />
                                
                                <div className="flex items-center gap-3 mb-6 relative z-10">
                                    <Trophy size={22} className="text-amber-400" />
                                    <h4 className="font-tech font-bold text-xl uppercase tracking-[0.1em] text-white">Competitions & Awards</h4>
                                </div>
                                
                                <ul className="space-y-4 relative z-10">
                                    {/* เช็คว่ามีข้อมูล Array การแข่งขัน และ Array ไม่ว่างเปล่า */}
                                    {data.competitions && data.competitions.length > 0 ? (
                                        data.competitions.map((item, i) => (
                                            <li key={i} className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/[0.03] to-transparent border border-amber-500/10 flex items-start gap-4 hover:border-amber-500/30 hover:bg-amber-500/[0.05] transition-all">
                                                <Award size={20} className="text-amber-400 mt-0.5 flex-shrink-0" />
                                                <span className="text-base text-slate-100 font-body font-light leading-relaxed">{item}</span>
                                            </li>
                                        ))
                                    ) : (
                                        /* แสดงข้อความนี้เมื่อไม่มีการแข่งขัน */
                                        <li className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-center min-h-[120px]">
                                            <span className="text-base text-slate-400 font-body font-light italic">
                                                Currently focusing on building impactful projects.
                                            </span>
                                        </li>
                                    )}
                                </ul>
                            </div>
                        </>
                    ) : (
                        /* Fallback สำหรับสมาชิกที่ยังเป็น text แบบเก่า (ไม่มี Array ของ Experience) */
                        <div className="lg:col-span-12 glass-panel p-10 rounded-[2.5rem] border border-white/5 border-l-4 border-l-emerald-500 hover:border-emerald-500/30 transition-all">
                            <div className="flex items-center gap-3 mb-4 text-emerald-400">
                                <Briefcase size={24} />
                                <h4 className="font-tech font-bold text-lg uppercase tracking-[0.1em]">ประสบการณ์</h4>
                            </div>
                            <p className="text-base text-slate-200 leading-relaxed font-body font-light">{data.exp}</p>
                        </div>
                    )}

                    {/* 🤝 COMPLEMENTARY SKILLS */}
                    <div className={`glass-panel p-8 md:p-10 rounded-[2.5rem] border border-white/5 border-l-4 group transition-all hover:border-white/20 ${data.experiences ? 'lg:col-span-12' : 'lg:col-span-6'}`} style={{ borderLeftColor: data.color }}>
                        <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-b from-transparent to-white/[0.01] pointer-events-none rounded-[2.5rem]" />
                        <div className="flex items-center gap-3 mb-4 text-white relative z-10">
                            <Network size={22} style={{ color: data.color }} />
                            <h4 className="font-tech font-bold text-xl uppercase tracking-[0.1em]">Complementary Skills</h4>
                        </div>
                        <p className="text-lg text-slate-200 leading-relaxed font-body font-light max-w-4xl relative z-10">{data.synergy}</p>
                    </div>

                </motion.div>

            </div>
        </div>
    );
}