const telegram = window.Telegram?.WebApp;

if (telegram) {
  telegram.ready();
  telegram.expand();
}

const languageToggle = document.querySelector("#language-toggle");
const languageLabel = document.querySelector("#language-label");
const searchToggle = document.querySelector("#search-toggle");
const searchBar = document.querySelector("#search-bar");
const productSearchInput = document.querySelector("#product-search");
const userLoginToggle = document.querySelector("#user-login-toggle");
const profileName = document.querySelector("#profile-name");
const statusText = document.querySelector("#status");
const menuCategories = document.querySelector("#menu-categories");
const menuCategoryPrev = document.querySelector("#menu-category-prev");
const menuCategoryNext = document.querySelector("#menu-category-next");
const menuGrid = document.querySelector("#menu-grid");
const menuTitle = document.querySelector("#menu-title");
const menuModal = document.querySelector("#menu-modal");
const menuModalImage = document.querySelector("#menu-modal-image");
const menuModalTitle = document.querySelector("#menu-modal-title");
const menuModalDescription = document.querySelector("#menu-modal-description");
const menuModalPrice = document.querySelector("#menu-modal-price");
const menuModalMeta = document.querySelector("#menu-modal-meta");
const menuModalVariants = document.querySelector("#menu-modal-variants");
const menuModalAddons = document.querySelector("#menu-modal-addons");
const adminPanel = document.querySelector("#admin-panel");
const adminLogin = document.querySelector("#admin-login");
const adminLoginInput = document.querySelector("#admin-login-name");
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

const isLoginPage = window.location.pathname === "/login";
const isAdminPage = window.location.pathname === "/admin";
let adminLoginName = "";
let adminAccessToken = window.localStorage.getItem("bonbon_admin_access_token") || "";
let adminTokenExpiresAt = Number(window.localStorage.getItem("bonbon_admin_token_expires_at") || 0);
let isAdmin = false;
let activeLanguage = "UZ";
let activeAdminView = "categories";
let activeCrudRequestId = 0;
let activeMenuCategory = "all";
let menuItems = [];
let menuCategoryItems = [];
const adminCache = {
  categories: [],
  items: [],
  variants: [],
  addons: [],
  addonGroups: [],
  addonLinks: [],
};

const menuIcons = {
  arrowRight: `
    <svg class="menu-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  `,
  bottle: `
    <svg class="menu-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M10 2h4" />
      <path d="M11 6h2" />
      <path d="M9 10h6l1 10H8l1-10Z" />
      <path d="M9.5 14h5" />
    </svg>
  `,
  burger: `
    <svg class="menu-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 13h16" />
      <path d="M5 13a7 7 0 0 1 14 0" />
      <path d="M5 17h14" />
      <path d="M7 21h10a3 3 0 0 0 3-3v-1H4v1a3 3 0 0 0 3 3Z" />
      <path d="M8 9h.01M12 7h.01M16 9h.01" />
    </svg>
  `,
  cake: `
    <svg class="menu-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 11h16" />
      <path d="M5 11v8h14v-8" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      <path d="M8 15h.01M12 15h.01M16 15h.01" />
    </svg>
  `,
  cheese: `
    <svg class="menu-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 19h16V8L4 13v6Z" />
      <path d="M4 13 20 8" />
      <path d="M8 16h.01M13 13h.01M16 17h.01" />
    </svg>
  `,
  cloche: `
    <svg class="menu-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 17h16" />
      <path d="M6 17a6 6 0 0 1 12 0" />
      <path d="M12 7v2" />
      <path d="M10 5h4" />
      <path d="M5 20h14" />
    </svg>
  `,
  coffee: `
    <svg class="menu-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 8h10v7a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4V8Z" />
      <path d="M16 10h1a3 3 0 0 1 0 6h-1" />
      <path d="M8 3v2M12 3v2M16 3v2" />
    </svg>
  `,
  fileText: `
    <svg class="menu-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7l-5-5Z" />
      <path d="M14 2v5h5" />
      <path d="M9 13h6" />
      <path d="M9 17h6" />
      <path d="M9 9h1" />
    </svg>
  `,
  fries: `
    <svg class="menu-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="m7 7-.8-4" />
      <path d="m11 7 .2-5" />
      <path d="m15 7 1-4" />
      <path d="M5 8h14l-1.4 13H6.4L5 8Z" />
      <path d="M8 12h8" />
    </svg>
  `,
  layers: `
    <svg class="menu-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="m12 3 8 4.5-8 4.5-8-4.5L12 3Z" />
      <path d="m4 12 8 4.5 8-4.5" />
      <path d="m4 16.5 8 4.5 8-4.5" />
    </svg>
  `,
  leaf: `
    <svg class="menu-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 4c-7.5 0-12 4.5-12 12 7.5 0 12-4.5 12-12Z" />
      <path d="M8 16 4 20" />
    </svg>
  `,
  meat: `
    <svg class="menu-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M18.5 10.5a5.5 5.5 0 0 1-8.1 4.8l-1.8 1.8a2.5 2.5 0 1 1-3.6-3.6l1.8-1.8a5.5 5.5 0 1 1 11.7-1.2Z" />
      <path d="M14.5 8.5h.01" />
      <path d="M12 12h.01" />
    </svg>
  `,
  star: `
    <svg class="menu-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 16.9l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" />
    </svg>
  `,
  tag: `
    <svg class="menu-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 10 12 2H5v7l8 8 7-7Z" />
      <path d="M8 6h.01" />
    </svg>
  `,
  wrap: `
    <svg class="menu-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 21 18.5 9.5a4.4 4.4 0 0 0-6.2-6.2L4.8 10.8a2.7 2.7 0 0 0 0 3.8L11.4 21H7Z" />
      <path d="M9 8.5 15.5 15" />
      <path d="M12.5 5.5 18 11" />
    </svg>
  `,
};

async function loadCatalog() {
  try {
    const [categoriesResponse, itemsResponse] = await Promise.all([
      fetch("/api/catalog/categories"),
      fetch("/api/catalog/menu-items"),
    ]);
    if (!categoriesResponse.ok || !itemsResponse.ok) {
      return;
    }

    menuCategoryItems = await categoriesResponse.json();
    menuItems = await itemsResponse.json();
    renderMenuCategories();
    renderMenuGrid();
  } catch {
    if (statusText) {
      statusText.textContent = "Menu hozircha yuklanmadi.";
    }
  }
}

function iconSvg(name) {
  return menuIcons[name] || menuIcons.tag;
}

function isLavashItem(item) {
  const value = `${item.name || ""} ${item.category?.name || ""}`.toLowerCase();
  return value.includes("lavash");
}

function menuImageForItem(item) {
  if (item.image_url) {
    return item.image_url;
  }

  if (isLavashItem(item)) {
    return "/static/assets/lavash-wrap.jpg";
  }

  return fallbackMenuImage(item);
}

function formatMenuMoney(amount) {
  return String(Math.round(Number(amount || 0))).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function menuPriceTemplate(amount) {
  return `
    <span class="menu-price-value">${formatMenuMoney(amount)}</span>
    <span class="menu-price-currency">so'm</span>
  `;
}

function menuCategoryIcon(item) {
  const category = `${item.category?.name || menuCategoryName(item.category_id)}`.toLowerCase();
  const name = `${item.name || ""}`.toLowerCase();

  if (category.includes("lavash") || name.includes("lavash")) {
    return "wrap";
  }
  if (category.includes("burger")) {
    return "burger";
  }
  if (category.includes("ichimlik")) {
    return "coffee";
  }
  if (category.includes("desert")) {
    return "cake";
  }

  return "tag";
}

function displayVariantName(name) {
  const normalized = String(name || "").toLowerCase();
  if (normalized.includes("kichik") || normalized.includes("mini")) {
    return "Mini";
  }
  if (normalized.includes("standart") || normalized.includes("oddiy")) {
    return "Oddiy";
  }
  if (normalized.includes("katta") || normalized.includes("big")) {
    return "Big";
  }
  return name || "Oddiy";
}

function variantIconName(name, index) {
  const normalized = String(name || "").toLowerCase();
  if (normalized.includes("standart") || normalized.includes("oddiy")) {
    return "star";
  }
  return index === 1 ? "star" : "wrap";
}

function addonDisplayName(name) {
  const normalized = String(name || "").toLowerCase();
  if (normalized.includes("pishloq") || normalized.includes("sir")) {
    return "Sir";
  }
  if (normalized.includes("go'sht") || normalized.includes("go‘sht") || normalized.includes("gosht")) {
    return "Go'sht";
  }
  if (normalized.includes("ketchup")) {
    return "Ketchup";
  }
  if (normalized.includes("sous")) {
    return "Sous";
  }
  if (normalized.includes("fri")) {
    return "Fri";
  }
  return name || "Qo'shimcha";
}

function addonIconName(name) {
  const normalized = String(name || "").toLowerCase();
  if (normalized.includes("pishloq") || normalized.includes("sir")) {
    return "cheese";
  }
  if (normalized.includes("go'sht") || normalized.includes("go‘sht") || normalized.includes("gosht")) {
    return "meat";
  }
  if (normalized.includes("fri")) {
    return "fries";
  }
  if (normalized.includes("sous") || normalized.includes("ketchup")) {
    return "bottle";
  }
  return "cloche";
}

function addonPriority(name) {
  const normalized = String(name || "").toLowerCase();
  if (normalized.includes("pishloq") || normalized.includes("sir")) {
    return 1;
  }
  if (normalized.includes("go'sht") || normalized.includes("go‘sht") || normalized.includes("gosht")) {
    return 2;
  }
  if (normalized.includes("ketchup")) {
    return 3;
  }
  if (normalized.includes("sous")) {
    return 4;
  }
  if (normalized.includes("fri")) {
    return 5;
  }
  return 20;
}

function menuAddons(item) {
  return (item.addon_groups || [])
    .flatMap((group) => group.items || [])
    .map((groupItem) => groupItem.addon)
    .filter(Boolean)
    .sort((left, right) => addonPriority(left.name) - addonPriority(right.name));
}

function menuVariantOptions(item) {
  return item.variants?.length
    ? item.variants
    : [
        {
          id: `base-${item.id}`,
          name: "Oddiy",
          price: item.base_price,
          weight_grams: item.weight_grams,
        },
      ];
}

function fallbackMenuImage(item) {
  const colors = [
    ["#f7b267", "#f79d65"],
    ["#f6bd60", "#f28482"],
    ["#84a59d", "#f5cac3"],
    ["#90be6d", "#f9c74f"],
  ][Number(item.id || 0) % 4];
  const label = encodeURIComponent(item.name || "Bon-Bon");
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 240 240'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' x2='1' y1='0' y2='1'%3E%3Cstop stop-color='${encodeURIComponent(colors[0])}'/%3E%3Cstop offset='1' stop-color='${encodeURIComponent(colors[1])}'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='240' height='240' rx='28' fill='url(%23g)'/%3E%3Ccircle cx='184' cy='46' r='24' fill='rgba(255,255,255,.32)'/%3E%3Ccircle cx='52' cy='182' r='38' fill='rgba(255,255,255,.2)'/%3E%3Ctext x='120' y='124' text-anchor='middle' font-family='Arial' font-size='22' font-weight='700' fill='white'%3E${label}%3C/text%3E%3C/svg%3E`;
}

function renderMenuCategories() {
  const buttons = [
    `<button class="menu-category-button ${activeMenuCategory === "all" ? "is-active" : ""}" data-menu-category="all" type="button">Barchasi</button>`,
    ...menuCategoryItems.map(
      (category) => `
        <button class="menu-category-button ${String(activeMenuCategory) === String(category.id) ? "is-active" : ""}" data-menu-category="${category.id}" type="button">
          ${escapeHtml(category.name)}
        </button>
      `,
    ),
  ];
  menuCategories.innerHTML = buttons.join("");
}

function renderMenuGrid() {
  const searchTerm = productSearchInput.value.trim().toLowerCase();
  const filteredItems = menuItems.filter((item) => {
    const matchesCategory =
      activeMenuCategory === "all" || String(item.category_id) === String(activeMenuCategory);
    const matchesSearch = [item.name, item.description, item.category?.name]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(searchTerm);
    return matchesCategory && matchesSearch;
  });

  menuGrid.innerHTML = filteredItems.length
    ? filteredItems.map(menuCardTemplate).join("")
    : `<p class="menu-empty">Menu topilmadi.</p>`;
  menuTitle.textContent =
    activeMenuCategory === "all" ? "Barchasi" : menuCategoryName(activeMenuCategory);
}

function menuCardTemplate(item) {
  const imageUrl = menuImageForItem(item);
  const categoryName = item.category?.name || menuCategoryName(item.category_id);
  const variants = menuVariantOptions(item).slice(0, 3);
  const addons = menuAddons(item).slice(0, 3);
  const displayPrice = selectedVariant(item)?.price ?? item.base_price;
  const description = item.description || "Tavsif hozircha yo'q.";

  return `
    <article class="menu-card">
      <div class="menu-card-media">
        <img class="menu-card-image" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(item.name)}" loading="lazy" />
        <span class="menu-media-pill menu-media-category">
          ${iconSvg(menuCategoryIcon(item))}
          <span>${escapeHtml(categoryName)}</span>
        </span>
        <span class="menu-media-pill menu-media-status">
          <span class="menu-status-dot" aria-hidden="true"></span>
          <span>${item.is_available ? "Sotuvda bor" : "Sotuvda yo'q"}</span>
        </span>
      </div>
      <div class="menu-card-body">
        <div class="menu-card-heading">
          <h2>${escapeHtml(item.name)}</h2>
          <strong class="menu-card-price">${menuPriceTemplate(displayPrice)}</strong>
        </div>
        <p class="menu-card-subline">
          ${iconSvg("leaf")}
          <span>${escapeHtml(description)}</span>
        </p>
        <div class="menu-info-stack">
          <section class="menu-info-row menu-info-category" aria-label="Category">
            <span class="menu-info-icon">${iconSvg("tag")}</span>
            <span class="menu-info-copy">
              <span>Category</span>
              <strong>${escapeHtml(categoryName)}</strong>
            </span>
          </section>
          <section class="menu-info-row menu-info-variants" aria-label="Variantlar">
            <span class="menu-info-icon">${iconSvg("layers")}</span>
            <span class="menu-info-copy">
              <span>Variantlar</span>
              <span class="menu-option-grid">
                ${variants
                  .map(
                    (variant, index) => `
                      <span class="menu-option-pill">
                        ${iconSvg(variantIconName(variant.name, index))}
                        <span>${escapeHtml(displayVariantName(variant.name))}</span>
                      </span>
                    `,
                  )
                  .join("")}
              </span>
            </span>
          </section>
          <section class="menu-info-row menu-info-addons" aria-label="Qo'shimchalar">
            <span class="menu-info-icon">${iconSvg("cloche")}</span>
            <span class="menu-info-copy">
              <span>Qo'shimchalar</span>
              <span class="menu-option-grid">
                ${
                  addons.length
                    ? addons
                        .map(
                          (addon) => `
                            <span class="menu-option-pill menu-addon-pill">
                              ${iconSvg(addonIconName(addon.name))}
                              <span>${escapeHtml(addonDisplayName(addon.name))}</span>
                            </span>
                          `,
                        )
                        .join("")
                    : `
                      <span class="menu-option-pill menu-addon-pill is-muted">
                        ${iconSvg("cloche")}
                        <span>Yo'q</span>
                      </span>
                    `
                }
              </span>
            </span>
          </section>
        </div>
        <button class="menu-view-button" data-menu-view="${item.id}" type="button">
          <span class="menu-view-label">
            ${iconSvg("fileText")}
            <span>Batafsil</span>
          </span>
          <span class="menu-view-arrow">${iconSvg("arrowRight")}</span>
        </button>
      </div>
    </article>
  `;
}

function selectedVariant(item, variantId) {
  const variants = item.variants || [];
  return (
    variants.find((variant) => String(variant.id) === String(variantId)) ||
    variants.find((variant) => variant.is_default) ||
    variants[0] ||
    null
  );
}

function renderModalDynamicInfo(item, variantId = null) {
  const variant = selectedVariant(item, variantId);
  const price = variant?.price ?? item.base_price;
  const weight = variant?.weight_grams ?? item.weight_grams;
  const meta = [
    item.category?.name || menuCategoryName(item.category_id),
    item.preparation_time_minutes ? `${item.preparation_time_minutes} min` : "",
    item.calories ? `${item.calories} kcal` : "",
    weight ? `${weight} g` : "",
  ].filter(Boolean);

  menuModalPrice.innerHTML = menuPriceTemplate(price);
  menuModalMeta.innerHTML = meta.map((value) => `<span>${escapeHtml(value)}</span>`).join("");
}

function openMenuModal(item) {
  const imageUrl = menuImageForItem(item);
  menuModalImage.src = imageUrl;
  menuModalImage.alt = item.name;
  menuModalTitle.textContent = item.name;
  menuModalDescription.textContent = item.description || "Tavsif hozircha yo'q.";

  const defaultVariant = selectedVariant(item);
  menuModalVariants.innerHTML = item.variants?.length
    ? `
      <h3>Variantlar</h3>
      <div class="menu-variant-options">
        ${item.variants
          .map(
            (variant) => `
              <label class="menu-variant-option">
                <input
                  name="menu-variant"
                  type="radio"
                  value="${variant.id}"
                  ${String(variant.id) === String(defaultVariant?.id) ? "checked" : ""}
                />
                <span>
                  <strong>${escapeHtml(variant.name)}</strong>
                  <small>${formatMoney(variant.price)}${variant.weight_grams ? ` / ${variant.weight_grams} g` : ""}</small>
                </span>
              </label>
            `,
          )
          .join("")}
      </div>
    `
    : "";

  menuModalAddons.innerHTML = item.addon_groups?.length
    ? `
      <h3>Qo'shimchalar</h3>
      <div class="menu-addon-groups">
        ${item.addon_groups
          .map((group) => {
            const addons = group.items
              .map(
                (groupItem) => `
                  <span class="menu-addon-chip">
                    <span>${escapeHtml(groupItem.addon.name)}</span>
                    <strong>+${formatMoney(groupItem.addon.price)}</strong>
                  </span>
                `,
              )
              .join("");
            return `
              <div class="menu-addon-group">
                <div class="menu-addon-group-head">
                  <strong>${escapeHtml(group.name)}</strong>
                  <em>${group.is_required ? "Majburiy" : `${group.min_select}-${group.max_select}`}</em>
                </div>
                <div>${addons || `<span class="menu-addon-chip"><span>Qo'shimcha yo'q</span></span>`}</div>
              </div>
            `;
          })
          .join("")}
      </div>
    `
    : "";

  renderModalDynamicInfo(item, defaultVariant?.id);
  menuModal.dataset.itemId = item.id;
  menuModal.classList.remove("is-hidden");
}

function closeMenuModal() {
  menuModal.classList.add("is-hidden");
  menuModal.removeAttribute("data-item-id");
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

productSearchInput.addEventListener("input", renderMenuGrid);

searchBar.addEventListener("submit", (event) => {
  event.preventDefault();
});

function openLoginSection() {
  setLoginLayout(true);
  setAdminLayout(false);
  adminPanel.classList.remove("is-hidden");
  adminLogin.classList.remove("is-hidden");
  adminLoginInput.value = "";
  adminKeyInput.value = "";
  adminStatusText.textContent = "Admin login va parolni kiriting.";
  adminLogin.scrollIntoView({ behavior: "smooth", block: "center" });
  adminLoginInput.focus();
}

function hasValidAdminToken() {
  return Boolean(adminAccessToken && adminTokenExpiresAt && Date.now() < adminTokenExpiresAt);
}

function clearAdminToken() {
  adminAccessToken = "";
  adminTokenExpiresAt = 0;
  isAdmin = false;
  window.localStorage.removeItem("bonbon_admin_access_token");
  window.localStorage.removeItem("bonbon_admin_token_expires_at");
  window.localStorage.removeItem("bonbon_admin_key");
  window.localStorage.removeItem("bonbon_admin_password");
}

function storeAdminToken(token) {
  adminAccessToken = token.access_token;
  adminTokenExpiresAt = Number(token.expires_at) * 1000;
  window.localStorage.setItem("bonbon_admin_access_token", adminAccessToken);
  window.localStorage.setItem("bonbon_admin_token_expires_at", String(adminTokenExpiresAt));
}

async function openAdminFromToken() {
  if (!hasValidAdminToken()) {
    clearAdminToken();
    window.location.href = "/login";
    return;
  }

  window.location.href = "/admin";
}

function setAdminLayout(isEnabled) {
  document.body.classList.toggle("is-admin-view", isEnabled);
}

function setLoginLayout(isEnabled) {
  document.body.classList.toggle("is-login-view", isEnabled);
}

function setActiveAdminView(view) {
  adminViewButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.adminView === view);
  });
}

function showAdminPlaceholder(view) {
  activeAdminView = view;
  setActiveAdminView(view);

  if (view === "categories") {
    loadCrudView("categories");
    return;
  }

  if (view === "items") {
    loadCrudView("items");
    return;
  }

  if (view === "variants") {
    loadCrudView("variants");
    return;
  }

  if (view === "addon-groups") {
    loadCrudView("addonGroups");
    return;
  }

  if (view === "addons") {
    loadCrudView("addons");
    return;
  }

  if (view === "addon-links") {
    loadCrudView("addonLinks");
  }
}

if (adminMenuToggle && adminMenuList) {
  adminMenuToggle.addEventListener("click", () => {
    const isCollapsed = adminMenuList.classList.toggle("is-collapsed");
    adminMenuToggle.setAttribute("aria-expanded", String(!isCollapsed));
  });
}

adminViewButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (!isAdmin) {
      openLoginSection();
      return;
    }

    showAdminPlaceholder(button.dataset.adminView);
  });
});

userLoginToggle.addEventListener("pointerenter", () => {
  userLoginToggle.classList.add("is-hovered");
});

userLoginToggle.addEventListener("pointerleave", () => {
  userLoginToggle.classList.remove("is-hovered", "is-pressed");
});

userLoginToggle.addEventListener("pointerdown", () => {
  userLoginToggle.classList.add("is-pressed");
});

userLoginToggle.addEventListener("pointerup", () => {
  userLoginToggle.classList.remove("is-pressed");
});

userLoginToggle.addEventListener("pointercancel", () => {
  userLoginToggle.classList.remove("is-hovered", "is-pressed");
});

userLoginToggle.addEventListener("blur", () => {
  userLoginToggle.classList.remove("is-hovered", "is-pressed");
});

userLoginToggle.addEventListener("click", async () => {
  if (hasValidAdminToken()) {
    await openAdminFromToken();
    return;
  }

  window.location.href = "/login";
});

menuCategories.addEventListener("click", (event) => {
  const button = event.target.closest("[data-menu-category]");
  if (!button) {
    return;
  }

  activeMenuCategory = button.dataset.menuCategory;
  renderMenuCategories();
  renderMenuGrid();
});

menuCategoryPrev.addEventListener("click", () => {
  menuCategories.scrollBy({ left: -180, behavior: "smooth" });
});

menuCategoryNext.addEventListener("click", () => {
  menuCategories.scrollBy({ left: 180, behavior: "smooth" });
});

menuGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-menu-view]");
  if (!button) {
    return;
  }

  const item = menuItems.find((menuItem) => String(menuItem.id) === String(button.dataset.menuView));
  if (!item) {
    return;
  }

  openMenuModal(item);
});

menuModal.addEventListener("click", (event) => {
  if (event.target.closest("[data-menu-modal-close]")) {
    closeMenuModal();
  }
});

menuModalVariants.addEventListener("change", (event) => {
  const input = event.target.closest('input[name="menu-variant"]');
  if (!input) {
    return;
  }

  const item = menuItems.find((menuItem) => String(menuItem.id) === String(menuModal.dataset.itemId));
  if (!item) {
    return;
  }

  renderModalDynamicInfo(item, input.value);
});

function authHeaders() {
  const headers = {};

  if (telegram?.initData) {
    headers["X-Telegram-Init-Data"] = telegram.initData;
  }

  if (hasValidAdminToken()) {
    headers["X-Admin-Token"] = adminAccessToken;
  }

  return headers;
}

function requestTelegramContact() {
  if (!telegram?.requestContact) {
    return;
  }

  const storageKey = "bonbon_contact_status";
  const status = window.localStorage.getItem(storageKey);
  if (status === "shared" || status === "denied" || status === "asked") {
    return;
  }

  window.localStorage.setItem(storageKey, "asked");
  try {
    telegram.requestContact((isShared) => {
      window.localStorage.setItem(storageKey, isShared ? "shared" : "denied");
    });
  } catch {
    window.localStorage.setItem(storageKey, "denied");
  }
}

function formatUser(user) {
  if (!user) {
    return "Telegram foydalanuvchi yo'q";
  }

  const name = [user.first_name, user.last_name].filter(Boolean).join(" ");
  const username = user.username ? `@${user.username}` : "";
  return [name, username, `ID: ${user.telegram_id}`].filter(Boolean).join(" ");
}

function profileLabel(user, hasAdminAccess) {
  if (user?.first_name || user?.last_name) {
    return [user.first_name, user.last_name].filter(Boolean).join(" ");
  }

  if (user?.username) {
    return `@${user.username}`;
  }

  if (hasAdminAccess) {
    return "Admin";
  }

  if (hasValidAdminToken()) {
    return "Login";
  }

  return "Login";
}

function renderProfile(me = { is_admin: false, user: null }) {
  profileName.textContent = profileLabel(me.user, Boolean(me.is_admin));
  userLoginToggle.classList.toggle("is-authenticated", Boolean(me.user || me.is_admin));
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

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Rasmni o'qib bo'lmadi."));
    image.src = URL.createObjectURL(file);
  });
}

async function imageFileToDataUrl(file) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Faqat rasm fayl tanlang.");
  }

  if (file.type === "image/svg+xml") {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Rasmni yuklab bo'lmadi."));
      reader.readAsDataURL(file);
    });
  }

  const image = await loadImage(file);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  const maxEncodedLength = 60000;
  const sizes = [640, 520, 420, 320];
  const qualities = [0.76, 0.64, 0.52, 0.42];
  let result = "";

  for (const maxSize of sizes) {
    const scale = Math.min(1, maxSize / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    canvas.width = width;
    canvas.height = height;
    context.fillStyle = "#fff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    for (const quality of qualities) {
      result = canvas.toDataURL("image/jpeg", quality);
      if (result.length <= maxEncodedLength) {
        URL.revokeObjectURL(image.src);
        return result;
      }
    }
  }

  URL.revokeObjectURL(image.src);
  return result;
}

async function adminApi(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...authHeaders(),
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || "Admin so'rov bajarilmadi.");
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

function byId(items, id) {
  return items.find((item) => String(item.id) === String(id));
}

function categoryName(id) {
  return byId(adminCache.categories, id)?.name || `Category #${id}`;
}

function menuItemName(id) {
  return byId(adminCache.items, id)?.name || `Item #${id}`;
}

function menuCategoryName(id) {
  return byId(menuCategoryItems, id)?.name || `Category #${id}`;
}

function addonName(id) {
  return byId(adminCache.addons, id)?.name || `Addon #${id}`;
}

function addonGroupName(id) {
  const group = byId(adminCache.addonGroups, id);
  return group ? `${group.name} / ${menuItemName(group.menu_item_id)}` : `Group #${id}`;
}

function fieldValue(item, field) {
  const value = item?.[field.name];
  if (field.type === "checkbox") {
    return Boolean(value);
  }
  return value ?? field.default ?? "";
}

function renderField(field, item) {
  const value = fieldValue(item, field);
  const commonAttrs = [
    `name="${field.name}"`,
    `data-field-type="${field.type || "text"}"`,
    field.required ? "required" : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (field.type === "textarea") {
    return `
      <label>${field.label}
        <textarea ${commonAttrs}>${escapeHtml(value)}</textarea>
      </label>
    `;
  }

  if (field.type === "select") {
    const options = field
      .options()
      .map(
        (option) =>
          `<option value="${escapeHtml(option.value)}" ${String(option.value) === String(value) ? "selected" : ""}>${escapeHtml(option.label)}</option>`,
      )
      .join("");
    return `
      <label>${field.label}
        <select ${commonAttrs}>${options}</select>
      </label>
    `;
  }

  if (field.type === "checkbox") {
    return `
      <label class="admin-check">
        <input ${commonAttrs} type="checkbox" ${value ? "checked" : ""} />
        <span>${field.label}</span>
      </label>
    `;
  }

  if (field.name === "image_url") {
    return `
      <label class="image-upload-field">${field.label}
        <input ${commonAttrs} type="url" placeholder="https://... yoki rasm yuklang" value="${escapeHtml(value)}" />
        <input class="image-upload-input" type="file" accept="image/*" data-image-upload-for="${field.name}" />
        <span class="image-upload-hint">Rasm tanlang yoki URL qoldiring</span>
        ${value ? `<img class="image-upload-preview" src="${escapeHtml(value)}" alt="" />` : `<img class="image-upload-preview is-hidden" alt="" />`}
      </label>
    `;
  }

  return `
    <label>${field.label}
      <input ${commonAttrs} type="${field.type || "text"}" ${field.type === "number" ? 'step="any"' : ""} value="${escapeHtml(value)}" />
    </label>
  `;
}

function payloadFromForm(form, fields) {
  const payload = {};
  fields.forEach((field) => {
    const input = form.elements[field.name];
    if (!input) {
      return;
    }

    if (field.type === "checkbox") {
      payload[field.name] = input.checked;
      return;
    }

    if (field.type === "number" || field.type === "select") {
      payload[field.name] = input.value === "" ? null : Number(input.value);
      return;
    }

    payload[field.name] = input.value.trim() || null;
  });
  return payload;
}

function renderCrudForm(type, item = null) {
  const config = crudConfigs[type];
  const id = item?.id || "";
  return `
    <form class="admin-crud-form" data-crud-type="${type}" data-id="${escapeHtml(id)}">
      <div class="crud-form-head">
        <strong>${item ? "Tahrirlash" : "Yangi yozuv"}: ${config.title}</strong>
        ${item ? `<button class="text-button" data-cancel-edit="${type}" type="button">Bekor</button>` : ""}
      </div>
      <div class="crud-form-grid">
        ${config.fields.map((field) => renderField(field, item)).join("")}
      </div>
      <button class="primary-button admin-save-button" type="submit">
        ${item ? "Saqlash" : "Qo'shish"}
      </button>
    </form>
  `;
}

function renderCrudActions(type, item) {
  return `
    <div class="crud-actions">
      <button class="status-button" data-edit-type="${type}" data-edit-id="${item.id}" type="button">Edit</button>
      <button class="status-button danger" data-delete-type="${type}" data-delete-id="${item.id}" type="button">Delete</button>
    </div>
  `;
}

const crudConfigs = {
  categories: {
    title: "Categoriyalar",
    endpoint: "/api/admin/categories",
    heading: "Category CRUD",
    fields: [
      { name: "name", label: "Nomi", required: true },
      { name: "description", label: "Izoh", type: "textarea" },
      { name: "image_url", label: "Rasm URL" },
      { name: "sort_order", label: "Tartib", type: "number", default: 0 },
      { name: "is_active", label: "Aktiv", type: "checkbox", default: true },
    ],
    renderItem(item) {
      return `
        <article class="catalog-admin-item">
          <div class="catalog-admin-topline">
            <p class="order-title">${escapeHtml(item.name)}</p>
            <span class="catalog-badge">${item.is_active ? "active" : "hidden"}</span>
          </div>
          <p class="order-meta">${escapeHtml(item.description || "Izoh yo'q")}</p>
          <p class="order-meta">Tartib: ${item.sort_order} | ID: ${item.id}</p>
          ${renderCrudActions("categories", item)}
        </article>
      `;
    },
  },
  items: {
    title: "Menu Itemlar",
    endpoint: "/api/admin/menu-items",
    heading: "Menu Item CRUD",
    dependencies: ["categories"],
    fields: [
      {
        name: "category_id",
        label: "Category",
        type: "select",
        required: true,
        options: () =>
          adminCache.categories.map((category) => ({ value: category.id, label: category.name })),
      },
      { name: "name", label: "Nomi", required: true },
      { name: "description", label: "Izoh", type: "textarea" },
      { name: "base_price", label: "Asosiy narx", type: "number", default: 0 },
      { name: "image_url", label: "Rasm URL" },
      { name: "sort_order", label: "Tartib", type: "number", default: 0 },
      { name: "preparation_time_minutes", label: "Tayyorlash min.", type: "number" },
      { name: "calories", label: "Kaloriya", type: "number" },
      { name: "weight_grams", label: "Gram", type: "number" },
      { name: "is_available", label: "Sotuvda bor", type: "checkbox", default: true },
      { name: "is_popular", label: "Popular", type: "checkbox", default: false },
      { name: "is_new", label: "Yangi", type: "checkbox", default: false },
    ],
    renderItem(item) {
      return `
        <article class="catalog-admin-item">
          <div class="catalog-admin-topline">
            <p class="order-title">${escapeHtml(item.name)}</p>
            <span class="catalog-badge">${escapeHtml(categoryName(item.category_id))}</span>
          </div>
          <p class="order-meta">${escapeHtml(item.description || "Izoh yo'q")}</p>
          <p class="order-meta">Narx: ${formatMoney(item.base_price)} | Tartib: ${item.sort_order}</p>
          <div class="catalog-badge-row">
            ${item.is_available ? `<span class="catalog-badge">bor</span>` : `<span class="catalog-badge">yo'q</span>`}
            ${item.is_popular ? `<span class="catalog-badge">top</span>` : ""}
            ${item.is_new ? `<span class="catalog-badge">yangi</span>` : ""}
          </div>
          ${renderCrudActions("items", item)}
        </article>
      `;
    },
  },
  variants: {
    title: "Variantlar",
    endpoint: "/api/admin/variants",
    heading: "Variant CRUD",
    dependencies: ["items"],
    fields: [
      {
        name: "menu_item_id",
        label: "Menu item",
        type: "select",
        required: true,
        options: () => adminCache.items.map((item) => ({ value: item.id, label: item.name })),
      },
      { name: "name", label: "Nomi", required: true },
      { name: "price", label: "Narx", type: "number", default: 0 },
      { name: "weight_grams", label: "Gram", type: "number" },
      { name: "sort_order", label: "Tartib", type: "number", default: 0 },
      { name: "is_default", label: "Default", type: "checkbox", default: false },
      { name: "is_available", label: "Sotuvda bor", type: "checkbox", default: true },
    ],
    renderItem(item) {
      return `
        <article class="catalog-admin-item">
          <div class="catalog-admin-topline">
            <p class="order-title">${escapeHtml(item.name)}</p>
            <span class="catalog-badge">${escapeHtml(menuItemName(item.menu_item_id))}</span>
          </div>
          <p class="order-meta">Narx: ${formatMoney(item.price)} | Gram: ${item.weight_grams || "-"}</p>
          ${renderCrudActions("variants", item)}
        </article>
      `;
    },
  },
  addons: {
    title: "Addonlar",
    endpoint: "/api/admin/addons",
    heading: "Addon CRUD",
    fields: [
      { name: "name", label: "Nomi", required: true },
      { name: "description", label: "Izoh", type: "textarea" },
      { name: "price", label: "Narx", type: "number", default: 0 },
      { name: "is_available", label: "Sotuvda bor", type: "checkbox", default: true },
    ],
    renderItem(item) {
      return `
        <article class="catalog-admin-item">
          <div class="catalog-admin-topline">
            <p class="order-title">${escapeHtml(item.name)}</p>
            <span class="catalog-badge">${formatMoney(item.price)}</span>
          </div>
          <p class="order-meta">${escapeHtml(item.description || "Izoh yo'q")}</p>
          ${renderCrudActions("addons", item)}
        </article>
      `;
    },
  },
  addonGroups: {
    title: "Addon Grouplar",
    endpoint: "/api/admin/addon-groups",
    heading: "Addon Group CRUD",
    dependencies: ["items"],
    fields: [
      {
        name: "menu_item_id",
        label: "Menu item",
        type: "select",
        required: true,
        options: () => adminCache.items.map((item) => ({ value: item.id, label: item.name })),
      },
      { name: "name", label: "Nomi", required: true },
      { name: "min_select", label: "Min tanlov", type: "number", default: 0 },
      { name: "max_select", label: "Max tanlov", type: "number", default: 1 },
      { name: "sort_order", label: "Tartib", type: "number", default: 0 },
      { name: "is_required", label: "Majburiy", type: "checkbox", default: false },
    ],
    renderItem(item) {
      return `
        <article class="catalog-admin-item">
          <div class="catalog-admin-topline">
            <p class="order-title">${escapeHtml(item.name)}</p>
            <span class="catalog-badge">${escapeHtml(menuItemName(item.menu_item_id))}</span>
          </div>
          <p class="order-meta">Tanlov: ${item.min_select}-${item.max_select} | Tartib: ${item.sort_order}</p>
          ${renderCrudActions("addonGroups", item)}
        </article>
      `;
    },
  },
  addonLinks: {
    title: "Group Addonlar",
    endpoint: "/api/admin/addon-group-items",
    heading: "Addon Group Item CRUD",
    dependencies: ["addonGroups", "addons", "items"],
    fields: [
      {
        name: "addon_group_id",
        label: "Addon group",
        type: "select",
        required: true,
        options: () =>
          adminCache.addonGroups.map((group) => ({
            value: group.id,
            label: addonGroupName(group.id),
          })),
      },
      {
        name: "addon_id",
        label: "Addon",
        type: "select",
        required: true,
        options: () => adminCache.addons.map((addon) => ({ value: addon.id, label: addon.name })),
      },
      { name: "sort_order", label: "Tartib", type: "number", default: 0 },
    ],
    renderItem(item) {
      return `
        <article class="catalog-admin-item">
          <div class="catalog-admin-topline">
            <p class="order-title">${escapeHtml(addonGroupName(item.addon_group_id))}</p>
            <span class="catalog-badge">${escapeHtml(addonName(item.addon_id))}</span>
          </div>
          <p class="order-meta">Tartib: ${item.sort_order} | ID: ${item.id}</p>
          ${renderCrudActions("addonLinks", item)}
        </article>
      `;
    },
  },
};

async function loadCrudDependency(name) {
  if (name === "categories") {
    adminCache.categories = await adminApi("/api/admin/categories");
    return;
  }
  if (name === "items") {
    adminCache.items = await adminApi("/api/admin/menu-items");
    return;
  }
  if (name === "addons") {
    adminCache.addons = await adminApi("/api/admin/addons");
    return;
  }
  if (name === "addonGroups") {
    adminCache.addonGroups = await adminApi("/api/admin/addon-groups");
  }
}

async function loadCrudView(type, editingItem = null) {
  if (!isAdmin) {
    return;
  }

  const requestId = ++activeCrudRequestId;
  const config = crudConfigs[type];
  document.querySelector(".admin-heading h2").textContent = config.heading;
  adminStatusText.textContent = `${config.title} yuklanmoqda...`;
  ordersList.innerHTML = `<p class="order-meta">Yuklanmoqda...</p>`;

  try {
    for (const dependency of config.dependencies || []) {
      await loadCrudDependency(dependency);
    }

    const items = await adminApi(config.endpoint);
    if (requestId !== activeCrudRequestId) {
      return;
    }

    adminCache[type] = items;
    ordersList.innerHTML = `
      ${renderCrudForm(type, editingItem)}
      <div class="crud-list">
        ${items.length ? items.map((item) => config.renderItem(item)).join("") : `<p class="order-meta">Hali yozuv yo'q.</p>`}
      </div>
    `;
    adminStatusText.textContent = `${config.title}: ${items.length}`;
  } catch (error) {
    adminStatusText.textContent = error.message;
  }
}

async function submitCrudForm(form) {
  const type = form.dataset.crudType;
  const config = crudConfigs[type];
  const id = form.dataset.id;
  const payload = payloadFromForm(form, config.fields);
  const endpoint = id ? `${config.endpoint}/${id}` : config.endpoint;

  await adminApi(endpoint, {
    method: id ? "PATCH" : "POST",
    body: JSON.stringify(payload),
  });
  await loadCrudView(type);
}

async function deleteCrudItem(type, id) {
  const config = crudConfigs[type];
  if (!window.confirm("O'chirishni tasdiqlaysizmi?")) {
    return;
  }

  await adminApi(`${config.endpoint}/${id}`, { method: "DELETE" });
  await loadCrudView(type);
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
  if (adminAccessToken && !hasValidAdminToken()) {
    clearAdminToken();
  }

  if (isAdminPage) {
    adminPanel.classList.remove("is-hidden");
  }

  const response = await fetch("/api/me", {
    headers: authHeaders(),
  });

  const me = response.ok ? await response.json() : { is_admin: false };
  renderProfile(me);
  isAdmin = Boolean(me.is_admin);

  if (isAdmin && isLoginPage) {
    adminLogin.classList.add("is-hidden");
    setLoginLayout(false);
    window.location.href = "/admin";
    return;
  }

  if (!isAdmin && isAdminPage) {
    clearAdminToken();
    window.location.href = "/login";
    return;
  }

  if (isAdmin) {
    if (!isAdminPage) {
      return;
    }

    adminPanel.classList.remove("is-hidden");
    adminLogin.classList.add("is-hidden");
    setLoginLayout(false);
    setAdminLayout(true);
    setActiveAdminView("categories");
    activeAdminView = "categories";
    await loadCrudView("categories");
    return;
  }

  if (isLoginPage || isAdminPage) {
    if (isLoginPage) {
      openLoginSection();
      return;
    }

    setAdminLayout(false);
    adminLogin.classList.remove("is-hidden");
    adminStatusText.textContent = "Sessiya tugagan. Admin login va parolni qayta kiriting.";
  }
}

saveAdminKeyButton.addEventListener("click", async () => {
  adminLoginName = adminLoginInput.value.trim() || "admin";
  const adminPassword = adminKeyInput.value.trim();
  clearAdminToken();

  const response = await fetch("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      login: adminLoginName,
      password: adminPassword,
    }),
  });

  if (!response.ok) {
    adminStatusText.textContent = "Login yoki parol xato.";
    return;
  }

  storeAdminToken(await response.json());
  adminLogin.classList.add("is-hidden");
  adminKeyInput.value = "";
  window.location.href = "/admin";
});

adminLoginInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    adminKeyInput.focus();
  }
});

adminKeyInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    saveAdminKeyButton.click();
  }
});

refreshOrdersButton.addEventListener("click", () => {
  showAdminPlaceholder(activeAdminView);
});

ordersList.addEventListener("change", async (event) => {
  const fileInput = event.target.closest("[data-image-upload-for]");
  if (!fileInput || !fileInput.files?.length) {
    return;
  }

  const form = fileInput.closest("form");
  const targetInput = form?.elements[fileInput.dataset.imageUploadFor];
  const preview = fileInput.parentElement?.querySelector(".image-upload-preview");
  if (!targetInput) {
    return;
  }

  adminStatusText.textContent = "Rasm tayyorlanmoqda...";
  try {
    const dataUrl = await imageFileToDataUrl(fileInput.files[0]);
    targetInput.value = dataUrl;
    if (preview) {
      preview.src = dataUrl;
      preview.classList.remove("is-hidden");
    }
    adminStatusText.textContent = "Rasm tayyor. Saqlashni bosing.";
  } catch (error) {
    adminStatusText.textContent = error.message;
  } finally {
    fileInput.value = "";
  }
});

ordersList.addEventListener("click", async (event) => {
  const editButton = event.target.closest("[data-edit-type]");
  if (editButton) {
    const type = editButton.dataset.editType;
    const item = byId(adminCache[type], editButton.dataset.editId);
    if (item) {
      await loadCrudView(type, item);
      ordersList.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    return;
  }

  const deleteButton = event.target.closest("[data-delete-type]");
  if (deleteButton) {
    try {
      await deleteCrudItem(deleteButton.dataset.deleteType, deleteButton.dataset.deleteId);
    } catch (error) {
      adminStatusText.textContent = error.message;
    }
    return;
  }

  const cancelButton = event.target.closest("[data-cancel-edit]");
  if (cancelButton) {
    await loadCrudView(cancelButton.dataset.cancelEdit);
    return;
  }

});

ordersList.addEventListener("submit", async (event) => {
  const form = event.target.closest(".admin-crud-form");
  if (!form) {
    return;
  }

  event.preventDefault();
  try {
    adminStatusText.textContent = "Saqlanmoqda...";
    await submitCrudForm(form);
  } catch (error) {
    adminStatusText.textContent = error.message;
  }
});

checkAdmin();
loadCatalog();
requestTelegramContact();
