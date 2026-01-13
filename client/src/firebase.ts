
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app);

if (location.hostname === 'localhost') {
  const AUTH_EMULATOR_HOST = import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_HOST || 'localhost:9099';
  const FIRESTORE_EMULATOR_HOST = Number(import.meta.env.VITE_FIRESTORE_EMULATOR_PORT || 8081);
  const FUNCTIONS_EMULATOR_PORT = Number(import.meta.env.VITE_FUNCTIONS_EMULATOR_PORT || 5002);

  connectAuthEmulator(auth, `http://${AUTH_EMULATOR_HOST}`);
  connectFirestoreEmulator(db, 'localhost', FIRESTORE_EMULATOR_HOST);
  connectFunctionsEmulator(functions, 'localhost', FUNCTIONS_EMULATOR_PORT);
}

export { auth, db, functions };
