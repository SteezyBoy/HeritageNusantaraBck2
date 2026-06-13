// ================================================================
// HERITAGE NUSANTARA - User Init
// ================================================================

function toggleDarkMode() {
    isDarkMode = !isDarkMode;
    localStorage.setItem(STORAGE_KEYS.darkMode, isDarkMode);
    applyDarkMode();
}

function applyDarkMode() {
    document.documentElement.setAttribute("data-theme", isDarkMode ? "dark" : "light");
    const icon = document.getElementById("darkmodeIcon");
    if (icon) icon.textContent = isDarkMode ? "☀️" : "🌙";
}

document.addEventListener("DOMContentLoaded", async () => {
    applyDarkMode();

    // Ambil nomor meja dari URL param
    tableNumber = getTableNumber();

    // Tampilkan nomor meja di header
    const tableDisplay = document.getElementById("tableDisplay");
    if (tableDisplay) {
        tableDisplay.textContent = tableNumber ? `🪑 Meja ${tableNumber}` : "";
        tableDisplay.style.display = tableNumber ? "block" : "none";
    }

    showSkeletonLoading();
    await loadMenuFromSheet();
    renderMenu();

    // Resume active order jika ada
    if (activeOrderId) {
        await resumeActiveOrderIfNeeded();
    } else {
        const fab = document.getElementById("orderStatusFab");
        if (fab) fab.style.display = "none";
    }
});

window.onclick = function(event) {
    const modal              = document.getElementById("modal");
    const cartModal          = document.getElementById("cartModal");
    const quickModal         = document.getElementById("quickAddModal");
    const paymentChoiceModal = document.getElementById("paymentChoiceModal");
    if (event.target === modal)              closeModal();
    if (event.target === cartModal)          closeCart();
    if (event.target === quickModal)         closeQuickAddModal();
    if (event.target === paymentChoiceModal) closePaymentChoiceModal();
};
