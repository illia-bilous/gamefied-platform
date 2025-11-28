// src/teacherPanel.js

import { db } from "./firebase.js";
import { 
    collection, 
    getDocs, 
    query, 
    where, 
    orderBy, 
    doc, 
    updateDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { getShopItems, updateItemPrice } from "./shopData.js"; 

// --- ФУНКЦІЯ ЗАПУСКУ ---
export function initTeacherPanel() {
    console.log("TeacherPanel: Init...");
    
    renderTeacherDashboard("teacher-content"); 

    setTimeout(() => {
        renderTreasureEditor();
    }, 100); 

    setTimeout(() => {
        initMazeEditor();
    }, 100);
}

// ==========================================
// 🧩 ЛАБІРИНТ — ЛОГІКА РЕДАКТОРА
// ==========================================

const LEVEL_TEMPLATE = [
    { id: 1, name: "🚪 Двері №1 (Вхід)", desc: "Ключ лежить на старті." },
    { id: 2, name: "🚪 Двері №2 (Центр)", desc: "Блокують прохід до розвилки." },
    { id: 3, name: "🚪 Двері №3 (Скриня)", desc: "Останні двері перед скарбом." }
];

let mazeConfigData = {
    reward: 100,
    doors: []
};

function initMazeEditor() {
    console.log("Maze Editor: Init");

    const savedData = localStorage.getItem("game_config_data");
    if (savedData) {
        try {
            const parsed = JSON.parse(savedData);
            mazeConfigData = { ...mazeConfigData, ...parsed };
            
            if (document.getElementById("maze-global-reward")) {
                document.getElementById("maze-global-reward").value = mazeConfigData.reward;
            }
        } catch (e) {
            console.error("Помилка читання конфігу", e);
        }
    }

    renderDoorsForm();

    const btnSave = document.getElementById("btn-save-maze-config");
    if (btnSave) {
        const newBtn = btnSave.cloneNode(true);
        btnSave.parentNode.replaceChild(newBtn, btnSave);
        newBtn.addEventListener("click", saveConfiguration);
    }
}

function renderDoorsForm() {
    const container = document.getElementById("maze-doors-container");
    if (!container) return;

    container.innerHTML = "";

    LEVEL_TEMPLATE.forEach(templateItem => {
        const savedDoor = mazeConfigData.doors.find(d => d.id === templateItem.id) || {};
        const savedQ = savedDoor.question || "";
        const savedA = savedDoor.answer || "";

        const card = document.createElement("div");
        card.className = "door-config-card";
        card.style.cssText = "background: #333; padding: 15px; border-radius: 8px; border-left: 5px solid var(--accent-teal);";

        card.innerHTML = `
            <div style="margin-bottom: 10px; display: flex; justify-content: space-between;">
                <strong style="font-size: 1.1em; color: #fff;">${templateItem.name}</strong>
                <span style="font-size: 0.8em; color: #aaa; font-style: italic;">${templateItem.desc}</span>
            </div>
            <div style="display: flex; gap: 15px;">
                <div style="flex: 2;">
                    <label style="font-size: 0.8em; color: #ccc;">Питання</label>
                    <input type="text" class="inp-question" data-id="${templateItem.id}" value="${savedQ}" placeholder="5 * 5" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #555; background: #222; color: white;">
                </div>
                <div style="flex: 1;">
                    <label style="font-size: 0.8em; color: #ccc;">Відповідь</label>
                    <input type="number" class="inp-answer" data-id="${templateItem.id}" value="${savedA}" placeholder="25" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #555; background: #222; color: white;">
                </div>
            </div>
        `;

        container.appendChild(card);
    });
}

function saveConfiguration() {
    const rewardInput = document.getElementById("maze-global-reward");
    mazeConfigData.reward = parseInt(rewardInput.value) || 100;

    const newDoorsData = [];
    
    LEVEL_TEMPLATE.forEach(tpl => {
        const qInput = document.querySelector(`.inp-question[data-id="${tpl.id}"]`);
        const aInput = document.querySelector(`.inp-answer[data-id="${tpl.id}"]`);

        if (qInput && aInput) {
            newDoorsData.push({
                id: tpl.id,
                question: qInput.value.trim() || "???",
                answer: parseInt(aInput.value) || 0
            });
        }
    });

    mazeConfigData.doors = newDoorsData;

    const finalExport = {
        ...mazeConfigData,
        btnText: "Win"
    };

    localStorage.setItem("game_config_data", JSON.stringify(finalExport));
    console.log("Saved for Unity:", finalExport);

    const status = document.getElementById("maze-save-status");
    if(status) {
        status.style.display = "block";
        setTimeout(() => status.style.display = "none", 3000);
    }
}

// ==========================================
// 📚 ГОЛОВНА ПАНЕЛЬ ВЧИТЕЛЯ
// ==========================================

async function getUniqueClasses() {
    const usersSnapshot = await getDocs(collection(db, "users"));
    const classes = new Set(); 
    let studentCount = 0;

    usersSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.role === "student" && data.className) {
            classes.add(data.className);
            studentCount++;
        }
    });
    
    return { classes: Array.from(classes), totalStudents: studentCount }; 
}

export async function renderTeacherDashboard(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const { classes, totalStudents } = await getUniqueClasses();

    container.innerHTML = `
        <div class="teacher-header">
            <h2>📚 Мої класи</h2>
            <p>Всього учнів у системі: ${totalStudents}</p>
        </div>
        <div id="class-cards" class="class-grid"></div>
    `;
    
    const grid = document.getElementById("class-cards");
    
    classes.forEach(className => {
        const card = document.createElement("div");
        card.className = "class-card";
        card.innerHTML = `
            <h3>${className}</h3>
            <p>Переглянути прогрес</p>
        `;
        card.addEventListener('click', () => { renderClassLeaderboard(className); });
        grid.appendChild(card);
    });

    if (classes.length === 0) {
        grid.innerHTML = '<p style="text-align: center; margin-top: 30px;">У системі ще немає учнів.</p>';
    }
}

// ==========================================
// 🏆 ЛІДЕРБОРД КЛАСУ
// ==========================================

async function renderClassLeaderboard(className) {
    const container = document.getElementById("teacher-content");
    if (!container) return;

    container.innerHTML = `
        <div class="teacher-header">
            <button id="btn-back-to-classes" class="btn btn-secondary">← Назад</button>
            <h2>🏆 Лідерборд: ${className}</h2>
            <p>Сортування за золотом.</p>
        </div>
        <table class="leaderboard-table">
            <thead><tr><th>№</th><th>Ім'я</th><th>Золото</th><th>Дії</th></tr></thead>
            <tbody id="class-leaderboard-body"></tbody>
        </table>
    `;

    document.getElementById("btn-back-to-classes").onclick = () => renderTeacherDashboard("teacher-content");

    const tbody = document.getElementById("class-leaderboard-body");

    const q = query(
        collection(db, "users"),
        where("role", "==", "student"),
        where("className", "==", className),
        orderBy("profile.gold", "desc")
    );
    
    const querySnapshot = await getDocs(q);
    const students = [];
    querySnapshot.forEach(doc => students.push({ ...doc.data(), uid: doc.id }));

    students.forEach((student, index) => {
        const tr = document.createElement("tr");
        let rank = index + 1;
        if (index === 0) rank = "🥇 1";
        if (index === 1) rank = "🥈 2";
        if (index === 2) rank = "🥉 3";

        tr.innerHTML = `
            <td>${rank}</td>
            <td>${student.name}</td>
            <td>${student.profile.gold || 0} 💰</td>
            <td><button class="btn btn-sm btn-view-profile" data-uid="${student.uid}" data-class="${className}">Результати</button></td>
        `;
        tbody.appendChild(tr);
    });

    setupProfileView(students);
}

// ==========================================
// 👤 ПРОФІЛЬ УЧНЯ
// ==========================================

function setupProfileView(students) {
    document.querySelectorAll('.btn-view-profile').forEach(button => {
        button.addEventListener('click', e => {
            const studentUid = e.target.dataset.uid;
            const student = students.find(s => s.uid === studentUid);

            if (student) renderStudentProfile(student);
            else alert("Помилка: дані учня не знайдені!");
        });
    });
}

async function renderStudentProfile(student) {
    const container = document.getElementById("teacher-content");
    if (!container) return;

    const inventory = student.profile.inventory || [];
    const stackedInventory = inventory.reduce((acc, item) => {
        const itemName = item.name || "Нагорода";
        acc[itemName] = (acc[itemName] || 0) + 1;
        return acc;
    }, {});

    const inventoryList = Object.keys(stackedInventory).length
        ? Object.keys(stackedInventory)
            .map(x => `<li>${x} ${stackedInventory[x] > 1 ? `(x${stackedInventory[x]})` : ""}</li>`).join("")
        : "<li>Немає нагород</li>";

    const goldDisplay = student.profile.gold || 0;

    container.innerHTML = `
        <button id="btn-back-to-leaderboard" class="btn btn-secondary">← Назад</button>
        <h1 style="text-align:center;">👤 ${student.name}</h1>

        <div class="profile-dashboard-grid">
            <div class="card" style="padding:20px;">
                <h3>Основна інформація</h3>
                <p><strong>Клас:</strong> ${student.className}</p>
                <p><strong>Email:</strong> ${student.email}</p>
            </div>

            <div class="card" style="padding:20px;">
                <h3>💰 Баланс</h3>
                <p id="current-gold-display" style="font-size:2em; color:gold;">${goldDisplay} 💰</p>
                <input type="number" id="gold-amount-input" placeholder="Нове значення" style="padding:5px;">
                <button id="btn-update-gold" data-uid="${student.uid}" class="btn">Оновити золото</button>

                <h3>🎁 Нагороди</h3>
                <ul>${inventoryList}</ul>
            </div>
        </div>
    `;

    document.getElementById("btn-back-to-leaderboard").onclick = () =>
        renderClassLeaderboard(student.className);

    document.getElementById("btn-update-gold").onclick = async () => {
        const newVal = parseInt(document.getElementById("gold-amount-input").value);
        if (isNaN(newVal) || newVal < 0) return alert("Некоректне значення!");

        try {
            await updateDoc(doc(db, "users", student.uid), { "profile.gold": newVal });
            document.getElementById("current-gold-display").innerHTML = `${newVal} 💰`;
            alert("Золото оновлено!");
        } catch {
            alert("Помилка оновлення.");
        }
    };
}

// ==========================================
// 💎 РЕДАКТОР СКАРБНИЦІ (МАГАЗИН)
// ==========================================

async function renderTreasureEditor() {
    const container = document.getElementById("treasury-content");
    if (!container) return;

    container.innerHTML = `
        <h2 style="text-align:center; font-size:2em; color:gold;">💎 Ціни Скарбниці</h2>
        <div class="category-grid">
            <div class="editor-category-block"><h3>Мікро</h3><div id="teacher-rewards-micro"></div></div>
            <div class="editor-category-block"><h3>Середні</h3><div id="teacher-rewards-medium"></div></div>
            <div class="editor-category-block"><h3>Великі</h3><div id="teacher-rewards-large"></div></div>
        </div>
    `;

    const items = getShopItems();
    renderCategory("teacher-rewards-micro", items.micro);
    renderCategory("teacher-rewards-medium", items.medium);
    renderCategory("teacher-rewards-large", items.large);
}

function renderCategory(containerId, itemList) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = "";

    itemList.forEach(item => {
        const div = document.createElement("div");
        div.className = "shop-item";
        div.style = "background:#2c3e50; padding:10px; margin-bottom:10px; border-radius:5px;";

        div.innerHTML = `
            <p><strong>${item.name}</strong></p>
            <p style="font-size:0.9em;">${item.desc}</p>
            <input type="number" id="price-${item.id}" value="${item.price}" style="width:80px;">
            <button class="btn-save-price" data-id="${item.id}">💾 Зберегти</button>
        `;

        div.querySelector(".btn-save-price").onclick = () => {
            const newPrice = parseInt(document.getElementById(`price-${item.id}`).value);
            if (isNaN(newPrice) || newPrice < 0) return alert("Некоректне число!");

            updateItemPrice(item.id, newPrice);
            alert("Ціну оновлено!");
        };

        container.appendChild(div);
    });
}
