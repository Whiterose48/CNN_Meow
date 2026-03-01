import { createContext, useContext, useState, useEffect } from 'react'
import { auth, googleProvider } from '../firebase'
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
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
        return () => unsubscribe()
    }, [])

    const loginWithGoogle = async () => {
        try {
            const result = await signInWithPopup(auth, googleProvider)
            return result.user
        } catch (error) {
            console.error('Google login error:', error)
            // ถ้า Firebase config ไม่ถูก ใช้ demo mode แทน
            const configErrors = [
                'auth/configuration-not-found',
                'auth/invalid-api-key',
                'auth/api-key-not-valid',
                'auth/api-key-not-valid.-please-pass-a-valid-api-key.',
            ]
            if (configErrors.some(code => error.code?.includes(code) || error.message?.includes(code))) {
                const demoUser = {
                    uid: 'demo-001',
                    name: 'Demo User',
                    email: 'demo@petinsight360.ai',
                    image: null,
                }
                setUser(demoUser)
                return demoUser
            }
            throw error
        }
    }

    const logout = async () => {
        try {
            await signOut(auth)
        } catch {
            // demo mode fallback
        }
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
