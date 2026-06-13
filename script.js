// DEPRECATED: File ini sudah dipindah ke assets/js/user/ dan assets/js/shared/
// Gunakan index.html yang memuat modul JS terbaru.

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzAyM2D8f8-aWReFLBNNtbTG_gqq5Opl8VkhYchs_HqAYfOwabtz0zcdqL7JRxjxUex6Q/exec";

let currentCategory = "all";
let currentItem = null;
let cart = [];
let favorites = JSON.parse(localStorage.getItem("hn_favorites") || "[]");
let currentSearchKeyword = "";
let quickAddItem = null;
let quickQty = 1;
let isDarkMode = localStorage.getItem("hn_darkmode") === "true";
let menuData = { makanan: [], minuman: [], dessert: [] };

let activeOrderId = localStorage.getItem("hn_active_order_id") || null;
let monitorInterval = null;

// ==================== INIT ====================
document.addEventListener("DOMContentLoaded", async () => {
    applyDarkMode();
    showSkeletonLoading();
    await loadMenuFromSheet();
    renderMenu();
    if (activeOrderId) {
        document.getElementById("billFabBtn").style.display = "flex";
    } else {
        document.getElementById("billFabBtn").style.display = "none";
    }
    
    // Pasang event listener untuk tombol Close Bill and Payment (pastikan tidak double)
    const closeBillBtn = document.getElementById("closeBillBtn");
    if (closeBillBtn) {
        // Hapus event listener lama jika ada (dengan clone & replace)
        const newBtn = closeBillBtn.cloneNode(true);
        closeBillBtn.parentNode.replaceChild(newBtn, closeBillBtn);
        newBtn.addEventListener("click", function(e) {
            e.preventDefault();
            e.stopPropagation();
            showPaymentOptions();
        });
    }
});

// ==================== AMBIL MENU DARI GOOGLE SHEETS ====================
async function loadMenuFromSheet() {
    if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL === "PASTE_YOUR_APPS_SCRIPT_URL_HERE") {
        console.warn("URL Apps Script belum diset, pakai menu default");
        setDefaultMenu();
        return;
    }
    try {
        const res = await fetch(`${APPS_SCRIPT_URL}?action=getMenu`);
        const data = await res.json();
        if (data.menu && data.menu.length) {
            const newMenu = { makanan: [], minuman: [], dessert: [] };
            data.menu.forEach(item => {
                let categoryKey = "makanan";
                if (item.category === "minuman") categoryKey = "minuman";
                else if (item.category === "dessert") categoryKey = "dessert";
                else categoryKey = "makanan";
                newMenu[categoryKey].push({
                    name: item.name,
                    category: item.category,
                    bestSeller: item.bestSeller === true,
                    image: item.image,
                    desc: item.desc,
                    price: Number(item.price)
                });
            });
            menuData = newMenu;
        } else {
            setDefaultMenu();
        }
    } catch (err) {
        console.error("Gagal mengambil menu dari Sheets, pakai default:", err);
        setDefaultMenu();
    }
}

function setDefaultMenu() {
    menuData = {
        makanan: [
            { name: "Tahu Isi Goreng", category: "Appetizer", bestSeller: true, image: "images/TAHU ISI GORENG.jpeg", desc: "Tahu renyah yang digoreng keemasan.", price: 35000 },
            { name: "Lumpia Semarang", category: "Appetizer", bestSeller: false, image: "images/LUMPIA SEMARANG.jpeg", desc: "Camilan legendaris khas Semarang.", price: 45000 },
            { name: "Soto Ayam Lamongan", category: "Soup", bestSeller: true, image: "images/SOTO AYAM LAMONGAN.jpeg", desc: "Kuah soto kuning kaya rempah.", price: 40000 },
            { name: "Nasi Goreng Kampung", category: "Main Course", bestSeller: true, image: "images/NASI GORENG KAMPUNG.jpeg", desc: "Nasi goreng beraroma terasi.", price: 75000 },
            { name: "Rendang Daging Sapi", category: "Main Course", bestSeller: true, image: "images/RENDANG DAGING SAPI.jpeg", desc: "Mahakarya kuliner Minang.", price: 90000 }
        ],
        minuman: [
            { name: "Es Teh", category: "Beverage", bestSeller: false, image: "images/ES TEH.jpeg", desc: "Seduhan teh melati dingin.", price: 25000 },
            { name: "Kopi Bali", category: "Beverage", bestSeller: true, image: "images/KOPI BALI.jpeg", desc: "Kopi tubruk dari biji kopi Bali.", price: 30000 }
        ],
        dessert: [
            { name: "Klepon", category: "Dessert", bestSeller: true, image: "images/KLEPON.jpeg", desc: "Jajanan pasar kenyal bertabur kelapa.", price: 30000 }
        ]
    };
}

// ==================== DARK MODE ====================
function toggleDarkMode() {
    isDarkMode = !isDarkMode;
    localStorage.setItem("hn_darkmode", isDarkMode);
    applyDarkMode();
}
function applyDarkMode() {
    document.documentElement.setAttribute("data-theme", isDarkMode ? "dark" : "light");
    const icon = document.getElementById("darkmodeIcon");
    if (icon) icon.textContent = isDarkMode ? "☀️" : "🌙";
}

// ==================== HELPERS ====================
function formatPrice(price) {
    return "Rp " + price.toLocaleString("id-ID");
}
function getAllItems() {
    return [...menuData.makanan, ...menuData.dessert, ...menuData.minuman];
}
function showSuccessPopup(message = "Successfully added to cart!") {
    const popup = document.getElementById("success-popup");
    const msgElem = popup.querySelector("p");
    if (msgElem) msgElem.textContent = message;
    popup.classList.add("show");
    setTimeout(() => popup.classList.remove("show"), 2000);
}
function showShareToast(msg) {
    const toast = document.getElementById("shareToast");
    toast.textContent = msg;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 2500);
}
function showSkeletonLoading() {
    const menuList = document.getElementById("menu-list");
    if (!menuList) return;
    menuList.innerHTML = "";
    for (let i = 0; i < 4; i++) {
        menuList.innerHTML += `<div class="skeleton-card"><div class="skeleton-img skeleton-pulse"></div><div class="skeleton-body"><div class="skeleton-tag skeleton-pulse"></div><div class="skeleton-title skeleton-pulse"></div><div class="skeleton-price skeleton-pulse"></div><div class="skeleton-desc skeleton-pulse"></div><div class="skeleton-btns"><div class="skeleton-btn skeleton-pulse"></div><div class="skeleton-btn skeleton-pulse"></div></div></div></div>`;
    }
}

// ==================== RENDER MENU ====================
function getFilteredAndSortedItems() {
    let items = currentCategory === "all" ? getAllItems() : [...menuData[currentCategory]];
    if (currentSearchKeyword.trim() !== "") {
        items = items.filter(item => item.name.toLowerCase().includes(currentSearchKeyword.toLowerCase()));
    }
    const sortValue = document.getElementById("sortMenu")?.value;
    if (sortValue === "az") items.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortValue === "za") items.sort((a, b) => b.name.localeCompare(a.name));
    else if (sortValue === "low") items.sort((a, b) => a.price - b.price);
    else if (sortValue === "high") items.sort((a, b) => b.price - a.price);
    return items;
}
function renderMenu() {
    const items = getFilteredAndSortedItems();
    const menuList = document.getElementById("menu-list");
    if (!menuList) return;
    menuList.innerHTML = "";
    if (items.length === 0) {
        showEmptyState(currentSearchKeyword || "this category");
        return;
    }
    items.forEach((item, index) => {
        const safeName = item.name.replace(/'/g, "\\'");
        const isFav = favorites.includes(item.name);
        const card = document.createElement("div");
        card.className = "menu-card";
        card.style.animationDelay = `${index * 0.06}s`;
        card.innerHTML = `
            <div class="image-wrapper">
                ${item.bestSeller ? `<div class="best-seller">🔥 BEST SELLER</div>` : ''}
                <button class="card-fav-btn ${isFav ? 'active' : ''}" onclick="toggleFav(event,'${safeName}')" title="Favorite">
                    ${isFav ? '❤️' : '🤍'}
                </button>
                <img src="${item.image}" alt="${item.name}" loading="lazy" class="menu-img"
                     onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22240%22><rect fill=%22%23f1f5f9%22 width=%22400%22 height=%22240%22/><text x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 font-size=%2240%22>🍽️</text></svg>'">
            </div>
            <div class="menu-info">
                <div class="food-tag">${item.category}</div>
                <h3>${item.name}</h3>
                <div class="price">${formatPrice(item.price)}</div>
                <p>${item.desc.substring(0, 80)}${item.desc.length > 80 ? '...' : ''}</p>
                <div class="card-actions">
                    <button class="detail-btn" onclick="openModalByName('${safeName}')">View Details</button>
                    <button class="add-to-cart-btn" onclick="openQuickAddPopup('${safeName}')">+ Add To Cart</button>
                </div>
            </div>`;
        menuList.appendChild(card);
    });
}
function showEmptyState(keyword) {
    const menuList = document.getElementById("menu-list");
    menuList.innerHTML = `
    <div class="empty-state">
        <div class="empty-state-icon">🍽️</div>
        <h3>No menu found</h3>
        <p>No results for "<strong>${keyword}</strong>"</p>
        <button class="empty-state-btn" onclick="clearSearch()">Clear Search</button>
    </div>`;
}
function clearSearch() {
    document.getElementById("searchInput").value = "";
    currentSearchKeyword = "";
    renderMenu();
}
function searchMenu() { currentSearchKeyword = document.getElementById("searchInput").value; renderMenu(); }
function sortMenu() { renderMenu(); }
function changeCategory(btn, category) {
    document.querySelectorAll(".category-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentCategory = category;
    currentSearchKeyword = "";
    document.getElementById("searchInput").value = "";
    showSkeletonLoading();
    setTimeout(() => renderMenu(), 400);
}

// ==================== FAVORITES ====================
function toggleFav(event, itemName) {
    event.stopPropagation();
    const idx = favorites.indexOf(itemName);
    if (idx === -1) favorites.push(itemName);
    else favorites.splice(idx, 1);
    localStorage.setItem("hn_favorites", JSON.stringify(favorites));
    renderMenu();
    if (currentItem && currentItem.name === itemName) updateModalFavBtn();
}
function toggleFavFromModal() {
    if (!currentItem) return;
    const idx = favorites.indexOf(currentItem.name);
    if (idx === -1) favorites.push(currentItem.name);
    else favorites.splice(idx, 1);
    localStorage.setItem("hn_favorites", JSON.stringify(favorites));
    updateModalFavBtn();
    renderMenu();
}
function updateModalFavBtn() {
    const btn = document.getElementById("modalFavBtn");
    if (!btn || !currentItem) return;
    const isFav = favorites.includes(currentItem.name);
    btn.textContent = isFav ? "❤️" : "♡";
    btn.classList.toggle("fav-active", isFav);
}
function openFavModal() {
    const favList = document.getElementById("fav-list");
    const favEmpty = document.getElementById("fav-empty");
    favList.innerHTML = "";
    if (favorites.length === 0) {
        favEmpty.style.display = "block";
        favList.style.display = "none";
    } else {
        favEmpty.style.display = "none";
        favList.style.display = "block";
        const allItems = getAllItems();
        favorites.forEach(name => {
            const item = allItems.find(i => i.name === name);
            if (!item) return;
            const safeName = item.name.replace(/'/g, "\\'");
            favList.innerHTML += `
            <div class="fav-item">
                <img src="${item.image}" alt="${item.name}" loading="lazy">
                <div class="fav-item-info">
                    <strong>${item.name}</strong>
                    <span>${formatPrice(item.price)}</span>
                </div>
                <div class="fav-item-actions">
                    <button class="fav-add-btn" onclick="closeFavModal(); openQuickAddPopup('${safeName}')">+ Cart</button>
                    <button class="fav-remove-btn" onclick="removeFav('${safeName}')">🗑</button>
                </div>
            </div>`;
        });
    }
    document.getElementById("favModal").style.display = "flex";
}
function closeFavModal() { document.getElementById("favModal").style.display = "none"; }
function removeFav(name) {
    const idx = favorites.indexOf(name);
    if (idx !== -1) favorites.splice(idx, 1);
    localStorage.setItem("hn_favorites", JSON.stringify(favorites));
    renderMenu();
    openFavModal();
}

// ==================== MODAL DETAIL ====================
function openModalByName(itemName) {
    const items = getAllItems();
    currentItem = items.find(i => i.name === itemName);
    if (!currentItem) return;
    document.getElementById("modal-qty").innerText = "1";
    document.getElementById("modal-notes").value = "";
    document.getElementById("modal-image").src = currentItem.image;
    document.getElementById("modal-name").innerText = currentItem.name;
    document.getElementById("modal-category").innerText = currentItem.category;
    document.getElementById("modal-price").innerText = formatPrice(currentItem.price);
    document.getElementById("modal-desc").innerText = currentItem.desc;
    updateModalFavBtn();
    const scrollable = document.querySelector(".modal-scrollable");
    if (scrollable) scrollable.scrollTop = 0;
    document.getElementById("modal").style.display = "flex";
}
function closeModal() { document.getElementById("modal").style.display = "none"; currentItem = null; }
function increaseModalQty() {
    let s = document.getElementById("modal-qty");
    s.innerText = parseInt(s.innerText) + 1;
}
function decreaseModalQty() {
    let s = document.getElementById("modal-qty");
    let v = parseInt(s.innerText);
    if (v > 1) s.innerText = v - 1;
}
function addToCartFromModal() {
    if (!currentItem) return;
    const qty = parseInt(document.getElementById("modal-qty").innerText);
    const notes = document.getElementById("modal-notes").value.trim();
    addItemToCart(currentItem, qty, notes);
    closeModal();
    showSuccessPopup();
}

// ==================== QUICK ADD ====================
function openQuickAddPopup(itemName) {
    const items = getAllItems();
    quickAddItem = items.find(i => i.name === itemName);
    if (!quickAddItem) return;
    quickQty = 1;
    document.getElementById("quickQty").innerText = quickQty;
    document.getElementById("quickAddItemName").innerText = quickAddItem.name;
    document.getElementById("quickNotes").value = "";
    document.getElementById("quickAddModal").style.display = "flex";
}
function closeQuickAddModal() { document.getElementById("quickAddModal").style.display = "none"; quickAddItem = null; }
function increaseQuickQty() { quickQty++; document.getElementById("quickQty").innerText = quickQty; }
function decreaseQuickQty() { if (quickQty > 1) { quickQty--; document.getElementById("quickQty").innerText = quickQty; } }
function confirmQuickAdd() {
    if (!quickAddItem) return;
    const notes = document.getElementById("quickNotes").value.trim();
    addItemToCart(quickAddItem, quickQty, notes);
    closeQuickAddModal();
    showSuccessPopup();
}

// ==================== CART CORE ====================
function addItemToCart(item, qty, notes) {
    const existing = cart.find(c => c.name === item.name);
    if (existing) {
        existing.quantity += qty;
        if (notes) existing.notes = existing.notes ? existing.notes + "; " + notes : notes;
    } else {
        cart.push({ ...item, quantity: qty, notes: notes });
    }
    updateCartBadge();
    animateCartIcon();
}
function updateCartBadge() {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const badge = document.getElementById("cart-count");
    if (badge) badge.innerText = totalItems;
}
function animateCartIcon() {
    const btn = document.getElementById("cartIconBtn");
    if (!btn) return;
    btn.classList.remove("cart-pop");
    void btn.offsetWidth;
    btn.classList.add("cart-pop");
    setTimeout(() => btn.classList.remove("cart-pop"), 500);
}
function updateCart() {
    updateCartBadge();
    const container = document.getElementById("cart-items");
    const emptyState = document.getElementById("cart-empty-state");
    if (!container) return;
    container.innerHTML = "";
    if (cart.length === 0) {
        if (emptyState) emptyState.style.display = "block";
        container.style.display = "none";
        const totalSpan = document.getElementById("cart-total");
        if (totalSpan) totalSpan.innerText = formatPrice(0);
        return;
    }
    if (emptyState) emptyState.style.display = "none";
    container.style.display = "block";
    let total = 0;
    cart.forEach((item, index) => {
        total += item.price * item.quantity;
        const div = document.createElement("div");
        div.className = "cart-item";
        div.innerHTML = `
        <div class="cart-item-info">
            <strong>${item.name}</strong>
            <div class="cart-item-price">${formatPrice(item.price * item.quantity)}</div>
            ${item.notes ? `<span class="cart-notes">📝 ${item.notes}</span>` : ''}
        </div>
        <div class="cart-item-controls">
            <button class="btn-qty" onclick="changeCartQty(${index}, -1)">-</button>
            <span>${item.quantity}</span>
            <button class="btn-qty" onclick="changeCartQty(${index}, 1)">+</button>
            <button class="btn-remove" onclick="removeCartItem(${index})">🗑️</button>
        </div>`;
        container.appendChild(div);
    });
    const totalSpan = document.getElementById("cart-total");
    if (totalSpan) totalSpan.innerText = formatPrice(total);
}
function changeCartQty(index, amount) {
    cart[index].quantity += amount;
    if (cart[index].quantity <= 0) cart.splice(index, 1);
    updateCart();
}
function removeCartItem(index) { cart.splice(index, 1); updateCart(); }
function clearCart() {
    if (cart.length === 0) return;
    if (confirm("Clear all items from cart?")) { cart = []; updateCart(); }
}

// ==================== CART MODAL NAVIGATION ====================
function openCart() {
    updateCart();
    document.getElementById("cartModal").style.display = "block";
    document.getElementById("cart-screen").style.display = "block";
    document.getElementById("order-summary-screen").style.display = "none";
    document.getElementById("payment-screen").style.display = "none";
    document.getElementById("bill-monitor-screen").style.display = "none";
}
function closeCart() { document.getElementById("cartModal").style.display = "none"; }
function backToCart() {
    document.getElementById("order-summary-screen").style.display = "none";
    document.getElementById("cart-screen").style.display = "block";
}
function backToSummary() {
    document.getElementById("payment-screen").style.display = "none";
    document.getElementById("order-summary-screen").style.display = "block";
}

// ==================== PROCEED ORDER ====================
function proceedOrder() {
    if (cart.length === 0) { 
        showShareToast("🛒 Your cart is empty!"); 
        return; 
    }
    showSuccessPopup("✅ Order added successfully! Please wait...");
    openOrderSummary();
}

function openOrderSummary() {
    if (cart.length === 0) { showShareToast("🛒 Your cart is empty!"); return; }
    const summaryContainer = document.getElementById("order-summary-items");
    summaryContainer.innerHTML = "";
    let total = 0;
    cart.forEach(item => {
        total += item.price * item.quantity;
        summaryContainer.innerHTML += `
        <div class="summary-item">
            <div class="summary-item-left">
                <span class="summary-item-qty">${item.quantity}×</span>
                <span class="summary-item-name">${item.name}</span>
                ${item.notes ? `<span class="summary-item-note">📝 ${item.notes}</span>` : ''}
            </div>
            <span class="summary-item-price">${formatPrice(item.price * item.quantity)}</span>
        </div>`;
    });
    document.getElementById("order-summary-grand-total").innerText = formatPrice(total);
    const now = new Date();
    const timeStr = now.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
    document.getElementById("order-time-display").innerHTML = `🕐 Order Time: ${timeStr}`;
    document.getElementById("cart-screen").style.display = "none";
    document.getElementById("order-summary-screen").style.display = "block";
}

// ==================== SEND ORDER TO SERVER & OPEN MONITOR ====================
async function sendOrderAndMonitor() {
    const tableNum = document.getElementById("tableNumber").value.trim() || "—";
    if (!tableNum || tableNum === "—") {
        showShareToast("Please enter table number!");
        return;
    }
    if (cart.length === 0) {
        showShareToast("Cart is empty!");
        return;
    }
    
    const sendBtn = document.querySelector("#order-summary-screen .checkout-btn");
    const originalText = sendBtn.innerText;
    sendBtn.innerText = "⏳ Sending...";
    sendBtn.disabled = true;
    
    try {
        const orderData = {
            action: "newOrder",
            tableNumber: tableNum,
            items: cart.map(item => ({
                name: item.name,
                qty: item.quantity,
                price: item.price,
                notes: item.notes || ""
            }))
        };
        const res = await fetch(APPS_SCRIPT_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain" },
            body: JSON.stringify(orderData)
        });
        const result = await res.json();
        if (result.status === "ok") {
            activeOrderId = result.orderId;
            localStorage.setItem("hn_active_order_id", activeOrderId);
            cart = [];
            updateCartBadge();
            document.getElementById("billFabBtn").style.display = "flex";
            closeCart();
            setTimeout(() => openBillMonitor(), 500);
            showSuccessPopup("✅ Order sent! Check your order status.");
        } else {
            showShareToast("Failed to send order. Try again.");
        }
    } catch (err) {
        console.error(err);
        showShareToast("Network error. Please try again.");
    } finally {
        sendBtn.innerText = originalText;
        sendBtn.disabled = false;
    }
}

// ==================== PANTAUAN MENU ====================
async function openBillMonitor() {
    if (!activeOrderId) {
        showShareToast("No active order.");
        return;
    }
    if (monitorInterval) clearInterval(monitorInterval);
    document.getElementById("bill-monitor-screen").style.display = "block";
    document.getElementById("cart-screen").style.display = "none";
    document.getElementById("order-summary-screen").style.display = "none";
    document.getElementById("payment-screen").style.display = "none";
    document.getElementById("cartModal").style.display = "block";
    await loadOrderStatus();
    monitorInterval = setInterval(loadOrderStatus, 5000);
}

async function loadOrderStatus() {
    if (!activeOrderId) return;
    try {
        const res = await fetch(`${APPS_SCRIPT_URL}?action=getOrderById&id=${activeOrderId}`);
        const data = await res.json();
        const order = data.order;
        if (!order || !order.items || order.items.length === 0) {
            document.getElementById("bill-items-list").innerHTML = '<div class="empty-msg">Order not found</div>';
            document.getElementById("bill-total").innerHTML = "Rp 0";
            document.getElementById("bill-order-id").innerHTML = `Order ID: ${activeOrderId} (pending)`;
            return;
        }
        document.getElementById("bill-order-id").innerHTML = `Order ID: ${order.id}`;
        let itemsHtml = '<div class="order-items" style="margin-top:0;">';
        order.items.forEach(item => {
            let statusText = "";
            let statusClass = "";
            if (item.status === "Baru") {
                statusText = "🔴 Segera diproses";
                statusClass = "status-baru";
            } else if (item.status === "Diproses") {
                statusText = "🟡 Sedang diproses";
                statusClass = "status-diproses";
            } else if (item.status === "Selesai") {
                statusText = "🟢 Selesai";
                statusClass = "status-selesai";
            } else {
                statusText = "⚪ Menunggu";
                statusClass = "status-baru";
            }
            itemsHtml += `
                <div class="order-item-row">
                    <span>${item.qty}× ${item.name} ${item.notes ? `<em class="note">(${item.notes})</em>` : ''}</span>
                    <span>${formatPrice(item.subtotal)}</span>
                    <span class="item-status-badge ${statusClass}">${statusText}</span>
                </div>`;
        });
        itemsHtml += '</div>';
        document.getElementById("bill-items-list").innerHTML = itemsHtml;
        document.getElementById("bill-total").innerHTML = formatPrice(order.total);
        
        // Tombol sudah memiliki event listener dari DOMContentLoaded, tidak perlu diubah disini
    } catch (err) {
        console.error("Gagal load status:", err);
        document.getElementById("bill-items-list").innerHTML = '<div class="empty-msg">Error loading order status</div>';
    }
}

function closeBillMonitor() {
    if (monitorInterval) clearInterval(monitorInterval);
    document.getElementById("cartModal").style.display = "none";
}

// ==================== PILIHAN PEMBAYARAN ====================
function showPaymentOptions() {
    if (!activeOrderId) {
        showShareToast("No active order.");
        return;
    }
    document.getElementById("paymentChoiceModal").style.display = "flex";
}

function closePaymentChoiceModal() {
    document.getElementById("paymentChoiceModal").style.display = "none";
}

function payWithQRIS() {
    closePaymentChoiceModal();
    // Tampilkan layar payment QRIS
    document.getElementById("payment-screen").style.display = "block";
    document.getElementById("bill-monitor-screen").style.display = "none";
    // Set informasi pembayaran
    const totalElem = document.getElementById("bill-total");
    const total = totalElem ? totalElem.innerText : "Rp 0";
    document.getElementById("payTotalInfo").innerHTML = `💰 Total: <strong>${total}</strong>`;
    document.getElementById("payTableInfo").innerHTML = `🪑 Table: <strong>-</strong>`;
    const now = new Date();
    const timeStr = now.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
    document.getElementById("payTimeInfo").innerHTML = `🕐 Time: <strong>${timeStr}</strong>`;
    document.getElementById("payOrderId").innerHTML = `Order ID: ${activeOrderId}`;
}

function payWithCashier() {
    closePaymentChoiceModal();
    showShareToast("✅ Silakan bayar ke kasir. Terima kasih!");
    // Tutup bill dan hapus session
    localStorage.removeItem("hn_active_order_id");
    activeOrderId = null;
    document.getElementById("billFabBtn").style.display = "none";
    closeBillMonitor();
    setTimeout(() => location.reload(), 2000);
}

function finalizePaymentAndClose() {
    if (!activeOrderId) return;
    localStorage.removeItem("hn_active_order_id");
    activeOrderId = null;
    document.getElementById("billFabBtn").style.display = "none";
    document.getElementById("payment-screen").style.display = "none";
    closeBillMonitor();
    showSuccessPopup("✅ Pembayaran berhasil! Terima kasih.");
    setTimeout(() => location.reload(), 1500);
}

// ==================== SHARE ITEM ====================
function shareItem() {
    if (!currentItem) return;
    const text = `🍽️ ${currentItem.name}\n${formatPrice(currentItem.price)}\n\n${currentItem.desc}\n\n— Heritage Nusantara, Authentic Indonesian Cuisine`;
    if (navigator.share) {
        navigator.share({ title: currentItem.name, text: text }).catch(() => {});
    } else {
        navigator.clipboard.writeText(text).then(() => {
            showShareToast("📋 Menu info copied to clipboard!");
        }).catch(() => { showShareToast("💡 Share: " + currentItem.name); });
    }
}

// ==================== CLOSE MODALS ON OUTSIDE CLICK ====================
window.onclick = function(event) {
    const modal = document.getElementById("modal");
    const cartModal = document.getElementById("cartModal");
    const quickModal = document.getElementById("quickAddModal");
    const favModal = document.getElementById("favModal");
    const paymentChoiceModal = document.getElementById("paymentChoiceModal");
    if (event.target === modal) closeModal();
    if (event.target === cartModal) closeCart();
    if (event.target === quickModal) closeQuickAddModal();
    if (event.target === favModal) closeFavModal();
    if (event.target === paymentChoiceModal) closePaymentChoiceModal();
};