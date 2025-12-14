/* ============================
   INIT
===============================*/

const avatars = [
  "Alex", "Luna", "Maya", "Ray", "Arun",
  "Kavi", "Nia", "Esha", "Noah", "Zayn",
  "Liam", "Mila", "Ravi", "Saanvi", "Ira"
];

// Get preview element
const previewImg = document.getElementById("avatarPreview");

// Default preview
previewImg.src = `https://api.dicebear.com/7.x/notionists/svg?seed=Mawa`;


// Generate Avatar Grid
const grid = document.getElementById("avatarGrid");

avatars.forEach(name => {
    const url = `https://api.dicebear.com/7.x/notionists/svg?seed=${name}`;

    let div = document.createElement("div");
    div.className = "avatar-option";
    div.innerHTML = `<img src="${url}">`;

    div.onclick = () => {
        previewImg.src = url;
        selectedAvatar = url;
    };

    grid.appendChild(div);
});

let selectedAvatar = previewImg.src;

/* ============================
   SAVE AVATAR (Supabase)
===============================*/
async function saveAvatar() {
    const user = (await sb.auth.getUser()).data.user;

    if (!user) {
        alert("Please login first.");
        return;
    }

    const { error } = await sb.auth.updateUser({
        data: { avatar_url: selectedAvatar }
    });

    if (error) {
        alert("Error saving avatar.");
        console.log(error);
    } else {
        alert("Avatar updated!");
        window.location.href = "home.html";
    }
}
