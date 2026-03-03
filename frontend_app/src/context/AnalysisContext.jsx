import { createContext, useContext, useState, useEffect } from 'react'

const AnalysisContext = createContext()

const STORAGE_KEY = 'petinsight_analysis_history'
const MAX_HISTORY = 30          // จำกัดประวัติ 30 รายการล่าสุด
const THUMB_SIZE = 128           // ย่อรูปเป็น 128×128 px

// ── บีบอัดรูปเป็น thumbnail เล็กก่อนเก็บ localStorage ──
function compressImage(dataUrl) {
    return new Promise((resolve) => {
        if (!dataUrl) return resolve(null)
        const img = new Image()
        img.onload = () => {
            const canvas = document.createElement('canvas')
            const scale = Math.min(THUMB_SIZE / img.width, THUMB_SIZE / img.height, 1)
            canvas.width  = Math.round(img.width  * scale)
            canvas.height = Math.round(img.height * scale)
            const ctx = canvas.getContext('2d')
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
            resolve(canvas.toDataURL('image/jpeg', 0.5))   // JPEG quality 50%
        }
        img.onerror = () => resolve(null)
        img.src = dataUrl
    })
}

// ── เซฟลง localStorage แบบ safe (ไม่ crash ถ้า quota เต็ม) ──
function safeSave(data) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {
        // Quota exceeded – ลบรายการเก่าออกแล้วลองอีกที
        try {
            const trimmed = data.slice(0, Math.max(1, Math.floor(data.length / 2)))
            localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
        } catch {
            // ยังเต็มอีก – ล้างทั้งหมด
            localStorage.removeItem(STORAGE_KEY)
        }
    }
}

export function AnalysisProvider({ children }) {
    const [history, setHistory] = useState(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY)
            return saved ? JSON.parse(saved) : []
        } catch { return [] }
    })

    // Sync to localStorage (safe)
    useEffect(() => {
        safeSave(history)
    }, [history])

    // Add a new analysis result (compress image first)
    const addResult = async (result, imagePreview) => {
        const thumb = await compressImage(imagePreview)
        const entry = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            image: thumb,
            emotion: result.emotion || {},
            breed: result.breed || {},
            advice: result.advice || '',
            llm_used: result.llm_used || false,
        }
        setHistory(prev => [entry, ...prev].slice(0, MAX_HISTORY))
    }

    // Clear all history
    const clearHistory = () => setHistory([])

    // Computed stats
    const stats = {
        totalDiagnostics: history.length,
        uniqueBreeds: [...new Set(history.map(h => h.breed?.breed).filter(Boolean))].length,
        avgAccuracy: history.length > 0
            ? Math.round(history.reduce((sum, h) => sum + (h.emotion?.confidence || 0), 0) / history.length * 100)
            : 0,
        alertCount: history.filter(h => {
            const emo = (h.emotion?.label || '').toLowerCase()
            return emo === 'angry' || emo === 'sad'
        }).length,
    }

    // Emotion distribution for chart
    const emotionCounts = history.reduce((acc, h) => {
        const emo = (h.emotion?.label || 'other').toLowerCase()
        acc[emo] = (acc[emo] || 0) + 1
        return acc
    }, {})

    // Last 7 days activity (for bar chart)
    const last7DaysActivity = (() => {
        const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
        const counts = [0, 0, 0, 0, 0, 0, 0]
        const now = new Date()
        
        history.forEach(h => {
            const d = new Date(h.timestamp)
            const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24))
            if (diffDays < 7) {
                counts[d.getDay()]++
            }
        })

        // Reorder so today is last
        const todayIdx = now.getDay()
        const reordered = []
        for (let i = 1; i <= 7; i++) {
            const idx = (todayIdx + i) % 7
            reordered.push({ day: days[idx], count: counts[idx] })
        }
        return reordered
    })()

    return (
        <AnalysisContext.Provider value={{ history, addResult, clearHistory, stats, emotionCounts, last7DaysActivity }}>
            {children}
        </AnalysisContext.Provider>
    )
}

export const useAnalysis = () => useContext(AnalysisContext)
