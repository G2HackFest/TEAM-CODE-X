import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
    apiKey: "AIzaSyDna7HOmznqrGOyVbUtIOjTkOtP9Y6zDhY",
    authDomain: "aisummarize-711ac.firebaseapp.com",
    projectId: "aisummarize-711ac",
    storageBucket: "aisummarize-711ac.firebasestorage.app",
    messagingSenderId: "8799709488",
    appId: "1:8799709488:web:9bd1f72b1e94b6921a40f5",
    measurementId: "G-XSESYCET5F"
  };
// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and Firestore
export const auth = getAuth(app);
export const firestore = getFirestore(app);
export const storage = getStorage(app);
export default app;