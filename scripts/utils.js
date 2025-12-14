// Apply saved theme
if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark");
}

// Detect system theme if none saved
if (!localStorage.getItem("theme")) {
    if (window.matchMedia("(prefers-color-scheme: dark)").matches)
        document.body.classList.add("dark");
}

function toggleTheme() {
    document.body.classList.toggle("dark");

    localStorage.setItem(
        "theme",
        document.body.classList.contains("dark") ? "dark" : "light"
    );

    setToggleIcon();
}

function setToggleIcon() {
    const icon = document.querySelector(".theme-toggle");
    if (!icon) return;

    icon.textContent = document.body.classList.contains("dark") ? "☀️" : "🌙";
}

setToggleIcon();

/* Ripple effect */
document.addEventListener("click", e => {
    if (!e.target.classList.contains("primary-btn") &&
        !e.target.classList.contains("secondary-btn")) return;

    const btn = e.target;
    const ripple = document.createElement("span");
    ripple.className = "ripple";
    ripple.style.left = e.offsetX + "px";
    ripple.style.top = e.offsetY + "px";
    btn.appendChild(ripple);

    setTimeout(() => ripple.remove(), 600);
});
/* ===============================
   💎 INIT LUCIDE ICONS
================================*/
function initIcons() {
    if (window.lucide) {
        lucide.createIcons();
    }
}
// In scripts/utils.js

document.addEventListener("DOMContentLoaded", () => {
    // Add click sounds to all buttons and links
    document.querySelectorAll("button, a, .tool-card").forEach(el => {

        // Hover Sound (Tick)
        el.addEventListener("mouseenter", () => {
            if(window.synth) window.synth.hover();
        });

        // Click Sound (Blip)
        el.addEventListener("click", () => {
            if(window.synth) window.synth.click();
        });
    });
});
// Run on load
document.addEventListener("DOMContentLoaded", initIcons);

// Export for dynamic use (chat bubbles, tool outputs)
window.initIcons = initIcons;