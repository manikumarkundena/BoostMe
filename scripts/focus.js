/* ===============================
   BoostMe — focus.js (FINAL - MODALS & TOASTS)
================================*/

/* ===============================
   TIMER VARIABLES
================================*/
console.log("🧪 DEBUG START - Focus Module");

let totalSeconds = 1500;
let remaining = totalSeconds;
let timer = null;
let running = false;

/* ===============================
   DOM ELEMENTS
================================*/
const ring = document.getElementById("timerRing");
const valueEl = document.getElementById("timerValue");
const startBtn = document.getElementById("focusStartBtn");
const resetBtn = document.getElementById("focusResetBtn");
const stopBtn = document.getElementById("focusStopBtn");
const alertSound = document.getElementById("alertSound");
const portalContainer = document.getElementById("portalContainer");

/* ===============================
   AUDIO HELPERS
================================*/
function stopBeep() {
    if(alertSound) {
        alertSound.pause();
        alertSound.currentTime = 0;
    }
}

function vibrate(ms) {
    if (navigator.vibrate) navigator.vibrate(ms);
}

/* ===============================
   UPDATE UI (HUD & COLORS)
================================*/
function updateUI() {
    let m = String(Math.floor(remaining / 60)).padStart(2, "0");
    let s = String(remaining % 60).padStart(2, "0");

    // Update Text
    if(valueEl) valueEl.innerText = `${m}:${s}`;

    // Calculate Progress
    let progress = ((totalSeconds - remaining) / totalSeconds) * 360;
    let percentLeft = (remaining / totalSeconds) * 100;

    // 🎨 DYNAMIC COLOR LOGIC
    let newColor = "#6c63ff"; // Default Blue

    if (percentLeft <= 10) {
        newColor = "#ff4e4e"; // Red (Critical)
    } else if (percentLeft <= 30) {
        newColor = "#ff9f3f"; // Orange (Warning)
    } else if (percentLeft <= 60) {
        newColor = "#ffd54a"; // Yellow (Caution)
    }

    // Apply color to CSS Variable
    if(portalContainer) {
        portalContainer.style.setProperty('--ring-color', newColor);
    }

    // Update Ring Gradient
    if(ring) {
        ring.style.background = 
            `conic-gradient(var(--ring-color) ${progress}deg, transparent 0deg)`;
    }
}

/* ===============================
   LOCK PRESETS
================================*/
function lockPresets(lock) {
    document.querySelectorAll(".preset-btn").forEach(btn => {
        if (lock) {
            btn.classList.add("disabled");
            btn.disabled = true;
            btn.style.opacity = "0.5";
        } else {
            btn.classList.remove("disabled");
            btn.disabled = false;
            btn.style.opacity = "1";
        }
    });
}

/* ===============================
   START TIMER
================================*/
function startTimer() {
    if (timer) clearInterval(timer);
    running = true;
    
    // 🔊 Sound Effect
    if(window.synth) window.synth.click();

    // UI Updates
    startBtn.innerHTML = `<i data-lucide="pause"></i> <span>Pause</span>`;
    stopBtn.style.display = "flex"; 
    lockPresets(true);
    
    // Refresh Icons
    if(window.lucide) lucide.createIcons();

    timer = setInterval(() => {
        // Warning sound at 10s
        let alertThreshold = totalSeconds <= 30 ? 5 : 10;

        if (remaining <= alertThreshold && remaining > 0) {
            if(alertSound) alertSound.play().catch(() => {});
            vibrate(80);
        } else {
            stopBeep();
        }

        // Timer Finish Logic
        if (remaining <= 0) {
            finishTimer(); 
            return;
        }

        remaining--;
        updateUI();

    }, 1000);
}

/* ===============================
   🏁 FINISH TIMER
================================*/
function finishTimer() {
    console.log("🔥 finishTimer() called");

    // 1. Convert to minutes
    const minutesCompleted = Math.floor(totalSeconds / 60);

    // 2. Save Stats (if helper exists)
    if (window.saveDailyStats) {
        window.saveDailyStats({ focusMinutes: minutesCompleted });
    }

    clearInterval(timer);
    running = false;
    stopBeep();
    
    // 3. 🔊 PLAY SUCCESS CHORD
    if(window.synth) window.synth.success();
    vibrate([200, 100, 200]);

    // 4. Local Storage Backup
    const currentTotal = parseInt(localStorage.getItem("focus-minutes") || 0);
    localStorage.setItem("focus-minutes", currentTotal + minutesCompleted);

    // 5. Reset UI
    startBtn.innerHTML = `<i data-lucide="zap"></i> <span>Ignite</span>`;
    stopBtn.style.display = "none";
    lockPresets(false);
    if(window.lucide) lucide.createIcons();

    // 6. ✨ TOAST NOTIFICATION (Instead of Alert)
    showToast(`🔥 Core Stabilized! +${minutesCompleted} mins added.`, "success");
}

/* ===============================
   PAUSE TIMER
================================*/
function pauseTimer() {
    running = false;
    clearInterval(timer);
    stopBeep();
    
    // 🔊 Sound Effect
    if(window.synth) window.synth.click();

    startBtn.innerHTML = `<i data-lucide="play"></i> <span>Resume</span>`;
    if(window.lucide) lucide.createIcons();
}

/* ===============================
   STOP TIMER (ABORT) - WITH MODAL
================================*/
async function fullStop() {
    // 🔊 Sound Effect
    if(window.synth) window.synth.error();

    // ✨ NEW: Glass UI Confirmation
    let confirmed = false;
    if (window.ui) {
        // Red button logic (true as 3rd arg)
        confirmed = await ui.confirm("Abort Mission?", "Are you sure? Current progress will be lost.", true);
    } else {
        confirmed = confirm("⚠️ Abort mission? Progress will be lost.");
    }

    if (!confirmed) return;

    running = false;
    clearInterval(timer);
    stopBeep();

    remaining = totalSeconds;
    updateUI();
    
    startBtn.innerHTML = `<i data-lucide="zap"></i> <span>Ignite</span>`;
    stopBtn.style.display = "none";
    lockPresets(false);
    if(window.lucide) lucide.createIcons();

    showToast("Timer stopped.", "warning");
}

/* ===============================
   RESET TIMER
================================*/
function resetTimer() {
    // 🔊 Sound Effect
    if(window.synth) window.synth.click();

    running = false;
    clearInterval(timer);
    stopBeep();

    remaining = totalSeconds;

    startBtn.innerHTML = `<i data-lucide="zap"></i> <span>Ignite</span>`;
    stopBtn.style.display = "none";
    lockPresets(false);
    updateUI();
    if(window.lucide) lucide.createIcons();
}

/* ===============================
   EVENT LISTENERS
================================*/
if(startBtn) startBtn.onclick = () => running ? pauseTimer() : startTimer();
if(resetBtn) resetBtn.onclick = resetTimer;
if(stopBtn) stopBtn.onclick = fullStop;

/* Presets */
document.querySelectorAll(".preset-btn").forEach(btn => {
    btn.onclick = () => {
        if (running) return;
        
        // 🔊 Sound Effect
        if(window.synth) window.synth.click();

        if (btn.classList.contains("custom-btn")) {
            const inputDiv = document.getElementById("inlineCustomInput");
            inputDiv.style.display = (inputDiv.style.display === "flex") ? "none" : "flex";
            return;
        }

        document.getElementById("inlineCustomInput").style.display = "none";
        
        let min = parseInt(btn.innerText);
        if(!isNaN(min)) {
            totalSeconds = min * 60;
            remaining = totalSeconds;
            resetTimer(); 
        }
    };
});

/* Custom Input */
const applyBtn = document.getElementById("inlineCustomApply");
if(applyBtn) {
    applyBtn.onclick = () => {
        if (running) return;

        // 🔊 Sound Effect
        if(window.synth) window.synth.click();

        const val = parseInt(document.getElementById("inlineCustomMin").value);
        
        // Validation with Toast
        if (!val || val < 1) {
            showToast("Please enter at least 1 minute.", "warning");
            return;
        }
        
        totalSeconds = val * 60;
        remaining = totalSeconds;
        
        document.getElementById("inlineCustomInput").style.display = "none";
        resetTimer();
    };
}

/* INIT */
updateUI();


/* ===============================
   TOAST NOTIFICATION HELPER
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
  
  let bg = "#00C851"; // Green
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