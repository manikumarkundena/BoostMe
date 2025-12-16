document.addEventListener("DOMContentLoaded", async () => {
    console.log("📊 Dashboard Initializing...");
    
    // 1. Check Auth
    const { data: { user } } = await sb.auth.getUser();
    if (!user) {
        window.location.href = "login.html";
        return;
    }

    // 2. Fetch Data
    await loadDashboard(user.id);
});

/* =========================================
   CORE DATA FETCHING
========================================= */
async function loadDashboard(userId) {
    try {
        // Calculate date 7 days ago
        const date = new Date();
        date.setDate(date.getDate() - 6); // Last 7 days including today
        const startDate = date.toISOString().split('T')[0];

        // FETCH: Get last 7 days of stats
        const { data: stats, error } = await sb
            .from('daily_stats')
            .select('*')
            .eq('user_id', userId)
            .gte('date', startDate)
            .order('date', { ascending: true });

        if (error) throw error;

        // FETCH: Get ALL TIME total focus minutes for Leveling
        // We use a separate aggregation query for accuracy
        const { data: allStats, error: aggError } = await sb
            .from('daily_stats')
            .select('focus_minutes')
            .eq('user_id', userId);

        let totalLifeMinutes = 0;
        if (allStats) {
            totalLifeMinutes = allStats.reduce((acc, row) => acc + (row.focus_minutes || 0), 0);
        }

        // --- PROCESS DATA ---
        const todayStr = new Date().toISOString().split('T')[0];
        
        // Find today's specific row (if it exists)
        const todayData = stats.find(row => row.date === todayStr) || {};
        
        // Find yesterday's row (for insights)
        const yesterdayDate = new Date();
        yesterdayDate.setDate(yesterdayDate.getDate() - 1);
        const yStr = yesterdayDate.toISOString().split('T')[0];
        const yesterdayData = stats.find(row => row.date === yStr) || {};

        // --- RENDER UI ---
        renderSnapshot(todayData);
        renderCharts(stats); // Pass full 7 days data
        renderInsights(todayData, yesterdayData, stats);
        renderLevel(totalLifeMinutes);

    } catch (err) {
        console.error("Dashboard Error:", err);
        // Optional: Show empty state or error toast
    }
}

/* =========================================
   1. SNAPSHOT (TOP CARDS)
========================================= */
function renderSnapshot(data) {
    // Helper to safely get number
    const val = (key) => data[key] || 0;

    document.getElementById("val-focus").innerText = `${val('focus_minutes')}m`;
    document.getElementById("val-games").innerText = val('games_played');
    document.getElementById("val-challenges").innerText = val('challenges_completed');
    document.getElementById("val-tasks").innerText = val('completed_tasks');
}

/* =========================================
   2. CHARTS (CHART.JS)
========================================= */
function renderCharts(weeklyData) {
    const isDark = document.body.classList.contains("dark") || 
                   document.documentElement.getAttribute('data-theme') === 'dark';
    
    const textColor = isDark ? "#ccc" : "#444";
    const gridColor = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)";
    const primaryColor = "#6c5ce7";

    // --- PREPARE DATA ARRAYS ---
    // We need to ensure we have entries for all 7 days, even empty ones
    const labels = [];
    const focusData = [];
    const challengeData = [];

    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
        
        labels.push(dayName); // Mon, Tue...
        
        // Find data for this date
        const dayStats = weeklyData.find(row => row.date === dateStr);
        focusData.push(dayStats ? dayStats.focus_minutes : 0);
        challengeData.push(dayStats ? dayStats.challenge_minutes : 0);
    }

    // --- CHART 1: WEEKLY FOCUS (Line/Area) ---
    const ctxWeekly = document.getElementById('weeklyChart');
    if (ctxWeekly) {
        new Chart(ctxWeekly, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Minutes',
                    data: focusData,
                    borderColor: primaryColor,
                    backgroundColor: 'rgba(108, 92, 231, 0.2)', // Fill color
                    borderWidth: 2,
                    tension: 0.4, // Smooth curve
                    fill: true,
                    pointRadius: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { 
                        beginAtZero: true, 
                        grid: { color: gridColor },
                        ticks: { color: textColor }
                    },
                    x: { 
                        grid: { display: false },
                        ticks: { color: textColor }
                    }
                }
            }
        });
    }

    // --- CHART 2: BALANCE (Doughnut) ---
    // Sum up totals for the visual
    const totalFocus = focusData.reduce((a, b) => a + b, 0);
    const totalChill = challengeData.reduce((a, b) => a + b, 0); // Assuming challenge_minutes = chill time
    
    // Fallback if empty so chart isn't blank
    const chartData = (totalFocus === 0 && totalChill === 0) 
        ? [1, 1] // Placeholder visual
        : [totalFocus, totalChill];
        
    const bgColors = (totalFocus === 0 && totalChill === 0)
        ? ['#333', '#444']
        : [primaryColor, '#ff7675']; // Purple vs Red/Pink

    const ctxBalance = document.getElementById('balanceChart');
    if (ctxBalance) {
        new Chart(ctxBalance, {
            type: 'doughnut',
            data: {
                labels: ['Focus', 'Chill'],
                datasets: [{
                    data: chartData,
                    backgroundColor: bgColors,
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%', // Thinner ring
                plugins: {
                    legend: { position: 'bottom', labels: { color: textColor } }
                }
            }
        });
    }
}

/* =========================================
   3. INSIGHTS & MOTIVATION
========================================= */
function renderInsights(today, yesterday, weekly) {
    const el = document.getElementById("insightSection");
    const textEl = document.getElementById("insightText");
    const iconEl = document.querySelector(".insight-icon");
    
    if (!el) return;

    const tFocus = today.focus_minutes || 0;
    const yFocus = yesterday.focus_minutes || 0;
    
    // Logic: Compare today to yesterday
    let msg = "";
    let icon = "sparkles"; // default lucide icon name

    if (tFocus > yFocus && yFocus > 0) {
        msg = `🔥 You're on fire! ${tFocus - yFocus}m more focus than yesterday.`;
        icon = "flame";
    } else if (tFocus > 60) {
        msg = "🚀 Solid deep work session today. Keep it up!";
        icon = "rocket";
    } else if (today.games_played > 2 && tFocus < 10) {
        msg = "🎮 Lots of chill today. Maybe try a 5m focus sprint?";
        icon = "gamepad-2";
    } else {
        msg = "🌱 Every minute counts. Start small today!";
        icon = "leaf";
    }

    textEl.innerText = msg;
    // Update icon dynamically
    iconEl.setAttribute("data-lucide", icon);
    lucide.createIcons();
    
    el.style.display = "flex"; // Show card
}

/* =========================================
   4. LEVEL SYSTEM (Preserved)
========================================= */
/* =========================================
   4. LEVEL SYSTEM (Updated for CSS styling)
========================================= */

/* =========================================
   4. LEVEL SYSTEM
========================================= */
function renderLevel(totalMinutes) {
    const level = Math.floor(totalMinutes / 60) + 1;
    let title = "Novice";

    if(level > 2) title = "Apprentice";
    if(level > 5) title = "Focus Pro";
    if(level > 10) title = "Flow Master";
    if(level > 20) title = "Time Lord";
    if(level > 50) title = "God Mode";

    const container = document.getElementById("levelContainer");
    if(container) {
        // We use specific classes here that match dashboard.css
        container.innerHTML = `
            <div class="level-card-wrapper">
                <div class="level-badge">
                    🌟 Lvl ${level}: ${title}
                </div>
                <div class="level-text">
                    Total Lifetime Focus: ${totalMinutes} mins
                </div>
            </div>
        `;
    }
}