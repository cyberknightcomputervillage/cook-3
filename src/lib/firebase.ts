import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: "AIzaSyBAQOOLN43rjwat8lp43FBsfS53SD2yUio",
  authDomain: "cook-3-84c17.firebaseapp.com",
  projectId: "cook-3-84c17",
  storageBucket: "cook-3-84c17.firebasestorage.app",
  messagingSenderId: "487965315757",
  appId: "1:487965315757:web:63d990ba3ff8c4dab96c24",
  measurementId: "G-PLNKP11H2L"
};

// Initialize Firebase safely
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const firestore = getFirestore(app);
