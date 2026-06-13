// ================================================================
// HERITAGE NUSANTARA - User Modals (Detail & Quick Add)
// ================================================================

function openModalByName(itemName) {
    const items = getAllItems();
    currentItem = items.find(i => i.name === itemName);
    if (!currentItem) return;
    document.getElementById("modal-qty").innerText   = "1";
    document.getElementById("modal-notes").value     = "";
    document.getElementById("modal-image").src       = currentItem.image;
    document.getElementById("modal-name").innerText  = currentItem.name;
    document.getElementById("modal-category").innerText = currentItem.category;
    document.getElementById("modal-price").innerText = formatPrice(currentItem.price);
    document.getElementById("modal-desc").innerText  = currentItem.desc;
    const scrollable = document.querySelector(".modal-scrollable");
    if (scrollable) scrollable.scrollTop = 0;
    document.getElementById("modal").style.display  = "flex";
}

function closeModal() {
    document.getElementById("modal").style.display = "none";
    currentItem = null;
}

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
    const qty   = parseInt(document.getElementById("modal-qty").innerText);
    const notes = document.getElementById("modal-notes").value.trim();
    addItemToCart(currentItem, qty, notes);
    closeModal();
    showSuccessPopup();
}

function openQuickAddPopup(itemName) {
    const items = getAllItems();
    quickAddItem = items.find(i => i.name === itemName);
    if (!quickAddItem) return;
    quickQty = 1;
    document.getElementById("quickQty").innerText         = quickQty;
    document.getElementById("quickAddItemName").innerText = quickAddItem.name;
    document.getElementById("quickNotes").value           = "";
    document.getElementById("quickAddModal").style.display = "flex";
}

function closeQuickAddModal() {
    document.getElementById("quickAddModal").style.display = "none";
    quickAddItem = null;
}

function increaseQuickQty() { quickQty++; document.getElementById("quickQty").innerText = quickQty; }
function decreaseQuickQty() {
    if (quickQty > 1) { quickQty--; document.getElementById("quickQty").innerText = quickQty; }
}

function confirmQuickAdd() {
    if (!quickAddItem) return;
    const notes = document.getElementById("quickNotes").value.trim();
    addItemToCart(quickAddItem, quickQty, notes);
    closeQuickAddModal();
    showSuccessPopup();
}

function shareItem() {
    if (!currentItem) return;
    const text = `🍽️ ${currentItem.name}\n${formatPrice(currentItem.price)}\n\n${currentItem.desc}\n\n— Heritage Nusantara`;
    if (navigator.share) {
        navigator.share({ title: currentItem.name, text }).catch(() => {});
    } else {
        navigator.clipboard.writeText(text).then(() => showShareToast("📋 Disalin ke clipboard!")).catch(() => {});
    }
}
