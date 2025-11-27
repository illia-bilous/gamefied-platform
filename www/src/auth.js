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

const TEACHER_KEY = "1";

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

// --- UI HELPERS ---
function setError(inputEl, message) {
    if (!inputEl) return;
    inputEl.classList.add("input-error");
    let err = inputEl.nextElementSibling;
    if (!err || !err.classList.contains("error-msg")) {
        err = document.createElement("div");
        err.className = "error-msg";
        inputEl.insertAdjacentElement("afterend", err);
    }
    err.textContent = message;
}

function clearAllErrors(formId) {
    const form = document.getElementById(formId);
    if (!form) return;
    form.querySelectorAll(".input-error").forEach(el => el.classList.remove("input-error"));
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

            if (name.length < 2) return setError(nameEl, "Введіть повне ім'я");
            if (pass.length < 6) return setError(passEl, "Пароль має бути від 6 символів");

            if (role === "teacher") {
                if (teacherKeyEl.value.trim() !== TEACHER_KEY) return setError(teacherKeyEl, "Невірний код вчителя!");
            } else {
                className = classEl.value;
                if (!className) return setError(classEl, "Оберіть клас");
            }

            try {
                const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
                const user = userCredential.user;

                // 👇 ТУТ ЗМІНИ: Одразу даємо 2500 золота в базу
                const newUserData = {
                    uid: user.uid,
                    name: name,
                    email: email,
                    role: role,
                    className: className, 
                    profile: {
                        gold: 2500, // <--- БУЛО 0, СТАЛО 2500
                        inventory: [],
                        welcomeBonusReceived: true // <--- Вже отримав
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
                    setError(emailEl, "Цей email вже використовується.");
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

            if (!email || !pass) return setError(emailEl, "Заповніть всі поля");

            try {
                const userCredential = await signInWithEmailAndPassword(auth, email, pass);
                const uid = userCredential.user.uid;
                const userDoc = await getDoc(doc(db, "users", uid));

                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    localStorage.setItem("currentUser", JSON.stringify(userData));
                    console.log("✅ Вхід виконано:", userData.name);
                    emailEl.value = "";
                    passEl.value = "";
                    onLoginSuccess(userData.role);
                } else {
                    setError(emailEl, "Помилка: Профіль не знайдено в базі.");
                }
            } catch (error) {
                console.error("Помилка входу:", error);
                setError(emailEl, "Невірний логін або пароль");
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