// ================================================================
// HERITAGE NUSANTARA - Admin Stats
// ================================================================

async function loadStats() {
    if (!getAdminScriptUrl()) return;
    try {
        const data = await fetchStatsFromApi();
        const s = data.stats || {};
        document.getElementById("statTotalOrders").textContent = s.totalOrders || 0;
        document.getElementById("statTotalRevenue").textContent = s.totalRevenue ? fmt(s.totalRevenue) : "Rp 0";
        document.getElementById("statTodayOrders").textContent = s.todayOrders || 0;
        document.getElementById("statTodayRevenue").textContent = s.todayRevenue ? fmt(s.todayRevenue) : "Rp 0";

        const topHtml = (s.topItems || []).map((it, i) => `
            <div class="top-item">
                <span class="top-item-name">${i + 1}. ${it.name}</span>
                <span class="top-item-qty">${it.qty}× terjual</span>
            </div>`).join("") || '<div style="color:var(--muted);font-size:14px;">Belum ada data</div>';
        document.getElementById("topItemsList").innerHTML = topHtml;
        document.getElementById("statsSummary").innerHTML =
            `Total pesanan masuk: <strong>${s.totalOrders || 0}</strong><br>
             Pendapatan total: <strong>${s.totalRevenue ? fmt(s.totalRevenue) : "Rp 0"}</strong><br>
             Pesanan hari ini: <strong>${s.todayOrders || 0}</strong>`;
    } catch (e) {
        document.getElementById("statsSummary").textContent = "Gagal memuat statistik.";
    }
}
