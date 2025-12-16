console.log("Chill Zone Loaded 🌿");

/* ===============================
   STATE & DOM ELEMENTS
================================= */
const breatheUI = document.getElementById("breatheUI");
const popUI = document.getElementById("popUI");
const fireUI = document.getElementById("fireUI");
const breatheText = document.getElementById("breatheText");
const cards = document.querySelectorAll(".chill-card");

// AUDIO ELEMENTS (Streaming Music)
const lofiAudio = document.getElementById("lofiMusic");

/* ===============================
   SWITCHER LOGIC
================================= */
function switchMode(mode) {
    // 1. Hide All Sections
    if(breatheUI) breatheUI.style.display = "none";
    if(popUI) popUI.style.display = "none";
    if(fireUI) fireUI.style.display = "none";

    // 2. Stop Other Audio/Timers
    stopBreathingText();
    stopFireSound();

    // 3. Show Selected & Init Logic
    if (mode === 'breathe') {
        breatheUI.style.display = "flex";
        breatheUI.style.flexDirection = "column";
        startBreathingText();
    } 
    else if (mode === 'pop') {
        popUI.style.display = "flex";
        popUI.style.flexDirection = "column";
    } 
    else if (mode === 'fire') {
        fireUI.style.display = "flex";
        fireUI.style.flexDirection = "column";
        // Ambient fire crackle via synth (simulated noise) or just silence
    }

    // 4. Update Visual Active State
    cards.forEach(c => c.classList.remove("active-mode"));
    
    // Highlight correct card (Indices: 0=Breathe, 1=Pop, 3=Fire)
    if(mode === 'breathe' && cards[0]) cards[0].classList.add("active-mode");
    if(mode === 'pop' && cards[1]) cards[1].classList.add("active-mode");
    if(mode === 'fire' && cards[3]) cards[3].classList.add("active-mode");
    
    // Play Click Sound
    if(window.synth) window.synth.click();
}

/* ===============================
   1. BREATHING LOGIC (4-7-8)
================================= */
let breatheInterval;

function startBreathingText() {
    updateText();
    // 8s cycle (4s inhale/hold + 4s exhale)
    breatheInterval = setInterval(updateText, 8000); 
}

function updateText() {
    // INHALE
    if(breatheText) {
        breatheText.innerText = "Inhale";
        breatheText.style.transform = "scale(1.5)";
        breatheText.style.opacity = "1";
    }

    // HOLD (at 4s)
    setTimeout(() => {
        if(breatheText) {
            breatheText.innerText = "Hold";
        }
    }, 4000);

    // EXHALE (at 6s) - Modified timing for better feel
    setTimeout(() => {
        if(breatheText) {
            breatheText.innerText = "Exhale";
            breatheText.style.transform = "scale(1)";
            breatheText.style.opacity = "0.7";
        }
    }, 5500);
}

function stopBreathingText() {
    if (breatheInterval) clearInterval(breatheInterval);
    if (breatheText) breatheText.innerText = "Ready";
}

/* ===============================
   2. BUBBLE WRAP LOGIC + SOUND 🫧
================================= */
const bubbleGrid = document.getElementById("bubbleGrid");

// 🆕 Mood Boost Emojis
const POP_EMOJIS = ["✨", "💖", "🔥", "🍀", "💎", "🌟", "💜", "🚀", "😊", "🎵"];

function initBubbles() {
    if(!bubbleGrid) return;
    bubbleGrid.innerHTML = "";
    
    // Create 25 Bubbles
    for (let i = 0; i < 25; i++) { 
        const b = document.createElement("div");
        b.className = "bubble";
        
        // 🆕 Add a hidden emoji inside
        const randomEmoji = POP_EMOJIS[Math.floor(Math.random() * POP_EMOJIS.length)];
        b.innerHTML = `<span class="pop-content">${randomEmoji}</span>`;
        
        b.onclick = () => popBubble(b);
        bubbleGrid.appendChild(b);
    }
}

function popBubble(el) {
    if (el.classList.contains("popped")) return;
    
    el.classList.add("popped");
    
    // 🔊 1. PLAY POP SOUND
    if(window.synth) window.synth.pop();
    
    // Haptics
    if (navigator.vibrate) navigator.vibrate(15);

    // CHECK WIN CONDITION
    checkAllPopped();
    
    // 🆕 Update Stress Label dynamically
    const remaining = document.querySelectorAll(".bubble:not(.popped)").length;
    const label = document.getElementById("stressLabel");
    
    if(label) {
        if(remaining > 15) label.innerText = "Stress Level: High 😤";
        else if(remaining > 5) label.innerText = "Stress Level: Dropping... 📉";
        else if(remaining > 0) label.innerText = "Stress Level: Almost Gone 🍃";
        else label.innerText = "Stress Level: Zero! 🧘‍♂️";
    }
}

function checkAllPopped() {
    const remaining = document.querySelectorAll(".bubble:not(.popped)").length;
    
    if (remaining === 0) {
        // 🎉 ALL POPPED! - COMPLETION POINT 1
        // ✅ CALL GLOBAL HELPER FROM supabase.js
        if (window.saveDailyStats) window.saveDailyStats({ gamesPlayed: 1 });

        setTimeout(() => {
            // 🔊 2. PLAY SUCCESS SOUND
            if(window.synth) window.synth.success();
            if (navigator.vibrate) navigator.vibrate([50, 50, 100]);
            
            // Visual feedback
            const btn = document.querySelector("#popUI .text-btn");
            if(btn) btn.innerText = "Nice Job! Resetting... 🎉";
            
            // Auto Reset after 1.5s
            setTimeout(() => {
                resetBubbles();
                if(btn) btn.innerText = "Reset Sheet 🔄";
            }, 1500);
            
        }, 300);
    }
}

function resetBubbles() {
    const bubbles = document.querySelectorAll(".bubble");
    
    // Staggered reset animation
    bubbles.forEach((b, index) => {
        setTimeout(() => {
            b.classList.remove("popped");
            // Tiny sound for mechanical reset feel
            if(window.synth && index % 5 === 0) window.synth.hover(); 
        }, index * 20); // Wave effect
    });
}

/* ===============================
   3. LO-FI MUSIC TOGGLE
================================= */
let isMusicPlaying = false;

function toggleMusic(card) {
    if (isMusicPlaying) {
        // Stop Music
        if(lofiAudio) {
            lofiAudio.pause();
            lofiAudio.src = lofiAudio.src; // Disconnect stream to save data
        }
        card.classList.remove("playing");
    } else {
        // Start Music
        if(lofiAudio) {
            // Reload src to ensure stream is live
            const currentSrc = lofiAudio.querySelector('source').src;
            lofiAudio.src = currentSrc; 
            lofiAudio.volume = 0.5;
            lofiAudio.play().catch(e => alert("Tap again to play (Browser blocked auto-audio)"));
        }
        card.classList.add("playing");
        
        // 🔊 Sound Effect
        if(window.synth) window.synth.click();
    }
    isMusicPlaying = !isMusicPlaying;
}

/* ===============================
   4. BONFIRE LOGIC
================================= */
const ventInput = document.getElementById("ventText");
const inputArea = document.getElementById("ventInputArea");
const postBurnMsg = document.getElementById("postBurnMsg");

const WISDOM_QUOTES = [
    "Let it go. You are doing your best.",
    "Breathe. This is just a moment.",
    "Release the weight. You are free now.",
    "Peace comes from within.",
    "New beginnings are often disguised as painful endings."
];

function stopFireSound() {
    // If you add a fire loop later, stop it here
}

function burnStress() {
    if (!ventInput.value.trim()) {
        alert("Write something to burn first!");
        return;
    }

    // 🔊 Sound Effect
    if(window.synth) window.synth.click();

    ventInput.classList.add("burning");

    // Wait for animation
    setTimeout(() => {
        if(inputArea) inputArea.style.display = "none";
        
        const quote = WISDOM_QUOTES[Math.floor(Math.random() * WISDOM_QUOTES.length)];
        
        if(postBurnMsg) {
            postBurnMsg.innerHTML = `
                <span>"${quote}"</span><br><br>
                <button class="text-btn" onclick="resetFire()">Vent More</button>
            `;
            postBurnMsg.style.display = "block";
            
            // 🔊 Success Sound for relief
            if(window.synth) window.synth.success();
        }

        ventInput.value = "";
        ventInput.classList.remove("burning");
        
        if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
        
        // 🔥 BURN COMPLETE - COMPLETION POINT 2
        // ✅ CALL GLOBAL HELPER FROM supabase.js
        if (window.saveDailyStats) window.saveDailyStats({ gamesPlayed: 1 });
        
    }, 800);
}

function resetFire() {
    if(postBurnMsg) postBurnMsg.style.display = "none";
    if(inputArea) inputArea.style.display = "block";
    if(window.synth) window.synth.click();
}

/* ===============================
   INIT
================================= */
document.addEventListener("DOMContentLoaded", () => {
    initBubbles();
    // Start on Breathe mode by default
    switchMode('breathe'); 
});