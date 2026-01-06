import { initializeApp } from "firebase/app";
// We import 'initializeAuth' and 'getReactNativePersistence' specifically for mobile
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getStorage } from "firebase/storage";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDbl9w9wziCJG_oKf6XJIuLNzjeMuT_h6g",
  authDomain: "academix-531c3.firebaseapp.com",
  projectId: "academix-531c3",
  storageBucket: "academix-531c3.firebasestorage.app",
  messagingSenderId: "190995422528",
  appId: "1:190995422528:web:acae49cba9e94c22c16ea5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with Persistence (This keeps the user logged in)
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

const db = getFirestore(app);

// Initialize Storage (File Uploads) <--- NEW
const storage = getStorage(app);

export { auth, db, storage };