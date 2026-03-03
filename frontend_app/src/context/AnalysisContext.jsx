import { createContext, useContext, useState, useEffect } from 'react'

const AnalysisContext = createContext()

const STORAGE_KEY = 'petinsight_analysis_history'

export function AnalysisProvider({ children }) {
    const [history, setHistory] = useState(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY)
            return saved ? JSON.parse(saved) : []
        } catch { return [] }
    })

    // Sync to localStorage
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
    }, [history])

    // Add a new analysis result
    const addResult = (result, imagePreview) => {
        const entry = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            image: imagePreview,
            emotion: result.emotion || {},
            breed: result.breed || {},
            advice: result.advice || '',
            llm_used: result.llm_used || false,
        }
        setHistory(prev => [entry, ...prev])
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
