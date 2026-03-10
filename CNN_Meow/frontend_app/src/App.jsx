import { useState, useEffect } from 'react'
// Components
import Nav from './components/Nav'
import Footer from './components/Footer'
import Loading from './components/Loading' // นำเข้า Loading Component
import { AuthProvider } from './context/AuthContext'
import { AnalysisProvider } from './context/AnalysisContext'
// Pages
import Home from './pages/Home'
import Plans from './pages/Plans'
import Analyze from './pages/Analyze'
import Dashboard from './pages/Dashboard'
import Personal from './pages/Personal'

const API = import.meta.env.VITE_API_URL || "http://localhost:8000"

// ─── Helper: อ่าน page จาก URL hash ──────────────────────────────
const validPages = ['home', 'plans', 'analyze', 'dashboard', 'phruk', 'poom', 'boss', 'nut']
function getPageFromHash() {
  const hash = window.location.hash.replace('#', '') || 'home'
  return validPages.includes(hash) ? hash : 'home'
}

export default function App() {
  const [page, setPageState] = useState(getPageFromHash)
  const [plan, setPlan] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  const teamMembers = ['phruk', 'poom', 'boss', 'nut']

  // ─── setPage wrapper: เปลี่ยนหน้า + push history ──────────────
  const setPage = (newPage) => {
    if (newPage === page) return
    window.history.pushState({ page: newPage }, '', `#${newPage}`)
    setPageState(newPage)
  }

  // ─── ฟัง browser back/forward (popstate) ───────────────────────
  useEffect(() => {
    const handlePopState = (e) => {
      const p = e.state?.page || getPageFromHash()
      setPageState(p)
    }
    window.addEventListener('popstate', handlePopState)

    // ตั้ง initial state ให้ history
    window.history.replaceState({ page: getPageFromHash() }, '', `#${getPageFromHash()}`)

    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // จำลองการโหลดระบบ (Simulation)
  useEffect(() => {
    // โหลดเสร็จใน 2.8 วินาที (เพื่อให้ทันกับ Animation ของ Loading)
    const timer = setTimeout(() => setIsLoading(false), 2800)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [page])

  return (
    <AuthProvider>
    <AnalysisProvider>
      {/* ── Loading Screen (Overlay) ── */}
      <Loading isLoading={isLoading} />

      {/* ── Main App (Rendered behind loader to be ready) ── */}
      <div className="bg-[#010409] text-white min-h-screen selection:bg-teal-400 selection:text-black font-body overflow-x-hidden">

        {/* ── Background Layer (Persistent) ── */}
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute inset-0 bg-[#010409]" />
          {/* เอฟเฟกต์แสงพื้นหลังเฉพาะหน้าที่ไม่ใช่ Home (เพราะ Home มี 3D ของตัวเอง) */}
          {page !== 'home' && (
            <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-teal-500/5 rounded-full blur-[120px]" />
          )}
        </div>

        {/* ── Navigation ── */}
        <Nav page={page} setPage={setPage} />

        {/* ── Main Content with Transitions ── */}
        <main className="relative z-10 min-h-screen">
            <div key={page} className="page-fade-in">
              {page === 'home' && <Home setPage={setPage} />}

              {page === 'plans' && (
                <div className="pt-32 px-6 max-w-7xl mx-auto">
                  <Plans setPage={setPage} setPlan={setPlan} />
                </div>
              )}

              {page === 'analyze' && (
                <div className="pt-32 px-6 max-w-7xl mx-auto">
                  <Analyze plan={plan} api={API} setPage={setPage} />
                </div>
              )}

              {page === 'dashboard' && <Dashboard />}

              {/* ── Personal Pages Dynamic Route ── */}
              {teamMembers.includes(page) && (
                <Personal
                  name={page.charAt(0).toUpperCase() + page.slice(1)}
                  setPage={setPage}
                />
              )}
            </div>
        </main>

        {/* ── Footer Section (Only on Home) ── */}
        {page === 'home' && <Footer setPage={setPage} />}

      </div>
    </AnalysisProvider>
    </AuthProvider>
  )
}