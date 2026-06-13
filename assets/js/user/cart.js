// ================================================================
// HERITAGE NUSANTARA - User Cart
// Notes berbeda = entri terpisah (tidak digabung)
// ================================================================

function addItemToCart(item, qty, notes) {
    // Entri terpisah jika notes berbeda (atau semua selalu terpisah jika notes ada)
    const normalizedNotes = (notes || "").trim();
    const existing = cart.find(c => c.name === item.name && (c.notes || "") === normalizedNotes);
    if (existing) {
        existing.quantity += qty;
    } else {
        cart.push({ ...item, quantity: qty, notes: normalizedNotes });
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
    const container  = document.getElementById("cart-items");
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

function removeCartItem(index) {
    cart.splice(index, 1);
    updateCart();
}

function clearCart() {
    if (cart.length === 0) return;
    if (confirm("Clear all items from cart?")) {
        cart = [];
        updateCart();
    }
}

function openCart() {
    updateCart();
    document.getElementById("cartModal").style.display    = "block";
    document.getElementById("cart-screen").style.display  = "block";
    document.getElementById("order-summary-screen").style.display = "none";
    document.getElementById("payment-screen").style.display       = "none";
    document.getElementById("cashier-wait-screen").style.display  = "none";
    document.getElementById("bill-monitor-screen").style.display  = "none";
}

function closeCart() {
    document.getElementById("cartModal").style.display = "none";
}

function backToCart() {
    document.getElementById("order-summary-screen").style.display = "none";
    document.getElementById("cart-screen").style.display = "block";
}

function proceedOrder() {
    if (cart.length === 0) {
        showShareToast("🛒 Your cart is empty!");
        return;
    }
    openOrderSummary();
}

function openOrderSummary() {
    if (cart.length === 0) {
        showShareToast("🛒 Your cart is empty!");
        return;
    }
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
    // Tampilkan nomor meja di review
    const tableEl = document.getElementById("summary-table-display");
    if (tableEl) tableEl.innerHTML = `🪑 Meja: <strong>${tableNumber || "—"}</strong>`;
    const now = new Date();
    const timeStr = now.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
    document.getElementById("order-time-display").innerHTML = `🕐 Order Time: ${timeStr}`;
    document.getElementById("cart-screen").style.display          = "none";
    document.getElementById("order-summary-screen").style.display = "block";
}
