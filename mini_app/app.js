const telegram = window.Telegram?.WebApp;

if (telegram) {
  telegram.ready();
  telegram.expand();
}

const productInput = document.querySelector("#product");
const languageToggle = document.querySelector("#language-toggle");
const languageLabel = document.querySelector("#language-label");
const searchToggle = document.querySelector("#search-toggle");
const searchBar = document.querySelector("#search-bar");
const productSearchInput = document.querySelector("#product-search");
const userLoginToggle = document.querySelector("#user-login-toggle");
const quantityInput = document.querySelector("#quantity");
const noteInput = document.querySelector("#note");
const statusText = document.querySelector("#status");
const sendButton = document.querySelector("#send-order");
const adminPanel = document.querySelector("#admin-panel");
const adminLogin = document.querySelector("#admin-login");
const adminKeyInput = document.querySelector("#admin-key");
const saveAdminKeyButton = document.querySelector("#save-admin-key");
const adminMenuToggle = document.querySelector("#admin-menu-toggle");
const adminMenuList = document.querySelector("#admin-menu-list");
const adminViewButtons = document.querySelectorAll("[data-admin-view]");
const refreshOrdersButton = document.querySelector("#refresh-orders");
const adminStatusText = document.querySelector("#admin-status");
const ordersList = document.querySelector("#orders-list");
const statTotal = document.querySelector("#stat-total");
const statNew = document.querySelector("#stat-new");
const statProcessing = document.querySelector("#stat-processing");
const statRevenue = document.querySelector("#stat-revenue");

let adminKey = window.localStorage.getItem("bonbon_admin_key") || "";
let isAdmin = false;
let activeLanguage = "UZ";
let shouldNavigateToAdmin = window.location.pathname === "/admin";
let productOptions = Array.from(productInput.options).map((option) => ({
  value: option.value,
  label: option.textContent,
}));

function renderProductOptions(searchTerm = "") {
  const normalizedSearchTerm = searchTerm.trim().toLowerCase();
  const filteredOptions = productOptions.filter((option) =>
    option.label.toLowerCase().includes(normalizedSearchTerm),
  );

  productInput.replaceChildren(
    ...(filteredOptions.length
      ? filteredOptions.map((option) => new Option(option.label, option.value))
      : [new Option("Mahsulot topilmadi", "")]),
  );
}

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

    productOptions = products.map((product) => {
      const price = Number(product.price).toLocaleString("uz-UZ");
      return {
        value: product.slug,
        label: `${product.title} - ${price} ${product.currency}`,
      };
    });
    renderProductOptions(productSearchInput.value);
  } catch {
    statusText.textContent = "Katalog API hozircha ishlamayapti, local ro'yxat ishlatiladi.";
  }
}

languageToggle.addEventListener("click", () => {
  const languages = ["UZ", "RU", "EN"];
  const currentIndex = languages.indexOf(activeLanguage);
  activeLanguage = languages[(currentIndex + 1) % languages.length];
  languageLabel.textContent = activeLanguage;
  document.documentElement.lang = activeLanguage.toLowerCase();
});

searchToggle.addEventListener("click", () => {
  const isHidden = searchBar.classList.toggle("is-hidden");
  searchToggle.setAttribute("aria-expanded", String(!isHidden));

  if (!isHidden) {
    productSearchInput.focus();
  }
});

productSearchInput.addEventListener("input", () => {
  renderProductOptions(productSearchInput.value);
});

searchBar.addEventListener("submit", (event) => {
  event.preventDefault();
});

function openLoginSection() {
  shouldNavigateToAdmin = true;
  adminPanel.classList.remove("is-hidden");

  if (isAdmin) {
    adminPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  adminLogin.classList.remove("is-hidden");
  adminStatusText.textContent = "Admin kalitni kiriting yoki Telegram admin sifatida oching.";
  adminLogin.scrollIntoView({ behavior: "smooth", block: "center" });
  adminKeyInput.focus();
}

function setAdminLayout(isEnabled) {
  document.body.classList.toggle("is-admin-view", isEnabled);
}

function setActiveAdminView(view) {
  adminViewButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.adminView === view);
  });
}

function showAdminPlaceholder(view) {
  setActiveAdminView(view);

  if (view === "orders") {
    loadOrders();
    return;
  }

  if (view === "stats") {
    ordersList.innerHTML = "";
    adminStatusText.textContent = "Statistika yuqoridagi bloklarda ko'rsatilgan.";
    loadStats();
    return;
  }

  if (view === "categories") {
    loadAdminCategories();
    return;
  }

  if (view === "items") {
    loadAdminMenuItems();
  }
}

adminMenuToggle.addEventListener("click", () => {
  const isCollapsed = adminMenuList.classList.toggle("is-collapsed");
  adminMenuToggle.setAttribute("aria-expanded", String(!isCollapsed));
});

adminViewButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (!isAdmin) {
      openLoginSection();
      return;
    }

    showAdminPlaceholder(button.dataset.adminView);
  });
});

userLoginToggle.addEventListener("click", async () => {
  openLoginSection();
  await checkAdmin();
  openLoginSection();
});

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

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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

function categoryTemplate(category) {
  const status = category.is_active ? "active" : "hidden";

  return `
    <article class="catalog-admin-item">
      <div class="catalog-admin-topline">
        <p class="order-title">${escapeHtml(category.name)}</p>
        <span class="catalog-badge">${status}</span>
      </div>
      <p class="order-meta">${escapeHtml(category.description || "Izoh yo'q")}</p>
      <p class="order-meta">Tartib: ${category.sort_order} | ID: ${category.id}</p>
    </article>
  `;
}

function menuItemTemplate(item) {
  const badges = [
    item.is_popular ? "Top" : "",
    item.is_new ? "Yangi" : "",
    item.is_available ? "" : "Yo'q",
  ].filter(Boolean);
  const variants = item.variants?.length
    ? item.variants
        .map((variant) => `${escapeHtml(variant.name)} - ${formatMoney(variant.price)}`)
        .join(", ")
    : "Variant yo'q";
  const meta = [
    item.preparation_time_minutes ? `${item.preparation_time_minutes} min` : "",
    item.calories ? `${item.calories} kcal` : "",
    item.weight_grams ? `${item.weight_grams} g` : "",
  ].filter(Boolean);
  const addonGroups = item.addon_groups?.length
    ? item.addon_groups
        .map((group) => {
          const addons = group.items
            .map(
              (groupItem) =>
                `${escapeHtml(groupItem.addon.name)} +${formatMoney(groupItem.addon.price)}`,
            )
            .join(", ");

          return `
            <div class="addon-group-preview">
              <strong>${escapeHtml(group.name)} (${group.min_select}-${group.max_select})</strong>
              <span>${addons || "Addon yo'q"}</span>
            </div>
          `;
        })
        .join("")
    : "";

  return `
    <article class="catalog-admin-item">
      <div class="catalog-admin-topline">
        <p class="order-title">${escapeHtml(item.name)}</p>
        <span class="catalog-badge">${escapeHtml(item.category.name)}</span>
      </div>
      <p class="order-meta">${escapeHtml(item.description || "Izoh yo'q")}</p>
      <p class="order-meta">Narx: ${formatMoney(item.base_price)}${meta.length ? ` | ${meta.join(" | ")}` : ""}</p>
      <p class="order-meta">Variantlar: ${variants}</p>
      ${addonGroups ? `<div class="addon-groups-preview">${addonGroups}</div>` : ""}
      ${
        badges.length
          ? `<div class="catalog-badge-row">${badges.map((badge) => `<span class="catalog-badge">${badge}</span>`).join("")}</div>`
          : ""
      }
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

async function loadAdminCategories() {
  if (!isAdmin) {
    return;
  }

  adminStatusText.textContent = "Categoriyalar yuklanmoqda...";
  const response = await fetch("/api/admin/categories", {
    headers: authHeaders(),
  });

  if (!response.ok) {
    adminStatusText.textContent = "Categoriyalarni yuklab bo'lmadi.";
    return;
  }

  const categories = await response.json();
  ordersList.innerHTML = categories.length
    ? categories.map(categoryTemplate).join("")
    : `<p class="order-meta">Hali category yo'q.</p>`;
  adminStatusText.textContent = `Categoriyalar: ${categories.length}`;
}

async function loadAdminMenuItems() {
  if (!isAdmin) {
    return;
  }

  adminStatusText.textContent = "Itemlar yuklanmoqda...";
  const response = await fetch("/api/admin/menu-items", {
    headers: authHeaders(),
  });

  if (!response.ok) {
    adminStatusText.textContent = "Itemlarni yuklab bo'lmadi.";
    return;
  }

  const items = await response.json();
  ordersList.innerHTML = items.length
    ? items.map(menuItemTemplate).join("")
    : `<p class="order-meta">Hali item yo'q.</p>`;
  adminStatusText.textContent = `Itemlar: ${items.length}`;
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
    setAdminLayout(shouldNavigateToAdmin);
    setActiveAdminView("orders");
    await loadOrders();
    if (shouldNavigateToAdmin && window.location.pathname !== "/admin") {
      window.history.pushState({}, "", "/admin");
    }
    return;
  }

  if (shouldShowAdmin) {
    setAdminLayout(false);
    adminStatusText.textContent = "Admin kalit yoki Telegram admin ID kerak.";
  }
}

saveAdminKeyButton.addEventListener("click", async () => {
  adminKey = adminKeyInput.value.trim();
  window.localStorage.setItem("bonbon_admin_key", adminKey);
  shouldNavigateToAdmin = true;
  await checkAdmin();

  if (isAdmin) {
    adminPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  }
});

adminKeyInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    saveAdminKeyButton.click();
  }
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
