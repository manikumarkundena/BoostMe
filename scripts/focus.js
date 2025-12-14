/* ===============================
   TIMER VARIABLES
================================*/
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
        // Warning sound at 10s (standard beep logic)
        let alertThreshold = totalSeconds <= 30 ? 5 : 10;

        if (remaining <= alertThreshold && remaining > 0) {
            if(alertSound) alertSound.play().catch(() => {});
            vibrate(80);
        } else {
            stopBeep();
        }

        // Timer Finish Logic
        if (remaining <= 0) {
            finishTimer(); // 👈 Calls the new function below
            return;
        }

        remaining--;
        updateUI();

    }, 1000);
}

/* ===============================
   🏁 FINISH TIMER (New Function)
================================*/
function finishTimer() {
    clearInterval(timer);
    running = false;
    stopBeep();
    
    // 🔊 PLAY SUCCESS CHORD (Procedural Audio)
    if(window.synth) window.synth.success();

    vibrate([200, 100, 200]);

    // Save Stats
    const minutesCompleted = Math.floor(totalSeconds / 60);
    const currentTotal = parseInt(localStorage.getItem("focus-minutes") || 0);
    localStorage.setItem("focus-minutes", currentTotal + minutesCompleted);

    // Reset UI
    startBtn.innerHTML = `<i data-lucide="zap"></i> <span>Ignite</span>`;
    stopBtn.style.display = "none";
    lockPresets(false);
    if(window.lucide) lucide.createIcons();

    // Small delay for alert so sound plays first
    setTimeout(() => {
        alert("🔥 Core Stabilized! Focus Session Complete.");
    }, 500);
    async function saveFocusSession(minutes) {
    if(!currentUser) return;

    // 1. Log the individual session (For Graphs)
    await sb.from('focus_sessions').insert({
        user_id: currentUser.id,
        duration_minutes: minutes,
        session_type: 'focus'
    });

    // 2. Update Total Stats (Aggregated)
    // First get current totals
    const { data: current } = await sb.from('user_stats')
        .select('total_focus_minutes, total_xp')
        .eq('id', currentUser.id)
        .single();
    
    if(current) {
        const newMins = (current.total_focus_minutes || 0) + minutes;
        const newXP = (current.total_xp || 0) + (minutes * 10); // 10 XP per minute

        await sb.from('user_stats')
            .update({ 
                total_focus_minutes: newMins,
                total_xp: newXP, 
                last_active_date: new Date()
            })
            .eq('id', currentUser.id);
    }
}
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
   STOP TIMER (ABORT)
================================*/
function fullStop() {
    // 🔊 Sound Effect (Error tone for abort)
    if(window.synth) window.synth.error();

    if(!confirm("⚠️ Abort mission? Progress will be lost.")) return;

    running = false;
    clearInterval(timer);
    stopBeep();

    remaining = totalSeconds;
    updateUI();

    startBtn.innerHTML = `<i data-lucide="zap"></i> <span>Ignite</span>`;
    stopBtn.style.display = "none";
    lockPresets(false);
    if(window.lucide) lucide.createIcons();
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
            resetTimer(); // Reset visual state
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
        if (!val || val < 1) return;
        
        totalSeconds = val * 60;
        remaining = totalSeconds;
        
        document.getElementById("inlineCustomInput").style.display = "none";
        resetTimer();
    };
}

/* INIT */
updateUI();