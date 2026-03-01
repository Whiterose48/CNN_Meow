// Firebase Configuration — ใช้ project จริงของทีม
import { initializeApp } from "firebase/app"
import { getAuth, GoogleAuthProvider } from "firebase/auth"

const firebaseConfig = {
    apiKey: "AIzaSyAL3I9sqFp6ub-sjmoI59eUbIEY6_yoLnY",
    authDomain: "mlops-auth-c08ab.firebaseapp.com",
    projectId: "mlops-auth-c08ab",
    storageBucket: "mlops-auth-c08ab.firebasestorage.app",
    messagingSenderId: "358558029175",
    appId: "1:358558029175:web:edf9a5b2de29066e33fd72",
    measurementId: "G-19M0F8LBEJ"
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ prompt: 'select_account' })

export default app