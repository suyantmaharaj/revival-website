import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";
import { getFunctions } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-functions.js";

const firebaseConfig = {
  apiKey: "AIzaSyAcDaowCeHoHbK_nO0p5Jfw9VchXbuaa6A",
  authDomain: "revival-automotive-79be7.firebaseapp.com",
  projectId: "revival-automotive-79be7",
  storageBucket: "revival-automotive-79be7.firebasestorage.app",
  messagingSenderId: "605588015868",
  appId: "1:605588015868:web:8388c0237fbd852f4c2579",
  measurementId: "G-37XQ0YG3QN"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app);

export { auth, db, functions };
