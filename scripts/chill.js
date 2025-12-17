console.log("Chill Zone Loaded 🌿");

/* ===============================
   STATE & DOM ELEMENTS
================================= */
const breatheUI = document.getElementById("breatheUI");
const popUI = document.getElementById("popUI");
const fireUI = document.getElementById("fireUI");
const breatheText = document.getElementById("breatheText");
const cards = document.querySelectorAll(".chill-card");

// AUDIO ELEMENTS
const lofiAudio = document.getElementById("lofiMusic");

// AI CONFIG
const BACKEND_URL = "https://boostme-a0ca.onrender.com/api/chat";

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
        // Reset fire UI
        const inputArea = document.getElementById("ventInputArea");
        const msgArea = document.getElementById("postBurnMsg");
        if(inputArea) {
            inputArea.style.display = "block";
            inputArea.style.opacity = "1";
        }
        if(msgArea) msgArea.style.display = "none";
        // Reset input value
        const vInput = document.getElementById("ventText");
        if(vInput) {
            vInput.value = "";
            vInput.classList.remove("burning");
        }
    }

    // 4. Update Visual Active State
    cards.forEach(c => c.classList.remove("active-mode"));
    
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
    breatheInterval = setInterval(updateText, 8000); 
}

function updateText() {
    if(breatheText) {
        breatheText.innerText = "Inhale";
        breatheText.style.transform = "scale(1.5)";
        breatheText.style.opacity = "1";
    }

    setTimeout(() => {
        if(breatheText) breatheText.innerText = "Hold";
    }, 4000);

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
   2. BUBBLE WRAP LOGIC
================================= */
const bubbleGrid = document.getElementById("bubbleGrid");
const POP_EMOJIS = ["✨", "💖", "🔥", "🍀", "💎", "🌟", "💜", "🚀", "😊", "🎵"];

function initBubbles() {
    if(!bubbleGrid) return;
    bubbleGrid.innerHTML = "";
    
    for (let i = 0; i < 25; i++) { 
        const b = document.createElement("div");
        b.className = "bubble";
        const randomEmoji = POP_EMOJIS[Math.floor(Math.random() * POP_EMOJIS.length)];
        b.innerHTML = `<span class="pop-content">${randomEmoji}</span>`;
        b.onclick = () => popBubble(b);
        bubbleGrid.appendChild(b);
    }
}

function popBubble(el) {
    if (el.classList.contains("popped")) return;
    el.classList.add("popped");
    
    if(window.synth) window.synth.pop();
    if (navigator.vibrate) navigator.vibrate(15);

    checkAllPopped();
    
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
        incrementDailyStats({ gamesPlayed: 1 });
        showToast("So satisfying! Stress level zero! 🫧✨", "success");

        setTimeout(() => {
            if(window.synth) window.synth.success();
            if (navigator.vibrate) navigator.vibrate([50, 50, 100]);
            
            const btn = document.querySelector("#popUI .text-btn");
            if(btn) btn.innerText = "Nice Job! Resetting... 🎉";
            
            setTimeout(() => {
                resetBubbles();
                if(btn) btn.innerText = "Reset Sheet 🔄";
            }, 1500);
        }, 300);
    }
}

function resetBubbles() {
    const bubbles = document.querySelectorAll(".bubble");
    bubbles.forEach((b, index) => {
        setTimeout(() => {
            b.classList.remove("popped");
            if(window.synth && index % 5 === 0) window.synth.hover(); 
        }, index * 20);
    });
}

/* ===============================
   3. LO-FI MUSIC TOGGLE
================================= */
let isMusicPlaying = false;

function toggleMusic(card) {
    if (isMusicPlaying) {
        if(lofiAudio) {
            lofiAudio.pause();
            lofiAudio.src = lofiAudio.src; 
        }
        card.classList.remove("playing");
    } else {
        if(lofiAudio) {
            const currentSrc = lofiAudio.querySelector('source').src;
            lofiAudio.src = currentSrc; 
            lofiAudio.volume = 0.5;
            lofiAudio.play().catch(e => showToast("Tap again to play (Auto-audio blocked)", "warning"));
        }
        card.classList.add("playing");
        if(window.synth) window.synth.click();
    }
    isMusicPlaying = !isMusicPlaying;
}

/* ===============================
   4. BONFIRE LOGIC (FIXED LAYOUT 🔥)
================================= */
const ventInput = document.getElementById("ventText");
const inputArea = document.getElementById("ventInputArea");
const postBurnMsg = document.getElementById("postBurnMsg");

function stopFireSound() {}

// ✨ ENHANCED AI PROMPT FOR EMOTIONAL SUPPORT
async function getVentResponse(text) {
    try {
        const response = await fetch(BACKEND_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                messages: [
                    { 
                        role: "system", 
                        content: `You are a warm, empathetic soul. The user is burning their stress/pain.
                        - If they sound sad/broken: Reply with deep compassion, validation, and a gentle virtual hug.
                        - If they sound angry: Acknowledge the fire and let them release it.
                        - If they sound tired: Offer rest and peace.
                        - Keep it to 1-2 sentences max. Be poetic and comforting.` 
                    },
                    { role: "user", content: text }
                ]
            })
        });
        const data = await response.json();
        return data.choices?.[0]?.message?.content || data.content || "Your pain ripples like a stormy sea, and it's okay to acknowledge its depths.";
    } catch (e) {
        console.error(e);
        return "Let the fire consume your worry. You are safe now.";
    }
}

async function burnStress() {
    const text = ventInput.value.trim();
    if (!text) {
        showToast("Write something to burn first! 🔥", "warning");
        return;
    }

    if(window.synth) window.synth.click();

    // 1. ANIMATION START
    ventInput.classList.add("burning");
    if (navigator.vibrate) navigator.vibrate([50, 50, 50]);

    // 2. SHOW LOADING STATE (Pulsing Ember)
    if(inputArea) inputArea.style.opacity = "0"; 
    
    if(postBurnMsg) {
        // Ensure flex centering for loading too
        postBurnMsg.style.display = "flex";
        postBurnMsg.style.flexDirection = "column";
        postBurnMsg.style.justifyContent = "center";
        postBurnMsg.style.alignItems = "center";
        postBurnMsg.style.height = "100%"; // FILL CONTAINER

        postBurnMsg.innerHTML = `
            <div style="font-size:3rem; animation: pulse 1.5s infinite; filter: drop-shadow(0 0 15px orange);">🔥</div>
            <div style="margin-top:15px; color:#ff8b2d; opacity:0.8; font-size:0.9rem;">Consuming your stress...</div>
        `;
    }

    // 3. WAIT FOR AI (Min 1.5s for effect)
    const minWait = new Promise(r => setTimeout(r, 1500));
    const aiPromise = getVentResponse(text);
    const [_, aiText] = await Promise.all([minWait, aiPromise]);

    // 4. SHOW RESULT (Centered & Balanced)
    if(inputArea) {
        inputArea.style.display = "none";
        inputArea.style.opacity = "1";
    }
    
    if(postBurnMsg) {
        postBurnMsg.innerHTML = `
            <div style="animation: fadeIn 0.8s ease; text-align: center; padding: 20px; max-width: 90%;">
                
                <p style="
                    font-size: 1.35rem; 
                    line-height: 1.5; 
                    font-weight: 500; 
                    color: #ff8b2d; 
                    font-style: italic; 
                    text-shadow: 0 2px 10px rgba(255, 140, 0, 0.15); 
                    margin: 0 0 40px 0;
                ">"${aiText}"</p>

                <button class="text-btn" onclick="resetFire()">Vent More</button>
            </div>
        `;
        
        if(window.synth) window.synth.success();
    }

    ventInput.value = "";
    ventInput.classList.remove("burning");
    
    incrementDailyStats({ completed_tasks: 1 });
}

function resetFire() {
    const msgArea = document.getElementById("postBurnMsg");
    const inputArea = document.getElementById("ventInputArea");
    
    if(msgArea) msgArea.style.display = "none";
    if(inputArea) {
        inputArea.style.display = "block";
        inputArea.style.animation = "fadeIn 0.5s ease";
    }
    if(window.synth) window.synth.click();
}

/* ===============================
   HELPER: Safe Stats Increment
================================*/
async function incrementDailyStats(updates) {
    if (!window.currentUser || !window.sb) return;
    const userId = window.currentUser.id;
    const today = new Date().toISOString().split("T")[0];

    try {
        const { data: current } = await sb
            .from("daily_stats")
            .select("*")
            .eq("user_id", userId)
            .eq("date", today)
            .single();

        const base = current || {};
        const payload = { user_id: userId, date: today };

        for (const key in updates) {
            payload[key] = (base[key] || 0) + updates[key];
        }

        const { error } = await sb
            .from("daily_stats")
            .upsert(payload, { onConflict: "user_id,date" });

        if (error) throw error;
        console.log("✅ Stats updated:", updates);

    } catch (err) {
        console.error("❌ Stats update failed:", err);
    }
}

/* ===============================
   TOAST NOTIFICATION
================================*/
function showToast(message, type = "success") {
  let toastContainer = document.getElementById("toast-container");
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.id = "toast-container";
    toastContainer.style.cssText = `
      position: fixed; top: 20px; right: 20px; z-index: 9999;
      display: flex; flex-direction: column; gap: 10px; pointer-events: none;
    `;
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement("div");
  let bg = "#00C851"; 
  let color = "#fff";
  if (type === "error") { bg = "#ff4d4d"; }
  else if (type === "warning") { bg = "#ffca28"; color = "#333"; }
  
  toast.innerText = message;
  toast.style.cssText = `
    background: ${bg}; color: ${color}; padding: 12px 24px;
    border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    font-family: sans-serif; font-weight: 600; font-size: 14px;
    opacity: 0; transform: translateX(20px); transition: all 0.3s ease;
    pointer-events: auto;
  `;

  toastContainer.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translateX(0)";
  });
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(20px)";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/* ===============================
   INIT
================================= */
document.addEventListener("DOMContentLoaded", () => {
    initBubbles();
    // Start on Breathe mode by default
    switchMode('breathe'); 
});