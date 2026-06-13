// ================================================================
// HERITAGE NUSANTARA - Admin Orders
// Auto-refresh 15 detik, notif suara, group per meja
// ================================================================

// ── BEEP NOTIFIKASI ──────────────────────────────────────────────
function playNewOrderBeep() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        [0, 0.15, 0.30].forEach(delay => {
            const osc  = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.type      = "sine";
            osc.frequency.setValueAtTime(880, ctx.currentTime + delay);
            gain.gain.setValueAtTime(0.4, ctx.currentTime + delay);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.25);
            osc.start(ctx.currentTime + delay);
            osc.stop(ctx.currentTime + delay + 0.3);
        });
    } catch(e) {}
}

// ── LOAD & RENDER ────────────────────────────────────────────────
async function loadOrders(silent = false) {
    if (!silent) document.getElementById("orders-list").innerHTML = '<div class="loading-spin"></div>';
    const url = getAdminScriptUrl();
    if (!url) {
        document.getElementById("orders-list").innerHTML =
            '<div class="empty-msg"><div class="em-icon">⚙️</div><p>Masukkan URL Apps Script di tab <strong>Setup</strong> dulu</p></div>';
        return;
    }
    if (typeof SCRIPT_URL !== "undefined" && !SCRIPT_URL) SCRIPT_URL = url;
    try {
        const data = await fetchOrdersFromApi();
        if (data.status && data.status !== "ok") throw new Error(data.message || "Respons API tidak valid");

        const newOrders = data.orders || [];

        // Deteksi pesanan baru → mainkan beep
        const newIds = new Set(newOrders.map(o => o.id));
        let hasNew = false;
        newIds.forEach(id => { if (!lastOrderIds.has(id)) hasNew = true; });
        if (hasNew && lastOrderIds.size > 0) playNewOrderBeep();
        lastOrderIds = newIds;

        currentOrders = newOrders;

        const newCount = currentOrders.filter(o => normalizeOrderStatus(o.status) === "Baru").length;
        const badge    = document.getElementById("newOrderBadge");
        if (newCount > 0) { badge.style.display = "inline-block"; badge.textContent = newCount; }
        else               { badge.style.display = "none"; }

        renderOrders();
        document.getElementById("lastRefreshTime").textContent =
            "Terakhir diperbarui: " + new Date().toLocaleTimeString("id-ID");
    } catch (e) {
        console.error("loadOrders error:", e);
        if (!silent && currentOrders.length === 0)
            document.getElementById("orders-list").innerHTML =
                '<div class="empty-msg"><div class="em-icon">❌</div><p>Gagal memuat pesanan. Periksa URL Apps Script.</p></div>';
        else if (!silent) renderOrders();
    }
}

function filterOrders(status, btn) {
    currentFilter = status;
    document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    renderOrders();
}

// ── RENDER ORDERS GROUPED BY TABLE ──────────────────────────────
function renderOrders() {
    const list = document.getElementById("orders-list");
    let filtered = currentFilter === "semua"
        ? currentOrders
        : currentOrders.filter(o => normalizeOrderStatus(o.status) === currentFilter);

    // Filter tambahan: bayar dikasir / qris
    if (currentFilter === "kasir")
        filtered = currentOrders.filter(o => (o.paymentStatus || "").includes("Kasir"));
    if (currentFilter === "qris")
        filtered = currentOrders.filter(o => (o.paymentStatus || "").includes("QRIS") || (o.paymentStatus || "").includes("Qris"));

    if (filtered.length === 0) {
        list.innerHTML = '<div class="empty-msg"><div class="em-icon">📋</div><p>Tidak ada pesanan</p></div>';
        return;
    }

    // Group by table
    const tableGroups = {};
    filtered.forEach(order => {
        const t = order.table || "—";
        if (!tableGroups[t]) tableGroups[t] = [];
        tableGroups[t].push(order);
    });

    let html = "";
    Object.entries(tableGroups).forEach(([table, orders]) => {
        // Cek apakah ada yang belum lunas di meja ini
        const hasUnpaid = orders.some(o => o.paymentStatus !== "Lunas");
        html += `<div class="table-group">
            <div class="table-group-header">
                <span>🪑 Meja ${table}</span>
                ${hasUnpaid ? '<span class="table-unpaid-dot">Menunggu Bayar</span>' : '<span class="table-paid-dot">Lunas</span>'}
            </div>`;
        orders.forEach(order => {
            try { html += buildOrderCardHtml(order); } catch(err) { console.warn("Skip order card:", order.id, err); }
        });
        html += `</div>`;
    });

    list.innerHTML = html;
}

// ── BUILD SINGLE ORDER CARD ──────────────────────────────────────
function buildOrderCardHtml(order) {
    const safeId       = escapeJsString(order.id);
    const statusText   = normalizeOrderStatus(order.status);
    const statusClass  = statusText.toLowerCase().replace(/ /g, "");
    const badgeClass   = "badge-" + statusClass;
    const ps           = order.paymentStatus || "-";

    // Badge pembayaran
    let paymentBadge = "";
    if (ps === "Menunggu Kasir")
        paymentBadge = '<span class="order-badge badge-kasir">💰 Bayar di Kasir</span>';
    else if (ps === "Menunggu QRIS" || ps === "Menunggu Qris")
        paymentBadge = '<span class="order-badge badge-qris">📱 QRIS</span>';
    else if (ps === "Lunas")
        paymentBadge = '<span class="order-badge badge-selesai">✅ Lunas</span>';

    // Tampilkan items — catatan terpisah jika notes berbeda
    const itemsHtml = (order.items || []).map(it => `
        <div class="order-item-row">
            <span>${it.qty}× ${it.name} ${it.notes && it.notes !== "-" ? `<em class="note">(${it.notes})</em>` : ""}</span>
            <span>${fmt(it.subtotal)}</span>
            <span class="item-status-small ${getItemStatusClass(it.status)}">${getItemStatusLabel(it.status)}</span>
        </div>`).join("");

    // Tombol aksi
    const paidBtn   = ps === "Menunggu Kasir"
        ? `<button class="action-btn btn-selesai" onclick="markOrderPaid('${safeId}')">💵 Sudah Bayar</button>` : "";
    const diantarBtn = statusText !== "Diantar" && statusText !== "Selesai"
        ? `<button class="action-btn btn-diantar" onclick="updateStatus('${safeId}','Diantar')">🛵 Sudah Diantar</button>` : "";

    return `
    <div class="order-card status-${statusClass}">
        <div class="order-header">
            <div>
                <div class="order-id">${order.id}</div>
                <div class="order-meta">🕐 ${order.time}</div>
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:4px;justify-content:flex-end;">
                <span class="order-badge ${badgeClass}">${statusText}</span>
                ${paymentBadge}
            </div>
        </div>
        <div class="order-items">
            ${itemsHtml}
            <div class="order-total-row"><span>Total</span><span>${fmt(order.total)}</span></div>
        </div>
        <div class="order-actions">
            <button class="action-btn btn-proses"  onclick="updateStatus('${safeId}','Diproses')">🍳 Diproses</button>
            ${diantarBtn}
            <button class="action-btn btn-selesai" onclick="updateStatus('${safeId}','Selesai')">✅ Selesai</button>
            ${paidBtn}
            <button class="action-btn btn-hapus"   onclick="deleteOrder('${safeId}')">🗑 Hapus</button>
        </div>
    </div>`;
}

function getItemStatusLabel(s) {
    s = (s || "").toLowerCase();
    if (s === "diproses") return "🍳 Diproses";
    if (s === "diantar")  return "🛵 Diantar";
    if (s === "selesai")  return "✅ Selesai";
    return "⏳ Baru";
}
function getItemStatusClass(s) {
    s = (s || "").toLowerCase();
    if (s === "diproses") return "iss-diproses";
    if (s === "diantar")  return "iss-diantar";
    if (s === "selesai")  return "iss-selesai";
    return "iss-baru";
}

// ── ACTIONS ─────────────────────────────────────────────────────
async function updateStatus(orderId, newStatus) {
    if (!getAdminScriptUrl()) { alert("Set URL Apps Script dulu di tab Setup!"); return; }
    try {
        await updateOrderStatus(orderId, newStatus);
        const o = currentOrders.find(x => x.id === orderId);
        if (o) o.status = newStatus;
        renderOrders();
        loadStats();
    } catch (e) { alert("Gagal update status: " + e.message); }
}

async function markOrderPaid(orderId) {
    if (!getAdminScriptUrl()) { alert("URL Apps Script belum diset!"); return; }
    if (!confirm(`Tandai pesanan ${orderId} sudah dibayar di kasir?`)) return;
    try {
        const result = await markPaymentPaid(orderId);
        if (result.status === "ok") {
            const o = currentOrders.find(x => x.id === orderId);
            if (o) o.paymentStatus = "Lunas";
            renderOrders();
            showAdminToast("✅ Pembayaran dikonfirmasi!");
        } else {
            alert("❌ Gagal: " + (result.message || "Unknown error"));
        }
    } catch (e) { alert("❌ Error: " + e.message); }
}

async function deleteOrder(orderId) {
    if (!confirm(`Hapus pesanan ${orderId}?`)) return;
    if (!getAdminScriptUrl()) { alert("URL Apps Script belum diset!"); return; }
    try {
        const result = await deleteOrderFromApi(orderId);
        if (result.status === "ok") {
            currentOrders = currentOrders.filter(o => o.id !== orderId);
            renderOrders();
            loadStats();
            showAdminToast("✅ Pesanan dihapus.");
        } else { alert("❌ Gagal menghapus: " + (result.message || "Unknown error")); }
    } catch (e) { alert("❌ Error: " + e.message); }
}

function showAdminToast(msg) {
    let t = document.getElementById("adminToast");
    if (!t) {
        t = document.createElement("div");
        t.id = "adminToast";
        t.style.cssText = "position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1e293b;color:#fff;padding:10px 22px;border-radius:30px;font-size:14px;font-weight:600;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,.3);opacity:0;transition:opacity .3s;";
        document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.opacity = "1";
    setTimeout(() => { t.style.opacity = "0"; }, 2500);
}

// ── QR CODE GENERATOR ────────────────────────────────────────────
function openQrGenerator() {
    document.getElementById("qrModal").style.display = "flex";
    document.getElementById("qrTableInput").value = "";
    document.getElementById("qrResult").innerHTML = "";
}
function closeQrModal() {
    document.getElementById("qrModal").style.display = "none";
}

function generateQrCode() {
    const table = document.getElementById("qrTableInput").value.trim();
    if (!table) { showAdminToast("⚠️ Masukkan nomor meja dulu!"); return; }
    const baseUrl = window.location.origin + window.location.pathname.replace("admin.html","index.html");
    const qrUrl   = `${baseUrl}?table=${encodeURIComponent(table)}`;
    const container = document.getElementById("qrResult");
    container.innerHTML = `
        <p style="font-size:13px;color:var(--muted);margin-bottom:10px;">URL: <a href="${qrUrl}" target="_blank" style="color:var(--accent);word-break:break-all;">${qrUrl}</a></p>
        <div id="qrcode-display" style="display:flex;justify-content:center;margin:12px 0;"></div>
        <p style="font-size:12px;color:var(--muted);text-align:center;">Scan QR ini untuk Meja ${table}</p>
        <button class="add-menu-btn" style="width:100%;margin-top:10px;" onclick="printQrCode('${escapeJsString(table)}','${escapeJsString(qrUrl)}')">🖨️ Print QR Code</button>`;

    // Render QR via Google Charts API (no JS lib needed)
    const img = document.createElement("img");
    img.src   = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}`;
    img.alt   = `QR Meja ${table}`;
    img.style.cssText = "width:200px;height:200px;border-radius:12px;border:3px solid var(--accent);";
    document.getElementById("qrcode-display").appendChild(img);
}

function printQrCode(table, url) {
    const win = window.open("","_blank");
    const imgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`;
    win.document.write(`<!DOCTYPE html><html><head><title>QR Meja ${table}</title>
    <style>body{font-family:sans-serif;text-align:center;padding:40px;}h2{color:#ff5400;}img{border:3px solid #ff5400;border-radius:12px;}p{color:#64748b;font-size:14px;}</style></head>
    <body><h2>Heritage Nusantara</h2><h3>🪑 Meja ${table}</h3>
    <img src="${imgUrl}" alt="QR"><p>Scan untuk memesan</p><p style="font-size:11px;color:#94a3b8;">${url}</p>
    <script>window.onload=()=>window.print();<\/script></body></html>`);
    win.document.close();
}

// Auto refresh 15 detik
function startAutoRefresh() {
    if (autoRefreshTimer) clearInterval(autoRefreshTimer);
    autoRefreshTimer = setInterval(() => loadOrders(true), 15000);
}
