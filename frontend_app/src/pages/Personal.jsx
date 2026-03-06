import { useRef, useState, useMemo, Suspense, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float, MeshDistortMaterial, MeshWobbleMaterial, TorusKnot, Icosahedron, Box, Sphere, Points, PointMaterial, Environment, ContactShadows, Stars, Sparkles, PerspectiveCamera, Dodecahedron } from '@react-three/drei'
import * as THREE from 'three'
import { motion, useScroll, useTransform, useSpring } from 'framer-motion'
import { Brain, Code2, Database, Zap, Target, Cpu, Network, Users, CheckCircle2, Microscope, Briefcase } from 'lucide-react'
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
            background: rgba(15, 23, 42, 0.6); 
            backdrop-filter: blur(20px); 
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
        contribution: "ออกแบบและพัฒนา Full-stack Web Application แบบ End-to-End พร้อมบูรณาการโมเดล AI (CNN) และ Large Language Models (LLM) เพื่อสร้างระบบอัจฉริยะที่ตอบโจทย์การใช้งานจริง", 
        synergy: "เป็นสะพานเชื่อมระหว่าง Data Science และ Software Engineering ทำให้โมเดล AI สามารถสเกลและนำไปใช้งานจริงได้อย่างไร้รอยต่อ", 
        color: "#3b82f6", 
        colorGlow: "rgba(59, 130, 246, 0.9)", 
        gradient: "linear-gradient(to right, #1d4ed8, #3b82f6, #1d4ed8)", 
        icon: Database, 
        CoreComponent: AICore
    },
    poom: {
        role: "Project Manager & AI Engineer", 
        skills: ["React", "Three.js", "Motion Design", "User Psychology"], 
        passion: "เทคโนโลยีที่ดีต้องมาคู่กับประสบการณ์ที่สวยงาม เพื่อสร้างความไว้วางใจให้ผู้ใช้งาน", 
        exp: "มีประสบการณ์สร้าง Immersive Web Interface และระบบจัดการ State ที่ซับซ้อนให้ลื่นไหลระดับรางวัล", 
        contribution: "ออกแบบ Visual Experience และ Interaction สื่อสารข้อมูลยากๆ ให้เข้าใจง่าย", 
        synergy: "เป็นด่านหน้าปะทะผู้ใช้ เปลี่ยนข้อมูลดิบจาก Phruk และ Nut ให้กลายเป็นงานศิลปะที่เข้าถึงใจ", 
        color: "#38bdf8", colorGlow: "rgba(56, 189, 248, 0.9)", gradient: "linear-gradient(to right, #0284c7, #38bdf8, #0284c7)", icon: Code2, CoreComponent: FECore 
    },
    boss: { 
        role: "UX UI Designer", 
        skills: ["Cloud Architecture", "PostgreSQL", "Docker", "Cybersecurity"], 
        passion: "ความปลอดภัยของข้อมูลคือหัวใจสำคัญที่สุดของเทคโนโลยีด้านสุขภาพ", 
        exp: "ออกแบบ Server Scalability ระดับสูง รองรับ Traffic มหาศาล พร้อมวางระบบป้องกันข้อมูลรั่วไหลขั้นสุด", 
        contribution: "พัฒนาระบบ Backend & Secure API ให้เสถียรและปลอดภัย 100%", 
        synergy: "กระดูกสันหลังของทีม ที่รับประกันว่า AI ของ Phruk และ UI ของ Poom จะทำงานได้อย่างไร้รอยต่อ", 
        color: "#60a5fa", colorGlow: "rgba(96, 165, 250, 0.9)", gradient: "linear-gradient(to right, #2563eb, #60a5fa, #2563eb)", icon: Database, CoreComponent: BECore 
    },
    nut: { 
        role: "Cloud Developer", 
        skills: ["Big Data Analytics", "MLOps", "Statistics", "Predictive Modeling"], 
        passion: "ค้นพบรูปแบบที่ซ่อนอยู่ในข้อมูล เพื่อทำนายและป้องกันปัญหาสุขภาพก่อนที่มันจะเกิด", 
        exp: "วิเคราะห์และจัดการ Big Data นำ Insight ไปสร้างโมเดลทำนายผลที่มี Impact เชิงธุรกิจและการแพทย์", 
        contribution: "สร้าง Data Pipeline และกระบวนการ Statistical Analysis รองรับข้อมูลมหาศาล", 
        synergy: "ผู้พิสูจน์ความจริงหลังม่านข้อมูล คอย Feed ข้อมูลที่ถูกต้องให้ AI เพื่อให้มั่นใจในทุกๆ การตัดสินใจ", 
        color: "#10b981", colorGlow: "rgba(16, 185, 129, 0.9)", gradient: "linear-gradient(to right, #059669, #10b981, #059669)", icon: Zap, CoreComponent: DSCore 
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

                {/* ── HERO SECTION (ชื่อและบทบาท) ── */}
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
                    <div className="lg:col-span-8 group relative glass-panel p-8 md:p-12 rounded-[2.5rem] overflow-hidden border border-white/5 hover:border-white/20 transition-all duration-500 flex flex-col justify-center">
                        <div className="absolute -top-24 -right-24 w-64 h-64 blur-[80px] rounded-full" style={{ background: `${data.color}33` }} />
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-6 font-tech font-bold tracking-[0.2em] text-sm uppercase" style={{ color: data.color }}>
                                <span>🔥</span> PASSION
                            </div>
                            <p className="text-2xl md:text-4xl font-bold text-white leading-[1.3] font-body tracking-tight">
                                "{data.passion}"
                            </p>
                        </div>
                        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent to-transparent" style={{ backgroundImage: `linear-gradient(to right, transparent, ${data.color}88, transparent)` }} />
                    </div>

                    {/* 👥 ความรับผิดชอบ */}
                    <div className="lg:col-span-4 glass-panel p-8 rounded-[2.5rem] flex flex-col justify-between border border-white/5">
                        <div>
                            <div className="flex items-center gap-3 mb-6 font-tech text-sm tracking-widest text-slate-300 uppercase font-bold">
                                <span>👥</span> ความรับผิดชอบ
                            </div>
                            <p className="text-lg text-white font-medium leading-relaxed font-body">
                                {data.contribution}
                            </p>
                        </div>
                        <div className="mt-8 pt-6 border-t border-white/5 flex justify-between items-end">
                            <span className="text-slate-400 text-[12px] font-bold uppercase font-tech">Integrity</span>
                            <span className="text-2xl font-tech font-black" style={{ color: data.color }}>100%</span>
                        </div>
                    </div>

                    {/* ⚙️ SKILLS */}
                    <div className="lg:col-span-12 glass-panel p-8 md:p-10 rounded-[2.5rem] border border-white/5 relative">
                        <div className="flex items-center gap-4 mb-8 text-white">
                            <Cpu size={20} className="text-amber-400" />
                            <h3 className="font-tech text-xl font-bold tracking-[0.1em] uppercase">Skills</h3>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">
                            {data.skills.map((s, i) => (
                                <div key={i} className="px-5 py-4 rounded-xl bg-white/[0.03] border border-white/5 flex items-center gap-3 hover:bg-white/[0.08] transition-all group">
                                    <CheckCircle2 size={16} className="opacity-50 group-hover:opacity-100" style={{ color: data.color }} />
                                    <span className="font-tech font-bold text-sm text-slate-300 group-hover:text-white uppercase tracking-wider">{s}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 💼 ประสบการณ์ */}
                    <div className="lg:col-span-6 glass-panel p-10 rounded-[2.5rem] border border-white/5 border-l-4" style={{ borderLeftColor: '#64748b' }}>
                        <div className="flex items-center gap-3 mb-4 text-slate-300">
                            <span>💼</span>
                            <h4 className="font-tech font-bold text-lg uppercase tracking-[0.1em]">ประสบการณ์</h4>
                        </div>
                        <p className="text-base text-slate-200 leading-relaxed font-body font-light">{data.exp}</p>
                    </div>

                    {/* 🤝 COMPLEMENTARY SKILLS */}
                    <div className="lg:col-span-6 glass-panel p-10 rounded-[2.5rem] border border-white/5 border-l-4" style={{ borderLeftColor: data.color }}>
                        <div className="flex items-center gap-3 mb-4 text-slate-300">
                            <span>🤝</span>
                            <h4 className="font-tech font-bold text-lg uppercase tracking-[0.1em]">Complementary Skills</h4>
                        </div>
                        <p className="text-base text-slate-200 leading-relaxed font-body font-light">{data.synergy}</p>
                    </div>
                </motion.div>

            </div>
        </div>
    );
}