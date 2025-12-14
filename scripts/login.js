document.addEventListener("DOMContentLoaded", () => {
    
    // ELEMENTS
    const authBtn = document.getElementById("authBtn");
    const toggleLink = document.getElementById("toggleLink");
    const nameGroup = document.getElementById("nameGroup");
    const pageTitle = document.getElementById("pageTitle");
    const alertBox = document.getElementById("alertBox");
    
    // Avatar Elements
    const avatarSection = document.getElementById("avatarSection");
    const avatarImg = document.getElementById("avatarImg");
    const shuffleBtn = document.getElementById("shuffleBtn");
    
    // Inputs
    const emailInput = document.getElementById("emailInput");
    const passInput = document.getElementById("passwordInput");
    const nameInput = document.getElementById("nameInput");

    let isSignUp = false; 
    let currentAvatarUrl = "https://api.dicebear.com/7.x/notionists/svg?seed=Felix"; // Default

    // --- AVATAR LOGIC ---
    function updateAvatar(seed) {
        // We use 'notionists' style because it fits your app aesthetic perfectly
        currentAvatarUrl = `https://api.dicebear.com/7.x/notionists/svg?seed=${seed}&backgroundColor=e1e4e8,ffd5dc,c0aede`;
        avatarImg.src = currentAvatarUrl;
    }

    // 1. Auto-generate when typing name
    nameInput.addEventListener("input", (e) => {
        if(e.target.value.length > 0) updateAvatar(e.target.value);
    });

    // 2. Manual Shuffle
    shuffleBtn.addEventListener("click", () => {
        const randomSeed = Math.random().toString(36).substring(7);
        updateAvatar(randomSeed);
        // If they haven't typed a name yet, keep this seed in mind? 
        // Actually, name input override is fine.
    });

    // --- TOGGLE LOGIC ---
    toggleLink.addEventListener("click", () => {
        isSignUp = !isSignUp;
        alertBox.style.display = "none"; 
        
        if (isSignUp) {
            // SHOW AVATAR & NAME
            nameGroup.style.display = "block";
            avatarSection.style.display = "flex"; // Show Avatar
            pageTitle.innerText = "Create Account";
            authBtn.innerText = "Sign Up";
            toggleLink.innerText = "Login";
            document.getElementById("toggleText").innerHTML = 'Already have an account? <span id="toggleLink" class="link">Login</span>';
            // Re-bind listener (since innerHTML replaced element)
            document.getElementById("toggleLink").addEventListener("click", arguments.callee);
        } else {
            // HIDE AVATAR & NAME
            nameGroup.style.display = "none";
            avatarSection.style.display = "none"; // Hide Avatar
            pageTitle.innerText = "Welcome Back";
            authBtn.innerText = "Login";
            toggleLink.innerText = "Sign Up";
            document.getElementById("toggleText").innerHTML = 'Don\'t have an account? <span id="toggleLink" class="link">Sign Up</span>';
            document.getElementById("toggleLink").addEventListener("click", arguments.callee);
        }
    });

    // --- AUTH SUBMIT ---
    authBtn.addEventListener("click", async () => {
        const email = emailInput.value.trim();
        const password = passInput.value.trim();
        const name = nameInput.value.trim();

        if (!email || !password) return showAlert("Please fill in all fields.");
        if (isSignUp && !name) return showAlert("Please enter your name.");
        if (password.length < 6) return showAlert("Password too short (min 6 chars).");

        // UI Loading
        const originalText = authBtn.innerText;
        authBtn.innerHTML = `<i data-lucide="loader-2" class="spin"></i> Processing...`;
        authBtn.disabled = true;
        lucide.createIcons();

        try {
            let data, error;

            if (isSignUp) {
                // === SIGN UP ===
                const result = await sb.auth.signUp({
                    email: email,
                    password: password,
                    options: {
                        data: { 
                            display_name: name,
                            avatar_url: currentAvatarUrl // 👈 SAVING THE AVATAR HERE
                        }
                    }
                });
                data = result.data;
                error = result.error;

                if (!error && data.user) {
                    // Create DB Stats Entry
                    await sb.from('user_stats').insert([{ id: data.user.id }]);
                    
                    // (Optional) Save to 'profiles' table if you created one
                    await sb.from('profiles').insert([{
                        id: data.user.id,
                        display_name: name,
                        avatar_url: currentAvatarUrl
                    }]);

                    alert("✅ Account Created! Logging in...");
                    window.location.href = "home.html";
                    return;
                }

            } else {
                // === LOGIN ===
                const result = await sb.auth.signInWithPassword({
                    email: email,
                    password: password
                });
                data = result.data;
                error = result.error;

                if (!error && data.user) {
                    window.location.href = "home.html";
                    return;
                }
            }

            if (error) showAlert("⚠️ " + error.message);

        } catch (err) {
            showAlert("Error: " + err.message);
        } finally {
            authBtn.innerText = originalText;
            authBtn.disabled = false;
        }
    });

    function showAlert(msg) {
        alertBox.innerText = msg;
        alertBox.style.display = "block";
    }

    // Password Eye Toggle
    document.getElementById("togglePass").addEventListener("click", (e) => {
        const type = passInput.getAttribute("type") === "password" ? "text" : "password";
        passInput.setAttribute("type", type);
        e.currentTarget.innerHTML = type === "password" ? `<i data-lucide="eye"></i>` : `<i data-lucide="eye-off"></i>`;
        lucide.createIcons();
    });
});