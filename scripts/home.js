document.addEventListener("DOMContentLoaded", () => {
    
    // --- 1. GREETING LOGIC ---
    const typedTarget = document.getElementById("typedText");
    const subtitle = document.getElementById("greetSubtitle");

    function getGreeting() {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) return { title: "Good morning buddy", sub: "A fresh start, let's go! 🌞" };
        if (hour >= 12 && hour < 17) return { title: "Good afternoon buddy", sub: "Keep the momentum going! ⚡" };
        if (hour >= 17 && hour < 21) return { title: "Good evening buddy", sub: "Winding down but still productive ✨" };
        return { title: "Hey buddy!", sub: "Late hours hustle mode 🌙" };
    }

    if (typedTarget && subtitle) {
        const greet = getGreeting();
        subtitle.textContent = greet.sub;

        // --- Smooth Typing Effect ---
        let delay = 0;
        greet.title.split("").forEach(char => {
            const span = document.createElement("span");
            span.className = "char";
            span.innerHTML = char === " " ? "&nbsp;" : char;
            span.style.animationDelay = `${delay}s`;
            delay += 0.06;
            typedTarget.appendChild(span);
        });
    }

    // --- 2. SETUP NAVBAR USER ---
    setupNavbar();
});

/* ===============================
   📸 HIGH-TECH SCANNER LOGIC
================================*/
let videoStream = null;
let hudInterval = null;

const SCIFI_LOGS = [
    "CALIBRATING_LENS...", "MAPPING_FACE_MESH...", "DETECTING_MICRO_TREMORS...",
    "ANALYZING_PUPIL_DILATION...", "CHECKING_FATIGUE_LEVELS...", "SYNCING_BIO_RHYTHM...",
    "CALCULATING_FOCUS_SCORE...", "MATCHING_PROFILE..."
];

async function openScanner() {
    const modal = document.getElementById("scannerModal");
    const video = document.getElementById("videoFeed");
    const status = document.getElementById("scanStatus");
    const hudText = document.getElementById("hudDataText");

    if (!modal) return;
    modal.style.display = "flex";

    // 1. Matrix Text Effect
    let logIndex = 0;
    hudInterval = setInterval(() => {
        const rand = Math.floor(Math.random() * 9999);
        if(hudText) hudText.innerHTML = `${SCIFI_LOGS[logIndex % SCIFI_LOGS.length]}<br>HEX: 0x${rand}<br>CPU: ${Math.floor(Math.random()*100)}%`;
        logIndex++;
    }, 400);

    try {
        // 2. Start Camera
        videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
        if(video) video.srcObject = videoStream;

        // 3. Run "Scan Sequence"
        if(status) status.innerText = "Target Found. Holding...";
        await wait(1500);

        if(status) {
            status.style.color = "#ffff00"; // Yellow
            status.innerText = "Analyzing Expressions...";
        }
        await wait(2000);

        if(status) {
            status.style.color = "#00ffff"; // Cyan
            status.innerText = "Processing Results...";
        }
        await wait(1500);

        // 4. Complete & Apply Theme
        completeRefinedScan();

    } catch (err) {
        console.error(err);
        if (window.ui) await ui.alert("Camera Error", "Camera access needed for Vibe Check!");
        else alert("Camera access needed!");
        closeScanner();
    }
}

function closeScanner() {
    const modal = document.getElementById("scannerModal");
    if(modal) modal.style.display = "none";
    
    if (videoStream) videoStream.getTracks().forEach(track => track.stop());
    if (hudInterval) clearInterval(hudInterval);
}

function completeRefinedScan() {
    // 🎲 Simulate different outcomes
    const vibes = [
        { name: "HIGH ENERGY ⚡", color: "#6c63ff", msg: "Let's crush some tasks!" }, 
        { name: "RELAXED 🌊",    color: "#4cc9f0", msg: "Chill vibes loaded." },
        { name: "STRESSED 😤",   color: "#f72585", msg: "Switching to Focus Mode." },
        { name: "TIRED 😴",      color: "#4895ef", msg: "Ease up, buddy." }
    ];

    const result = vibes[Math.floor(Math.random() * vibes.length)];

    // Show Result
    const status = document.getElementById("scanStatus");
    if(status) status.innerHTML = `DETECTED: <span style="color:${result.color}">${result.name}</span>`;
    
    setTimeout(async () => {
        closeScanner();
        
        // ✨ NEW: Glass Alert for Result
        if (window.ui) {
            await ui.alert("Vibe Check Complete", `Mood: ${result.name}\n${result.msg}`);
        } else {
            alert(`Vibe Check Complete!\nMood: ${result.name}\n${result.msg}`);
        }
        
        // 🎨 REAL-TIME THEME SWITCH
        document.documentElement.style.setProperty('--primary', result.color);
        
    }, 1000);
}

/* ===============================
   ⚡ QUICK CHALLENGE (Redirect)
================================*/
function manualChallenge() {
    // 1. Play Sound if available
    // if(window.synth) window.synth.click();

    // 2. Set a "flag" so chat.html knows to auto-start a challenge
    localStorage.setItem("auto_trigger_challenge", "true");

    // 3. Redirect to Chat
    window.location.href = "chat.html";
}

/* ===============================
   👨‍💻 ABOUT MODAL LOGIC (Optional if handled by CSS)
================================*/
function openAboutModal() {
    const modal = document.getElementById("aboutModal");
    if(modal) {
        modal.style.display = "flex";
        setTimeout(() => modal.classList.add("active"), 10);
    }
}

function closeAboutModal() {
    const modal = document.getElementById("aboutModal");
    if(modal) {
        modal.classList.remove("active");
        setTimeout(() => modal.style.display = "none", 300);
    }
}

// Close when clicking outside the card
window.addEventListener("click", (e) => {
    const modal = document.getElementById("aboutModal");
    if (e.target === modal) {
        closeAboutModal();
    }
});

/* ===============================
   HELPER: WAIT PROMISE
================================*/
function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

/* ===============================
   NAVBAR AVATAR SETUP
================================*/
async function setupNavbar() {
    const userImg = document.querySelector(".nav-user-img");
    if (!userImg || !window.sb) return;

    // Check if user is logged in
    const { data: { user } } = await sb.auth.getUser();
    
    if (user) {
        // Try to get profile pic
        const { data: profile } = await sb
            .from('profiles')
            .select('avatar_url')
            .eq('id', user.id)
            .single();

        if (profile && profile.avatar_url) {
            userImg.src = profile.avatar_url;
        } else if (user.user_metadata && user.user_metadata.avatar_url) {
            userImg.src = user.user_metadata.avatar_url;
        }
    }
}