document.addEventListener("DOMContentLoaded", async () => {
    
    // 1. APPLY SAVED THEME
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);

    const nav = document.getElementById("navbar-right");
    
    // 2. GET USER (Auth Check)
    let user = null;
    if (window.sb) {
        const { data } = await sb.auth.getUser();
        user = data?.user;
        window.currentUser = user; // Make globally available
    }

    // 3. RENDER NAVBAR UI
    if (nav) {
        nav.innerHTML = "";
        
        if (!user) {
            // === LOGGED OUT ===
            nav.innerHTML = `
                <a href="login.html" class="primary-btn" 
                   style="padding:8px 16px; font-size:13px; text-decoration:none;">
                   Login
                </a>
            `;
            
            // 🚀 TRIGGER THE LOGIN NUDGE (Only for guests)
            initLoginNudge();

        } else {
            // === LOGGED IN ===
            const avatar = user.user_metadata?.avatar_url || "../assets/avatars/default.png";

            nav.innerHTML = `
                <a href="dashboard.html" class="nav-dash-btn" title="Dashboard">
                    <i data-lucide="bar-chart-2" width="22"></i>
                </a>

                <div class="profile-wrapper">
                    <img src="${avatar}" class="profile-avatar" id="profileAvatar">
                    
                    <div class="profile-menu">
                        <button onclick="location.href='profile.html'">👤 Profile</button>
                        <button onclick="location.href='avatar.html'">🖼 Change Avatar</button>
                        <button onclick="location.href='settings.html'">⚙ Settings</button>
                        
                        <button onclick="location.href='settings.html'">❓ Help & Support</button>

                        <div style="height:1px; background:var(--card-border); margin:4px 0;"></div>
                        <button onclick="logout()">🚪 Logout</button>
                    </div>
                </div>
            `;
        }
    }

    // Refresh Icons
    if (window.lucide) lucide.createIcons();
});

// Logout Helper
async function logout() {
    if(window.sb) await sb.auth.signOut();
    location.href = "login.html";
}

/* =========================================================
   🚀 LOGIN NUDGE LOGIC (Smart Popup)
========================================================= */
function initLoginNudge() {
    if (sessionStorage.getItem("loginNudgeDismissed") === "true") return;

    // Show after 20 seconds
    setTimeout(() => {
        if (window.currentUser) return;
        showNudgeModal();
    }, 20000); 
}

function showNudgeModal() {
    if (document.getElementById("nudge-modal")) return;

    const backdrop = document.createElement("div");
    backdrop.id = "nudge-modal";
    backdrop.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0, 0, 0, 0.5); backdrop-filter: blur(6px);
        z-index: 99999; display: flex; align-items: center; justify-content: center;
        opacity: 0; transition: opacity 0.3s ease;
    `;

    const content = document.createElement("div");
    content.style.cssText = `
        background: rgba(255, 255, 255, 0.9);
        padding: 30px; border-radius: 24px; width: 90%; max-width: 380px;
        text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.25);
        border: 1px solid rgba(255,255,255,0.6);
        transform: scale(0.9); transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        font-family: 'Plus Jakarta Sans', sans-serif;
    `;

    content.innerHTML = `
        <div style="font-size: 42px; margin-bottom: 15px;">💾</div>
        <h2 style="margin: 0 0 10px; color: #1f2937; font-size: 20px; font-weight: 700;">Save Your Progress!</h2>
        <p style="margin: 0 0 25px; color: #4b5563; font-size: 14px; line-height: 1.5;">
            You're currently in <b>Guest Mode</b>. Create a free account to verify your stats, save chat history, and unlock all tools.
        </p>
        <div style="display: flex; gap: 12px; justify-content: center;">
            <button id="nudge-later" style="
                padding: 10px 18px; border: none; background: transparent;
                color: #6b7280; cursor: pointer; font-weight: 600; font-size: 14px;
                border-radius: 8px; transition: background 0.2s;
            ">Later</button>
            <button onclick="location.href='login.html'" style="
                padding: 10px 24px; border: none; border-radius: 50px;
                background: linear-gradient(135deg, #6c63ff 0%, #5a52d5 100%);
                color: white; cursor: pointer; font-weight: 600; font-size: 14px;
                box-shadow: 0 4px 12px rgba(108, 99, 255, 0.3);
                transition: transform 0.2s;
            " onmouseover="this.style.transform='translateY(-2px)'" 
              onmouseout="this.style.transform='translateY(0)'">
                Login Now
            </button>
        </div>
    `;

    backdrop.appendChild(content);
    document.body.appendChild(backdrop);

    const laterBtn = content.querySelector("#nudge-later");
    laterBtn.onmouseover = () => laterBtn.style.background = "#f3f4f6";
    laterBtn.onmouseout = () => laterBtn.style.background = "transparent";
    
    laterBtn.onclick = () => {
        backdrop.style.opacity = "0";
        content.style.transform = "scale(0.9)";
        setTimeout(() => backdrop.remove(), 300);
        sessionStorage.setItem("loginNudgeDismissed", "true");
    };

    requestAnimationFrame(() => {
        backdrop.style.opacity = "1";
        content.style.transform = "scale(1)";
    });
}