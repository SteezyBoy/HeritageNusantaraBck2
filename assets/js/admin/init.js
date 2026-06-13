// ================================================================
// HERITAGE NUSANTARA - Admin Init
// ================================================================

function toggleAdminDark() {
    adminDark = !adminDark;
    localStorage.setItem(STORAGE_KEYS.adminDark, adminDark);
    applyAdminDark();
}

function applyAdminDark() {
    document.documentElement.setAttribute("data-theme", adminDark ? "dark" : "light");
}

function switchTab(name, btn) {
    document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.getElementById("panel-" + name).classList.add("active");
    btn.classList.add("active");
    if (name === "menu")   renderAdminMenu();
    if (name === "stats")  loadStats();
    if (name === "qr")     { /* QR panel active */ }
}

function saveSetup() {
    const url = document.getElementById("setupUrl").value.trim();
    SCRIPT_URL = url;
    localStorage.setItem(STORAGE_KEYS.adminUrl, url);
    document.getElementById("setupStatus").innerHTML =
        '<span style="color:var(--green)">✅ URL berhasil disimpan!</span>';
    setTimeout(() => { document.getElementById("setupStatus").textContent = ""; loadOrders(); loadStats(); }, 1500);
}

document.addEventListener("DOMContentLoaded", () => {
    applyAdminDark();
    if (!SCRIPT_URL) SCRIPT_URL = getAppsScriptUrl();
    if (localStorage.getItem(STORAGE_KEYS.adminSession) === "ok") showAdmin();
    if (SCRIPT_URL) document.getElementById("setupUrl").value = SCRIPT_URL;

    document.getElementById("menuModal").addEventListener("click", function(e) {
        if (e.target === this) closeMenuModal();
    });
    const qrModal = document.getElementById("qrModal");
    if (qrModal) qrModal.addEventListener("click", function(e) {
        if (e.target === this) closeQrModal();
    });
});
