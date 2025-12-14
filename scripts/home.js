document.addEventListener("DOMContentLoaded", () => {

    const typedTarget = document.getElementById("typedText");
    const subtitle = document.getElementById("greetSubtitle");

    // --- Greeting Logic ---
    function getGreeting() {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) return { title: "Good morning buddy", sub: "A fresh start, let's go! 🌞" };
        if (hour >= 12 && hour < 17) return { title: "Good afternoon buddy", sub: "Keep the momentum going! ⚡" };
        if (hour >= 17 && hour < 21) return { title: "Good evening buddy", sub: "Winding down but still productive ✨" };
        return { title: "Hey buddy!", sub: "Late hours hustle mode 🌙" };
    }

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

    modal.style.display = "flex";

    // 1. Matrix Text Effect
    let logIndex = 0;
    hudInterval = setInterval(() => {
        const rand = Math.floor(Math.random() * 9999);
        hudText.innerHTML = `${SCIFI_LOGS[logIndex % SCIFI_LOGS.length]}<br>HEX: 0x${rand}<br>CPU: ${Math.floor(Math.random()*100)}%`;
        logIndex++;
    }, 400);

    try {
        // 2. Start Camera
        videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = videoStream;

        // 3. Run "Scan Sequence"
        status.innerText = "Target Found. Holding...";
        await wait(1500);

        status.style.color = "#ffff00"; // Yellow
        status.innerText = "Analyzing Expressions...";
        await wait(2000);

        status.style.color = "#00ffff"; // Cyan
        status.innerText = "Processing Results...";
        await wait(1500);

        // 4. Complete & Apply Theme
        completeRefinedScan();

    } catch (err) {
        console.error(err);
        alert("Camera access needed for Vibe Check!");
        closeScanner();
    }
}

function closeScanner() {
    const modal = document.getElementById("scannerModal");
    modal.style.display = "none";
    
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
    status.innerHTML = `DETECTED: <span style="color:${result.color}">${result.name}</span>`;
    
    setTimeout(() => {
        alert(`Vibe Check Complete!\nMood: ${result.name}\n${result.msg}`);
        
        // 🎨 REAL-TIME THEME SWITCH
        document.documentElement.style.setProperty('--primary', result.color);
        
        // Update logo color or accents if needed
        closeScanner();
    }, 1000);
    /* ... (Your existing Greeting & Scanner code) ... */

/* ===============================
   ⚡ QUICK CHALLENGE (Redirect)
================================*/
function manualChallenge() {
    // 1. Play Sound
    if(window.synth) window.synth.click();

    // 2. Set a "flag" so chat.html knows to auto-start a challenge
    localStorage.setItem("auto_trigger_challenge", "true");

    // 3. Redirect to Chat
    window.location.href = "chat.html";
}
}

/* ... existing greeting and scanner code ... */

/* ===============================
   👨‍💻 ABOUT MODAL LOGIC
================================*/
function openAboutModal() {
    if(window.synth) window.synth.click(); // Play sound
    
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

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }