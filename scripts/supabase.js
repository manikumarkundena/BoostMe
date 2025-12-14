// ================================
//  SUPABASE CLIENT SETUP
// ================================
const SUPABASE_URL = "https://iygvxqkzdpmelgzggvio.supabase.co"; // your URL
const SUPABASE_KEY = "sb_publishable_kvcj_5TVeYRkxujDoG8lhw_OcZRbPYz"; // anon key only

const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

window.sb = sb; // so other scripts can use sb
let currentUser = null;
window.currentUser = null;

// ================================
//  1) AUTH MODAL (MAGIC LINK LOGIN)
// ================================
function openAuth() {
    const modal = document.getElementById("authModal");
    if (modal) {
        modal.style.display = "flex";
        setTimeout(() => modal.classList.add("active"), 10);
    }
}

function closeAuth() {
    const modal = document.getElementById("authModal");
    if (modal) {
        modal.classList.remove("active");
        setTimeout(() => (modal.style.display = "none"), 300);
    }
}

async function handleMagicLogin() {
    const emailEl = document.getElementById("emailInput");
    if (!emailEl) return;

    const email = emailEl.value.trim();
    if (!email.includes("@")) {
        alert("Please enter a valid email!");
        return;
    }

    const btn = document.querySelector(".magic-btn");
    if (!btn) return;

    const originalText = btn.innerText;
    btn.innerText = "✨ Sending...";
    btn.disabled = true;

    const { error } = await sb.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.href }
    });

    if (error) {
        alert("Error: " + error.message);
        btn.innerText = originalText;
        btn.disabled = false;
    } else {
        btn.innerHTML = "✅ Check your Inbox!";
        setTimeout(() => {
            closeAuth();
            alert("We sent a magic link to " + email + ". Click it to login!");
        }, 1500);
    }
}

// Expose these globally if you call from HTML
window.openAuth = openAuth;
window.closeAuth = closeAuth;
window.handleMagicLogin = handleMagicLogin;

// ================================
//  2) USER + HEADER UI HANDLING
// ================================
async function ensureProfileRow(user) {
    if (!user) return;

    const { data, error } = await sb
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .single();

    if (error && error.code !== "PGRST116") {
        console.log("Profile fetch error:", error);
        return;
    }

    if (!data) {
        await sb.from("profiles").insert({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || null,
            avatar_url:
                user.user_metadata?.avatar_url ||
                `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(
                    user.email || "BoostUser"
                )}`
        });
    }
}

// Called on page load & on auth state change
async function checkUser() {
    const {
        data: { session }
    } = await sb.auth.getSession();

    currentUser = session?.user || null;
    window.currentUser = currentUser;

    const loginBtn = document.getElementById("loginBtn");
    const profileWrapper = document.getElementById("profileDropdown");
    const profileAvatar = document.getElementById("profileAvatar");
    const authArea = document.getElementById("authArea"); // optional container in some pages

    if (currentUser) {
        await ensureProfileRow(currentUser);

        // Avatar from auth metadata or default
        const meta = currentUser.user_metadata || {};
        const avatarUrl =
            meta.avatar_url ||
            `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(
                currentUser.email || "BoostUser"
            )}`;

        // Top-right login/profile (home.html etc.)
        if (loginBtn) loginBtn.style.display = "none";
        if (profileWrapper) profileWrapper.style.display = "flex";
        if (profileAvatar) profileAvatar.src = avatarUrl;

        // Optional generic auth area (if you use it somewhere)
        if (authArea) {
            authArea.innerHTML = `
                <div class="profile-wrapper" id="profileDropdown">
                    <img src="${avatarUrl}" class="profile-avatar" id="profileBtn">
                    <div class="profile-menu" id="profileMenu">
                        <button onclick="openProfile()">View Profile</button>
                        <button onclick="changeAvatar()">Change Avatar</button>
                        <button onclick="openSettings()">Settings</button>
                        <button onclick="logout()">Logout</button>
                    </div>
                </div>
            `;

            const profileBtn = document.getElementById("profileBtn");
            const profileMenu = document.getElementById("profileMenu");
            if (profileBtn && profileMenu) {
                profileBtn.onclick = () => {
                    profileMenu.classList.toggle("show");
                };
            }
        }
    } else {
        // Not logged in
        if (loginBtn) loginBtn.style.display = "flex";
        if (profileWrapper) profileWrapper.style.display = "none";

        if (authArea) {
            authArea.innerHTML = `
                <a href="login.html" class="primary-btn" style="padding:8px 16px;">Login</a>
            `;
        }
    }
}

// Listen for auth changes & re-run checkUser
sb.auth.onAuthStateChange((_event, _session) => {
    checkUser();
});

// Run on first load
document.addEventListener("DOMContentLoaded", checkUser);

// ================================
//  3) DASHBOARD / CLOUD STATS
// ================================
async function syncDailyStats() {
    if (!currentUser) return;

    const today = new Date().toISOString().split("T")[0];

    let { data, error } = await sb
        .from("daily_stats")
        .select("*")
        .eq("user_id", currentUser.id)
        .eq("date", today)
        .single();

    if (error && error.code !== "PGRST116") {
        console.log("daily_stats fetch error:", error);
        return;
    }

    if (!data) {
        await sb.from("daily_stats").insert([
            {
                user_id: currentUser.id,
                date: today,
                focus_minutes: 0,
                completed_tasks: 0,
                chats: 0,
                mood_score: null
            }
        ]);
    } else {
        console.log("Cloud daily_stats:", data);
    }
}

// Call this from focus.js when a focus session completes
async function saveFocusSession(minutes, mode = "focus") {
    if (!currentUser) return;

    const today = new Date().toISOString().split("T")[0];

    // upsert daily_stats
    let { data, error } = await sb
        .from("daily_stats")
        .select("focus_minutes")
        .eq("user_id", currentUser.id)
        .eq("date", today)
        .single();

    if (error && error.code !== "PGRST116") {
        console.log("daily_stats error:", error);
    }

    const newTotal = (data?.focus_minutes || 0) + minutes;

    await sb
        .from("daily_stats")
        .upsert(
            {
                user_id: currentUser.id,
                date: today,
                focus_minutes: newTotal
            },
            { onConflict: "user_id,date" }
        );

    // Log session separately
    await sb.from("focus_sessions").insert([
        {
            user_id: currentUser.id,
            minutes,
            mode,
            started_at: new Date().toISOString()
        }
    ]);

    console.log("🔥 Focus session saved:", minutes, "mins");
}

window.syncDailyStats = syncDailyStats;
window.saveFocusSession = saveFocusSession;

// ================================
//  4) GENERIC HELPERS (PROFILE/SETTINGS)
// ================================
function logout() {
    sb.auth.signOut();
    window.location.href = "home.html";
}

function openProfile() {
    // you can later create profile.html
    window.location.href = "about.html";
}

function changeAvatar() {
    window.location.href = "avatar.html";
}

function openSettings() {
    window.location.href = "settings.html";
}

window.logout = logout;
window.openProfile = openProfile;
window.changeAvatar = changeAvatar;
window.openSettings = openSettings;
