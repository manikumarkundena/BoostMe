console.log("📊 Dashboard loading...");

/* ===============================
   1. LEVEL SYSTEM LOGIC
================================*/
function getLevel(minutes) {
    // Simple RPG logic: Level up every 60 minutes
    const level = Math.floor(minutes / 60) + 1;
    let title = "Novice";
    
    if(level > 2) title = "Apprentice";
    if(level > 5) title = "Focus Pro";
    if(level > 10) title = "Flow Master";
    if(level > 20) title = "Time Lord";
    if(level > 50) title = "God Mode";

    return { level, title };
}

/* ===============================
   2. LOAD & RENDER STATS
================================*/
function loadStats() {
    // 1. Get Data
    const totalMinutes = parseInt(localStorage.getItem("focus-minutes") || 0);
    const challenges = parseInt(localStorage.getItem("challenges-done") || 0);
    
    // 2. Calculate Level
    const { level, title } = getLevel(totalMinutes);

    // 3. Update DOM Elements
    // Use optional chaining (?) just in case element is missing
    const timeEl = document.querySelector(".focus-time");
    const chalEl = document.querySelector(".challenges");
    const streakEl = document.querySelector(".streak");

    if(timeEl) timeEl.innerText = totalMinutes + " m";
    if(chalEl) chalEl.innerText = challenges;
    
    // 🚧 Mock Streak Logic (Real logic requires saving dates)
    // For now, let's just make it look cool based on activity
    let streak = totalMinutes > 0 ? 1 : 0; 
    if(streakEl) streakEl.innerText = streak + " 🔥";

    // 4. Add a "Level Badge" dynamically if it doesn't exist
    const header = document.querySelector(".section-heading");
    const existingBadge = document.getElementById("lvlBadge");
    
    if (header && !existingBadge) {
        const badge = document.createElement("div");
        badge.id = "lvlBadge";
        badge.style.background = "var(--primary)";
        badge.style.color = "white";
        badge.style.padding = "8px 16px";
        badge.style.borderRadius = "12px";
        badge.style.marginTop = "10px";
        badge.style.display = "inline-block";
        badge.style.fontWeight = "bold";
        badge.style.fontSize = "14px";
        badge.innerHTML = `🌟 Lvl ${level}: ${title}`;
        
        header.parentElement.insertBefore(badge, header.nextSibling);
    }
}

/* ===============================
   3. RENDER CHART (Chart.js)
================================*/
function renderChart() {
    const ctx = document.getElementById('focusChart');
    if (!ctx) return;

    // Check Theme for Colors
    const isDark = document.body.classList.contains("dark");
    const textColor = isDark ? "#aaa" : "#666";
    const gridColor = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)";
    const primaryColor = "#6c63ff";

    // 🚧 Mock Data: In a real app, we'd store daily history in localStorage.
    // For now, we generate a cool looking curve ending in today's actual minutes.
    const today = parseInt(localStorage.getItem("focus-minutes") || 0);
    const mockWeek = [15, 45, 30, 60, 20, 90, today]; 

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Today'],
            datasets: [{
                label: 'Focus Minutes',
                data: mockWeek,
                backgroundColor: primaryColor,
                borderRadius: 6,
                barThickness: 16,
                hoverBackgroundColor: "#8c0cf4"
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { 
                legend: { display: false },
                tooltip: {
                    backgroundColor: isDark ? '#333' : '#fff',
                    titleColor: isDark ? '#fff' : '#000',
                    bodyColor: isDark ? '#ddd' : '#666',
                    borderColor: primaryColor,
                    borderWidth: 1,
                    displayColors: false,
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: gridColor, borderDash: [4, 4] },
                    ticks: { color: textColor, font: { family: 'Inter' } },
                    border: { display: false }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: textColor, font: { family: 'Inter' } },
                    border: { display: false }
                }
            },
            animation: {
                duration: 1500,
                easing: 'easeOutQuart'
            }
        }
    });
}

/* ===============================
   INIT
================================*/
document.addEventListener("DOMContentLoaded", () => {
    loadStats();
    renderChart();

    // Re-render chart if theme toggles (to fix colors)
    const themeBtn = document.querySelector(".theme-toggle");
    if(themeBtn) {
        themeBtn.addEventListener("click", () => {
            setTimeout(() => {
                // Destroy old chart instance if needed, or just reload
                location.reload(); // Simplest way to refresh chart colors
            }, 100);
        });
    }
});