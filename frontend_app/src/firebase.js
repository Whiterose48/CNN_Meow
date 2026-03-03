// Firebase Configuration
import { initializeApp } from "firebase/app"
import { getAuth, GoogleAuthProvider } from "firebase/auth"

const firebaseConfig = {
    apiKey: "AIzaSyBHV5IZLmD8M5BTQpOTbXrKyOk4C63EA4A",
    authDomain: "mlops-auth-c08ab.firebaseapp.com",
    projectId: "mlops-auth-c08ab",
    storageBucket: "mlops-auth-c08ab.firebasestorage.app",
    messagingSenderId: "358558029175",
    appId: "1:358558029175:web:edf9a5b2de29066e33fd72",
    measurementId: "G-19M0F8LBEJ"
}

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const provider = new GoogleAuthProvider()
provider.setCustomParameters({ prompt: 'select_account' })
const googleProvider = provider // alias for backward compatibility

export { auth, provider, googleProvider }
export default app