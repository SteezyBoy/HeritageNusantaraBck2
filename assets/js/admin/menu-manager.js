// ================================================================
// HERITAGE NUSANTARA - Admin Menu Manager
// ================================================================

function getAllAdminItems() {
    return [
        ...adminMenuData.makanan.map(i => ({ ...i, _cat: "makanan" })),
        ...adminMenuData.minuman.map(i => ({ ...i, _cat: "minuman" })),
        ...adminMenuData.dessert.map(i => ({ ...i, _cat: "dessert" }))
    ];
}

function renderAdminMenu() {
    const all = getAllAdminItems();
    document.getElementById("menuCount").textContent = all.length;
    const list = document.getElementById("menu-list-admin");
    if (all.length === 0) {
        list.innerHTML = '<div class="empty-msg"><div class="em-icon">🍽</div><p>Belum ada menu</p></div>';
        return;
    }
    list.innerHTML = all.map((item, i) => `
        <div class="menu-item-row">
            <img src="${item.image}" alt="${item.name}"
                 onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2260%22 height=%2260%22><rect fill=%22%23f1f5f9%22 width=%2260%22 height=%2260%22/></svg>'">
            <div class="menu-item-info">
                <strong>${item.name} ${item.bestSeller ? "🔥" : ""}</strong>
                <span>${fmt(item.price)}</span>
                <small>${item.category} • ${item._cat}</small>
            </div>
            <div class="menu-item-btns">
                <button class="edit-btn" onclick="openEditMenu(${i})">✏️ Edit</button>
                <button class="del-btn" onclick="deleteMenuItem(${i})">🗑</button>
            </div>
        </div>`).join("");
}

function openAddMenu() {
    editingMenuIndex = null;
    document.getElementById("menuModalTitle").textContent = "➕ Tambah Menu";
    document.getElementById("fName").value = "";
    document.getElementById("fPrice").value = "";
    document.getElementById("fDesc").value = "";
    document.getElementById("fImage").value = "";
    document.getElementById("fSubcat").value = "";
    document.getElementById("fBestSeller").checked = false;
    document.getElementById("fCategory").value = "makanan";
    document.getElementById("menuModal").classList.add("open");
}

function openEditMenu(globalIndex) {
    editingMenuIndex = globalIndex;
    const item = getAllAdminItems()[globalIndex];
    document.getElementById("menuModalTitle").textContent = "✏️ Edit Menu";
    document.getElementById("fName").value = item.name;
    document.getElementById("fPrice").value = item.price;
    document.getElementById("fDesc").value = item.desc;
    document.getElementById("fImage").value = item.image;
    document.getElementById("fSubcat").value = item.category;
    document.getElementById("fBestSeller").checked = item.bestSeller;
    document.getElementById("fCategory").value = item._cat;
    document.getElementById("menuModal").classList.add("open");
}

function closeMenuModal() {
    document.getElementById("menuModal").classList.remove("open");
}

function saveMenuItem() {
    const name = document.getElementById("fName").value.trim();
    const price = parseInt(document.getElementById("fPrice").value);
    const cat = document.getElementById("fCategory").value;
    const subcat = document.getElementById("fSubcat").value.trim() || cat;
    const desc = document.getElementById("fDesc").value.trim();
    const image = document.getElementById("fImage").value.trim();
    const best = document.getElementById("fBestSeller").checked;
    if (!name || !price) { alert("Nama dan harga wajib diisi!"); return; }
    const newItem = { name, price, category: subcat, desc, image, bestSeller: best };
    if (editingMenuIndex === null) {
        adminMenuData[cat].push(newItem);
    } else {
        const all = getAllAdminItems();
        const old = all[editingMenuIndex];
        const oldCat = old._cat;
        const idx = adminMenuData[oldCat].findIndex(i => i.name === old.name);
        if (idx !== -1) adminMenuData[oldCat].splice(idx, 1);
        adminMenuData[cat].push(newItem);
    }
    closeMenuModal();
    renderAdminMenu();
    syncMenuToSheets();
}

function deleteMenuItem(globalIndex) {
    const item = getAllAdminItems()[globalIndex];
    if (!confirm(`Hapus "${item.name}"?`)) return;
    const arr = adminMenuData[item._cat];
    const idx = arr.findIndex(i => i.name === item.name);
    if (idx !== -1) arr.splice(idx, 1);
    renderAdminMenu();
    syncMenuToSheets();
}

async function syncMenuToSheets() {
    if (!getAdminScriptUrl()) return;
    try {
        const allItems = getAllAdminItems().map(i => ({
            category: i._cat, name: i.name, price: i.price,
            desc: i.desc, image: i.image, bestSeller: i.bestSeller
        }));
        await syncMenuToApi(allItems);
    } catch (e) { console.warn("Gagal sync menu:", e); }
}
