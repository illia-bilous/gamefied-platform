import { getCurrentUser } from "./auth.js";

export function initTeacherPanel() {
    const panel = document.getElementById("teacher-panel");
    const user = getCurrentUser();

    if (!panel || !user) {
        console.error("Не знайдено панель викладача або дані користувача.");
        return;
    }

    panel.innerHTML = `
        <h2>Вітаємо, ${user.name}</h2>
        <p>Email: ${user.email}</p>

        <h3>Панель викладача</h3>
        <ul>
            <li>Управління класами</li>
            <li>Управління учнями</li>
            <li>Редактор завдань</li>
            <li>Редактор скарбниці</li>
            <li>Аналітика</li>
        </ul>
    `;
    
    // Обробник для елементів сайдбару
    document.querySelectorAll('#screen-teacher .sidebar .menu-item').forEach(button => {
        button.addEventListener('click', (e) => {
            const panelName = e.target.dataset.panel;
            // Умовна заглушка для відображення, яку можна буде замінити реальним контентом
            panel.innerHTML = `<h3>Панель: ${panelName}</h3><p>Тут буде детальний контент для ${panelName}.</p>`;
        });
    });
}