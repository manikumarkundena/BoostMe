document.addEventListener("DOMContentLoaded", async () => {
    const nav = document.getElementById("navbar-right");
    if (!nav) return;

    // ✅ Ensure sb exists
    if (!window.sb) {
        console.error("Supabase client (sb) not loaded");
        return;
    }

    const { data, error } = await sb.auth.getUser();
    const user = data?.user;

    nav.innerHTML = "";

    if (!user) {
        // 🔐 LOGGED OUT
        nav.innerHTML = `
            <a href="login.html" class="primary-btn"
               style="padding:8px 16px;font-size:13px;text-decoration:none;">
               Login
            </a>

            <div class="theme-toggle" onclick="toggleTheme()">🌙</div>
        `;
    } else {
        // ✅ LOGGED IN
        const avatar =
            user.user_metadata?.avatar_url ||
            "../assets/avatars/default.png";

        nav.innerHTML = `
            <a href="dashboard.html" class="icon-btn-small" title="Dashboard">
                <i data-lucide="bar-chart-2" width="20"></i>
            </a>

            <div class="profile-wrapper">
                <img src="${avatar}" class="profile-avatar" id="profileAvatar">

                <div class="profile-menu">
                    <button onclick="location.href='profile.html'">👤 Profile</button>
                    <button onclick="location.href='avatar.html'">🖼 Change Avatar</button>
                    <button onclick="location.href='settings.html'">⚙ Settings</button>
                    <button onclick="logout()">🚪 Logout</button>
                </div>
            </div>

            <div class="theme-toggle" onclick="toggleTheme()">🌙</div>
        `;
    }

    lucide.createIcons();
});

// Logout
async function logout() {
    await sb.auth.signOut();
    location.href = "login.html";
}
