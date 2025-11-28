// src/auth.js
import { auth, db } from "./firebase.js";
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    doc, 
    setDoc, 
    getDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const TEACHER_KEY = "1"; // Код доступу для вчителя

// --- ОТРИМАННЯ ПОТОЧНОГО КОРИСТУВАЧА ---
export function getCurrentUser() {
    try {
        const user = localStorage.getItem("currentUser");
        return user ? JSON.parse(user) : null;
    } catch (e) {
        return null;
    }
}

// --- ВИХІД ---
export function logoutUser() {
    localStorage.removeItem("currentUser");
    signOut(auth).then(() => {
        console.log("Вийшли з Firebase");
    }).catch((error) => console.error(error));
}

// --- UI HELPERS (ВІЗУАЛІЗАЦІЯ ПОМИЛОК) ---

// Функція встановлення помилки на конкретне поле
function setError(inputEl, message) {
    if (!inputEl) return;
    
    // 1. Додаємо клас стилю (червона рамка, рожевий фон)
    inputEl.classList.add("input-error");
    
    // 2. Створюємо або оновлюємо текст помилки під полем
    let err = inputEl.nextElementSibling;
    
    // Якщо наступний елемент не є повідомленням про помилку, створюємо його
    if (!err || !err.classList.contains("error-msg")) {
        err = document.createElement("div");
        err.className = "error-msg";
        inputEl.insertAdjacentElement("afterend", err);
    }
    
    err.textContent = message;
}

// Функція очищення всіх помилок у формі
function clearAllErrors(formId) {
    const form = document.getElementById(formId);
    if (!form) return;
    
    // Прибираємо червоні рамки
    form.querySelectorAll(".input-error").forEach(el => el.classList.remove("input-error"));
    
    // Видаляємо тексти помилок
    form.querySelectorAll(".error-msg").forEach(el => el.remove());
}

// --- ГОЛОВНА ЛОГІКА ---
export function initAuth(onLoginSuccess) {
    const regSubmitBtn = document.getElementById("register-submit");
    const loginSubmitBtn = document.getElementById("login-submit");

    // 1. РЕЄСТРАЦІЯ
    if (regSubmitBtn) {
        const newBtn = regSubmitBtn.cloneNode(true);
        regSubmitBtn.parentNode.replaceChild(newBtn, regSubmitBtn);

        newBtn.addEventListener('click', async () => {
            clearAllErrors("register-form");

            const nameEl = document.getElementById("reg-name");
            const emailEl = document.getElementById("reg-email");
            const passEl = document.getElementById("reg-pass");
            const classEl = document.getElementById("reg-class");
            const teacherKeyEl = document.getElementById("teacher-key");

            const name = nameEl.value.trim();
            const email = emailEl.value.trim();
            const pass = passEl.value.trim();
            
            const isTeacherView = !document.getElementById("register-teacher-key")?.classList.contains("hidden");
            const role = isTeacherView ? "teacher" : "student";
            let className = null;
            let hasError = false;

            // Валідація полів
            if (name.length < 2) {
                setError(nameEl, "Введіть повне ім'я (мінімум 2 літери)");
                hasError = true;
            }

            if (pass.length < 6) {
                setError(passEl, "Пароль має бути не менше 6 символів");
                hasError = true;
            }

            if (!email.includes("@")) {
                setError(emailEl, "Введіть коректний email");
                hasError = true;
            }

            if (role === "teacher") {
                if (teacherKeyEl.value.trim() !== TEACHER_KEY) {
                    setError(teacherKeyEl, "Неправильний код доступу!");
                    hasError = true;
                }
            } else {
                className = classEl.value;
                if (!className) {
                    setError(classEl, "Будь ласка, оберіть клас");
                    hasError = true;
                }
            }

            if (hasError) return; // Якщо є помилки, зупиняємось

            try {
                const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
                const user = userCredential.user;

                const newUserData = {
                    uid: user.uid,
                    name: name,
                    email: email,
                    role: role,
                    className: className, 
                    profile: {
                        gold: 2500,
                        inventory: [],
                        welcomeBonusReceived: true
                    },
                    createdAt: new Date().toISOString()
                };

                await setDoc(doc(db, "users", user.uid), newUserData);

                console.log("✅ Реєстрація успішна:", user.email);
                document.getElementById("register-form-content")?.classList.add("hidden");
                document.getElementById("register-success")?.classList.remove("hidden");

            } catch (error) {
                console.error("Помилка реєстрації:", error);
                if (error.code === 'auth/email-already-in-use') {
                    setError(emailEl, "Цей email вже зареєстрований.");
                } else if (error.code === 'auth/invalid-email') {
                    setError(emailEl, "Некоректний формат email.");
                } else {
                    setError(emailEl, "Помилка: " + error.message);
                }
            }
        });
    }

    // 2. ВХІД
    if (loginSubmitBtn) {
        const newLoginBtn = loginSubmitBtn.cloneNode(true);
        loginSubmitBtn.parentNode.replaceChild(newLoginBtn, loginSubmitBtn);

        newLoginBtn.addEventListener('click', async () => {
            clearAllErrors("login-form");

            const emailEl = document.getElementById("login-email");
            const passEl = document.getElementById("login-pass");
            const email = emailEl.value.trim();
            const pass = passEl.value.trim();
            let hasError = false;

            if (!email) {
                setError(emailEl, "Введіть email");
                hasError = true;
            }
            if (!pass) {
                setError(passEl, "Введіть пароль");
                hasError = true;
            }

            if (hasError) return;

            try {
                const userCredential = await signInWithEmailAndPassword(auth, email, pass);
                const uid = userCredential.user.uid;
                const userDoc = await getDoc(doc(db, "users", uid));

                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    localStorage.setItem("currentUser", JSON.stringify(userData));
                    console.log("✅ Вхід виконано:", userData.name);
                    
                    // Очистка полів
                    emailEl.value = "";
                    passEl.value = "";
                    
                    onLoginSuccess(userData.role);
                } else {
                    setError(emailEl, "Профіль не знайдено в базі даних.");
                }
            } catch (error) {
                console.error("Помилка входу:", error.code);
                
                // Обробка конкретних помилок Firebase
                if (error.code === 'auth/invalid-email' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
                    // Часто Firebase повертає invalid-credential для безпеки,
                    // але ми можемо підсвітити обидва або конкретне
                    setError(emailEl, "Користувача з таким email не знайдено або дані невірні");
                    setError(passEl, "Перевірте пароль");
                } else if (error.code === 'auth/wrong-password') {
                    setError(passEl, "Неправильний пароль");
                } else if (error.code === 'auth/too-many-requests') {
                    setError(passEl, "Забагато спроб. Спробуйте пізніше.");
                } else {
                    setError(emailEl, "Помилка входу. Спробуйте ще раз.");
                }
            }
        });
    }

    const goToLoginBtn = document.getElementById("btn-go-to-login");
    if (goToLoginBtn) {
        const newGoBtn = goToLoginBtn.cloneNode(true);
        goToLoginBtn.parentNode.replaceChild(newGoBtn, goToLoginBtn);
        newGoBtn.addEventListener('click', () => {
             document.getElementById("register-form-content")?.classList.remove("hidden");
             document.getElementById("register-success")?.classList.add("hidden");
             document.getElementById("btn-login")?.click(); 
        });
    }
}