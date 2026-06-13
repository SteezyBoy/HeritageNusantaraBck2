// ================================================================
// HERITAGE NUSANTARA - Shared Utilities
// ================================================================

function formatPrice(price) {
    return "Rp " + Number(price).toLocaleString("id-ID");
}

const fmt = formatPrice;

function cloneDefaultMenu() {
    return JSON.parse(JSON.stringify(DEFAULT_MENU_DATA));
}

function normalizeOrderStatus(status) {
    return String(status || "Baru").trim();
}

function escapeJsString(value) {
    return String(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}
