// ================================================================
// HERITAGE NUSANTARA - User State
// ================================================================

let currentCategory     = "all";
let currentItem         = null;
let cart                = [];           // [{name,price,qty,notes,...}] — notes berbeda = entri terpisah
let currentSearchKeyword = "";
let quickAddItem        = null;
let quickQty            = 1;
let isDarkMode          = localStorage.getItem(STORAGE_KEYS.darkMode) === "true";
let menuData            = { makanan: [], minuman: [], dessert: [] };
let activeOrderId       = localStorage.getItem(STORAGE_KEYS.activeOrderId) || null;
let tableNumber         = "";           // di-set oleh init dari URL param
let monitorInterval     = null;
let cashierPollInterval = null;
