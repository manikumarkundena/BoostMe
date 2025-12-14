/* ===============================
   BoostMe — chat.js (FINAL)
   Drop-in replacement for your chat.js
================================*/

/* ===============================
   RUNTIME API KEY (SAFE METHOD)
   - NOT stored in code
   - NOT committed
   - Lives only during session
================================*/


/* ------------------------------
   CONFIG / GLOBALS
   - Keep this synced with your config.js if needed


-------------------------------*/


const BACKEND_URL = (window.BOOSTME_CONFIG && window.BOOSTME_CONFIG.BACKEND_URL) 
    || "https://boostme-a0ca.onrender.com/api/chat";

let appLang = "en-US";
let currentUser = null; // will be set by your auth check if supabase exists

// Timer flags to prevent duplicate challenges / multiple timers
let activeTimer = null;
let timerSoundInterval = null;
let timerRemaining = 0;
let challengeLocked = false; // prevents duplicate challenge creation while a challenge/timer is active

/* ------------------------------
   SAFETY: try to auto-load supabase user if available
-------------------------------*/
if (typeof supabase !== "undefined" && supabase && supabase.auth) {
    supabase.auth.getSession().then(res => {
        currentUser = res?.data?.session?.user || null;
        window.currentUser = currentUser;
    }).catch(e => {
        console.warn("Supabase session check failed:", e);
    });

    // keep currentUser updated on auth changes (your existing pattern)
    if (supabase.auth.onAuthStateChange) {
        supabase.auth.onAuthStateChange((_event, _session) => {
            currentUser = _session?.user || null;
            window.currentUser = currentUser;
        });
    }
}

/* ===============================
   LANGUAGE / PROMPT HELPERS
   - lightweight language detection (telugu/devanagari/latin)
   - returns an instruction snippet for prompts & speechLang
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

/* ===============================
   BACKEND CALL (robust)
   - accepts a single prompt (string) OR messages array
   - handles many shapes of response and network errors
================================*/
async function callAI(input) {
    // input may be a string prompt OR an array of messages
    const body = {};
    if (Array.isArray(input)) body.messages = input;
    else body.messages = [
        { role: "system", content: "You are BoostMe, a friendly chill AI buddy who talks like a modern friend. Keep replies short, supportive and real." },
        { role: "user", content: input }
    ];

    try {
        const res = await fetch(BACKEND_URL, {
            method: "POST",
           headers: {
  "Content-Type": "application/json",
  
},

            body: JSON.stringify(body)
        });

        // if response not ok, attempt to parse JSON and surface message
        const text = await res.text();
        let data;
        try { data = JSON.parse(text); } catch (e) { data = null; }

        if (!res.ok) {
            // prefer returned error message if present
            const errMsg = data?.error || data?.message || `HTTP ${res.status}`;
            return `⚠️ API Error: ${errMsg}`;
        }

        // Normal success shapes:
        // 1) { choices: [ { message: { content: "..." } } ] }
        if (data?.choices?.[0]?.message?.content) return data.choices[0].message.content;

        // 2) { content: "..." }
        if (typeof data?.content === "string") return data.content;

        // 3) { content: [ { text: "..." }, ... ] }
        if (Array.isArray(data?.content)) {
            return data.content.map(c => c.text || "").join("\n").trim();
        }

        // 4) { message: "..."} or { text: "..." }
        if (typeof data?.message === "string") return data.message;
        if (typeof data?.text === "string") return data.text;

        // 5) raw string body (some proxies return raw)
        if (typeof text === "string" && text.trim().length > 0) return text.trim();

        return "⚠️ AI Error (Invalid response format)";
    } catch (e) {
        console.error("callAI network error:", e);
        return "⚠️ Network Error (backend unreachable)";
    }
}

/* ===============================
   PROMPTS (language-aware wrappers)
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
   UI BUBBLES (unchanged core features)
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

/* ===============================
   TTS (uses appLang set from detection)
================================*/
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

/* ===============================
   Typing indicator
================================*/
function showTyping() {
    const box = document.getElementById("chatBox");
    if (!box) return;
    // prevent duplicates
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
   CHALLENGE CARD & CUSTOM TIME (preserve UI)
   - prevents duplicate challenge card creation while active
================================*/
function createChallengeCard(text) {
    const chatBox = document.getElementById("chatBox");
    if (!chatBox) return;

    // If there's already a challenge-card and a timer active, don't create another
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

    // Wire buttons (delegated)
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

/* ===============================
   CLEAR existing timers/cards etc.
================================*/
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

/* ===============================
   START CHALLENGE TIMER
   - second param 'cardEl' is optional — used to disable time-btns while running
================================*/
function startChallengeTimer(seconds, cardEl = null) {
    if (challengeLocked) {
        addAIBubble("⚠️ Another challenge is already running.");
        return;
    }

    challengeLocked = true; // 🔒 LOCK HERE

    if (cardEl) {
        cardEl.querySelectorAll(
            ".time-btn, #applyCustomTimeBtn, #customTimeVal"
        ).forEach(el => el.disabled = true);
    }

    clearExistingTimers();

    addAIBubble("⏱️ Timer started! Focus: " + seconds + "s");
    showCircularTimer(seconds);
    showLinearBarTimer(seconds);
}

/* ===============================
   Circular timer + last-second sound logic
   - plays alert sound once per second during alert window to avoid overlapping
================================*/
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

    // alert threshold: last 5 sec if short timer, else last 10s
    const alertThreshold = seconds <= 30 ? 5 : 10;
    const snd = document.getElementById("timerSound");

    // We'll run our interval and handle sound playback once per second when within alert window.
    activeTimer = setInterval(() => {
    remaining--;
    timerRemaining = remaining;
    txt.innerText = remaining + "s";

    const progress = ((seconds - remaining) / seconds) * totalLength;
    circle.style.strokeDashoffset = progress;

    // 🎨 COLOR + 🔔 SOUND
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

/* ===============================
   Linear progress bar
================================*/
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

    // set initial width to 100% and reduce
    fill.style.width = "100%";

    const interval = setInterval(() => {
        remaining--;
        const percent = Math.max(0, (remaining / seconds) * 100);
        fill.style.width = percent + "%";

        // color stages (keeps your design)
        if (percent > 60) fill.style.background = "#7b5dff";
        else if (percent > 40) fill.style.background = "#ffd24d";
        else if (percent > 20) fill.style.background = "#ff8b2d";
        else fill.style.background = "#ff4e4e";

        if (remaining <= 0) clearInterval(interval);
    }, 1000);
}

/* ===============================
   finishTimer — cleanup + message
================================*/
function finishTimer(seconds) {
    clearExistingTimers();
    addAIBubble(`🔥 Time's up! You nailed that ${seconds}s focus sesh bro!`);
    challengeLocked = false; // 🔓 UNLOCK ONLY HERE
}


/* ===============================
   SEND/MAIN flow (mood -> motivate -> challenge)
   - keeps DB inserts if currentUser exists
   - handles language detection before each prompt
================================*/
async function sendMessage() {
    const input = document.getElementById("userInput");
    if (!input) return;
    const msg = input.value.trim();
    if (!msg) return;

    input.value = "";
    addUserBubble(msg);

    const langInfo = getLanguageInfo(msg);
    appLang = langInfo.speechLang || "en-US";

    // Save user message to Supabase if available (preserve your flow)
    if (currentUser && typeof sb !== "undefined") {
        try {
            sb.from("chat_messages").insert({ user_id: currentUser.id, sender: "user", message: msg }).catch(()=>{});
        } catch (e) {}
    }

    // 1) Mood
    showTyping();
    const mood = await callAI(moodPrompt(msg, langInfo));
    hideTyping();
    addAIBubble(mood || "⚠️ AI Error");

    if (currentUser && typeof sb !== "undefined") {
        try { sb.from("chat_messages").insert({ user_id: currentUser.id, sender: "ai", message: mood || "" }).catch(()=>{}); } catch(e){}
    }

    // 2) Motivation
    showTyping();
    const motivate = await callAI(motivatePrompt(msg, langInfo));
    hideTyping();
    addAIBubble(motivate || "⚠️ AI Error");

    if (currentUser && typeof sb !== "undefined") {
        try { sb.from("chat_messages").insert({ user_id: currentUser.id, sender: "ai", message: motivate || "" }).catch(()=>{}); } catch(e){}
    }

    // 3) Challenge — create card (prevents duplicates inside createChallengeCard)
    showTyping();
    const challenge = await callAI(challengePrompt(langInfo));
    hideTyping();
    createChallengeCard(challenge || "Take 3 slow deep breaths.");

    if (currentUser && typeof sb !== "undefined") {
        try { sb.from("chat_messages").insert({ user_id: currentUser.id, sender: "ai", message: challenge || "" }).catch(()=>{}); } catch(e){}
    }
}

/* ===============================
   Manual challenge invoker (floating quick button)
   - obeys duplicate-prevention
================================*/
async function manualChallenge() {
    if (challengeLocked) {
        addAIBubble("⚠️ A challenge is already running. Finish it before starting another.");
        return;
    }
    showTyping();
    // default language: english buddy
    const langInfo = { instruction: "Reply in casual modern English, friendly buddy.", speechLang: "en-US", code: "en" };
    const ch = await callAI(challengePrompt(langInfo));
    hideTyping();
    createChallengeCard(ch || "Do 10 seconds stretch.");
    if (currentUser && typeof sb !== "undefined") {
        try { sb.from("chat_messages").insert({ user_id: currentUser.id, sender: "ai", message: ch || "" }).catch(()=>{}); } catch(e){}
    }
}

/* ===============================
   CHAT HISTORY modal + clear (keeps existing functions)
================================*/
const historyBtn = document.getElementById("historyBtn");
const historyModal = document.getElementById("historyModal");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");
const historyList = document.getElementById("historyList");

historyBtn && (historyBtn.onclick = loadChatHistoryModal);
function openHistory() { historyModal && historyModal.classList.add("active"); }
function closeHistory() { historyModal && historyModal.classList.remove("active"); }

async function loadChatHistoryModal() {
    if (!currentUser) {
        alert("Login to view chat history!");
        return;
    }

    if (!historyList) return;
    historyList.innerHTML = `<div class="history-item">Loading…</div>`;
    openHistory();

    try {
        const { data, error } = await sb.from("chat_messages").select("*").eq("user_id", currentUser.id).order("id", { ascending: true });
        if (!data || data.length === 0) {
            historyList.innerHTML = `<div class="history-item">No past messages 😶</div>`;
            return;
        }

        // Group by date
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
        console.error(e);
    }
}

clearHistoryBtn && (clearHistoryBtn.onclick = async () => {
    if (!confirm("Delete ALL your chat history?")) return;
    if (!currentUser) return;
    try {
        await sb.from("chat_messages").delete().eq("user_id", currentUser.id);
        historyList.innerHTML = `<div class="history-item">History cleared 🧹</div>`;
    } catch (e) {
        console.error("clear history failed", e);
    }
});

/* ===============================
   VOICE input wiring (keeps behavior)
================================*/
const voiceBtn = document.getElementById("chatVoiceBtn");
if (voiceBtn && ("webkitSpeechRecognition" in window)) {
    const recognition = new webkitSpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;

    voiceBtn.onclick = () => {
        voiceBtn.classList.add("recording");
        recognition.start();
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        const ui = document.getElementById("userInput");
        if (ui) ui.value = transcript;
    };

    recognition.onend = () => {
        voiceBtn.classList.remove("recording");
    };

    recognition.onerror = (event) => {
        console.error("Voice Error:", event.error);
        voiceBtn.classList.remove("recording");
    };
} else if (voiceBtn) {
    voiceBtn.style.display = "none";
}

/* ===============================
   INIT / EVENT BINDINGS
================================*/
document.addEventListener("DOMContentLoaded", () => {
    // load chat history if user exists
    if (typeof loadChatHistory === "function") {
        try { loadChatHistory(); } catch (e) { console.warn(e); }
    }

    // buttons + input
    const sendBtn = document.getElementById("sendBtn");
    const userInput = document.getElementById("userInput");
    if (sendBtn) sendBtn.onclick = sendMessage;
    if (userInput) {
        userInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }

    // suggestion chips (existing code)
    document.querySelectorAll(".chip").forEach(chip => {
        chip.onclick = () => {
            const ui = document.getElementById("userInput");
            if (ui) ui.value = chip.innerText;
            sendMessage();
        };
    });

    // manual quick challenge button
    const quick = document.querySelector(".floating-quick-btn");
    if (quick) quick.onclick = manualChallenge;
});
