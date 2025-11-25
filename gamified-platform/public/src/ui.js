export function showScreen(id) {
    document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
    const screenElement = document.getElementById(id);
    if (screenElement) {
        screenElement.classList.add("active");
    } else {
        console.error(`Екран з ID "${id}" не знайдено.`);
    }
}

export function showToast(text) {
    const t = document.createElement("div");
    t.className = "card";
    t.style.position = "fixed";
    t.style.bottom = "20px";
    t.style.right = "20px";
    t.textContent = text;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2500);
}