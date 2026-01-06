import { initializeApp } from "firebase/app";
// We import 'initializeAuth' and 'getReactNativePersistence' specifically for mobile
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getStorage } from "firebase/storage";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_CONFIG",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR",
  messagingSenderId: "YOUR",
  appId: "YOUR"
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
