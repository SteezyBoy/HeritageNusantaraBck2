// ================================================================
// HERITAGE NUSANTARA - Admin State
// ================================================================

let SCRIPT_URL        = localStorage.getItem(STORAGE_KEYS.adminUrl) || "";
let currentOrders     = [];
let currentFilter     = "semua";
let editingMenuIndex  = null;
let adminDark         = localStorage.getItem(STORAGE_KEYS.adminDark) === "true";
let autoRefreshTimer  = null;
let adminMenuData     = cloneDefaultMenu();
let lastOrderIds      = new Set();   // untuk deteksi pesanan baru (notif suara)
let qrModalOpen       = false;
