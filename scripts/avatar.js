/* ============================
   INIT & CONFIG
===============================*/

// Your list of seeds
const avatarSeeds = [
  "Alex", "Luna", "Maya", "Ray", "Arun",
  "Kavi", "Nia", "Esha", "Noah", "Zayn",
  "Liam", "Mila", "Ravi", "Saanvi", "Ira"
];

let selectedAvatar = ""; // Will hold the full URL
const previewImg = document.getElementById("avatarPreview");
const grid = document.getElementById("avatarGrid");

// --- 1. LOAD CURRENT AVATAR ON START ---
document.addEventListener("DOMContentLoaded", async () => {
    
    // Check Login
    const { data: { user } } = await sb.auth.getUser();
    if (!user) {
        window.location.href = "login.html";
        return;
    }

    // A. Default to Auth Metadata
    let currentUrl = user.user_metadata.avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=Mawa`;

    // B. Check Database for latest version (Truth)
    const { data: profile } = await sb
        .from('profiles')
        .select('avatar_url')
        .eq('id', user.id)
        .single();

    if (profile && profile.avatar_url) {
        currentUrl = profile.avatar_url;
    }

    // C. Update Preview
    selectedAvatar = currentUrl;
    previewImg.src = selectedAvatar;

    // D. Generate Grid
    avatarSeeds.forEach(seed => {
        const url = `https://api.dicebear.com/7.x/notionists/svg?seed=${seed}`;
        
        let div = document.createElement("div");
        div.className = "avatar-option";
        div.innerHTML = `<img src="${url}">`;

        div.onclick = () => {
            // Update Visuals
            previewImg.src = url;
            selectedAvatar = url;
            
            // Optional: Highlight selected
            document.querySelectorAll(".avatar-option").forEach(el => el.style.border = "2px solid transparent");
            div.style.border = "2px solid var(--primary-color)";
        };

        grid.appendChild(div);
    });
});

/* ============================
   SAVE AVATAR (Dual Update)
===============================*/
async function saveAvatar() {
    const btn = document.querySelector(".save-btn");
    const originalText = btn.innerText;

    // UI Feedback
    btn.innerText = "Saving...";
    btn.disabled = true;

    try {
        const { data: { user } } = await sb.auth.getUser();

        if (!user) throw new Error("No user found");

        // 1. Update Auth Metadata (For Navbar/Session)
        const { error: authError } = await sb.auth.updateUser({
            data: { avatar_url: selectedAvatar }
        });
        if (authError) throw authError;

        // 2. Update Database Table (For Profile Page Persistence)
        // We use upsert to handle both new and existing users
        const { error: dbError } = await sb
            .from('profiles')
            .upsert({
                id: user.id,
                avatar_url: selectedAvatar,
                updated_at: new Date()
            });

        if (dbError) throw dbError;

        // Success!
        alert("✅ Avatar updated successfully!");
        window.location.href = "profile.html"; // Go to profile to see change

    } catch (error) {
        console.error("Save Error:", error);
        alert("Error saving avatar: " + error.message);
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}