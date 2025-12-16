console.log("Tools page ready 🚀");

/* =========================================================
   STATE MANAGEMENT
========================================================= */
let selectedTool = "";
let conversationHistory = [];
let isLoading = false;

const outputBox = document.getElementById("toolOutput");
const inputBox = document.getElementById("toolInput");
const runBtn = document.getElementById("runToolBtn");
const toolTitleEl = document.getElementById("toolTitle");
const toolHintEl = document.querySelector(".tool-hint");

// History Modal Elements (Assumed to exist per requirements)
const historyBtn = document.getElementById("toolHistoryBtn");
const historyModal = document.getElementById("toolHistoryModal");
const historyList = document.getElementById("toolHistoryList");
const closeHistoryBtn = document.getElementById("closeHistoryBtn"); // Assuming a close button exists inside modal

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
   2. SUPABASE HISTORY INTEGRATION (NEW)
========================================================= */

/**
 * Saves the tool usage to Supabase `tool_history` table.
 * Designed to be "Fire and Forget" to not block UI.
 */
async function saveToolEntry(tool, input, output) {
  // Guard clause: Ensure user is logged in and sb client exists
  if (!window.sb || !window.currentUser) {
    console.warn("Cannot save history: User not logged in or Supabase not initialized.");
    return;
  }

  try {
    const { error } = await window.sb.from('tool_history').insert({
      user_id: window.currentUser.id,
      tool: tool,
      input_text: input,
      output_text: output,
      meta: { page: "tools", version: "v1" } // metadata
    });

    if (error) throw error;
    console.log("✅ Tool history saved.");
  } catch (err) {
    console.error("❌ Error saving tool history:", err.message);
  }
}

/**
 * Loads history for the current user.
 * Orders by newest first.
 */
async function loadToolHistory() {
  if (!window.sb || !window.currentUser) return [];

  try {
    const { data, error } = await window.sb
      .from('tool_history')
      .select('*')
      .eq('user_id', window.currentUser.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    console.log("📂 History loaded:", data);
    return data; // Return data for the UI renderer
  } catch (err) {
    console.error("❌ Error loading history:", err.message);
    return [];
  }
}

/* =========================================================
   3. TOOL SELECTION
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
   4. BACKEND AI CALL
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
   5. RUN TOOL (MODIFIED)
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

  // --- SAVE HISTORY (NEW) ---
  // We do not await this, so UI stays snappy
  saveToolEntry(selectedTool, text, reply);

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
   6. UI HELPERS
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
   7. CHATGPT-STYLE CODE BLOCK FORMATTER
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
   8. HISTORY MODAL LOGIC (NEW)
========================================================= */

// Event Listeners for Modal
if (historyBtn) {
  historyBtn.onclick = openToolHistory;
}
if (closeHistoryBtn) {
  closeHistoryBtn.onclick = closeToolHistory;
}
// Close on outside click
window.addEventListener("click", (e) => {
  if (e.target === historyModal) closeToolHistory();
});

async function openToolHistory() {
  if (!historyModal) return;
  historyModal.style.display = "block"; // Or add a class .show
  
  if (historyList) {
    historyList.innerHTML = "<p>Loading history...</p>";
    const historyData = await loadToolHistory();
    renderHistoryList(historyData);
  }
}

function closeToolHistory() {
  if (!historyModal) return;
  historyModal.style.display = "none";
}

function renderHistoryList(data) {
  if (!historyList) return;
  historyList.innerHTML = "";

  if (!data || data.length === 0) {
    historyList.innerHTML = "<p>No history found yet.</p>";
    return;
  }

  // Group by date logic (Today, Yesterday, Older)
  const grouped = { Today: [], Yesterday: [], Older: [] };
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  data.forEach(item => {
    const itemDate = new Date(item.created_at).toDateString();
    if (itemDate === today) grouped.Today.push(item);
    else if (itemDate === yesterday) grouped.Yesterday.push(item);
    else grouped.Older.push(item);
  });

  // Render Logic
  Object.keys(grouped).forEach(key => {
    if (grouped[key].length > 0) {
      const header = document.createElement("h4");
      header.innerText = key;
      header.className = "history-date-header";
      historyList.appendChild(header);

      grouped[key].forEach(item => {
        const div = document.createElement("div");
        div.className = "history-item";
        // Create a summary snippet
        div.innerHTML = `
          <span class="history-tool-badge">${item.tool}</span>
          <span class="history-query">${escapeHtml(item.input_text.substring(0, 40))}...</span>
        `;
        div.onclick = () => loadHistoryItemToView(item);
        historyList.appendChild(div);
      });
    }
  });
}

/**
 * Optional: Clicking a history item re-displays it in the main view
 * This is a bonus UX improvement
 */
function loadHistoryItemToView(item) {
  // Switch to the correct tool context
  if (selectedTool !== item.tool) {
    // Ideally select the tool card, but here we just set state
    selectedTool = item.tool;
    // Note: We might want to trigger the UI click here in a full implementation
  }

  closeToolHistory();
  outputBox.innerHTML = ""; // Clear current view
  
  // Re-inject history into view
  appendMessage("user", item.input_text);
  appendMessage("ai", item.output_text);
  
  // Update system context
  conversationHistory = [
    { role: "system", content: BASE_SYSTEM_PROMPT + "\n\nCURRENT ROLE:\n" + TOOL_DEFINITIONS[item.tool] },
    { role: "user", content: item.input_text },
    { role: "assistant", content: item.output_text }
  ];
  
  if (window.Prism) Prism.highlightAll();
}

/* =========================================================
   9. 🎤 VOICE INPUT
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
const clearToolHistoryBtn = document.getElementById("clearToolHistoryBtn");

if (clearToolHistoryBtn) {
  clearToolHistoryBtn.onclick = async () => {
    if (!window.currentUser) return;

    const ok = confirm("Clear ALL tool history? This cannot be undone.");
    if (!ok) return;

    try {
      const { error } = await sb
        .from("tool_history")
        .delete()
        .eq("user_id", window.currentUser.id);

      if (error) throw error;

      historyList.innerHTML = "<p>History cleared 🧹</p>";
      console.log("🧹 Tool history cleared");
    } catch (e) {
      alert("Failed to clear history");
      console.error(e);
    }
  };
}

