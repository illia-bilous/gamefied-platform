// 1. Імпортуємо Firebase через інтернет (CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 2. Твоя конфігурація (з твого повідомлення)
const firebaseConfig = {
  apiKey: "AIzaSyDM5N2KjctWbKKtY1bP0bde5kaNxqDExbI",
  authDomain: "mathmaze-d57fb.firebaseapp.com",
  projectId: "mathmaze-d57fb",
  storageBucket: "mathmaze-d57fb.firebasestorage.app",
  messagingSenderId: "981708916474",
  appId: "1:981708916474:web:b050824643314771e2eb43"
};

// 3. Ініціалізація
const app = initializeApp(firebaseConfig);

// 4. Експортуємо сервіси для використання в інших файлах
export const auth = getAuth(app);
export const db = getFirestore(app);

console.log("🔥 Firebase (Auth + Firestore) підключено успішно!");