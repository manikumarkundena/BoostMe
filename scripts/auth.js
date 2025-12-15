// auth.js
let currentUser = null;

async function initAuth() {
  const { data } = await supabase.auth.getSession();
  currentUser = data?.session?.user || null;
  window.currentUser = currentUser;
  renderNavbar();
}

supabase.auth.onAuthStateChange((_event, session) => {
  currentUser = session?.user || null;
  window.currentUser = currentUser;
  renderNavbar();
});

initAuth();
