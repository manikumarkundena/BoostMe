/* =========================================
   BoostMe UI Manager (Modals & Toasts)
   ========================================= */

// 1. Inject HTML into page automatically
document.addEventListener("DOMContentLoaded", () => {
    // Only inject if not already there
    if (!document.getElementById("boostModal")) {
        const modalHTML = `
        <div id="boostModal" class="modal-overlay">
            <div class="custom-modal">
                <img src="../assets/images/boostme-logo.png" class="modal-logo" alt="BoostMe">
                <h3 id="modalTitle" class="modal-title">Alert</h3>
                <p id="modalMessage" class="modal-message">Message goes here...</p>
                <div id="modalActions" class="modal-actions">
                    </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }
});

// 2. Helper to Open/Close
const ui = {
    overlay: () => document.getElementById("boostModal"),
    
    close: () => {
        const el = document.getElementById("boostModal");
        if(el) el.classList.remove("active");
    },

    // 🌟 CUSTOM ALERT (Fixed Button Logic)
    alert: (title, message) => {
        return new Promise((resolve) => {
            const el = document.getElementById("boostModal");
            if (!el) return resolve(); // Safety check

            document.getElementById("modalTitle").innerText = title;
            document.getElementById("modalMessage").innerText = message;
            
            const actions = document.getElementById("modalActions");
            actions.innerHTML = ""; // Clear old buttons

            // Create button safely
            const btn = document.createElement("button");
            btn.className = "modal-btn btn-confirm";
            btn.innerText = "Got it";
            
            // ✅ THE FIX: Attach event directly
            btn.onclick = () => {
                ui.close();
                setTimeout(resolve, 300); // Wait for animation then finish
            };

            actions.appendChild(btn);
            el.classList.add("active");
        });
    },

    // 🌟 CUSTOM CONFIRM (Fixed Button Logic)
    confirm: (title, message, isDangerous = false) => {
        return new Promise((resolve) => {
            const el = document.getElementById("boostModal");
            if (!el) return resolve(false);

            document.getElementById("modalTitle").innerText = title;
            document.getElementById("modalMessage").innerText = message;
            
            const actions = document.getElementById("modalActions");
            actions.innerHTML = ""; // Clear old buttons

            // 1. Cancel Button
            const btnCancel = document.createElement("button");
            btnCancel.className = "modal-btn btn-cancel";
            btnCancel.innerText = "Cancel";
            btnCancel.onclick = () => {
                ui.close();
                resolve(false);
            };

            // 2. Confirm Button
            const btnConfirm = document.createElement("button");
            btnConfirm.className = isDangerous ? "modal-btn btn-danger" : "modal-btn btn-confirm";
            btnConfirm.innerText = isDangerous ? "Yes, Delete" : "Yes, Continue";
            btnConfirm.onclick = () => {
                ui.close();
                resolve(true);
            };

            actions.appendChild(btnCancel);
            actions.appendChild(btnConfirm);
            
            el.classList.add("active");
        });
    }
};

// Make it global
window.ui = ui;