import { createContext, useContext, useState, useEffect } from 'react'
import { auth, provider } from '../firebase'
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

    // ── Listen for Firebase auth state ──
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (firebaseUser) => {
            if (firebaseUser) {
                setUser({
                    uid: firebaseUser.uid,
                    name: firebaseUser.displayName,
                    email: firebaseUser.email,
                    image: firebaseUser.photoURL,
                })
            } else {
                setUser(null)
            }
            setLoading(false)
        })
        return () => unsub()
    }, [])

    // ── Google Login (popup) ──
    const loginWithGoogle = async () => {
        try {
            console.log('[Auth] Starting Google sign-in popup...')
            const result = await signInWithPopup(auth, provider)
            console.log('[Auth] Success:', result.user.email)
            return result.user
        } catch (err) {
            console.error('[Auth] Login failed:', err.code, err.message)
            
            if (err.code === 'auth/popup-closed-by-user') {
                console.log('[Auth] User closed popup')
                return null
            } else if (err.code === 'auth/popup-blocked') {
                alert('Browser บล็อก popup\n\nกรุณาอนุญาต popup สำหรับ localhost ใน browser settings')
            } else if (err.code === 'auth/unauthorized-domain') {
                alert('Firebase Error: localhost ยังไม่ได้ authorize\n\nไปที่ Firebase Console → Authentication → Settings → Authorized domains → เพิ่ม localhost')
            } else if (err.code === 'auth/configuration-not-found' || err.code === 'auth/operation-not-allowed') {
                alert('Firebase Error: ยังไม่ได้เปิด Google Sign-in provider\n\nไปที่ Firebase Console → Authentication → Sign-in method → เปิด Google')
            } else {
                // Show full error for debugging
                alert('Login Error:\nCode: ' + (err.code || 'unknown') + '\n\nMessage: ' + err.message)
            }
            return null
        }
    }

    // ── Logout ──
    const logout = async () => {
        try { await signOut(auth) } catch { /* ignore */ }
        setUser(null)
    }

    return (
        <AuthContext.Provider value={{ user, loading, loginWithGoogle, logout }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
    return ctx
}
