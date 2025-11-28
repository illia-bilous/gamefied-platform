// src/router.js

import { showScreen } from "./ui.js";
import { initAuth, getCurrentUser } from "./auth.js";
import { initStudentPanel } from "./studentPanel.js";
import { initTeacherPanel } from "./teacherPanel.js"; 

let currentRole = null;

// Функція логауту
const logout = () => {
    localStorage.removeItem("currentUser");
    currentRole = null;
    location.hash = "";
    resetForms();
    showScreen("screen-home");
};

function setupButtonListener(id, handler) {
    const btn = document.getElementById(id);
    if (btn) {
        // Клонуємо кнопку, щоб видалити старі слухачі і не дублювати події
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        newBtn.addEventListener("click", handler);
    }
}

// --- ФУНКЦІЯ ОЧИЩЕННЯ (THE CLEANER) ---
function resetForms() {
    console.log("🧹 Cleaning forms...");
    const forms = ["login-form", "register-form"];

    forms.forEach(formId => {
        const form = document.getElementById(formId);
        if (form) {
            form.reset();
            const inputs = form.querySelectorAll("input");
            inputs.forEach(input => {
                input.value = ""; 
                input.setAttribute("value", ""); 
                input.classList.remove("input-error");
            });
            const selects = form.querySelectorAll("select");
            selects.forEach(select => {
                select.selectedIndex = 0;
                select.classList.remove("input-error");
            });
        }
    });

    document.querySelectorAll(".error-msg").forEach(el => el.remove());
    document.getElementById("register-form-content")?.classList.remove("hidden");
    document.getElementById("register-success")?.classList.add("hidden");
    
    const teacherKey = document.getElementById("teacher-key");
    if(teacherKey) teacherKey.value = "";
}

// --- НАВІГАЦІЯ ---
function setupDashboardNavigation(screenId) {
    const container = document.getElementById(screenId);
    if (!container) return;

    const menuButtons = container.querySelectorAll('.menu-item:not(.logout)');
    const views = container.querySelectorAll('.panel-view');

    menuButtons.forEach(btn => {
        btn.onclick = () => {
            const panelName = btn.dataset.panel;
            menuButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            views.forEach(view => {
                view.classList.remove('active');
                view.classList.add('hidden');
            });
            const targetView = document.getElementById(`view-${panelName}`);
            if (targetView) {
                targetView.classList.remove('hidden');
                targetView.classList.add('active');
            }
        };
    });
}

function initializeApp() {
    console.log("initializeApp: Start...");

    // 1. ВИБІР РОЛІ
    setupButtonListener("btn-role-student", () => { 
        currentRole = "student"; 
        showScreen("screen-auth-choice"); 
        // Чистимо із затримкою, щоб перебити браузер
        setTimeout(resetForms, 50);
    });
    
    setupButtonListener("btn-role-teacher", () => { 
        currentRole = "teacher"; 
        showScreen("screen-auth-choice"); 
        setTimeout(resetForms, 50);
    });
    
    // 2. КНОПКИ "НАЗАД"
    setupButtonListener("btn-back-to-home", () => {
        showScreen("screen-home");
        setTimeout(resetForms, 50);
    });

    setupButtonListener("btn-back-auth1", () => { // Назад з Логіну
        showScreen("screen-auth-choice");
        setTimeout(resetForms, 50);
    });

    setupButtonListener("btn-back-auth2", () => { // Назад з Реєстрації
        showScreen("screen-auth-choice");
        setTimeout(resetForms, 50);
    });
    
    // 3. ПЕРЕХІД НА ЕКРАНИ ВВОДУ (Головний момент!)
    setupButtonListener("btn-login", () => { 
        showScreen("screen-login"); 
        // 🔥 МАГІЯ ТУТ: Чекаємо 50мс поки браузер спробує заповнити, і стираємо
        setTimeout(resetForms, 50); 
    });

    setupButtonListener("btn-register", () => {
        showScreen("screen-register");
        
        const role = currentRole || "student";
        const teacherKeyField = document.getElementById("register-teacher-key");
        const classSelectField = document.getElementById("select-class-wrapper");
        
        if (role === "teacher") {
            teacherKeyField?.classList.remove("hidden");
            classSelectField?.classList.add("hidden");
        } else {
            teacherKeyField?.classList.add("hidden");
            classSelectField?.classList.remove("hidden");
        }
        
        // 🔥 МАГІЯ ТУТ ТАКОЖ
        setTimeout(resetForms, 50);
    });

    setupButtonListener("logout-student", logout);
    setupButtonListener("logout-teacher", logout);

    // Ініціалізація сесії
    const handleLoginSuccess = (role) => {
        if (role === "student") {
            showScreen("screen-student");
            setupDashboardNavigation("screen-student");
            initStudentPanel();
        } else {
            showScreen("screen-teacher");
            setupDashboardNavigation("screen-teacher");
            initTeacherPanel(); 
        }
    };

    initAuth(handleLoginSuccess);

    const user = getCurrentUser();
    if (user) {
        currentRole = user.role;
        handleLoginSuccess(user.role);
    } else {
        showScreen("screen-home");
    }
}

initializeApp();