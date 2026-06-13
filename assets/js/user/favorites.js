// ================================================================
// HERITAGE NUSANTARA - User Favorites
// ================================================================

function toggleFav(event, itemName) {
    event.stopPropagation();
    const idx = favorites.indexOf(itemName);
    if (idx === -1) favorites.push(itemName);
    else favorites.splice(idx, 1);
    localStorage.setItem(STORAGE_KEYS.favorites, JSON.stringify(favorites));
    renderMenu();
    if (currentItem && currentItem.name === itemName) updateModalFavBtn();
}

function toggleFavFromModal() {
    if (!currentItem) return;
    const idx = favorites.indexOf(currentItem.name);
    if (idx === -1) favorites.push(currentItem.name);
    else favorites.splice(idx, 1);
    localStorage.setItem(STORAGE_KEYS.favorites, JSON.stringify(favorites));
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

function closeFavModal() {
    document.getElementById("favModal").style.display = "none";
}

function removeFav(name) {
    const idx = favorites.indexOf(name);
    if (idx !== -1) favorites.splice(idx, 1);
    localStorage.setItem(STORAGE_KEYS.favorites, JSON.stringify(favorites));
    renderMenu();
    openFavModal();
}
