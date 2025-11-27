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

// !!! ІМПОРТ ФУНКЦІЙ МАГАЗИНУ (Переконайтеся, що файл shopData.js існує)
import { getShopItems, updateItemPrice } from "./shopData.js"; 

// --- ФУНКЦІЯ ЗАПУСКУ ---
export function initTeacherPanel() {
    console.log("TeacherPanel: Init...");
    
    // 1. Рендеримо головну панель (Класи) - це те, що вчитель бачить одразу
    renderTeacherDashboard("teacher-content"); 

    // 2. Рендеримо Редактор Скарбниці ОДРАЗУ (автоматично)
    // Не треба чекати кліку. Ми просто заповнюємо прихований контейнер даними.
    // Коли вчитель натисне кнопку в меню, router.js просто покаже цей вже готовий контейнер.
    setTimeout(() => {
        renderTreasureEditor();
    }, 100); 
}

// --- ЛОГІКА ОТРИМАННЯ УНІКАЛЬНИХ КЛАСІВ З БАЗИ ---
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

// --- РЕНДЕРИНГ ГОЛОВНОЇ ПАНЕЛІ (БЛОКИ КЛАСІВ) ---
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
            <p>Переглянути лідерборд та прогрес</p>
        `;
        
        card.addEventListener('click', () => {
            renderClassLeaderboard(className); 
        });
        
        grid.appendChild(card);
    });

    if (classes.length === 0) {
        grid.innerHTML = '<p style="text-align: center; margin-top: 30px;">У системі ще немає зареєстрованих учнів.</p>';
    }
}

// =========================================================
// 🏆 ЛОГІКА РЕНДЕРИНГУ ЛІДЕРБОРДА ДЛЯ КОНКРЕТНОГО КЛАСУ
// =========================================================

async function renderClassLeaderboard(className) {
    const container = document.getElementById("teacher-content");
    if (!container) return;

    container.innerHTML = `
        <div class="teacher-header">
            <button id="btn-back-to-classes" class="btn btn-secondary">← Назад до класів</button>
            <h2>🏆 Лідерборд класу: ${className}</h2>
            <p>Учні відсортовані за кількістю золота.</p>
        </div>
        <table class="leaderboard-table">
            <thead>
                <tr>
                    <th>№</th>
                    <th>Ім'я</th>
                    <th>Золото 💰</th>
                    <th>Дії</th>
                </tr>
            </thead>
            <tbody id="class-leaderboard-body">
                </tbody>
        </table>
    `;

    document.getElementById("btn-back-to-classes").onclick = () => {
        renderTeacherDashboard("teacher-content"); 
    };

    const tbody = document.getElementById("class-leaderboard-body");
    
    const q = query(
        collection(db, "users"),
        where("role", "==", "student"),
        where("className", "==", className),
        orderBy("profile.gold", "desc")
    );
    
    const querySnapshot = await getDocs(q);
    const students = [];
    querySnapshot.forEach(doc => {
        students.push({ ...doc.data(), uid: doc.id }); 
    });

    students.forEach((student, index) => {
        const tr = document.createElement("tr");
        
        let rankDisplay = index + 1;
        if (index === 0) rankDisplay = "🥇 1";
        if (index === 1) rankDisplay = "🥈 2";
        if (index === 2) rankDisplay = "🥉 3";

        tr.innerHTML = `
            <td class="rank-col">${rankDisplay}</td>
            <td class="name-col">${student.name}</td>
            <td class="gold-col">${student.profile.gold || 0} 💰</td>
            <td class="action-col">
                <button class="btn btn-sm btn-view-profile" data-uid="${student.uid}" data-class="${className}">Результати</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    
    setupProfileView(students);
}

// =========================================================
// 👁️ ЛОГІКА ПЕРЕГЛЯДУ ПРОФІЛЮ УЧНЯ
// =========================================================

function setupProfileView(students) {
    document.querySelectorAll('.btn-view-profile').forEach(button => {
        button.addEventListener('click', (e) => {
            const studentUid = e.target.dataset.uid;
            const student = students.find(s => s.uid === studentUid);
            
            if (student) {
                renderStudentProfile(student);
            } else {
                alert("Помилка: Дані учня не знайдено!");
            }
        });
    });
}

// =========================================================
// 👤 ФУНКЦІЯ РЕНДЕРИНГУ ПРОФІЛЮ УЧНЯ
// =========================================================

async function renderStudentProfile(student) {
    const container = document.getElementById("teacher-content");
    if (!container) return;

    const inventory = student.profile.inventory || [];
    
    const stackedInventory = inventory.reduce((acc, item) => {
        const itemName = item.name || 'Нагорода без назви';
        acc[itemName] = (acc[itemName] || 0) + 1;
        return acc;
    }, {});
    
    const inventoryKeys = Object.keys(stackedInventory);
    const inventoryList = inventoryKeys.length > 0
        ? inventoryKeys.map(name => {
            const count = stackedInventory[name];
            const countText = count > 1 ? ` (x${count})` : '';
            return `<li>${name}${countText}</li>`;
        }).join('')
        : '<li>Нагороди ще не придбані.</li>';
        
    let goldDisplay = student.profile.gold || 0; 

    container.innerHTML = `
        <div class="teacher-header" style="text-align: center;">
            <button id="btn-back-to-leaderboard" class="btn btn-secondary" style="float: left;">← Назад до лідерборду</button>
            <h2 style="font-size: 2em; margin-bottom: 5px;">👤 ПРОФІЛЬ УЧНЯ</h2>
            <h1 style="color: var(--accent-gold); margin-top: 0; font-size: 2.5em;">${student.name}</h1>
            <p style="margin-bottom: 30px;">Детальна інформація про прогрес та нагороди.</p>
        </div>

        <div class="profile-dashboard-grid">
            
            <div class="card profile-info-card" style="padding: 20px;">
                <h3 style="color: var(--primary-color); border-bottom: 2px solid #ccc; padding-bottom: 10px; margin-bottom: 20px;">Основні Дані</h3>
                
                <div class="info-line">
                    <strong>🎓 Клас:</strong> <span style="font-size: 1.2em; font-weight: bold;">${student.className}</span>
                </div>
                
                <div class="info-line">
                    <strong>📧 Email:</strong> <span>${student.email}</span>
                </div>
            </div>

            <div class="card profile-rewards-card" style="padding: 20px;">
                <h3 style="color: var(--accent-gold); text-align: center;">💰 Баланс Золота</h3>
                <p id="current-gold-display" class="big-gold-amount" style="font-size: 3em; font-weight: bold; text-align: center; color: var(--accent-gold); margin-top: 0;">
                    ${goldDisplay} 💰
                </p>

                <div class="gold-editor-controls" style="margin-bottom: 20px; text-align: center;">
                    <input type="number" id="gold-amount-input" placeholder="Нова кількість" style="width: 50%; padding: 8px; margin-right: 5px; color: black; border-radius: 5px;">
                    <button id="btn-update-gold" data-uid="${student.uid}" class="btn btn-sm" style="background-color: #f39c12; color: white; border:none; padding: 8px 15px; cursor: pointer;">Оновити</button>
                </div>
                
                <div style="border-top: 1px dashed #555; margin: 20px 0;"></div>
                
                <h3 style="color: var(--primary-color); text-align: center;">🎁 Отримані Нагороди</h3>
                <ul class="rewards-list" style="list-style-type: none; padding-left: 0;">
                    ${inventoryList}
                </ul>
            </div>
        </div>
    `;

    document.getElementById("btn-update-gold").addEventListener('click', async () => {
        const inputElement = document.getElementById("gold-amount-input");
        const newGoldValue = parseInt(inputElement.value);

        if (isNaN(newGoldValue) || newGoldValue < 0) {
            alert("Будь ласка, введіть дійсне додатне число для золота.");
            return;
        }

        if (!student.uid) {
            alert("Помилка: UID учня не знайдено.");
            return;
        }

        try {
            const studentRef = doc(db, "users", student.uid);
            await updateDoc(studentRef, {
                "profile.gold": newGoldValue
            });

            document.getElementById("current-gold-display").innerHTML = `${newGoldValue} 💰`;
            inputElement.value = ''; 
            alert(`Золото учня ${student.name} успішно оновлено до ${newGoldValue}.`);

        } catch (error) {
            console.error("Помилка оновлення золота:", error);
            alert("Помилка при оновленні золота. Перевірте консоль.");
        }
    });
    
    document.getElementById("btn-back-to-leaderboard").onclick = () => {
        renderClassLeaderboard(student.className); 
    };
}

// =========================================================
// 💎 РЕДАКТОР СКАРБНИЦІ (ЦІН)
// =========================================================

async function renderTreasureEditor() {
    console.log("Rendering Treasury Editor...");
    
    const container = document.getElementById("treasury-content");
    
    if (!container) {
        console.error("Помилка: Контейнер 'treasury-content' не знайдено в index.html");
        return;
    }

    container.innerHTML = `
        <div class="teacher-header" style="text-align: center;">
            <h2 style="font-size: 2.5em; color: var(--accent-gold);">💎 РЕДАГУВАННЯ ЦІН СКАРБНИЦІ</h2>
            <p style="margin-bottom: 30px;">Тут ви можете змінювати ціни на нагороди для учнів.</p>
        </div>

        <div class="category-grid" style="display: flex; gap: 20px; flex-wrap: wrap; justify-content: center;">
            <div class="editor-category-block" style="flex: 1; min-width: 300px; background: #1a1a1a; padding: 15px; border-radius: 10px; border: 1px solid #333;">
                <h3 style="color: #2ecc71; text-align: center; border-bottom: 1px solid #333; padding-bottom: 10px;">Мікро-нагороди</h3>
                <div id="teacher-rewards-micro" class="rewards-editor-list"></div>
            </div>
            <div class="editor-category-block" style="flex: 1; min-width: 300px; background: #1a1a1a; padding: 15px; border-radius: 10px; border: 1px solid #333;">
                <h3 style="color: #3498db; text-align: center; border-bottom: 1px solid #333; padding-bottom: 10px;">Середні нагороди</h3>
                <div id="teacher-rewards-medium" class="rewards-editor-list"></div>
            </div>
            <div class="editor-category-block" style="flex: 1; min-width: 300px; background: #1a1a1a; padding: 15px; border-radius: 10px; border: 1px solid #333;">
                <h3 style="color: #9b59b6; text-align: center; border-bottom: 1px solid #333; padding-bottom: 10px;">Великі нагороди</h3>
                <div id="teacher-rewards-large" class="rewards-editor-list"></div>
            </div>
        </div>
    `;

    try {
        const items = getShopItems(); 
        renderCategory("teacher-rewards-micro", items.micro);
        renderCategory("teacher-rewards-medium", items.medium);
        renderCategory("teacher-rewards-large", items.large);
    } catch (e) {
        console.error("Помилка завантаження товарів:", e);
        container.innerHTML += `<p style="color: red; text-align: center;">Помилка: ${e.message}. Перевірте shopData.js</p>`;
    }
}

// =========================================================
// 🛒 ФУНКЦІЯ РЕНДЕРИНГУ КАТЕГОРІЙ (БУЛА ПРОПУЩЕНА)
// =========================================================

function renderCategory(containerId, itemList) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = ""; 

    itemList.forEach(item => {
        const div = document.createElement("div");
        div.className = "shop-item";
        div.style.background = "#2c3e50"; 
        div.style.border = "1px solid #34495e";
        div.style.borderRadius = "8px";
        div.style.padding = "10px";
        div.style.marginBottom = "15px";

        div.innerHTML = `
            <div class="shop-item-row" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                <div class="item-name" style="color: #ecf0f1; font-weight: bold;">${item.name}</div>
                <div style="width: 50%; text-align: right; display: flex; align-items: center; justify-content: flex-end;">
                    <input type="number" id="price-${item.id}" value="${item.price}" 
                           style="width: 70px; padding: 5px; background: #34495e; color: #f1c40f; border: 1px solid #555; border-radius: 5px; text-align: center; margin-right: 5px;">
                    <span style="color: #f1c40f;">💰</span>
                </div>
            </div>
            <div class="item-desc" style="margin-bottom: 10px; font-size: 0.8rem; color: #bdc3c7;">${item.desc}</div>
            <button class="btn-save-price" data-id="${item.id}" 
                    style="width: 100%; padding: 8px; background: #27ae60; border: none; border-radius: 5px; cursor: pointer; color: white; font-weight: bold; text-transform: uppercase;">
                💾 Зберегти ціну
            </button>
        `;

        const btn = div.querySelector(".btn-save-price");
        btn.onclick = () => {
            const input = document.getElementById(`price-${item.id}`);
            const newPrice = parseInt(input.value);
            
            if (isNaN(newPrice) || newPrice < 0) {
                 alert("Будь ласка, введіть дійсне додатне число.");
                 return;
            }

            // Зберігаємо ціну (оновлюємо shopData.js / localStorage)
            const success = updateItemPrice(item.id, newPrice);
            
            if (success) {
                alert(`Ціну на "${item.name}" оновлено до ${newPrice}!`);
                btn.style.backgroundColor = "#1abc9c"; 
                setTimeout(() => btn.style.backgroundColor = "#27ae60", 1000);
            } else {
                alert("Помилка збереження! Перевірте консоль та shopData.js");
            }
        };

        container.appendChild(div);
    });
}