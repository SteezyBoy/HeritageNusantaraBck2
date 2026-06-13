// ================================================================
// HERITAGE NUSANTARA - User UI Helpers
// ================================================================

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

function getAllItems() {
    return [...menuData.makanan, ...menuData.dessert, ...menuData.minuman];
}
