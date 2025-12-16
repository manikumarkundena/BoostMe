/* ===============================
   BoostMe — chat.js (FINAL - MODULAR UI + STATS FIXED + TOASTS)
================================*/

/* ------------------------------
   CONFIG / GLOBALS
-------------------------------*/
async function waitForUser() {
    let tries = 0;
    // Wait up to 3 seconds for auth to hydrate
    while (!window.currentUser && tries < 30) {
        await new Promise(r => setTimeout(r, 100));
        tries++;
    }
    return window.currentUser;
}

const BACKEND_URL = (window.BOOSTME_CONFIG && window.BOOSTME_CONFIG.BACKEND_URL) 
    || "https://boostme-a0ca.onrender.com/api/chat";

let appLang = "en-US";
let activeTimer = null;
let timerSoundInterval = null;
let timerRemaining = 0;
let challengeLocked = false; 

/* ===============================
   LANGUAGE & AI HELPERS
================================*/
function getLanguageInfo(msg) {
    const text = msg || "";
    const total = Math.max(1, text.length);
    let teluguChars = 0;
    let devanagariChars = 0;
    let nonLatin = 0;

    for (const ch of text) {
        const code = ch.charCodeAt(0);
        if (code >= 0x0C00 && code <= 0x0C7F) { teluguChars++; nonLatin++; }
        else if (code >= 0x0900 && code <= 0x097F) { devanagariChars++; nonLatin++; }
        else if (code > 127) { nonLatin++; }
    }

    const teluguRatio = teluguChars / total;
    const devRatio = devanagariChars / total;
    const nonLatinRatio = nonLatin / total;

    let code = "en";
    if (teluguRatio >= 0.8) code = "te";
    else if (devRatio >= 0.8) code = "hi";
    else if (nonLatinRatio >= 0.8) code = "auto";

    let speechLang = "en-US";
    if (code === "te") speechLang = "te-IN";
    if (code === "hi") speechLang = "hi-IN";

    let instruction;
    if (code === "te") instruction = "Reply mostly in Telugu (allow small English words), casual friendly buddy tone.";
    else if (code === "hi") instruction = "Reply in casual Hinglish (mix Hindi + English, keep it friendly).";
    else if (code === "auto") instruction = "Reply in the same language as the user in a friendly tone.";
    else instruction = "Reply in casual modern English, friendly buddy vibe.";

    return { code, speechLang, instruction };
}

async function callAI(input) {
    const body = {};
    if (Array.isArray(input)) body.messages = input;
    else body.messages = [
        { role: "system", content: "You are BoostMe, a friendly chill AI buddy who talks like a modern friend. Keep replies short, supportive and real." },
        { role: "user", content: input }
    ];

    try {
        const res = await fetch(BACKEND_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });

        const text = await res.text();
        let data;
        try { data = JSON.parse(text); } catch (e) { data = null; }

        if (!res.ok) {
            const errMsg = data?.error || data?.message || `HTTP ${res.status}`;
            return `⚠️ API Error: ${errMsg}`;
        }

        if (data?.choices?.[0]?.message?.content) return data.choices[0].message.content;
        if (typeof data?.content === "string") return data.content;
        if (Array.isArray(data?.content)) return data.content.map(c => c.text || "").join("\n").trim();
        if (typeof data?.message === "string") return data.message;
        if (typeof data?.text === "string") return data.text;
        if (typeof text === "string" && text.trim().length > 0) return text.trim();

        return "⚠️ AI Error (Invalid response format)";
    } catch (e) {
        console.error("callAI network error:", e);
        return "⚠️ Network Error (backend unreachable)";
    }
}

/* ===============================
   PROMPTS
================================*/
function moodPrompt(msg, langInfo) {
    return `
${langInfo.instruction}
Analyze the user's mood from: "${msg}"
Reply with EXACTLY ONE short friendly line (1–2 short sentences), casual, 1–3 emojis max.
`;
}

function motivatePrompt(msg, langInfo) {
    return `
${langInfo.instruction}
User message: "${msg}"
Give EXACTLY ONE short supportive/motivational line tailored to the message (1 sentence). 1–2 emojis max.
`;
}

function challengePrompt(langInfo) {
    return `
${langInfo.instruction}
Task: Suggest EXACTLY ONE tiny challenge that takes 30–90 seconds (one short sentence). Examples: drink water, stretch, deep breaths, write 3 quick tasks.
Keep it playful and simple.
`;
}

/* ===============================
   UI BUBBLES
================================*/
function addUserBubble(text) {
    const box = document.getElementById("chatBox");
    if (!box) return;
    const b = document.createElement("div");
    b.className = "user-bubble";
    b.innerText = text;
    box.appendChild(b);
    box.scrollTop = box.scrollHeight;
}

function addAIBubble(text) {
    const box = document.getElementById("chatBox");
    if (!box) return;

    const b = document.createElement("div");
    b.className = "ai-bubble";
    const span = document.createElement("span");
    span.innerHTML = (text || "").replace(/\n/g, "<br>");
    b.appendChild(span);

    const btn = document.createElement("button");
    btn.className = "bubble-speaker-btn";
    btn.innerHTML = `<i data-lucide="volume-2" width="14"></i>`;
    btn.onclick = () => speakText(text);
    btn.style.marginLeft = "10px";
    btn.style.border = "none";
    btn.style.background = "transparent";
    btn.style.opacity = "0.7";
    btn.style.cursor = "pointer";

    b.appendChild(btn);
    box.appendChild(b);
    box.scrollTop = box.scrollHeight;
    if (window.lucide) window.lucide.createIcons();
}

function speakText(text) {
    if (!window.speechSynthesis) return;
    try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = appLang || "en-US";
        u.rate = 1;
        u.pitch = 1;
        const voices = window.speechSynthesis.getVoices();
        u.voice = voices.find(v => v.name.includes("Google")) || voices[0] || null;
        window.speechSynthesis.speak(u);
    } catch (e) {
        console.warn("TTS error:", e);
    }
}

function showTyping() {
    const box = document.getElementById("chatBox");
    if (!box) return;
    if (document.getElementById("typingBubble")) return;
    const t = document.createElement("div");
    t.className = "typing-indicator";
    t.id = "typingBubble";
    t.innerHTML = `<span class="dot"></span><span class="dot"></span><span class="dot"></span>`;
    box.appendChild(t);
    box.scrollTop = box.scrollHeight;
}
function hideTyping() {
    const t = document.getElementById("typingBubble");
    if (t) t.remove();
}

/* ===============================
   CHALLENGE LOGIC
================================*/
function createChallengeCard(text) {
    const chatBox = document.getElementById("chatBox");
    if (!chatBox) return;

    if (challengeLocked) {
        addAIBubble("⚠️ Challenge already active — finish or stop it first.");
        return;
    }

    let card = document.createElement("div");
    card.className = "challenge-card";

    card.innerHTML = `
        <div class="challenge-title">🔥 BoostMe Challenge</div>
        <div class="challenge-text">${text}</div>
        <div class="focus-label">⏱ Choose Focus Time</div>
        <div class="time-options">
            <button class="time-btn" data-seconds="30">30s</button>
            <button class="time-btn" data-seconds="60">1 min</button>
            <button class="time-btn" data-seconds="120">2 min</button>
            <button class="time-btn" data-seconds="300">5 min</button>
            <button class="time-btn custom-btn">Custom</button>
        </div>
        <div class="custom-time-input" style="display:none; margin-top:8px;">
            <input type="number" id="customTimeVal" min="10" placeholder="sec">
            <button id="applyCustomTimeBtn">OK</button>
        </div>
    `;

    chatBox.appendChild(card);
    chatBox.scrollTop = chatBox.scrollHeight;

    card.querySelectorAll(".time-btn").forEach(btn => {
        if (btn.classList.contains("custom-btn")) {
            btn.onclick = () => {
                const custom = card.querySelector(".custom-time-input");
                custom.style.display = "block";
                const input = custom.querySelector("#customTimeVal");
                input.focus();
            };
        } else {
            btn.onclick = () => {
                const sec = parseInt(btn.getAttribute("data-seconds"), 10);
                startChallengeTimer(sec, card);
            };
        }
    });

    const applyBtn = card.querySelector("#applyCustomTimeBtn");
    if (applyBtn) {
        applyBtn.onclick = () => {
            const val = parseInt(card.querySelector("#customTimeVal").value, 10);
            if (!val || val < 10) {
                addAIBubble("⛔ Minimum is 10 seconds dude.");
                return;
            }
            startChallengeTimer(val, card);
        };
    }
}

function clearExistingTimers() {
    if (activeTimer) {
        clearInterval(activeTimer);
        activeTimer = null;
    }
    if (timerSoundInterval) {
        clearInterval(timerSoundInterval);
        timerSoundInterval = null;
    }
    timerRemaining = 0;
    document.querySelectorAll(".circle-timer-wrap").forEach(e => e.remove());
    document.querySelectorAll(".challenge-progress-bar").forEach(e => e.remove());
    document.querySelectorAll(".challenge-card").forEach(e => e.remove());
}

function startChallengeTimer(seconds, cardEl = null) {
    if (challengeLocked) {
        addAIBubble("⚠️ Another challenge is already running.");
        return;
    }

    challengeLocked = true;
    if (cardEl) {
        cardEl.querySelectorAll(".time-btn, #applyCustomTimeBtn, #customTimeVal").forEach(el => el.disabled = true);
    }
    clearExistingTimers();
    addAIBubble("⏱️ Timer started! Focus: " + seconds + "s");
    showCircularTimer(seconds);
    showLinearBarTimer(seconds);
}

function showCircularTimer(seconds) {
    const chatBox = document.getElementById("chatBox");
    if (!chatBox) return;

    const wrap = document.createElement("div");
    wrap.className = "circle-timer-wrap";
    wrap.innerHTML = `
        <div class="circle-timer">
            <svg class="timer-svg" width="80" height="80">
                <circle class="timer-bg" cx="40" cy="40" r="35"></circle>
                <circle class="timer-progress" cx="40" cy="40" r="35"></circle>
            </svg>
            <div class="timer-text">${seconds}s</div>
        </div>
    `;

    chatBox.appendChild(wrap);
    chatBox.scrollTop = chatBox.scrollHeight;

    let remaining = seconds;
    timerRemaining = remaining;
    const txt = wrap.querySelector(".timer-text");
    const circle = wrap.querySelector(".timer-progress");
    const totalLength = 2 * Math.PI * 35;
    circle.style.strokeDasharray = totalLength;
    circle.style.strokeDashoffset = 0;

    const snd = document.getElementById("timerSound");

    activeTimer = setInterval(() => {
        remaining--;
        timerRemaining = remaining;
        txt.innerText = remaining + "s";
        const progress = ((seconds - remaining) / seconds) * totalLength;
        circle.style.strokeDashoffset = progress;

        if (remaining <= 5 && remaining > 0) {
            circle.style.stroke = "#ff4e4e";
            if (snd) {
                snd.currentTime = 0;
                snd.play().catch(()=>{});
            }
        } else if (remaining <= 15) {
            circle.style.stroke = "#ff8b2d";
        } else {
            circle.style.stroke = "#7b5dff";
        }

        if (remaining <= 0) {
            clearInterval(activeTimer);
            activeTimer = null;
            if (snd) {
                snd.pause();
                snd.currentTime = 0;
            }
            finishTimer(seconds);
        }
    }, 1000);
}

function showLinearBarTimer(seconds) {
    const chatBox = document.getElementById("chatBox");
    if (!chatBox) return;

    let bar = document.createElement("div");
    bar.className = "challenge-progress-bar";
    bar.innerHTML = `<div class="challenge-progress-fill"></div>`;
    chatBox.appendChild(bar);
    chatBox.scrollTop = chatBox.scrollHeight;

    const fill = bar.querySelector(".challenge-progress-fill");
    let remaining = seconds;
    fill.style.width = "100%";

    const interval = setInterval(() => {
        remaining--;
        const percent = Math.max(0, (remaining / seconds) * 100);
        fill.style.width = percent + "%";

        if (percent > 60) fill.style.background = "#7b5dff";
        else if (percent > 40) fill.style.background = "#ffd24d";
        else if (percent > 20) fill.style.background = "#ff8b2d";
        else fill.style.background = "#ff4e4e";

        if (remaining <= 0) clearInterval(interval);
    }, 1000);
}

/* ===============================
   finishTimer — cleanup + message + STATS FIX
================================*/
async function finishTimer(seconds) {
    clearExistingTimers();
    addAIBubble(`🔥 Time's up! You nailed that ${seconds}s focus sesh bro!`);
    challengeLocked = false;

    // 🔥 UPDATED: Increment Stats using Helper
    if (window.currentUser) {
        const minutes = Math.ceil(seconds / 60);
        await incrementDailyStats({
            challenge_minutes: minutes,
            challenges_completed: 1
        });
    }
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
   MESSAGE SEND FLOW
================================*/
async function sendMessage() {
    const user = await waitForUser(); 
    const input = document.getElementById("userInput");
    if (!input) return;
    const msg = input.value.trim();
    if (!msg) return;

    input.value = "";
    addUserBubble(msg);

    const langInfo = getLanguageInfo(msg);
    appLang = langInfo.speechLang || "en-US";

    if (user && typeof sb !== "undefined") {
        sb.from("chat_messages").insert({
            user_id: user.id,
            sender: "user",
            message: msg
        }).then(({error}) => { if(error) console.error("Save User Msg Failed", error) });
    }

    // Mood
    showTyping();
    const mood = await callAI(moodPrompt(msg, langInfo));
    hideTyping();
    addAIBubble(mood || "⚠️ AI Error");
    if (user) sb.from("chat_messages").insert({ user_id: user.id, sender: "ai", message: mood }).then();

    // Motivation
    showTyping();
    const motivate = await callAI(motivatePrompt(msg, langInfo));
    hideTyping();
    addAIBubble(motivate || "⚠️ AI Error");
    if (user) sb.from("chat_messages").insert({ user_id: user.id, sender: "ai", message: motivate }).then();

    // Challenge
    showTyping();
    const challenge = await callAI(challengePrompt(langInfo));
    hideTyping();
    createChallengeCard(challenge || "Take 3 slow deep breaths.");
    if (user) sb.from("chat_messages").insert({ user_id: user.id, sender: "ai", message: challenge }).then();
}

async function manualChallenge() {
    if (challengeLocked) {
        addAIBubble("⚠️ A challenge is already running. Finish it first.");
        return;
    }
    const user = await waitForUser();
    showTyping();
    const langInfo = { instruction: "Reply in casual English.", speechLang: "en-US", code: "en" };
    const ch = await callAI(challengePrompt(langInfo));
    hideTyping();
    
    createChallengeCard(ch || "Do 10 seconds stretch.");
    if (user) sb.from("chat_messages").insert({ user_id: user.id, sender: "ai", message: ch }).then();
}

/* ===============================
   HISTORY MODAL (UPDATED WITH TOASTS & CHECKS)
================================*/
const historyBtn = document.getElementById("historyBtn");
const historyModal = document.getElementById("historyModal");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");
const historyList = document.getElementById("historyList");

historyBtn && (historyBtn.onclick = loadChatHistoryModal);
function openHistory() { historyModal && historyModal.classList.add("active"); }
function closeHistory() { historyModal && historyModal.classList.remove("active"); }

async function loadChatHistoryModal() {
    if (!window.currentUser) {
        showToast("Please login to view chat history!", "error");
        return;
    }

    if (!historyList) return;
    historyList.innerHTML = `<div class="history-item">Loading...</div>`;
    openHistory();

    try {
        const { data, error } = await sb.from("chat_messages")
            .select("*")
            .eq("user_id", window.currentUser.id)
            .order("id", { ascending: true });
        
        if (error) throw error;

        if (!data || data.length === 0) {
            historyList.innerHTML = `<div class="history-item" style="text-align:center; opacity:0.6;">No past messages 😶</div>`;
            return;
        }

        const groups = {};
        data.forEach(row => {
            const date = new Date(row.created_at).toLocaleDateString();
            (groups[date] ||= []).push(row);
        });

        historyList.innerHTML = "";
        Object.keys(groups).forEach(date => {
            const groupDiv = document.createElement("div");
            groupDiv.innerHTML = `<div class="history-date">${date}</div>`;
            groups[date].forEach(msg => {
                const item = document.createElement("div");
                item.className = "history-item";
                item.innerText = `${msg.sender === "user" ? "🧑‍💬 You" : "🤖 BoostMe"}: ${msg.message}`;
                item.onclick = () => {
                    const ui = document.getElementById("userInput");
                    if (ui) ui.value = msg.message;
                    closeHistory();
                };
                groupDiv.appendChild(item);
            });
            historyList.appendChild(groupDiv);
        });
    } catch (e) {
        historyList.innerHTML = `<div class="history-item">Failed to load history.</div>`;
        console.error("History load error:", e);
    }
}

// ✨ FIXED CLEAR HISTORY LOGIC (No Overlaps)
if (clearHistoryBtn) {
    clearHistoryBtn.onclick = () => {
        if (!window.currentUser) {
            showToast("Please login first!", "error");
            return;
        }
        
        // 1️⃣ CHECK IF EMPTY
        const hasContent = historyList.querySelector(".history-date");
        if (!hasContent) {
            showToast("Nothing to delete here! ✨", "warning");
            return; 
        }

        // 2️⃣ CLOSE HISTORY MODAL FIRST (Fixes the overlapping issue)
        closeHistory();

        // 3️⃣ WAIT 100ms & SHOW CONFIRMATION
        setTimeout(async () => {
            let confirmed = false;
            
            if (window.ui) {
                confirmed = await ui.confirm("Clear History?", "Are you sure? This deletes ALL chat history permanently.", true);
            } else {
                confirmed = confirm("Delete ALL your chat history?");
            }

            // 4️⃣ HANDLE CANCEL
            if (!confirmed) {
                openHistory(); // Re-open history if they cancelled so they don't lose context
                return;
            }

            // 5️⃣ DELETE OPERATION
            try {
                const { error } = await sb.from("chat_messages").delete().eq("user_id", window.currentUser.id);
                if (error) throw error;
                
                // Update UI state (will be visible next time they open it)
                historyList.innerHTML = `<div class="history-item" style="text-align:center; opacity:0.6;">No past messages 😶</div>`;
                showToast("History cleared successfully! 🧹", "success");
                
            } catch (e) {
                console.error("clear history failed", e);
                showToast("Failed to clear history.", "error");
                openHistory(); // Re-open on error
            }
        }, 100);
    };
}

/* ===============================
   VOICE & INIT
================================*/
const voiceBtn = document.getElementById("chatVoiceBtn");
if (voiceBtn && ("webkitSpeechRecognition" in window)) {
    const recognition = new webkitSpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    voiceBtn.onclick = () => {
        voiceBtn.classList.add("active");
        recognition.start();
    };
    recognition.onresult = (e) => {
        const t = e.results[0][0].transcript;
        const ui = document.getElementById("userInput");
        if (ui) ui.value = t;
    };
    recognition.onend = () => voiceBtn.classList.remove("active");
}

function initChat() {
    const sendBtn = document.getElementById("sendBtn");
    const userInput = document.getElementById("userInput");
    if (!sendBtn || !userInput) {
        return setTimeout(initChat, 100);
    }
    sendBtn.onclick = sendMessage;
    userInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    document.querySelectorAll(".chip").forEach(chip => {
        chip.onclick = () => {
            userInput.value = chip.innerText;
            sendMessage();
        };
    });
    const quick = document.querySelector(".floating-quick-btn");
    if (quick) quick.onclick = manualChallenge;

    const historyBtn = document.getElementById("historyBtn");
    if (historyBtn) historyBtn.onclick = loadChatHistoryModal;
    
    console.log("✅ Chat initialized");
}

/* ===============================
   TOAST NOTIFICATION (SHARED)
================================*/
function showToast(message, type = "success") {
  // Create toast container if it doesn't exist
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
  
  let bg = "#00C851"; // Default Green
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

setTimeout(initChat, 0);