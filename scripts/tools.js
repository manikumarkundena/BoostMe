console.log("Tools page ready 🚀");

/* =========================================================
   STATE MANAGEMENT
========================================================= */
let selectedTool = "";
let conversationHistory = [];
let isLoading = false;
let typingInterval = null;

const outputBox = document.getElementById("toolOutput");
const inputBox = document.getElementById("toolInput");
const runBtn = document.getElementById("runToolBtn");
const toolTitleEl = document.getElementById("toolTitle");
const toolHintEl = document.querySelector(".tool-hint");

/* =========================================================
   1. SYSTEM PROMPT (ENGLISH ONLY — DO NOT REMOVE)
========================================================= */
const BASE_SYSTEM_PROMPT = `
You are **BoostMe Tools**, a friendly but highly skilled AI assistant 🤝.

STRICT RULES (VERY IMPORTANT):
- Respond in **ENGLISH ONLY**
- Friendly, modern, supportive tone (light emojis allowed 😊🔥)
- No robotic tone
- Clear, structured, helpful answers

FORMATTING RULES:
- Use Markdown (## headings, **bold**, - lists)
- ALL code MUST be inside fenced blocks like:
\`\`\`js
code here
\`\`\`
- Keep answers practical and clean
`;

/* =========================================================
   TOOL ROLES (POLISHED)
========================================================= */
const TOOL_DEFINITIONS = {
  planner: `
You are a **Productivity Coach 🕒**
- Create realistic schedules
- Use time blocks, breaks & emojis
- Avoid overload
`,

  writer: `
You are a **Creative Content Writer ✍️**
- Give 2 versions (Formal & Creative)
- Use engaging hooks
- Improve clarity & flow
`,

  study: `
You are a **Study Buddy 📚**
- Explain like I’m 10
- Use real-life analogies
- End with a 2–3 question mini quiz
`,

  ideas: `
You are an **Idea Machine 💡**
- Give fresh, trendy ideas
- Avoid generic suggestions
- Explain WHY each idea works
`,

  dev: `
You are a **Senior Developer 👨‍💻**
- Explain errors simply
- Give clean, optimized code
- Mention common mistakes
`
};

const PLACEHOLDERS = {
  planner: "Plan my day for 6 hours of study with breaks...",
  writer: "Write a LinkedIn post about my new AI project...",
  study: "Explain recursion in simple terms...",
  ideas: "Give YouTube content ideas for tech reels...",
  dev: "Paste your broken code here..."
};

/* =========================================================
   2. TOOL SELECTION
========================================================= */
document.querySelectorAll(".tool-card").forEach(card => {
  card.onclick = () => {
    const newTool = card.dataset.tool;
    if (selectedTool !== newTool) {
      selectedTool = newTool;
      resetToolState();
    }

    document.querySelectorAll(".tool-card").forEach(c => c.classList.remove("active-tool"));
    card.classList.add("active-tool");

    toolTitleEl.innerText = card.querySelector(".tool-title").innerText;
    toolHintEl.innerText = "Mode active. Type below 👇";
    inputBox.placeholder = PLACEHOLDERS[selectedTool];

    document.querySelector(".tool-panel").scrollIntoView({ behavior: "smooth" });
    setTimeout(() => inputBox.focus(), 400);
  };
});

function resetToolState() {
  conversationHistory = [];
  outputBox.innerHTML = "";
  inputBox.value = "";

  conversationHistory.push({
    role: "system",
    content: BASE_SYSTEM_PROMPT + "\n\nCURRENT ROLE:\n" + TOOL_DEFINITIONS[selectedTool]
  });
}

/* =========================================================
   3. BACKEND AI CALL
========================================================= */
const BACKEND_URL = "https://boostme-a0ca.onrender.com/api/chat";

async function callAI(messages) {
  try {
    const res = await fetch(BACKEND_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages })
    });

    const data = await res.json();

    if (data?.choices?.[0]?.message?.content)
      return data.choices[0].message.content;

    if (typeof data?.content === "string")
      return data.content;

    return "⚠️ No response received.";
  } catch (e) {
    console.error(e);
    return "⚠️ Backend error. Please try again.";
  }
}

/* =========================================================
   4. RUN TOOL
========================================================= */
async function handleRunTool() {
  if (isLoading || !selectedTool) return;

  const text = inputBox.value.trim();
  if (!text) return;

  isLoading = true;
  runBtn.innerHTML = "Thinking… ⏳";
  runBtn.disabled = true;

  appendMessage("user", text);
  conversationHistory.push({ role: "user", content: text });
  inputBox.value = "";

  const loaderId = showLoading();
  const reply = await callAI(conversationHistory);

  removeLoading(loaderId);
  conversationHistory.push({ role: "assistant", content: reply });
  appendMessage("ai", reply);

  runBtn.innerHTML = "Run ✨";
  runBtn.disabled = false;
  isLoading = false;

  if (window.Prism) Prism.highlightAll();
}

runBtn.onclick = handleRunTool;
inputBox.addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    handleRunTool();
  }
});

/* =========================================================
   5. UI HELPERS
========================================================= */
function appendMessage(role, text) {
  const div = document.createElement("div");

  if (role === "user") {
    div.className = "tool-user-msg";
    div.innerHTML = `<strong>You:</strong> ${escapeHtml(text)}`;
  } else {
    div.className = "tool-ai-msg";
    div.innerHTML = formatAIOutput(text);
    wireCopyButtons(div);
  }

  outputBox.appendChild(div);
  outputBox.scrollTop = outputBox.scrollHeight;
}

function showLoading() {
  const id = "loader-" + Date.now();
  const div = document.createElement("div");
  div.id = id;
  div.className = "loading-dots";
  div.innerHTML = "<span></span><span></span><span></span>";
  outputBox.appendChild(div);
  return id;
}

function removeLoading(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

function escapeHtml(text) {
  return text.replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;");
}

/* =========================================================
   6. CHATGPT-STYLE CODE BLOCK FORMATTER
========================================================= */
function formatAIOutput(raw) {
  if (!raw) return "";

  let text = raw;
  const blocks = [];

  text = text.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const id = blocks.length;
    blocks.push({ lang: lang || "text", code });
    return `[[CODE_${id}]]`;
  });

  text = text.replace(/^## (.*)$/gm, "<h2>$1</h2>")
             .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
             .replace(/\n/g, "<br>");

  blocks.forEach((b, i) => {
    text = text.replace(`[[CODE_${i}]]`, `
      <div class="code-block-wrapper">
        <div class="code-block-header">
          <span class="code-lang">${b.lang}</span>
          <button class="copy-btn">Copy code</button>
        </div>
        <pre><code class="language-${b.lang}">${escapeHtml(b.code)}</code></pre>
      </div>
    `);
  });

  return text;
}

function wireCopyButtons(container) {
  container.querySelectorAll(".copy-btn").forEach(btn => {
    btn.onclick = () => {
      const code = btn.parentElement.nextElementSibling.innerText;
      navigator.clipboard.writeText(code);
      btn.innerText = "Copied ✓";
      setTimeout(() => btn.innerText = "Copy code", 1200);
    };
  });
}
/* =========================================================
   7. 🎤 VOICE INPUT (ADD THIS)
========================================================= */

const micBtn = document.getElementById("voiceBtn");
const voiceStatus = document.getElementById("voiceStatus");

if ("webkitSpeechRecognition" in window && micBtn) {
  const recognition = new webkitSpeechRecognition();
  recognition.lang = "en-US"; // English only
  recognition.continuous = false;
  recognition.interimResults = false;

  micBtn.onclick = () => {
    if (isLoading) return;

    micBtn.classList.add("active");
    if (voiceStatus) voiceStatus.innerText = "Listening… 🎧";

    recognition.start();
  };

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    inputBox.value += transcript + " ";
    inputBox.focus();
  };

  recognition.onend = () => {
    micBtn.classList.remove("active");
    if (voiceStatus) voiceStatus.innerText = "";
  };

  recognition.onerror = (e) => {
    console.error("Voice error:", e);
    micBtn.classList.remove("active");
    if (voiceStatus) voiceStatus.innerText = "Voice error ❌";
  };
} else {
  // Browser not supported
  if (micBtn) micBtn.style.display = "none";
}
