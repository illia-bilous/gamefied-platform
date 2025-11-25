import { getCurrentUser } from "./auth.js";

export function initStudentPanel() {
    const panel = document.getElementById("student-panel");
    const user = getCurrentUser();

    if (!panel || !user) {
        console.error("Не знайдено панель учня або дані користувача.");
        return;
    }

    panel.innerHTML = `
        <h2>Кабінет учня</h2>
        <p><b>${user.name}</b></p>
        <p>Email: ${user.email}</p>
        <p>Клас: ${user.className}</p>

        <hr>

        <h3>Ваш прогрес</h3>
        <p>(поки заглушка)</p>

        <button id="btn-start-lesson" class="btn big">Почати урок</button>

        <div id="unity-container" style="margin-top:20px; display:none;">
            <iframe src="unity/index.html" style="width:100%;height:600px;border:1px solid #ccc;border-radius:8px;"></iframe>
        </div>
    `;

    // Обробник для кнопки "Почати урок"
    document.getElementById("btn-start-lesson")?.addEventListener('click', () => {
        const unityContainer = document.getElementById("unity-container");
        if (unityContainer) {
            unityContainer.style.display = "block";
        }
    });

    // Обробник для елементів сайдбару
    document.querySelectorAll('#screen-student .sidebar .menu-item').forEach(button => {
        button.addEventListener('click', (e) => {
            const panelName = e.target.dataset.panel;
            // Умовна заглушка для відображення, яку можна буде замінити реальним контентом
            panel.innerHTML = `<h3>Панель: ${panelName}</h3><p>Тут буде детальний контент для ${panelName}.</p>`;
        });
    });
}