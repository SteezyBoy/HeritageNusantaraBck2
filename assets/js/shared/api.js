// ================================================================
// HERITAGE NUSANTARA - Shared API (Google Apps Script)
// ================================================================

function resolveScriptUrl() {
    if (typeof SCRIPT_URL !== "undefined" && SCRIPT_URL) return SCRIPT_URL;
    return getAppsScriptUrl();
}

function getAdminScriptUrl() {
    return resolveScriptUrl();
}

async function apiGet(action, params = {}) {
    const url = new URL(resolveScriptUrl());
    url.searchParams.set("action", action);
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
    const res = await fetch(url.toString());
    return res.json();
}

async function apiPost(payload) {
    const res = await fetch(resolveScriptUrl(), {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(payload)
    });
    return res.json();
}

async function fetchMenuFromApi()            { return apiGet("getMenu"); }
async function fetchOrderById(orderId)       { return apiGet("getOrderById", { id: orderId }); }
async function submitNewOrder(orderData)     { return apiPost({ action: "newOrder", ...orderData }); }
async function addItemsToOrder(orderData)    { return apiPost({ action: "addItemsToOrder", ...orderData }); }
async function fetchOrdersFromApi()          { return apiGet("getOrders"); }
async function fetchStatsFromApi()           { return apiGet("getStats"); }
async function updateOrderStatus(orderId, newStatus) { return apiPost({ action: "updateStatus", orderId, newStatus }); }
async function deleteOrderFromApi(orderId)   { return apiPost({ action: "deleteOrder", orderId }); }
async function syncMenuToApi(menuItems)      { return apiPost({ action: "updateMenu", menu: menuItems }); }
async function setPaymentMethodCashier(orderId) { return apiPost({ action: "setPaymentMethod", orderId, method: "kasir" }); }
async function setPaymentMethodQris(orderId)    { return apiPost({ action: "setPaymentMethod", orderId, method: "qris" }); }
async function markPaymentPaid(orderId)      { return apiPost({ action: "markPaymentPaid", orderId }); }
async function getActiveOrderByTable(table)  { return apiGet("getActiveOrderByTable", { table }); }
async function generateTableQr(table)        { return apiPost({ action: "generateTableQr", table }); }
