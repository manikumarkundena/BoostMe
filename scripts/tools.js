console.log("Tools page ready 🚀");

/* =========================================================
   STATE MANAGEMENT
========================================================= */
let selectedTool = "";
let conversationHistory = []; // Stores the chat context for the active tool
let isLoading = false;
let typingInterval = null; // For the typing sound effect

const outputBox = document.getElementById("toolOutput");
const inputBox = document.getElementById("toolInput");
const runBtn = document.getElementById("runToolBtn");
const toolTitleEl = document.getElementById("toolTitle");
const toolHintEl = document.querySelector(".tool-hint");

/* =========================================================
   1. SYSTEM PROMPTS (Improved)
========================================================= */
const BASE_SYSTEM_PROMPT = `
You are "BoostMe Tools", an elite AI assistant.

CORE BEHAVIOR:
- **Language Agnostic:** Detect the user's language (Telugu, Hindi, English, etc.) and reply in the EXACT same language/tone.
- **Formatting:** Use Markdown (## headings, **bold**, - lists).
- **Code:** MUST be in fenced blocks like \`\`\`js ... \`\`\`.
- **Style:** Concise, direct, helpful, and friendly ("Mawa" vibes if appropriate).
`;

const TOOL_DEFINITIONS = {
  planner: "You are an expert Day Planner. Create structured schedules with time blocks, emojis, and focus sessions.",
  writer: "You are a Creative Writer. Help draft emails, captions, poems, or essays. Offer 2 variations (Formal vs Creative).",
  study: "You are a Study Buddy. Explain complex topics simply. Use analogies, bullet points, and offer a 3-question mini-quiz at the end.",
  ideas: "You are an Idea Generator. Brainstorm unique, high-value ideas for the user's topic. Be trendy and innovative.",
  dev: "You are a Senior Developer. Debug code, explain errors, and provide optimized, clean solutions in code blocks."
};

const PLACEHOLDERS = {
  planner: "e.g., I have a math exam tomorrow and want to study 4 hours...",
  writer: "e.g., Write a LinkedIn post about my new project...",
  study: "e.g., Explain Quantum Physics like I'm 5...",
  ideas: "e.g., YouTube channel ideas for cooking...",
  dev: "Paste your broken code here..."
};

/* =========================================================
   2. TOOL SELECTION LOGIC
========================================================= */
document.querySelectorAll(".tool-card").forEach(card => {
  card.addEventListener("click", () => {
    const newTool = card.dataset.tool;

    // 🔊 Sound Effect
    if (window.synth) window.synth.click();

    // If switching to a new tool, reset everything
    if (selectedTool !== newTool) {
      selectedTool = newTool;
      resetToolState();
    }

    // Update UI Active State
    document.querySelectorAll(".tool-card").forEach(c => c.classList.remove("active-tool"));
    card.classList.add("active-tool");

    // Update Titles & Hints
    const titleText = card.querySelector(".tool-title").innerText;
    toolTitleEl.innerText = titleText;
    toolHintEl.innerText = "Mode Active. Type below to start.";
    inputBox.placeholder = PLACEHOLDERS[selectedTool];

    // Scroll to panel & Focus input
    const panel = document.querySelector(".tool-panel");
    panel.scrollIntoView({ behavior: "smooth" });

    setTimeout(() => inputBox.focus(), 500);
  });
});

function resetToolState() {
  conversationHistory = []; // Clear memory
  outputBox.innerHTML = ""; // Clear screen
  inputBox.value = "";

  if (selectedTool && TOOL_DEFINITIONS[selectedTool]) {
    conversationHistory.push({
      role: "system",
      content: BASE_SYSTEM_PROMPT + "\n\nCURRENT ROLE: " +
               TOOL_DEFINITIONS[selectedTool]
    });
  }
}

/* =========================================================
   3. AI CALL (NOW USING BACKEND)
========================================================= */

const BACKEND_URL = "http://localhost:3000/api/chat";
async function callAI(messagesArray) {
  try {
    const res = await fetch(BACKEND_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: messagesArray })
    });

    const data = await res.json();

    // Backend error
    if (data.error) {
      return "⚠️ API Error: " + data.error;
    }

    // GROQ FORMAT: choices[0].message.content
    if (data?.choices?.[0]?.message?.content) {
      return data.choices[0].message.content;
    }

    // Simple content: { content: "..." }
    if (typeof data?.content === "string") {
      return data.content;
    }

    // Array format: { content: [ { text: "..." }, ... ] }
    if (Array.isArray(data?.content)) {
      return data.content.map(c => c.text || "").join("\n").trim();
    }

    return "⚠️ No AI response received.";
  } catch (e) {
    console.error("AI Call Error:", e);
    return "⚠️ Network Error. Backend not running?";
  }
}

/* =========================================================
   4. RUN TOOL HANDLER
========================================================= */
async function handleRunTool() {
  if (isLoading) return;

  if (!selectedTool) {
    alert("Please select a tool first!");
    return;
  }

  const userInput = inputBox.value.trim();
  if (!userInput) return;

  if (window.synth) window.synth.click();

  isLoading = true;
  runBtn.innerHTML = `<i data-lucide="loader-2" class="spin"></i> Thinking...`;
  runBtn.style.opacity = "0.7";

  conversationHistory.push({ role: "user", content: userInput });
  appendMessage("user", userInput);
  inputBox.value = "";

  const loadingId = showLoading();

  if (window.synth) {
    typingInterval = setInterval(() => window.synth.typing(), 150);
  }

  const aiResponse = await callAI(conversationHistory);

  if (typingInterval) {
    clearInterval(typingInterval);
    typingInterval = null;
  }

  removeLoading(loadingId);
  isLoading = false;
  runBtn.innerHTML = `Run <i data-lucide="sparkles"></i>`;
  runBtn.style.opacity = "1";

  conversationHistory.push({ role: "assistant", content: aiResponse });
  appendMessage("ai", aiResponse);

  if (window.synth) window.synth.success();

  if (window.lucide) lucide.createIcons();
}

runBtn.addEventListener("click", handleRunTool);

/* =========================================================
   ⌨️ ENTER KEY LISTENER
========================================================= */
inputBox.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    handleRunTool();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    e.preventDefault();
    handleRunTool();
  }
});

/* =========================================================
   💾 AUTO-SAVE INPUT
========================================================= */
const savedInput = localStorage.getItem("tool_autosave_input");
if (savedInput) inputBox.value = savedInput;

inputBox.addEventListener("input", (e) => {
  localStorage.setItem("tool_autosave_input", e.target.value);
});

/* =========================================================
   5. UI HELPERS
========================================================= */
function appendMessage(role, text) {
  const div = document.createElement("div");

  if (role === "user") {
    div.className = "tool-user-msg";
    div.innerHTML = `<strong>You</strong> ${escapeHtml(text)}`;
  } else {
    div.className = "tool-ai-msg";
    div.innerHTML = formatAIOutput(text);

    if (window.Prism) Prism.highlightAllUnder(div);
    wireCopyButtons(div);
  }

  outputBox.appendChild(div);

  requestAnimationFrame(() => {
    outputBox.scrollTop = outputBox.scrollHeight;
  });
}

function showLoading() {
  const id = "loader-" + Date.now();
  const div = document.createElement("div");
  div.id = id;
  div.className = "loading-dots";
  div.style.padding = "10px";
  div.innerHTML = `<span></span><span></span><span></span>`;
  outputBox.appendChild(div);
  outputBox.scrollTop = outputBox.scrollHeight;
  return id;
}

function removeLoading(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/* =========================================================
   6. FORMATTER & UTILS
========================================================= */
function formatAIOutput(raw) {
  if (!raw) return "";
  let text = raw;

  const codeBlocks = [];
  text = text.replace(/```(\w*)\n([\s\S]*?)```/g, (m, lang, code) => {
    const index = codeBlocks.length;
    codeBlocks.push({ lang: lang || "plaintext", code });
    return `[[CODE_${index}]]`;
  });

  text = text.replace(/^### (.*)$/gm, "<h3>$1</h3>");
  text = text.replace(/^## (.*)$/gm, "<h2>$1</h2>");
  text = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/^- (.*)$/gm, "<li>$1</li>");
  text = text.replace(/(<li>[\s\S]*?<\/li>)/g, "<ul>$1</ul>");
  text = text.replace(/\n/g, "<br>");

  codeBlocks.forEach((b, i) => {
    const html = `
      <div class="code-block-wrapper">
        <button class="copy-btn">Copy</button>
        <pre><code class="language-${b.lang}">${escapeHtml(b.code)}</code></pre>
      </div>
    `;
    text = text.replace(`[[CODE_${i}]]`, html);
  });

  return text;
}

function wireCopyButtons(container) {
  container.querySelectorAll(".copy-btn").forEach(btn => {
    btn.onclick = () => {
      if (window.synth) window.synth.click();

      const codeBlock = btn.parentElement.querySelector("code");
      if (codeBlock) {
        const code = codeBlock.innerText;
        navigator.clipboard.writeText(code);
        btn.innerText = "Copied!";
        setTimeout(() => (btn.innerText = "Copy"), 1200);
      }
    };
  });
}

/* =========================================================
   7. VOICE INPUT LOGIC
========================================================= */
const micBtn = document.getElementById("voiceBtn");
const voiceStatus = document.getElementById("voiceStatus");

if ("webkitSpeechRecognition" in window) {
  const recognition = new webkitSpeechRecognition();
  recognition.lang = "en-US";
  recognition.continuous = false;

  micBtn.onclick = () => {
    if (isLoading) return;

    if (window.synth) window.synth.click();

    recognition.start();
    micBtn.classList.add("active");
    if (voiceStatus) voiceStatus.innerText = "Listening...";
  };

  recognition.onresult = (e) => {
    const txt = e.results[0][0].transcript;
    inputBox.value += txt + " ";
    localStorage.setItem("tool_autosave_input", inputBox.value);
    inputBox.focus();
  };

  recognition.onend = () => {
    micBtn.classList.remove("active");
    if (voiceStatus) voiceStatus.innerText = "";
  };
} else {
  if (micBtn) micBtn.style.display = "none";
}
