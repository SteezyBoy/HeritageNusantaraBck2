// ================================================================
// HERITAGE NUSANTARA - User Payment (stub — logic moved to order.js)
// ================================================================

// Semua logic payment sudah dikonsolidasikan ke order.js
// File ini dipertahankan agar tidak ada broken import

function closeCashierWaitScreen() {
    stopCashierPaymentPoll();
    document.getElementById("cashier-wait-screen").style.display = "none";
    document.getElementById("cartModal").style.display = "none";
}
