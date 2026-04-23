const telegram = window.Telegram?.WebApp;

if (telegram) {
  telegram.ready();
  telegram.expand();
}

const productInput = document.querySelector("#product");
const quantityInput = document.querySelector("#quantity");
const noteInput = document.querySelector("#note");
const statusText = document.querySelector("#status");
const sendButton = document.querySelector("#send-order");
const adminPanel = document.querySelector("#admin-panel");
const adminLogin = document.querySelector("#admin-login");
const adminKeyInput = document.querySelector("#admin-key");
const saveAdminKeyButton = document.querySelector("#save-admin-key");
const refreshOrdersButton = document.querySelector("#refresh-orders");
const adminStatusText = document.querySelector("#admin-status");
const ordersList = document.querySelector("#orders-list");
const statTotal = document.querySelector("#stat-total");
const statNew = document.querySelector("#stat-new");
const statProcessing = document.querySelector("#stat-processing");
const statRevenue = document.querySelector("#stat-revenue");

let adminKey = window.localStorage.getItem("bonbon_admin_key") || "";
let isAdmin = false;

async function loadCatalog() {
  try {
    const response = await fetch("/api/catalog/products");
    if (!response.ok) {
      return;
    }

    const products = await response.json();
    if (!products.length) {
      return;
    }

    productInput.innerHTML = products
      .map((product) => {
        const price = Number(product.price).toLocaleString("uz-UZ");
        return `<option value="${product.slug}">${product.title} - ${price} ${product.currency}</option>`;
      })
      .join("");
  } catch {
    statusText.textContent = "Katalog API hozircha ishlamayapti, local ro'yxat ishlatiladi.";
  }
}

document.querySelector("#increment").addEventListener("click", () => {
  quantityInput.value = String(Number(quantityInput.value || 1) + 1);
});

document.querySelector("#decrement").addEventListener("click", () => {
  quantityInput.value = String(Math.max(1, Number(quantityInput.value || 1) - 1));
});

function authHeaders() {
  const headers = {};

  if (telegram?.initData) {
    headers["X-Telegram-Init-Data"] = telegram.initData;
  }

  if (adminKey) {
    headers["X-Admin-Key"] = adminKey;
  }

  return headers;
}

async function postOrderFallback(payload) {
  const response = await fetch("/api/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Buyurtmani API orqali yuborib bo'lmadi.");
  }

  return response.json();
}

sendButton.addEventListener("click", async () => {
  const payload = {
    product: productInput.value,
    quantity: Number(quantityInput.value || 1),
    note: noteInput.value.trim(),
    sent_at: new Date().toISOString(),
  };

  const serializedPayload = JSON.stringify(payload);

  if (telegram?.sendData) {
    telegram.sendData(serializedPayload);
    statusText.textContent = "Ma'lumot botga yuborildi.";
    return;
  }

  try {
    const order = await postOrderFallback(payload);
    statusText.textContent = `Buyurtma API orqali yozildi: #${order.id}`;
  } catch (error) {
    statusText.textContent = error.message;
  }
});

function formatUser(user) {
  if (!user) {
    return "Telegram foydalanuvchi yo'q";
  }

  const name = [user.first_name, user.last_name].filter(Boolean).join(" ");
  const username = user.username ? `@${user.username}` : "";
  return [name, username, `ID: ${user.telegram_id}`].filter(Boolean).join(" ");
}

function formatMoney(amount, currency = "UZS") {
  return `${Number(amount || 0).toLocaleString("uz-UZ")} ${currency}`;
}

function orderTemplate(order) {
  const badgeClass = order.status === "done" ? "badge done" : "badge";
  const items = (order.items || [])
    .map((item) => `${item.product_title} x ${item.quantity}`)
    .join(", ");

  return `
    <article class="order-item">
      <div class="order-topline">
        <p class="order-title">#${order.id} ${items}</p>
        <span class="${badgeClass}">${order.status}</span>
      </div>
      <p class="order-meta">Jami: ${formatMoney(order.total_amount, order.currency)}</p>
      <p class="order-meta">${formatUser(order.user)}</p>
      <p class="order-meta">${order.note || "Izoh yo'q"}</p>
      <div class="order-actions">
        <button class="status-button" data-order-id="${order.id}" data-status="new" type="button">Yangi</button>
        <button class="status-button" data-order-id="${order.id}" data-status="processing" type="button">Jarayonda</button>
        <button class="status-button" data-order-id="${order.id}" data-status="done" type="button">Tayyor</button>
        <button class="status-button" data-order-id="${order.id}" data-status="cancelled" type="button">Bekor</button>
      </div>
    </article>
  `;
}

async function loadStats() {
  if (!isAdmin) {
    return;
  }

  const response = await fetch("/api/admin/stats", {
    headers: authHeaders(),
  });

  if (!response.ok) {
    return;
  }

  const stats = await response.json();
  statTotal.textContent = stats.total_orders;
  statNew.textContent = stats.new_orders;
  statProcessing.textContent = stats.processing_orders;
  statRevenue.textContent = formatMoney(stats.revenue);
}

async function loadOrders() {
  if (!isAdmin) {
    return;
  }

  adminStatusText.textContent = "Buyurtmalar yuklanmoqda...";
  const response = await fetch("/api/admin/orders", {
    headers: authHeaders(),
  });

  if (!response.ok) {
    adminStatusText.textContent = "Admin ruxsati tekshiruvdan o'tmadi.";
    return;
  }

  const orders = await response.json();
  ordersList.innerHTML = orders.length
    ? orders.map(orderTemplate).join("")
    : `<p class="order-meta">Hali buyurtma yo'q.</p>`;
  adminStatusText.textContent = `Jami ko'rsatildi: ${orders.length}`;
  await loadStats();
}

async function updateStatus(orderId, status) {
  const response = await fetch(`/api/admin/orders/${orderId}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    adminStatusText.textContent = "Statusni yangilab bo'lmadi.";
    return;
  }

  await loadOrders();
}

async function checkAdmin() {
  const shouldShowAdmin = window.location.pathname === "/admin" || adminKey;
  if (shouldShowAdmin) {
    adminPanel.classList.remove("is-hidden");
  }

  const response = await fetch("/api/me", {
    headers: authHeaders(),
  });

  const me = response.ok ? await response.json() : { is_admin: false };
  isAdmin = Boolean(me.is_admin);

  if (isAdmin) {
    adminPanel.classList.remove("is-hidden");
    adminLogin.classList.add("is-hidden");
    await loadOrders();
    return;
  }

  if (shouldShowAdmin) {
    adminStatusText.textContent = "Admin kalit yoki Telegram admin ID kerak.";
  }
}

saveAdminKeyButton.addEventListener("click", async () => {
  adminKey = adminKeyInput.value.trim();
  window.localStorage.setItem("bonbon_admin_key", adminKey);
  await checkAdmin();
});

refreshOrdersButton.addEventListener("click", loadOrders);

ordersList.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-order-id]");
  if (!button) {
    return;
  }

  await updateStatus(button.dataset.orderId, button.dataset.status);
});

checkAdmin();
loadCatalog();
