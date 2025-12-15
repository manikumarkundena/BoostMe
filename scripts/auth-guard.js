// 🔐 Auth Guard
if (typeof window !== "undefined") {
  setTimeout(() => {
    if (!window.currentUser) {
      window.location.href = "login.html";
    }
  }, 300);
}
