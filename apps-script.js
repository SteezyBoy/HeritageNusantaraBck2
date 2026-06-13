// ================================================================
// HERITAGE NUSANTARA - Google Apps Script  (v2.0)
// New: addItemsToOrder, getActiveOrderByTable, status Diantar
// ================================================================

const SHEET_NAME_ORDERS = "Pesanan";
const SHEET_NAME_MENU   = "Menu";
const ADMIN_PASSWORD    = "heritage2026";

const ORDER_HEADERS = [
  "ID Pesanan","Waktu","No. Meja","Nama Item","Qty","Harga Satuan",
  "Subtotal","Catatan","Total Order","Status","Pembayaran"
];

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    if (data.action === "newOrder")          return handleNewOrder(data);
    if (data.action === "addItemsToOrder")   return handleAddItemsToOrder(data);
    if (data.action === "updateMenu")        return handleUpdateMenu(data);
    if (data.action === "updateStatus")      return handleUpdateStatus(data);
    if (data.action === "deleteOrder")       return handleDeleteOrder(data);
    if (data.action === "setPaymentMethod")  return handleSetPaymentMethod(data);
    if (data.action === "markPaymentPaid")   return handleMarkPaymentPaid(data);
    return respond({ status: "error", message: "Unknown action" });
  } catch(err) {
    return respond({ status: "error", message: err.toString() });
  }
}

function doGet(e) {
  try {
    const action = e.parameter.action;
    if (action === "getOrders")            return handleGetOrders(e);
    if (action === "getMenu")              return handleGetMenu(e);
    if (action === "getStats")             return handleGetStats(e);
    if (action === "getOrderById")         return handleGetOrderById(e);
    if (action === "getActiveOrderByTable")return handleGetActiveOrderByTable(e);
    return respond({ status: "error", message: "Unknown action" });
  } catch(err) {
    return respond({ status: "error", message: err.toString() });
  }
}

// ── HELPERS ──────────────────────────────────────────────────────
function respond(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateSheet(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length)
      .setBackground("#ff5400").setFontColor("#ffffff").setFontWeight("bold");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// ── NEW ORDER ────────────────────────────────────────────────────
function handleNewOrder(data) {
  const sheet     = getOrCreateSheet(SHEET_NAME_ORDERS, ORDER_HEADERS);
  const orderId   = "ORD-" + new Date().getTime();
  const timestamp = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
  const tableNum  = data.tableNumber || "-";
  const total     = data.items.reduce((s, i) => s + i.price * i.qty, 0);

  data.items.forEach((item, idx) => {
    sheet.appendRow([
      orderId, timestamp, tableNum,
      item.name, item.qty, item.price, item.price * item.qty,
      item.notes || "-",
      idx === 0 ? total : "",
      "Baru", "-"
    ]);
  });

  const lastRow  = sheet.getLastRow();
  const startRow = lastRow - data.items.length + 1;
  sheet.getRange(startRow, 6, data.items.length, 3).setNumberFormat("\"Rp \"#,##0");
  sheet.getRange(startRow, 1, data.items.length, ORDER_HEADERS.length).setBackground("#fff7ed");

  return respond({ status: "ok", orderId: orderId });
}

// ── ADD ITEMS TO EXISTING ORDER ───────────────────────────────────
function handleAddItemsToOrder(data) {
  const sheet   = getOrCreateSheet(SHEET_NAME_ORDERS, ORDER_HEADERS);
  const orderId = data.orderId;
  const rows    = sheet.getDataRange().getValues();

  // Recalculate total
  let existingTotal = 0;
  let tableNum = "-";
  let firstOrderRow = -1;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === orderId) {
      existingTotal += Number(rows[i][6]) || 0;
      tableNum = rows[i][2];
      if (firstOrderRow === -1) firstOrderRow = i + 1;
    }
  }
  const addTotal = data.items.reduce((s, i) => s + i.price * i.qty, 0);
  const newTotal = existingTotal + addTotal;

  // Update total on first row
  if (firstOrderRow > 0) sheet.getRange(firstOrderRow, 9).setValue(newTotal);

  // Append new items
  const timestamp = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
  data.items.forEach(item => {
    sheet.appendRow([
      orderId, timestamp, tableNum,
      item.name, item.qty, item.price, item.price * item.qty,
      item.notes || "-",
      "", "Baru", "-"
    ]);
  });

  const lastRow  = sheet.getLastRow();
  const startRow = lastRow - data.items.length + 1;
  sheet.getRange(startRow, 6, data.items.length, 3).setNumberFormat("\"Rp \"#,##0");
  sheet.getRange(startRow, 1, data.items.length, ORDER_HEADERS.length).setBackground("#fff7ed");

  return respond({ status: "ok", orderId: orderId });
}

// ── GET ACTIVE ORDER BY TABLE ─────────────────────────────────────
// Mengembalikan orderId yang belum lunas untuk meja tertentu
function handleGetActiveOrderByTable(e) {
  const table = e.parameter.table;
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME_ORDERS);
  if (!sheet) return respond({ status: "ok", orderId: null });

  const rows = sheet.getDataRange().getValues();
  const orderMap = {};
  for (let i = 1; i < rows.length; i++) {
    const id      = rows[i][0];
    const tbl     = rows[i][2];
    const payment = rows[i][10] || "-";
    if (!id) continue;
    if (tbl === table && payment !== "Lunas") {
      orderMap[id] = true;
    }
  }
  const ids = Object.keys(orderMap);
  // Kembalikan order terakhir (terbaru) yang aktif
  return respond({ status: "ok", orderId: ids.length > 0 ? ids[ids.length - 1] : null });
}

// ── GET ORDERS ───────────────────────────────────────────────────
function handleGetOrders(e) {
  const sheet = getOrCreateSheet(SHEET_NAME_ORDERS, ORDER_HEADERS);
  const rows  = sheet.getDataRange().getValues();
  if (rows.length <= 1) return respond({ status: "ok", orders: [] });

  const orderMap = {};
  rows.slice(1).forEach(row => {
    const id = row[0]; if (!id) return;
    if (!orderMap[id]) {
      orderMap[id] = {
        id:            id,
        time:          row[1],
        table:         row[2],
        total:         row[8] || 0,
        status:        row[9],
        paymentStatus: row[10] || "-",
        items:         []
      };
    }
    orderMap[id].items.push({
      name: row[3], qty: row[4], price: row[5],
      subtotal: row[6], notes: row[7], status: row[9]
    });
    if (row[8])  orderMap[id].total         = row[8];
    orderMap[id].status        = row[9];
    if (row[10]) orderMap[id].paymentStatus = row[10];
  });

  const orders = Object.values(orderMap).reverse();
  return respond({ status: "ok", orders: orders });
}

// ── GET ORDER BY ID ───────────────────────────────────────────────
function handleGetOrderById(e) {
  const orderId = e.parameter.id;
  const sheet   = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME_ORDERS);
  if (!sheet) return respond({ status: "error", message: "Sheet not found", order: null });

  const rows = sheet.getDataRange().getValues();
  let order = null, items = [], total = 0, table = "", time = "", orderStatus = "", paymentStatus = "-";

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === orderId) {
      if (!table) { table = rows[i][2]; time = rows[i][1]; }
      orderStatus   = rows[i][9];
      paymentStatus = rows[i][10] || "-";
      if (rows[i][8]) total = rows[i][8];
      items.push({
        name: rows[i][3], qty: rows[i][4], price: rows[i][5],
        subtotal: rows[i][6], notes: rows[i][7], status: rows[i][9]
      });
    }
  }
  if (items.length > 0)
    order = { id: orderId, table, time, total, status: orderStatus, paymentStatus, items };

  return respond({ status: "ok", order: order });
}

// ── GET STATS ────────────────────────────────────────────────────
function handleGetStats(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME_ORDERS);
  if (!sheet) return respond({ status: "ok", stats: {} });

  const rows  = sheet.getDataRange().getValues().slice(1);
  const today = new Date().toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" });

  let totalRevenue = 0, todayRevenue = 0, totalOrders = 0;
  const itemCount = {}, orderIds = new Set(), todayOrders = new Set();

  rows.forEach(row => {
    const id = row[0]; if (!id) return;
    const rowDate  = new Date(row[1]).toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" });
    const subtotal = Number(row[6]) || 0;
    const qty      = Number(row[4]) || 0;
    const name     = row[3];

    totalRevenue += subtotal;
    itemCount[name] = (itemCount[name] || 0) + qty;
    if (!orderIds.has(id)) { orderIds.add(id); totalOrders++; }
    if (rowDate === today)  { todayRevenue += subtotal; todayOrders.add(id); }
  });

  const topItems = Object.entries(itemCount)
    .sort((a,b) => b[1] - a[1]).slice(0,5)
    .map(([name, qty]) => ({ name, qty }));

  return respond({ status: "ok", stats: { totalRevenue, todayRevenue, totalOrders, todayOrders: todayOrders.size, topItems } });
}

// ── UPDATE STATUS ────────────────────────────────────────────────
// Status: Baru | Diproses | Diantar | Selesai
function handleUpdateStatus(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME_ORDERS);
  if (!sheet) return respond({ status: "error", message: "Sheet not found" });
  const rows = sheet.getDataRange().getValues();
  let found  = false;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === data.orderId) {
      sheet.getRange(i+1, 10).setValue(data.newStatus);
      const color = data.newStatus === "Selesai"  ? "#dcfce7"
                  : data.newStatus === "Diantar"  ? "#cffafe"
                  : data.newStatus === "Diproses" ? "#fef9c3"
                  : "#fff7ed";
      sheet.getRange(i+1, 1, 1, 10).setBackground(color);
      found = true;
    }
  }
  if (!found) return respond({ status: "error", message: "Order not found" });
  return respond({ status: "ok" });
}

// ── SET PAYMENT METHOD ───────────────────────────────────────────
function handleSetPaymentMethod(data) {
  const sheet        = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME_ORDERS);
  if (!sheet) return respond({ status: "error", message: "Sheet not found" });
  const method       = data.method || "kasir";
  const paymentValue = method === "kasir" ? "Menunggu Kasir" : "Menunggu QRIS";
  const rows         = sheet.getDataRange().getValues();
  let found          = false;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === data.orderId) {
      sheet.getRange(i+1, 11).setValue(paymentValue);
      found = true;
    }
  }
  if (!found) return respond({ status: "error", message: "Order not found" });
  return respond({ status: "ok", paymentStatus: paymentValue });
}

// ── MARK PAYMENT PAID ────────────────────────────────────────────
// Setelah lunas: reset semua data meja (kolom pembayaran jadi Lunas)
function handleMarkPaymentPaid(data) {
  const sheet  = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME_ORDERS);
  if (!sheet) return respond({ status: "error", message: "Sheet not found" });
  const rows   = sheet.getDataRange().getValues();
  let found    = false;
  let tableNum = null;

  // Set order ini jadi Lunas
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === data.orderId) {
      sheet.getRange(i+1, 11).setValue("Lunas");
      sheet.getRange(i+1, 1, 1, ORDER_HEADERS.length).setBackground("#f0fdf4");
      if (!tableNum) tableNum = rows[i][2];
      found = true;
    }
  }
  if (!found) return respond({ status: "error", message: "Order not found" });
  return respond({ status: "ok", paymentStatus: "Lunas" });
}

// ── DELETE ORDER ──────────────────────────────────────────────────
function handleDeleteOrder(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME_ORDERS);
  if (!sheet) return respond({ status: "error", message: "Sheet not found" });
  const rows = sheet.getDataRange().getValues();
  const rowsToDelete = [];
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === data.orderId) rowsToDelete.push(i + 1);
  }
  if (rowsToDelete.length === 0) return respond({ status: "error", message: "Order not found" });
  rowsToDelete.reverse().forEach(rowNum => sheet.deleteRow(rowNum));
  return respond({ status: "ok" });
}

// ── MENU HANDLERS ─────────────────────────────────────────────────
function handleGetMenu(e) {
  const sheet = getOrCreateSheet(SHEET_NAME_MENU,
    ["Kategori","Nama","Harga","Deskripsi","Gambar","Best Seller"]);
  const rows  = sheet.getDataRange().getValues();
  if (rows.length <= 1) return respond({ status: "ok", menu: [] });
  const menu  = rows.slice(1).map(r => ({
    category: r[0], name: r[1], price: Number(r[2]),
    desc: r[3], image: r[4],
    bestSeller: r[5] === true || r[5] === "TRUE" || r[5] === "true"
  }));
  return respond({ status: "ok", menu: menu });
}

function handleUpdateMenu(data) {
  const sheet = getOrCreateSheet(SHEET_NAME_MENU,
    ["Kategori","Nama","Harga","Deskripsi","Gambar","Best Seller"]);
  if (sheet.getLastRow() > 1)
    sheet.getRange(2, 1, sheet.getLastRow()-1, 6).clearContent();
  const rows = data.menu.map(item => [
    item.category, item.name, item.price, item.desc, item.image, item.bestSeller
  ]);
  if (rows.length > 0) sheet.getRange(2, 1, rows.length, 6).setValues(rows);
  return respond({ status: "ok" });
}
