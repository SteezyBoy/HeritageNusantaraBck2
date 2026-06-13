// ================================================================
// HERITAGE NUSANTARA - User Order & Status Monitor
// ================================================================

async function sendOrderAndMonitor() {
    if (!tableNumber) {
        showShareToast("❌ Nomor meja tidak ditemukan. Scan ulang QR code meja Anda.");
        return;
    }
    if (cart.length === 0) {
        showShareToast("Cart is empty!");
        return;
    }

    const sendBtn = document.querySelector("#order-summary-screen .send-order-btn");
    if (sendBtn) { sendBtn.innerText = "⏳ Mengirim..."; sendBtn.disabled = true; }

    try {
        // Cek apakah meja sudah punya order aktif (belum bayar) → tambahkan ke sana
        let result;
        const activeCheck = await getActiveOrderByTable(tableNumber);
        if (activeCheck.status === "ok" && activeCheck.orderId) {
            // Tambahkan ke order yang sudah ada
            result = await addItemsToOrder({
                orderId: activeCheck.orderId,
                tableNumber: tableNumber,
                items: cart.map(item => ({
                    name:  item.name,
                    qty:   item.quantity,
                    price: item.price,
                    notes: item.notes || ""
                }))
            });
            if (result.status === "ok") result.orderId = activeCheck.orderId;
        } else {
            // Buat order baru
            result = await submitNewOrder({
                tableNumber: tableNumber,
                items: cart.map(item => ({
                    name:  item.name,
                    qty:   item.quantity,
                    price: item.price,
                    notes: item.notes || ""
                }))
            });
        }

        if (result.status === "ok") {
            activeOrderId = result.orderId;
            localStorage.setItem(STORAGE_KEYS.activeOrderId, activeOrderId);
            cart = [];
            updateCartBadge();
            const statusFab = document.getElementById("orderStatusFab");
            if (statusFab) statusFab.style.display = "flex";
            closeCart();
            setTimeout(() => openOrderStatus(), 400);
            showSuccessPopup("✅ Pesanan dikirim! Mohon tunggu.");
        } else {
            showShareToast("Gagal mengirim pesanan. Coba lagi.");
        }
    } catch (err) {
        console.error(err);
        showShareToast("Network error. Coba lagi.");
    } finally {
        if (sendBtn) { sendBtn.innerText = "✅ Send Order"; sendBtn.disabled = false; }
    }
}

// ── ORDER STATUS SCREEN ──────────────────────────────────────────
async function openOrderStatus() {
    if (!activeOrderId) {
        showShareToast("Tidak ada pesanan aktif.");
        return;
    }
    if (monitorInterval) clearInterval(monitorInterval);
    _showScreen("order-status-screen");
    document.getElementById("cartModal").style.display = "block";
    await loadOrderStatus();
    monitorInterval = setInterval(() => {
        if (activeOrderId) loadOrderStatus();
        else clearInterval(monitorInterval);
    }, 5000);
}

async function loadOrderStatus() {
    if (!activeOrderId) return;
    try {
        const data  = await fetchOrderById(activeOrderId);
        const order = data.order;
        const container = document.getElementById("status-items-list");
        const totalEl   = document.getElementById("status-total");
        const headerEl  = document.getElementById("status-order-id");
        if (!order || !order.items || order.items.length === 0) {
            if (container) container.innerHTML = '<div class="empty-msg">Pesanan tidak ditemukan.</div>';
            return;
        }
        if (headerEl) headerEl.innerHTML = `Order ID: <strong>${order.id}</strong> &nbsp;•&nbsp; 🪑 Meja ${order.table || tableNumber}`;
        if (totalEl)  totalEl.innerHTML  = formatPrice(order.total);

        let html = "";
        order.items.forEach(item => {
            let statusText  = "⏳ Mohon Tunggu";
            let statusClass = "status-waiting";
            const s = (item.status || "").toLowerCase();
            if (s === "diproses")     { statusText = "🍳 Sedang Diproses"; statusClass = "status-diproses"; }
            else if (s === "diantar") { statusText = "🛵 Pesanan Sudah Diantar"; statusClass = "status-diantar"; }
            else if (s === "selesai") { statusText = "✅ Selesai"; statusClass = "status-selesai"; }
            html += `
            <div class="status-item-row">
                <div class="status-item-info">
                    <span class="status-item-qty">${item.qty}×</span>
                    <span class="status-item-name">${item.name}</span>
                    ${item.notes && item.notes !== "-" ? `<span class="status-item-note">📝 ${item.notes}</span>` : ""}
                </div>
                <div class="status-item-right">
                    <span class="status-item-price">${formatPrice(item.subtotal)}</span>
                    <span class="item-status-badge ${statusClass}">${statusText}</span>
                </div>
            </div>`;
        });
        if (container) container.innerHTML = html;

        // Tampilkan tombol bayar jika semua sudah diantar/selesai
        const allDone = order.items.every(i => ["diantar","selesai"].includes((i.status||"").toLowerCase()));
        const payBtn  = document.getElementById("statusPayBtn");
        if (payBtn) payBtn.style.display = allDone ? "block" : "none";

    } catch (err) {
        console.error("Gagal load status:", err);
    }
}

function closeOrderStatus() {
    if (monitorInterval) clearInterval(monitorInterval);
    stopCashierPaymentPoll();
    document.getElementById("cartModal").style.display = "none";
}

// ── PAYMENT FLOW ─────────────────────────────────────────────────
function showPaymentOptions() {
    if (!activeOrderId) { showShareToast("No active order."); return; }
    document.getElementById("paymentChoiceModal").style.display = "flex";
}

function closePaymentChoiceModal() {
    document.getElementById("paymentChoiceModal").style.display = "none";
}

async function payWithQRIS() {
    closePaymentChoiceModal();
    try { await setPaymentMethodQris(activeOrderId); } catch(e) {}
    _showScreen("payment-screen");
    document.getElementById("cartModal").style.display = "block";
    stopCashierPaymentPoll();
    const data = await fetchOrderById(activeOrderId).catch(()=>({order:null}));
    const total = data.order ? formatPrice(data.order.total) : "—";
    document.getElementById("payTotalInfo").innerHTML  = `💰 Total: <strong>${total}</strong>`;
    document.getElementById("payTableInfo").innerHTML  = `🪑 Meja: <strong>${tableNumber || "—"}</strong>`;
    const now = new Date();
    document.getElementById("payTimeInfo").innerHTML   = `🕐 ${now.toLocaleString("id-ID",{dateStyle:"medium",timeStyle:"short"})}`;
    document.getElementById("payOrderId").innerHTML    = `Order ID: ${activeOrderId}`;
}

async function payWithCashier() {
    closePaymentChoiceModal();
    if (!activeOrderId) return;
    try {
        const result = await setPaymentMethodCashier(activeOrderId);
        if (result.status !== "ok") { showShareToast("Gagal memproses pembayaran kasir."); return; }
        openCashierWaitScreen();
        startCashierPaymentPoll();
    } catch (err) {
        console.error(err);
        showShareToast("Network error. Coba lagi.");
    }
}

function openCashierWaitScreen() {
    if (monitorInterval) clearInterval(monitorInterval);
    _showScreen("cashier-wait-screen");
    document.getElementById("cartModal").style.display = "block";
    document.getElementById("cashierWaitOrderId").innerHTML = `Order ID: ${activeOrderId}`;
    document.getElementById("cashierWaitStatus").innerHTML  = "⏳ Menunggu konfirmasi pembayaran dari kasir...";
    fetchOrderById(activeOrderId).then(data => {
        if (data.order && data.order.total)
            document.getElementById("cashierWaitTotal").innerHTML = formatPrice(data.order.total);
    }).catch(()=>{});
}

function startCashierPaymentPoll() {
    stopCashierPaymentPoll();
    checkCashierPaymentStatus();
    cashierPollInterval = setInterval(checkCashierPaymentStatus, 3000);
}
function stopCashierPaymentPoll() {
    if (cashierPollInterval) { clearInterval(cashierPollInterval); cashierPollInterval = null; }
}

async function checkCashierPaymentStatus() {
    if (!activeOrderId) return;
    try {
        const data  = await fetchOrderById(activeOrderId);
        const order = data.order;
        if (!order) return;
        if (order.paymentStatus === "Lunas") {
            stopCashierPaymentPoll();
            document.getElementById("cashierWaitStatus").innerHTML = "✅ Pembayaran dikonfirmasi!";
            finalizePaymentAndClose();
        }
    } catch (err) { console.error("Gagal cek status pembayaran:", err); }
}

function finalizePaymentAndClose() {
    stopCashierPaymentPoll();
    clearTableSession();
    activeOrderId = null;
    const fab = document.getElementById("orderStatusFab");
    if (fab) fab.style.display = "none";
    _showScreen("cart-screen");
    document.getElementById("cartModal").style.display = "none";
    showSuccessPopup("✅ Pembayaran berhasil! Terima kasih.");
    setTimeout(() => location.reload(), 1800);
}

function backToOrderStatus() {
    _showScreen("order-status-screen");
}

// ── HELPER ───────────────────────────────────────────────────────
function _showScreen(id) {
    ["cart-screen","order-summary-screen","payment-screen",
     "cashier-wait-screen","order-status-screen"].forEach(s => {
        const el = document.getElementById(s);
        if (el) el.style.display = (s === id) ? "block" : "none";
    });
}

async function resumeActiveOrderIfNeeded() {
    if (!activeOrderId) return;
    try {
        const data  = await fetchOrderById(activeOrderId);
        const order = data.order;
        if (!order) { activeOrderId = null; localStorage.removeItem(STORAGE_KEYS.activeOrderId); return; }
        document.getElementById("orderStatusFab").style.display = "flex";
        if (order.paymentStatus === "Menunggu Kasir") {
            openCashierWaitScreen();
            startCashierPaymentPoll();
        }
    } catch(e) { console.warn("resumeActiveOrderIfNeeded:", e); }
}
