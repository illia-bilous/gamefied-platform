import { showScreen } from "./ui.js";

const TEACHER_KEY = "TEACHER-ACCESS-2025";

// ----------------------
// База даних (LocalStorage)
// ----------------------
export const db = {
    users: JSON.parse(localStorage.getItem("users") || "[]"),

    save() {
        localStorage.setItem("users", JSON.stringify(this.users));
    },

    addUser(user) {
        user.id = user.id || Date.now();
        this.users.push(user);
        this.save();
    },

    findUser(email, pass) {
        return this.users.find(u => u.email === email && u.pass === pass);
    },

    emailExists(email) {
        return this.users.some(u => u.email === email);
    }
};

export function getCurrentUser() {
    try {
        const user = localStorage.getItem("currentUser");
        return user ? JSON.parse(user) : null;
    } catch (e) {
        console.error("Помилка парсингу поточного користувача:", e);
        return null;
    }
}

// ----------------------
// UI допоміжні функції (Очищення/Встановлення помилок)
// ----------------------

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

function clearError(inputEl) {
    if (!inputEl) return;
    inputEl.classList.remove("input-error");

    let err = inputEl.nextElementSibling;
    if (err && err.classList.contains("error-msg")) {
        err.remove();
    }
}

function clearAllErrors(formId) {
    document.querySelectorAll(`#${formId} .input-error`).forEach(el => el.classList.remove("input-error"));
    document.querySelectorAll(`#${formId} .error-msg`).forEach(el => el.remove());
}

// ----------------------
// Основна логіка Аутентифікації
// ----------------------

export function initAuth(onLogin) {

    // Елементи реєстрації
    const reg_name = document.getElementById("reg-name");
    const reg_email = document.getElementById("reg-email");
    const reg_pass = document.getElementById("reg-pass");
    const teacherKeyInput = document.getElementById("teacher-key");
    const reg_class = document.getElementById("reg-class");
    const regSubmitBtn = document.getElementById("register-submit");
    const regForm = document.getElementById("register-form");
    
    // Елементи входу
    const login_email = document.getElementById("login-email");
    const login_pass = document.getElementById("login-pass");
    const loginSubmitBtn = document.getElementById("login-submit");
    const loginForm = document.getElementById("login-form");

    // Інші елементи
    const successDiv = document.getElementById("register-success");
    const regFormContent = document.getElementById("register-form-content");

    // ------------------------------------
    // Логіка реєстрації
    // ------------------------------------
    if (regSubmitBtn) {
        regSubmitBtn.addEventListener('click', () => {
            if (!regForm) return;

            // Використовуємо ID форми для очищення помилок
            clearAllErrors(regForm.id); 

            if (!reg_name || !reg_email || !reg_pass || !teacherKeyInput || !reg_class) {
                console.error("Auth Error: Не знайдено всі елементи реєстраційної форми.");
                return;
            }

            const name = reg_name.value.trim();
            const email = reg_email.value.trim();
            const pass = reg_pass.value.trim();

            let valid = true;

            // Визначаємо роль на основі видимості поля вчителя
            const isTeacherView = !document.getElementById("register-teacher-key")?.classList.contains("hidden");
            const role = isTeacherView ? "teacher" : "student";
            let className = null;
            
            console.log(`Auth: Спроба реєстрації як ${role}`);


            if (name.length < 2) {
                setError(reg_name, "Імʼя повинно містити мінімум 2 символи.");
                valid = false;
            }

            if (!email.includes("@") || !email.includes(".")) {
                setError(reg_email, "Введіть коректний email.");
                valid = false;
            } else if (db.emailExists(email)) {
                setError(reg_email, "Користувач з таким email вже існує.");
                valid = false;
            }

            if (pass.length < 6) {
                setError(reg_pass, "Пароль має містити не менше 6 символів.");
                valid = false;
            }

            if (role === "teacher") {
                const key = teacherKeyInput.value.trim();
                if (key !== TEACHER_KEY) {
                    setError(teacherKeyInput, "Невірний код доступу викладача!");
                    valid = false;
                }
            }

            if (role === "student") {
                className = reg_class.value;
                if (!className) {
                    setError(reg_class, "Оберіть ваш клас.");
                    valid = false;
                }
            }

            if (!valid) return;

            const newUser = {
                id: Date.now(),
                name,
                email,
                pass,
                role,
                className,
                profile: {
                    gold: 0,
                    exp: 0,
                    achievements: []
                }
            };

            db.addUser(newUser);
            console.log(`Auth: Успішна реєстрація нового користувача: ${newUser.email}`);

            // Показуємо повідомлення про успіх
            regFormContent?.classList.add("hidden");
            successDiv?.classList.remove("hidden");

            // Очищаємо поля форми
            reg_name.value = "";
            reg_email.value = "";
            reg_pass.value = "";
            teacherKeyInput.value = "";
        });
    } else {
         console.error("Auth Error: Кнопка 'register-submit' не знайдена.");
    }

    // Перехід на логін після успішної реєстрації
    document.getElementById("btn-go-to-login")?.addEventListener('click', () => {
        regFormContent?.classList.remove("hidden");
        successDiv?.classList.add("hidden");
        showScreen("screen-login");
    });


    // ------------------------------------
    // Логіка входу
    // ------------------------------------
    if (loginSubmitBtn) {
        loginSubmitBtn.addEventListener('click', () => {
            if (!loginForm) return;

            // Використовуємо ID форми для очищення помилок
            clearAllErrors(loginForm.id);
            
            if (!login_email || !login_pass) {
                 console.error("Auth Error: Не знайдено всі елементи форми входу.");
                 return;
            }

            const email = login_email.value.trim();
            const pass = login_pass.value.trim();

            let valid = true;

            if (!email) { setError(login_email, "Введіть email."); valid = false; }
            if (!pass) { setError(login_pass, "Введіть пароль."); valid = false; }

            if (!valid) return;

            const user = db.findUser(email, pass);

            if (!user) {
                setError(login_email, "Невірний логін або пароль");
                clearError(login_pass); 
                return;
            }

            localStorage.setItem("currentUser", JSON.stringify(user));
            console.log(`Auth: Успішний вхід користувача: ${user.email} (${user.role})`);

            // Очищаємо поля
            login_email.value = "";
            login_pass.value = "";

            onLogin(user.role);
        });
    } else {
        console.error("Auth Error: Кнопка 'login-submit' не знайдена.");
    }
}