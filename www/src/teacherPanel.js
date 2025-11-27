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

// --- ФУНКЦІЯ ЗАПУСКУ ---
export function initTeacherPanel() {
    console.log("TeacherPanel: Init...");
    renderTeacherDashboard("teacher-content"); 
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

    // 1. Отримати унікальні класи
    const { classes, totalStudents } = await getUniqueClasses();

    container.innerHTML = `
        <div class="teacher-header">
            <h2>📚 Мої класи</h2>
            <p>Всього учнів у системі: ${totalStudents}</p>
        </div>
        <div id="class-cards" class="class-grid"></div>
    `;
    
    const grid = document.getElementById("class-cards");
    
    // 2. Створити картку для кожного класу
    classes.forEach(className => {
        const card = document.createElement("div");
        card.className = "class-card";
        
        card.innerHTML = `
            <h3>${className}</h3>
            <p>Переглянути лідерборд та прогрес</p>
        `;
        
        card.addEventListener('click', () => {
            // ОНОВЛЕННЯ: Викликаємо функцію детального лідерборда
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

    // Створюємо базовий інтерфейс для таблиці
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

    // 1. Обробка кнопки "Назад"
    document.getElementById("btn-back-to-classes").onclick = () => {
        renderTeacherDashboard("teacher-content"); 
    };

    const tbody = document.getElementById("class-leaderboard-body");
    
    // 2. Запит до Firebase: фільтруємо по className та сортуємо по gold
    const q = query(
        collection(db, "users"),
        where("role", "==", "student"),
        where("className", "==", className),
        orderBy("profile.gold", "desc")
    );
    
    const querySnapshot = await getDocs(q);
    const students = [];
    querySnapshot.forEach(doc => students.push(doc.data()));

    // 3. Рендеринг рядків таблиці
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
                <button class="btn btn-sm btn-edit-gold" data-uid="${student.uid}">Редагувати</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    
    // 4. Підключаємо логіку редагування
    setupGoldEditor(students);
}

// =========================================================
// ✏️ ЛОГІКА РЕДАГУВАННЯ ЗОЛОТА ВЧИТЕЛЕМ
// =========================================================

function setupGoldEditor(students) {
    document.querySelectorAll('.btn-edit-gold').forEach(button => {
        button.addEventListener('click', (e) => {
            const studentUid = e.target.dataset.uid;
            const student = students.find(s => s.uid === studentUid);
            
            if (!student) return alert("Помилка: Учня не знайдено!");

            const currentGold = student.profile.gold || 0;
            const newGoldStr = prompt(`Введіть нову суму золота для ${student.name} (поточна: ${currentGold} 💰):`);
            
            if (newGoldStr === null) return; 
            
            const newGold = parseInt(newGoldStr);
            
            if (isNaN(newGold) || newGold < 0) {
                return alert("Будь ласка, введіть дійсне додатне число.");
            }
            
            updateStudentGold(studentUid, newGold, student.className, student.name);
        });
    });
}

async function updateStudentGold(uid, newGold, className, studentName) {
    try {
        const userRef = doc(db, "users", uid);
        
        await updateDoc(userRef, {
            "profile.gold": newGold
        });

        alert(`✅ Золото ${studentName} оновлено до ${newGold}!`);
        
        // Перезавантажуємо лідерборд, щоб показати оновлені дані
        renderClassLeaderboard(className); 

    } catch (error) {
        console.error("Помилка оновлення золота:", error);
        alert("❌ Помилка: Не вдалося оновити золото в базі даних.");
    }
}