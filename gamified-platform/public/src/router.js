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
    showScreen("screen-home");
};

/**
 * Допоміжна функція для налаштування обробників подій з логуванням помилок.
 */
function setupButtonListener(id, handler) {
    const btn = document.getElementById(id);
    if (btn) {
        btn.addEventListener("click", handler);
        // console.log(`Router: Обробник події прив'язаний до #${id}`);
    } else {
        // Не кричимо в консоль, якщо елемент не знайдено (наприклад, якщо ми на іншому екрані)
    }
}

/**
 * Основна функція для навігації всередині Dashboard (Кабінету)
 * Перемикає вкладки: Головна -> Скарбниця -> Профіль і т.д.
 * @param {string} screenId - ID батьківського екрану (screen-student або screen-teacher)
 */
function setupDashboardNavigation(screenId) {
    const container = document.getElementById(screenId);
    if (!container) return;

    // Знаходимо всі кнопки меню, крім "Вихід"
    const menuButtons = container.querySelectorAll('.menu-item:not(.logout)');
    
    // Знаходимо всі панелі контенту (views) всередині цього екрану
    const views = container.querySelectorAll('.panel-view');

    menuButtons.forEach(btn => {
        // Видаляємо старі лісенери (через клонування) або просто додаємо нові обережно
        // Тут використовуємо простий підхід:
        btn.onclick = () => {
            const panelName = btn.dataset.panel; // наприклад: 'treasury'
            
            // 1. Оновлюємо активну кнопку в меню
            menuButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // 2. Ховаємо всі views і показуємо потрібний
            views.forEach(view => {
                view.classList.remove('active');
                view.classList.add('hidden');
            });

            const targetView = document.getElementById(`view-${panelName}`);
            if (targetView) {
                targetView.classList.remove('hidden');
                targetView.classList.add('active');
            } else {
                console.warn(`View не знайдено для панелі: view-${panelName}`);
            }
        };
    });

    // Окремий обробник для кнопки запуску Unity (якщо вона є)
    const startUnityBtn = document.getElementById("btn-start-campaign");
    if (startUnityBtn) {
        startUnityBtn.onclick = () => {
            alert("⚔️ Запуск Unity... (Тут буде завантажувач гри)");
            // Тут пізніше додамо логіку: document.getElementById('unity-container').classList.remove('hidden');
        };
    }
}

/**
 * Ініціалізує всі обробники подій та перевіряє сесію.
 */
function initializeApp() {
    console.log("initializeApp: Ініціалізація обробників подій...");

    // ----------------------------------------------------
    // --- ТИМЧАСОВО: Очищення бази даних ---
    // ----------------------------------------------------
    setupButtonListener("btn-debug-clear-users", () => {
        const confirmed = confirm("Ви точно хочете видалити ВСІХ користувачів?");
        if (confirmed) {
            localStorage.removeItem("users");
            localStorage.removeItem("currentUser");
            alert("База очищена!");
            location.reload();
        }
    });

    // ----------------------------------------------------
    // --- Навігація: Вхід / Реєстрація ---
    // ----------------------------------------------------

    setupButtonListener("btn-role-student", () => {
        currentRole = "student";
        showScreen("screen-auth-choice");
    });

    setupButtonListener("btn-role-teacher", () => {
        currentRole = "teacher";
        showScreen("screen-auth-choice");
    });

    setupButtonListener("btn-back-to-home", () => showScreen("screen-home"));
    setupButtonListener("btn-login", () => showScreen("screen-login"));

    setupButtonListener("btn-register", () => {
        showScreen("screen-register");
        
        const role = currentRole || "student";
        
        // Логіка перемикання полів форми
        const teacherKeyField = document.getElementById("register-teacher-key");
        const classSelectField = document.getElementById("select-class-wrapper");
        
        if (role === "teacher") {
            teacherKeyField?.classList.remove("hidden");
            classSelectField?.classList.add("hidden");
        } else {
            teacherKeyField?.classList.add("hidden");
            classSelectField?.classList.remove("hidden");
        }

        document.getElementById("register-form-content")?.classList.remove("hidden");
        document.getElementById("register-success")?.classList.add("hidden");
    });

    setupButtonListener("btn-back-auth1", () => showScreen("screen-auth-choice"));
    setupButtonListener("btn-back-auth2", () => showScreen("screen-auth-choice"));

    setupButtonListener("logout-student", logout);
    setupButtonListener("logout-teacher", logout);

    // ----------------------------------------------------
    // --- Ініціалізація Аутентифікації та Запуск ---
    // ----------------------------------------------------

    // 1. Колбек при успішному вході через форму
    initAuth((role) => {
        if (role === "student") {
            showScreen("screen-student");
            setupDashboardNavigation("screen-student"); // <--- Активуємо меню
            initStudentPanel();
        } else {
            showScreen("screen-teacher");
            setupDashboardNavigation("screen-teacher"); // <--- Активуємо меню
            initTeacherPanel();
        }
    });

    // 2. Перевірка збереженої сесії (при оновленні сторінки)
    const user = getCurrentUser();
    if (user) {
        currentRole = user.role;
        if (user.role === "student") {
            showScreen("screen-student");
            setupDashboardNavigation("screen-student"); // <--- Активуємо меню
            initStudentPanel();
        } else {
            showScreen("screen-teacher");
            setupDashboardNavigation("screen-teacher"); // <--- Активуємо меню
            initTeacherPanel();
        }
    } else {
        showScreen("screen-home");
    }
}

// Запускаємо
initializeApp();