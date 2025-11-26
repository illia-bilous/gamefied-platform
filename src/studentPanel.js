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
    console.log("StudentPanel: Ініціалізація...");
    
    let user = getCurrentUser();
    if (!user) return;

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
    // 🎮 ЛОГІКА UNITY (INTEGRATION v2: postMessage)
    // ==========================================

    const unityContainer = document.getElementById("unity-container");
    const startBtn = document.getElementById("btn-start-lesson");

    // 1. Слухач повідомлень від Unity
    // Це найбезпечніший метод. Unity пише "SMS", а ми читаємо.
    window.addEventListener("message", function(event) {
        // Перевіряємо, чи це текст (щоб не ламалось від системних подій)
        if (typeof event.data !== "string") return;

        console.log("Отримано сигнал від Unity:", event.data);

        // А) Якщо прийшла команда додати монети (Наприклад: "ADD_COINS|10")
        if (event.data.startsWith("ADD_COINS|")) {
            const amount = parseInt(event.data.split("|")[1]); // Витягуємо число
            
            console.log(`Нараховуємо: ${amount} монет`);
            
            // Оновлюємо дані
            user = getCurrentUser(); // Беремо найсвіжіші дані
            user.profile.gold += amount;
            saveUserData(user);
            updateHomeDisplay(user);

            // Ефект пульсації для лічильника
            const goldDisplay = document.getElementById("student-gold-display");
            if(goldDisplay) {
                goldDisplay.classList.add("pulse");
                setTimeout(() => goldDisplay.classList.remove("pulse"), 1000);
            }
        }

        // Б) Якщо прийшла команда закрити гру
        if (event.data === "CLOSE_GAME") {
            closeUnityGame();
        }
    });

    // 2. Функція запуску гри (Кнопка "Почати урок")
    if (startBtn) {
        startBtn.onclick = () => {
            if (unityContainer) {
                unityContainer.classList.remove("hidden");
                unityContainer.scrollIntoView({ behavior: 'smooth' });

                // Додаємо кнопку "Примусовий вихід" (на випадок зависання)
                if (!document.getElementById("btn-force-close-unity")) {
                    const closeBtn = document.createElement("button");
                    closeBtn.id = "btn-force-close-unity";
                    closeBtn.innerText = "✖ Закрити гру";
                    closeBtn.style.cssText = "margin-bottom: 10px; background: #c0392b; color: white; border: none; padding: 10px; cursor: pointer; border-radius: 5px;";
                    closeBtn.onclick = closeUnityGame;
                    unityContainer.insertBefore(closeBtn, unityContainer.firstChild);
                }

                // Вставляємо iframe з грою
                // Важливо: шлях unity/index.html має бути правильним
                const iframe = unityContainer.querySelector("iframe");
                if (!iframe) {
                     const newIframe = document.createElement("iframe");
                     newIframe.src = "unity/index.html"; 
                     newIframe.style.cssText = "width:100%; height:600px; border:none;";
                     unityContainer.appendChild(newIframe);
                }
            }
        };
    }

    // 3. Функція закриття гри
    function closeUnityGame() {
        console.log("Закриваємо гру...");
        if (unityContainer) {
            unityContainer.classList.add("hidden");
            
            // Видаляємо iframe (щоб гра повністю вивантажилась з пам'яті)
            const iframe = unityContainer.querySelector("iframe");
            if (iframe) iframe.remove();
            
            // Видаляємо кнопку закриття
            const closeBtn = document.getElementById("btn-force-close-unity");
            if (closeBtn) closeBtn.remove();
        }
        // Оновлюємо інтерфейс
        user = getCurrentUser();
        updateHomeDisplay(user);
    };

    // --- Допоміжні функції UI ---

    function updateHomeDisplay(currentUser) {
        document.getElementById("student-name-display").textContent = currentUser.name;
        document.getElementById("student-email-display").textContent = currentUser.email;
        document.getElementById("student-class-display").textContent = currentUser.className || "Не вказано";
        document.getElementById("student-gold-display").textContent = currentUser.profile.gold;

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

        if (!realItem) {
            alert("Помилка: Товар більше не існує.");
            return;
        }

        if (realItem.price !== visualItem.price) {
            alert(`Увага! Вчитель змінив ціну. Нова ціна: ${realItem.price}`);
            location.reload(); 
            return;
        }

        if (user.profile.gold >= realItem.price) {
            user.profile.gold -= realItem.price;
            if (!user.profile.inventory) user.profile.inventory = [];
            user.profile.inventory.push({ name: realItem.name, date: new Date().toISOString() });

            saveUserData(user);
            updateHomeDisplay(user);
            
            const goldDisplay = document.getElementById("student-gold-display");
            goldDisplay.classList.add("pulse");
            setTimeout(() => goldDisplay.classList.remove("pulse"), 1000);

            alert(`Успішно придбано: ${realItem.name}!`);
        } else {
            alert("Недостатньо золота!");
        }
    }
}