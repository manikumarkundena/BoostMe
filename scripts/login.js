document.addEventListener("DOMContentLoaded", async () => {
    
    // =========================================
    // 1. ELEMENT SELECTION
    // =========================================
    
    // Main Auth Elements
    const authBtn = document.getElementById("authBtn");
    const toggleLink = document.getElementById("toggleLink");
    const nameGroup = document.getElementById("nameGroup");
    const pageTitle = document.getElementById("pageTitle");
    const pageSub = document.getElementById("pageSub");
    
    // Containers
    const loginForm = document.querySelector(".login-form");
    const loginFooter = document.querySelector(".login-footer");
    
    // Forgot Password & Reset Elements
    const forgotBtn = document.getElementById("forgotPassBtn");
    const resetSection = document.getElementById("resetSection");
    const backToLoginBtn = document.getElementById("backToLoginBtn");
    const sendResetBtn = document.getElementById("sendResetBtn");
    const resetEmailInput = document.getElementById("resetEmailInput");
    
    // New Password Section (For Recovery Flow)
    const updatePasswordSection = document.getElementById("updatePasswordSection");
    const finalPasswordInput = document.getElementById("finalPasswordInput");
    const saveNewPassBtn = document.getElementById("saveNewPassBtn");

    // Avatar Elements
    const avatarSection = document.getElementById("avatarSection");
    const avatarImg = document.getElementById("avatarImg");
    const shuffleBtn = document.getElementById("shuffleBtn");
    
    // Inputs
    const emailInput = document.getElementById("emailInput");
    const passInput = document.getElementById("passwordInput");
    const nameInput = document.getElementById("nameInput");

    // State Variables
    let isSignUp = false; 
    let currentAvatarUrl = "https://api.dicebear.com/7.x/notionists/svg?seed=Felix"; 

    // Initialize Icons
    lucide.createIcons();

    // =========================================
    // 2. RECOVERY MODE DETECTION 🕵️‍♂️
    // =========================================
    // If user clicks email link and lands here, show "New Password" UI
    const hash = window.location.hash;
    if (hash && hash.includes("type=recovery")) {
        console.log("⚡ Recovery mode detected!");
        if(loginForm) loginForm.style.display = "none";
        if(loginFooter) loginFooter.style.display = "none";
        if(resetSection) resetSection.style.display = "none";
        
        if(updatePasswordSection) {
            updatePasswordSection.style.display = "block";
            pageTitle.innerText = "Secure Account";
            if(pageSub) pageSub.innerText = "Create a new strong password.";
        }
    }

    // =========================================
    // 3. AVATAR LOGIC
    // =========================================
    function updateAvatar(seed) {
        currentAvatarUrl = `https://api.dicebear.com/7.x/notionists/svg?seed=${seed}&backgroundColor=e1e4e8,ffd5dc,c0aede`;
        if(avatarImg) avatarImg.src = currentAvatarUrl;
    }

    if(nameInput) {
        nameInput.addEventListener("input", (e) => {
            if(e.target.value.length > 0) updateAvatar(e.target.value);
        });
    }

    if(shuffleBtn) {
        shuffleBtn.addEventListener("click", () => {
            const randomSeed = Math.random().toString(36).substring(7);
            updateAvatar(randomSeed);
        });
    }

    // =========================================
    // 4. TOGGLE LOGIN / SIGNUP VIEW
    // =========================================
    if(toggleLink) {
        toggleLink.addEventListener("click", () => {
            isSignUp = !isSignUp;
            
            if (isSignUp) {
                // === SIGN UP MODE ===
                nameGroup.style.display = "block";
                avatarSection.style.display = "flex"; 
                pageTitle.innerText = "Create Account";
                authBtn.innerText = "Sign Up";
                
                // Hide "Forgot Password" link in Sign Up mode
                if(forgotBtn) forgotBtn.parentElement.style.display = "none"; 

                // Update footer text
                document.getElementById("toggleText").innerHTML = 'Already have an account? <span id="toggleLink" class="link">Login</span>';
                document.getElementById("toggleLink").addEventListener("click", arguments.callee); // Re-bind
            } else {
                // === LOGIN MODE ===
                nameGroup.style.display = "none";
                avatarSection.style.display = "none";
                pageTitle.innerText = "Welcome Back";
                authBtn.innerText = "Login";
                
                // Show "Forgot Password" link
                if(forgotBtn) forgotBtn.parentElement.style.display = "block";

                document.getElementById("toggleText").innerHTML = 'Don\'t have an account? <span id="toggleLink" class="link">Sign Up</span>';
                document.getElementById("toggleLink").addEventListener("click", arguments.callee);
            }
        });
    }

    // =========================================
    // 5. VIEW NAVIGATION (FORGOT PASSWORD)
    // =========================================
    
    // Switch to "Reset" view
    if (forgotBtn) {
        forgotBtn.addEventListener("click", () => {
            loginForm.style.display = "none";
            loginFooter.style.display = "none";
            if(resetSection) resetSection.style.display = "block";
            
            pageTitle.innerText = "Reset Password";
            pageSub.innerText = "Enter your email to receive a link.";
        });
    }

    // Switch back to "Login" view
    if (backToLoginBtn) {
        backToLoginBtn.addEventListener("click", () => {
            if(resetSection) resetSection.style.display = "none";
            loginForm.style.display = "block";
            loginFooter.style.display = "block";
            
            pageTitle.innerText = "Welcome Back";
            pageSub.innerText = "Enter your credentials to access your focus stats.";
        });
    }

    // =========================================
    // 6. ACTION: SEND RESET LINK (WITH RPC & MODAL)
    // =========================================
    if (sendResetBtn) {
        sendResetBtn.addEventListener("click", async () => {
            const email = resetEmailInput.value.trim();
            const originalText = sendResetBtn.innerText;

            if (!email) {
                await ui.alert("Missing Email", "Please enter your email address.");
                return;
            }

            sendResetBtn.innerText = "Checking...";
            sendResetBtn.disabled = true;

            try {
                // 1. MANUAL CHECK: Ask DB if user exists
                const { data: exists, error: checkError } = await sb
                    .rpc('check_email_exists', { email_check: email });

                if (checkError) throw checkError;

                // 2. STOP if user does not exist
                if (exists === false) {
                    await ui.alert("Not Found", "❌ Account not found. Please Sign Up first.");
                    sendResetBtn.innerText = originalText;
                    sendResetBtn.disabled = false;
                    return; // Stop here!
                }

                // 3. IF USER EXISTS -> Send the Reset Link
                sendResetBtn.innerText = "Sending...";
                const { error: resetError } = await sb.auth.resetPasswordForEmail(email, {
                    // Redirect to profile page (or back to login)
                    redirectTo: window.location.href.replace('login.html', 'profile.html')
                });

                if (resetError) throw resetError;

                // 4. Success Modal
                await ui.alert("Link Sent", "✅ Success! Check your email for the reset link.");
                
                // Return to login screen automatically
                backToLoginBtn.click();

            } catch (error) {
                console.error(error);
                await ui.alert("Error", error.message);
            } finally {
                sendResetBtn.innerText = originalText;
                sendResetBtn.disabled = false;
            }
        });
    }

    // =========================================
    // 7. ACTION: MAIN AUTH (LOGIN / SIGNUP)
    // =========================================
    if(authBtn) {
        authBtn.addEventListener("click", async () => {
            const email = emailInput.value.trim();
            const password = passInput.value.trim();
            const name = nameInput.value.trim();

            if (!email || !password) {
                await ui.alert("Incomplete", "Please fill in all fields.");
                return;
            }
            if (isSignUp && !name) {
                await ui.alert("Incomplete", "Please enter your name.");
                return;
            }
            if (password.length < 6) {
                await ui.alert("Weak Password", "Password too short (min 6 chars).");
                return;
            }

            // UI Loading
            const originalText = authBtn.innerText;
            authBtn.innerHTML = `Processing...`;
            authBtn.disabled = true;

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
                                avatar_url: currentAvatarUrl 
                            }
                        }
                    });
                    data = result.data;
                    error = result.error;

                    if (!error && data.user) {
                        // Initialize DB Stats
                        await sb.from('daily_stats').insert([{ 
                            user_id: data.user.id,
                            date: new Date().toISOString().split('T')[0]
                        }]);
                        
                        await ui.alert("Welcome!", "✅ Account Created! Logging in...");
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

                if (error) await ui.alert("Auth Error", "⚠️ " + error.message);

            } catch (err) {
                await ui.alert("System Error", err.message);
            } finally {
                authBtn.innerText = originalText;
                authBtn.disabled = false;
            }
        });
    }

    // =========================================
    // 8. ACTION: SAVE NEW PASSWORD (RECOVERY)
    // =========================================
    if (saveNewPassBtn) {
        saveNewPassBtn.addEventListener("click", async () => {
            const newPass = finalPasswordInput.value.trim();
            
            if (newPass.length < 6) {
                await ui.alert("Too Short", "Password must be at least 6 characters.");
                return;
            }

            saveNewPassBtn.innerText = "Updating...";
            saveNewPassBtn.disabled = true;

            const { error } = await sb.auth.updateUser({ password: newPass });

            if (error) {
                await ui.alert("Error", error.message);
                saveNewPassBtn.innerText = "Try Again";
                saveNewPassBtn.disabled = false;
            } else {
                await ui.alert("Success", "✅ Password Updated! Logging you in...");
                window.location.href = "home.html";
            }
        });
    }

    // =========================================
    // 9. PASSWORD EYE TOGGLE
    // =========================================
    const togglePassBtn = document.getElementById("togglePass");
    if(togglePassBtn) {
        togglePassBtn.addEventListener("click", (e) => {
            const type = passInput.getAttribute("type") === "password" ? "text" : "password";
            passInput.setAttribute("type", type);
            e.currentTarget.innerHTML = type === "password" ? `<i data-lucide="eye"></i>` : `<i data-lucide="eye-off"></i>`;
            lucide.createIcons();
        });
    }
});