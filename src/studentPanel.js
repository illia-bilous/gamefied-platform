import { getCurrentUser } from "./auth.js";
import { getShopItems, findItemById } from "./shopData.js";

// --- ФУНКЦІЯ ЗБЕРЕЖЕННЯ ---
function saveUserData(user) {
    localStorage.setItem("currentUser", JSON.stringify(user));
    const allUsers = JSON.parse(localStorage.getItem("users") || "[]");
    const index = allUsers.findIndex(u => u.email === user.email);
    if (index !== -1) {
        allUsers[index] = user;
        localStorage.setItem("users", JSON.stringify(allUsers));
    }
}

export function initStudentPanel() {
    console.log("StudentPanel: Init (Tabs restored + Wide Game)...");
    
    let user = getCurrentUser();
    if (!user) return;

    // --- Логіка перемикання вкладок (МЕНЮ ЗЛІВА) ---
    const menuItems = document.querySelectorAll(".menu-item[data-panel]");
    const views = document.querySelectorAll(".panel-view");

    menuItems.forEach(btn => {
        btn.addEventListener("click", () => {
            // 1. Прибираємо активний клас з усіх кнопок
            menuItems.forEach(b => b.classList.remove("active"));
            // 2. Додаємо активний клас натиснутій кнопці
            btn.classList.add("active");

            // 3. Ховаємо всі вкладки
            views.forEach(v => v.classList.add("hidden"));
            // 4. Показуємо потрібну вкладку
            const panelId = "view-" + btn.dataset.panel;
            document.getElementById(panelId).classList.remove("hidden");
        });
    });

    // --- Логіка бонусу ---
    if (!user.profile.welcomeBonusReceived) {
        user.profile.gold = 2500;
        user.profile.welcomeBonusReceived = true;
        if (!user.profile.inventory) user.profile.inventory = [];
        saveUserData(user);
    }

    // --- Оновлення даних ---
    updateHomeDisplay(user);

    // --- Завантаження магазину ---
    const shopItems = getShopItems();
    renderShopSection("rewards-micro-list", shopItems.micro);
    renderShopSection("rewards-medium-list", shopItems.medium);
    renderShopSection("rewards-large-list", shopItems.large);

    // ==========================================
    // 🎮 ЛОГІКА UNITY (ГРА)
    // ==========================================

    const unityContainer = document.getElementById("unity-container");
    const startBtn = document.getElementById("btn-start-lesson");

    window.addEventListener("message", function(event) {
        if (typeof event.data !== "string") return;
        
        if (event.data.startsWith("ADD_COINS|")) {
            const amount = parseInt(event.data.split("|")[1]);
            user = getCurrentUser(); 
            user.profile.gold += amount;
            saveUserData(user);
            updateHomeDisplay(user);
        }

        if (event.data === "CLOSE_GAME") {
            closeUnityGame();
        }
    });

    if (startBtn) {
        startBtn.onclick = () => {
            if (unityContainer) {
                unityContainer.classList.remove("hidden");
                startBtn.style.display = "none"; // Ховаємо кнопку

                // Кнопка закриття
                if (!document.getElementById("btn-force-close-unity")) {
                    const closeBtn = document.createElement("button");
                    closeBtn.id = "btn-force-close-unity";
                    closeBtn.innerText = "✖ Закрити";
                    closeBtn.style.cssText = "margin-bottom: 10px; background: #e74c3c; color: white; border: none; padding: 8px 15px; cursor: pointer; border-radius: 5px; float: right;";
                    closeBtn.onclick = closeUnityGame;
                    unityContainer.parentNode.insertBefore(closeBtn, unityContainer);
                }

                // Вставляємо iframe
                const iframe = unityContainer.querySelector("iframe");
                if (!iframe) {
                     const newIframe = document.createElement("iframe");
                     newIframe.src = "unity/index.html"; 
                     newIframe.style.width = "100%";
                     newIframe.style.height = "100%";
                     newIframe.style.border = "none";
                     unityContainer.appendChild(newIframe);
                }
            }
        };
    }

    function closeUnityGame() {
        if (unityContainer) {
            unityContainer.classList.add("hidden");
            const iframe = unityContainer.querySelector("iframe");
            if (iframe) iframe.remove();
        }
        const closeBtn = document.getElementById("btn-force-close-unity");
        if (closeBtn) closeBtn.remove();
        
        if(startBtn) startBtn.style.display = "inline-block"; // Повертаємо кнопку
        user = getCurrentUser();
        updateHomeDisplay(user);
    };

    // --- Допоміжні функції ---

    function updateHomeDisplay(currentUser) {
        document.getElementById("student-name-display").textContent = currentUser.name;
        document.getElementById("student-class-display").textContent = currentUser.className || "--";
        document.getElementById("student-gold-display").textContent = currentUser.profile.gold;

        // Інвентар (тепер він у вкладці Профіль)
        const listEl = document.getElementById("student-inventory-list");
        if (listEl) {
            listEl.innerHTML = "";
            if (!currentUser.profile.inventory || currentUser.profile.inventory.length === 0) {
                listEl.innerHTML = '<li class="empty-msg">Поки що пусто...</li>';
            } else {
                currentUser.profile.inventory.forEach(item => {
                    const li = document.createElement("li");
                    li.className = "inventory-item";
                    li.innerHTML = `<span>📜</span> ${item.name}`;
                    listEl.appendChild(li);
                });
            }
        }
    }

    function renderShopSection(containerId, items) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = "";

        items.forEach(item => {
            const itemDiv = document.createElement("div");
            itemDiv.className = "shop-item";
            itemDiv.innerHTML = `
                <div class="shop-item-row">
                    <div class="item-name">${item.name}</div>
                    <div class="item-price">${item.price} 💰</div>
                </div>
                <div class="item-desc">${item.desc}</div>
                <button class="btn-buy" data-id="${item.id}">Купити</button>
            `;
            itemDiv.querySelector(".btn-buy").addEventListener("click", () => buyItem(item));
            container.appendChild(itemDiv);
        });
    }

    function buyItem(visualItem) {
        user = getCurrentUser(); 
        const realItem = findItemById(visualItem.id);

        if (!realItem) { alert("Товар не знайдено."); return; }
        if (realItem.price !== visualItem.price) { alert("Ціна змінилася."); location.reload(); return; }

        if (user.profile.gold >= realItem.price) {
            user.profile.gold -= realItem.price;
            if (!user.profile.inventory) user.profile.inventory = [];
            user.profile.inventory.push({ name: realItem.name, date: new Date().toISOString() });
            saveUserData(user);
            updateHomeDisplay(user);
            alert(`Придбано: ${realItem.name}!`);
        } else {
            alert("Недостатньо золота!");
        }
    }
}