const telegram = window.Telegram?.WebApp;

if (telegram) {
  telegram.ready();
  telegram.expand();
}

const languageToggle = document.querySelector("#language-toggle");
const languageLabel = document.querySelector("#language-label");
const themeToggle = document.querySelector("#theme-toggle");
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
const loginPanel = document.querySelector("#login-panel");
const adminPanel = document.querySelector("#admin-panel");
const adminLogin = document.querySelector("#admin-login");
const adminLoginInput = document.querySelector("#admin-login-name");
const adminKeyInput = document.querySelector("#admin-key");
const saveAdminKeyButton = document.querySelector("#save-admin-key");
const adminMenuToggle = document.querySelector("#admin-menu-toggle");
const adminMenuList = document.querySelector("#admin-menu-list");
const adminViewButtons = document.querySelectorAll("[data-admin-view]");
const refreshOrdersButton = document.querySelector("#refresh-orders");
const loginStatusText = document.querySelector("#login-status");
const adminStatusText = document.querySelector("#admin-status");
const ordersList = document.querySelector("#orders-list");
const statTotal = document.querySelector("#stat-total");
const statNew = document.querySelector("#stat-new");
const statProcessing = document.querySelector("#stat-processing");
const statRevenue = document.querySelector("#stat-revenue");

const adminViewRoutes = {
  guests: "/admin/guests",
  categories: "/admin/categories",
  items: "/admin/items",
  variants: "/admin/variants",
  "addon-groups": "/admin/addon-groups",
  addons: "/admin/addons",
  "addon-links": "/admin/addon-links",
};
const adminViewCrudTypes = {
  categories: "categories",
  items: "items",
  variants: "variants",
  "addon-groups": "addonGroups",
  addons: "addons",
  "addon-links": "addonLinks",
};
const currentPath = window.location.pathname.replace(/\/+$/, "") || "/";
const isLoginPage = currentPath === "/login";
const isAdminPage = currentPath === "/admin" || currentPath.startsWith("/admin/");
const initialAdminView =
  Object.entries(adminViewRoutes).find(([, route]) => route === currentPath)?.[0] || "categories";
const ADMIN_TOKEN_TTL_MS = 6 * 60 * 60 * 1000;
let adminLoginName = "";
let adminAccessToken = window.localStorage.getItem("bonbon_admin_access_token") || "";
let adminTokenExpiresAt = Number(window.localStorage.getItem("bonbon_admin_token_expires_at") || 0);
let adminTokenExpiryTimerId = 0;
let isAdmin = false;
let activeLanguage = window.localStorage.getItem("bonbon_language") || "UZ";
let activeTheme = window.localStorage.getItem("bonbon_theme_mode") || "carrot";
let activeAdminView = initialAdminView;
let activeCrudType = adminViewCrudTypes[initialAdminView] || null;
let activeCrudEditingItem = null;
let activeCrudRequestId = 0;
let activeMenuCategory = "all";
let menuItems = [];
let menuCategoryItems = [];
const adminCache = {
  guests: [],
  categories: [],
  items: [],
  variants: [],
  addons: [],
  addonGroups: [],
  addonLinks: [],
};

const i18n = {
  UZ: {
    searchPlaceholder: "Qidirish...",
    all: "Barchasi",
    noMenu: "Menu topilmadi.",
    descriptionEmpty: "Tavsif hozircha yo'q.",
    available: "Sotuvda bor",
    unavailable: "Sotuvda yo'q",
    category: "Category",
    variants: "Variantlar",
    addons: "Qo'shimchalar",
    details: "Batafsil",
    login: "Login",
    admin: "Admin",
    guests: "Mehmonlar",
    categories: "Categoriyalar",
    items: "Itemlar",
    variantsAdmin: "Variantlar",
    addonGroups: "Addon Grouplar",
    addonsAdmin: "Addonlar",
    addonLinks: "Group Addonlar",
    loading: "Yuklanmoqda...",
    guestsLoading: "Mehmonlar yuklanmoqda...",
    guestsFailed: "Mehmonlarni yuklab bo'lmadi.",
    noGuests: "Hali mehmon yo'q.",
    noRecords: "Hali yozuv yo'q.",
    noSearchResults: "Qidiruv bo'yicha ma'lumot topilmadi.",
    recordNew: "Yangi yozuv",
    edit: "Tahrirlash",
    cancel: "Bekor",
    save: "Saqlash",
    add: "Qo'shish",
    editButton: "Edit",
    deleteButton: "Delete",
    adminReady: "Admin panel tayyorlanmoqda.",
    loginPrompt: "Admin login va parolni kiriting.",
    guestsCount: "Mehmonlar",
  },
  RU: {
    searchPlaceholder: "Поиск...",
    all: "Все",
    noMenu: "Меню не найдено.",
    descriptionEmpty: "Описание пока отсутствует.",
    available: "В продаже",
    unavailable: "Нет в продаже",
    category: "Категория",
    variants: "Варианты",
    addons: "Дополнения",
    details: "Подробнее",
    login: "Войти",
    admin: "Админ",
    guests: "Гости",
    categories: "Категории",
    items: "Позиции",
    variantsAdmin: "Варианты",
    addonGroups: "Группы доп.",
    addonsAdmin: "Дополнения",
    addonLinks: "Связи доп.",
    loading: "Загрузка...",
    guestsLoading: "Гости загружаются...",
    guestsFailed: "Не удалось загрузить гостей.",
    noGuests: "Гостей пока нет.",
    noRecords: "Записей пока нет.",
    noSearchResults: "По запросу ничего не найдено.",
    recordNew: "Новая запись",
    edit: "Редактировать",
    cancel: "Отмена",
    save: "Сохранить",
    add: "Добавить",
    editButton: "Edit",
    deleteButton: "Delete",
    adminReady: "Админ панель готовится.",
    loginPrompt: "Введите логин и пароль администратора.",
    guestsCount: "Гости",
  },
  EN: {
    searchPlaceholder: "Search...",
    all: "All",
    noMenu: "No menu items found.",
    descriptionEmpty: "No description yet.",
    available: "Available",
    unavailable: "Unavailable",
    category: "Category",
    variants: "Variants",
    addons: "Add-ons",
    details: "Details",
    login: "Login",
    admin: "Admin",
    guests: "Guests",
    categories: "Categories",
    items: "Items",
    variantsAdmin: "Variants",
    addonGroups: "Addon Groups",
    addonsAdmin: "Add-ons",
    addonLinks: "Group Add-ons",
    loading: "Loading...",
    guestsLoading: "Guests loading...",
    guestsFailed: "Could not load guests.",
    noGuests: "No guests yet.",
    noRecords: "No records yet.",
    noSearchResults: "No results found.",
    recordNew: "New record",
    edit: "Edit",
    cancel: "Cancel",
    save: "Save",
    add: "Add",
    editButton: "Edit",
    deleteButton: "Delete",
    adminReady: "Admin panel is loading.",
    loginPrompt: "Enter admin login and password.",
    guestsCount: "Guests",
  },
};

const adminViewLabels = {
  guests: "guests",
  categories: "categories",
  items: "items",
  variants: "variantsAdmin",
  "addon-groups": "addonGroups",
  addons: "addonsAdmin",
  "addon-links": "addonLinks",
};

function t(key) {
  return i18n[activeLanguage]?.[key] || i18n.UZ[key] || key;
}

function normalizeThemeMode(value) {
  return value === "mono" ? "mono" : "carrot";
}

function applyTheme() {
  activeTheme = normalizeThemeMode(activeTheme);
  document.body.dataset.theme = activeTheme;
  window.localStorage.setItem("bonbon_theme_mode", activeTheme);

  if (themeToggle) {
    const isMono = activeTheme === "mono";
    themeToggle.setAttribute("aria-pressed", String(isMono));
    themeToggle.setAttribute(
      "aria-label",
      isMono ? "Sabzirang modega o'tish" : "Kulrang modega o'tish",
    );
    themeToggle.title = isMono ? "Kulrang" : "Sabzirang";
  }

  try {
    telegram?.setHeaderColor?.(activeTheme === "mono" ? "#2f343d" : "#fffaf5");
    telegram?.setBackgroundColor?.(activeTheme === "mono" ? "#242a33" : "#fff3e8");
  } catch {
    // Telegram WebView may ignore these methods on older clients.
  }
}
function currentSearchTerm() {
  return productSearchInput.value.trim().toLowerCase();
}

function searchableText(value) {
  if (value === null || value === undefined) {
    return "";
  }

  if (Array.isArray(value)) {
    return value.map(searchableText).join(" ");
  }

  if (typeof value === "object") {
    return Object.values(value).map(searchableText).join(" ");
  }

  return String(value);
}

function matchesSearch(value, term = currentSearchTerm()) {
  return !term || searchableText(value).toLowerCase().includes(term);
}

function setSearchPlaceholder() {
  productSearchInput.placeholder = t("searchPlaceholder");
}

function updateStaticLanguage() {
  document.documentElement.lang = activeLanguage.toLowerCase();
  languageLabel.textContent = activeLanguage;
  setSearchPlaceholder();
  adminViewButtons.forEach((button) => {
    const labelKey = adminViewLabels[button.dataset.adminView];
    if (labelKey) {
      button.textContent = t(labelKey);
    }
  });
}

function applyLanguage() {
  updateStaticLanguage();
  renderMenuCategories();
  renderMenuGrid();

  if (isLoginPage && !isAdmin) {
    loginStatusText.textContent = t("loginPrompt");
  }

  if (isAdmin && isAdminPage) {
    renderCurrentAdminView();
  }
}

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
    return imageDisplayUrl(item.image_url);
  }

  if (isLavashItem(item)) {
    return "/static/assets/lavash-wrap.jpg";
  }

  return fallbackMenuImage(item);
}

function imageDisplayUrl(value, cacheBust = false) {
  if (!value) {
    return "";
  }

  try {
    const url = new URL(String(value), window.location.origin);
    if (cacheBust) {
      url.searchParams.set("v", String(Date.now()));
    }
    return url.href;
  } catch {
    return String(value);
  }
}

function adminImageTemplate(value, altText = "") {
  const src = imageDisplayUrl(value);
  if (!src) {
    return "";
  }

  return `
    <div class="catalog-admin-media">
      <img src="${escapeHtml(src)}" alt="${escapeHtml(altText)}" loading="lazy" decoding="async" />
    </div>
  `;
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
    `<button class="menu-category-button ${activeMenuCategory === "all" ? "is-active" : ""}" data-menu-category="all" type="button">${t("all")}</button>`,
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
    : `<p class="menu-empty">${t("noMenu")}</p>`;
  menuTitle.textContent =
    activeMenuCategory === "all" ? t("all") : menuCategoryName(activeMenuCategory);
}

function menuCardTemplate(item) {
  const imageUrl = menuImageForItem(item);
  const categoryName = item.category?.name || menuCategoryName(item.category_id);
  const variants = menuVariantOptions(item).slice(0, 3);
  const addons = menuAddons(item).slice(0, 3);
  const displayPrice = selectedVariant(item)?.price ?? item.base_price;
  const description = item.description || t("descriptionEmpty");

  return `
    <article class="menu-card">
      <div class="menu-card-media">
        <img class="menu-card-image" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(item.name)}" loading="lazy" decoding="async" />
        <span class="menu-media-pill menu-media-category">
          ${iconSvg(menuCategoryIcon(item))}
          <span>${escapeHtml(categoryName)}</span>
        </span>
        <span class="menu-media-pill menu-media-status">
          <span class="menu-status-dot" aria-hidden="true"></span>
          <span>${item.is_available ? t("available") : t("unavailable")}</span>
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
              <span>${t("category")}</span>
              <strong>${escapeHtml(categoryName)}</strong>
            </span>
          </section>
          <section class="menu-info-row menu-info-variants" aria-label="Variantlar">
            <span class="menu-info-icon">${iconSvg("layers")}</span>
            <span class="menu-info-copy">
              <span>${t("variants")}</span>
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
              <span>${t("addons")}</span>
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
          <span>${t("details")}</span>
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
  menuModalDescription.textContent = item.description || t("descriptionEmpty");

  const defaultVariant = selectedVariant(item);
  menuModalVariants.innerHTML = item.variants?.length
    ? `
      <h3>${t("variants")}</h3>
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
      <h3>${t("addons")}</h3>
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

themeToggle?.addEventListener("click", () => {
  activeTheme = activeTheme === "mono" ? "carrot" : "mono";
  applyTheme();
});
languageToggle.addEventListener("click", () => {
  const languages = ["UZ", "RU", "EN"];
  const currentIndex = languages.indexOf(activeLanguage);
  activeLanguage = languages[(currentIndex + 1) % languages.length];
  window.localStorage.setItem("bonbon_language", activeLanguage);
  applyLanguage();
});

searchToggle.addEventListener("click", () => {
  const isHidden = searchBar.classList.toggle("is-hidden");
  searchToggle.setAttribute("aria-expanded", String(!isHidden));

  if (!isHidden) {
    productSearchInput.focus();
    return;
  }

  if (productSearchInput.value) {
    productSearchInput.value = "";
    if (isAdmin && isAdminPage) {
      renderCurrentAdminView();
      return;
    }
    renderMenuGrid();
  }
});

productSearchInput.addEventListener("input", () => {
  if (isAdmin && isAdminPage) {
    renderCurrentAdminView();
    return;
  }

  renderMenuGrid();
});

searchBar.addEventListener("submit", (event) => {
  event.preventDefault();
});

function openLoginSection() {
  setLoginLayout(true);
  setAdminLayout(false);
  adminPanel.classList.add("is-hidden");
  loginPanel.classList.remove("is-hidden");
  adminLogin.classList.remove("is-hidden");
  adminLoginInput.value = "";
  adminKeyInput.value = "";
  loginStatusText.textContent = "Admin login va parolni kiriting.";
  loginPanel.scrollIntoView({ behavior: "smooth", block: "center" });
  adminLoginInput.focus();
}

function hasValidAdminToken() {
  return Boolean(adminAccessToken && adminTokenExpiresAt && Date.now() < adminTokenExpiresAt);
}

function clearAdminTokenExpiryTimer() {
  if (adminTokenExpiryTimerId) {
    window.clearTimeout(adminTokenExpiryTimerId);
    adminTokenExpiryTimerId = 0;
  }
}

function clearAdminToken() {
  clearAdminTokenExpiryTimer();
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
  const serverExpiresAt = Number(token.expires_at) * 1000;
  adminTokenExpiresAt = Math.min(serverExpiresAt, Date.now() + ADMIN_TOKEN_TTL_MS);
  window.localStorage.setItem("bonbon_admin_access_token", adminAccessToken);
  window.localStorage.setItem("bonbon_admin_token_expires_at", String(adminTokenExpiresAt));
  scheduleAdminTokenExpiry();
}

function handleAdminAuthExpired(message = "Sessiya tugagan. Admin login va parolni qayta kiriting.") {
  clearAdminToken();
  renderProfile({ is_admin: false, user: null });

  if (isAdminPage) {
    window.location.href = "/login";
    return;
  }

  if (isLoginPage) {
    openLoginSection();
    loginStatusText.textContent = message;
  }
}

function scheduleAdminTokenExpiry() {
  clearAdminTokenExpiryTimer();
  if (!hasValidAdminToken()) {
    return;
  }

  const delay = Math.max(0, adminTokenExpiresAt - Date.now());
  adminTokenExpiryTimerId = window.setTimeout(() => {
    handleAdminAuthExpired();
  }, delay);
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

  if (view === "guests") {
    loadGuests();
    return;
  }

  if (view === "categories") {
    loadCrudView(adminViewCrudTypes.categories);
    return;
  }

  if (view === "items") {
    loadCrudView(adminViewCrudTypes.items);
    return;
  }

  if (view === "variants") {
    loadCrudView(adminViewCrudTypes.variants);
    return;
  }

  if (view === "addon-groups") {
    loadCrudView(adminViewCrudTypes["addon-groups"]);
    return;
  }

  if (view === "addons") {
    loadCrudView(adminViewCrudTypes.addons);
    return;
  }

  if (view === "addon-links") {
    loadCrudView(adminViewCrudTypes["addon-links"]);
  }
}

if (adminMenuToggle && adminMenuList) {
  adminMenuToggle.addEventListener("click", () => {
    const isCollapsed = adminMenuList.classList.toggle("is-collapsed");
    adminMenuToggle.setAttribute("aria-expanded", String(!isCollapsed));
  });
}

adminViewButtons.forEach((button) => {
  button.addEventListener("click", (event) => {
    if (!isAdmin) {
      event.preventDefault();
      window.location.href = "/login";
      return;
    }

    const route = adminViewRoutes[button.dataset.adminView] || "/admin/categories";
    if (currentPath === route || (currentPath === "/admin" && button.dataset.adminView === "categories")) {
      event.preventDefault();
      showAdminPlaceholder(button.dataset.adminView);
      return;
    }
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

function isAdminAuthError(response) {
  return response.status === 401 || response.status === 403;
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
    return t("admin");
  }

  if (hasValidAdminToken()) {
    return t("login");
  }

  return t("login");
}

function renderProfile(me = { is_admin: false, user: null }) {
  profileName.textContent = profileLabel(me.user, Boolean(me.is_admin));
  userLoginToggle.classList.toggle("is-authenticated", Boolean(me.user || me.is_admin));
}

function formatMoney(amount, currency = "UZS") {
  return `${Number(amount || 0).toLocaleString("uz-UZ")} ${currency}`;
}

function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString("uz-UZ", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function uploadImageFile(file) {
  if (!file) {
    throw new Error("Rasm fayli tanlanmadi.");
  }

  if (file.size > 8 * 1024 * 1024) {
    throw new Error("Rasm 8 MB dan katta bo'lmasin.");
  }

  const response = await fetch("/api/admin/uploads/images", {
    method: "POST",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
      ...authHeaders(),
    },
    body: file,
  });

  if (isAdminAuthError(response)) {
    handleAdminAuthExpired();
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || "Rasmni yuklab bo'lmadi.");
  }

  return response.json();
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

  if (isAdminAuthError(response)) {
    handleAdminAuthExpired();
  }

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
        <input ${commonAttrs} type="text" inputmode="url" placeholder="https://... yoki rasm yuklang" value="${escapeHtml(value)}" />
        <input class="image-upload-input" type="file" accept="image/*,.heic,.heif,.webp,.avif" data-image-upload-for="${field.name}" />
        <span class="image-upload-hint">Rasm tanlang. Tizim format/kengaytmadan qat'i nazar uni o'qib, kichraytirib WebP yoki JPEG fayl sifatida saqlaydi.</span>
        ${
          value
            ? `<img class="image-upload-preview" src="${escapeHtml(imageDisplayUrl(value))}" alt="" decoding="async" />`
            : `<img class="image-upload-preview is-hidden" alt="" loading="lazy" decoding="async" />`
        }
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
  const actionText = item ? t("edit") : t("recordNew");
  return `
    <form class="admin-crud-form" data-crud-type="${type}" data-id="${escapeHtml(id)}">
      <div class="crud-form-head">
        <strong>${actionText}: ${crudTitle(type)}</strong>
        ${item ? `<button class="text-button" data-cancel-edit="${type}" type="button">${t("cancel")}</button>` : ""}
      </div>
      <div class="crud-form-grid">
        ${config.fields.map((field) => renderField(field, item)).join("")}
      </div>
      <button class="primary-button admin-save-button" type="submit">
        ${item ? t("save") : t("add")}
      </button>
    </form>
  `;
}

function renderCrudActions(type, item) {
  return `
    <div class="crud-actions">
      <button class="status-button" data-edit-type="${type}" data-edit-id="${item.id}" type="button">${t("editButton")}</button>
      <button class="status-button danger" data-delete-type="${type}" data-delete-id="${item.id}" type="button">${t("deleteButton")}</button>
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
      { name: "image_url", label: "Rasm URL yoki fayl" },
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
          ${adminImageTemplate(item.image_url, item.name)}
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

const crudTitleKeys = {
  categories: "categories",
  items: "items",
  variants: "variantsAdmin",
  addons: "addonsAdmin",
  addonGroups: "addonGroups",
  addonLinks: "addonLinks",
};

function crudTitle(type) {
  return t(crudTitleKeys[type]) || crudConfigs[type]?.title || type;
}

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

function renderCrudList(type, editingItem = activeCrudEditingItem) {
  const config = crudConfigs[type];
  const items = adminCache[type] || [];
  const term = currentSearchTerm();
  const filteredItems = items.filter((item) => matchesSearch(item, term));
  const emptyText = term ? t("noSearchResults") : t("noRecords");

  document.querySelector(".admin-heading h2").textContent = `${crudTitle(type)} CRUD`;
  ordersList.innerHTML = `
    ${renderCrudForm(type, editingItem)}
    <div class="crud-list">
      ${
        filteredItems.length
          ? filteredItems.map((item) => config.renderItem(item)).join("")
          : `<p class="order-meta">${emptyText}</p>`
      }
    </div>
  `;

  adminStatusText.textContent = term
    ? `${crudTitle(type)}: ${filteredItems.length}/${items.length}`
    : `${crudTitle(type)}: ${items.length}`;
}

function renderGuestsList() {
  const guests = adminCache.guests || [];
  const term = currentSearchTerm();
  const filteredGuests = guests.filter((guest) => matchesSearch(guest, term));
  document.querySelector(".admin-heading h2").textContent = t("guests");
  ordersList.innerHTML = filteredGuests.length
    ? guestsTableTemplate(filteredGuests)
    : `<p class="order-meta">${term ? t("noSearchResults") : t("noGuests")}</p>`;
  adminStatusText.textContent = term
    ? `${t("guestsCount")}: ${filteredGuests.length}/${guests.length}`
    : `${t("guestsCount")}: ${guests.length}`;
}

function renderCurrentAdminView() {
  if (activeAdminView === "guests") {
    renderGuestsList();
    return;
  }

  if (activeCrudType) {
    renderCrudList(activeCrudType);
  }
}

async function loadCrudView(type, editingItem = null) {
  if (!isAdmin) {
    return;
  }

  const requestId = ++activeCrudRequestId;
  const config = crudConfigs[type];
  activeCrudType = type;
  activeCrudEditingItem = editingItem;
  document.querySelector(".admin-heading h2").textContent = `${crudTitle(type)} CRUD`;
  adminStatusText.textContent = `${crudTitle(type)}: ${t("loading")}`;
  ordersList.innerHTML = `<p class="order-meta">${t("loading")}</p>`;

  try {
    for (const dependency of config.dependencies || []) {
      await loadCrudDependency(dependency);
    }

    const items = await adminApi(config.endpoint);
    if (requestId !== activeCrudRequestId) {
      return;
    }

    adminCache[type] = items;
    renderCrudList(type, editingItem);
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

function guestTableRow(guest) {
  const name = [guest.first_name, guest.last_name].filter(Boolean).join(" ") || "Ism yo'q";
  const username = guest.username ? `@${guest.username}` : "username yo'q";
  const language = guest.language_code ? guest.language_code.toUpperCase() : "-";

  return `
    <tr>
      <td>${guest.id}</td>
      <td>
        <strong>${escapeHtml(name)}</strong>
        <span>${escapeHtml(username)}</span>
      </td>
      <td><a href="tel:${escapeHtml(guest.phone_number)}">${escapeHtml(guest.phone_number)}</a></td>
      <td>${guest.telegram_id}</td>
      <td>${guest.contact_user_id || "-"}</td>
      <td>${escapeHtml(language)}</td>
      <td>${formatDateTime(guest.created_at)}</td>
      <td>${formatDateTime(guest.updated_at)}</td>
    </tr>
  `;
}

function guestsTableTemplate(guests) {
  return `
    <div class="admin-table-shell">
      <table class="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Mehmon</th>
            <th>Telefon</th>
            <th>Telegram ID</th>
            <th>Contact ID</th>
            <th>Til</th>
            <th>Qo'shildi</th>
            <th>Yangilandi</th>
          </tr>
        </thead>
        <tbody>
          ${guests.map(guestTableRow).join("")}
        </tbody>
      </table>
    </div>
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
    if (isAdminAuthError(response)) {
      handleAdminAuthExpired();
    }
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
    if (isAdminAuthError(response)) {
      handleAdminAuthExpired();
      return;
    }
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

async function loadGuests() {
  if (!isAdmin) {
    return;
  }

  activeCrudType = null;
  activeCrudEditingItem = null;
  document.querySelector(".admin-heading h2").textContent = t("guests");
  adminStatusText.textContent = t("guestsLoading");
  ordersList.innerHTML = `<p class="order-meta">${t("loading")}</p>`;

  const response = await fetch("/api/admin/guests", {
    headers: authHeaders(),
  });

  if (!response.ok) {
    if (isAdminAuthError(response)) {
      handleAdminAuthExpired();
      return;
    }
    adminStatusText.textContent = t("guestsFailed");
    return;
  }

  const guests = await response.json();
  adminCache.guests = guests;
  renderGuestsList();
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
    if (isAdminAuthError(response)) {
      handleAdminAuthExpired();
      return;
    }
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
    if (isAdminAuthError(response)) {
      handleAdminAuthExpired();
      return;
    }
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
    if (isAdminAuthError(response)) {
      handleAdminAuthExpired();
      return;
    }
    adminStatusText.textContent = "Statusni yangilab bo'lmadi.";
    return;
  }

  await loadOrders();
}

async function checkAdmin() {
  if (adminAccessToken && !hasValidAdminToken()) {
    clearAdminToken();
  } else {
    scheduleAdminTokenExpiry();
  }

  const response = await fetch("/api/me", {
    headers: authHeaders(),
  });

  const me = response.ok ? await response.json() : { is_admin: false };
  renderProfile(me);
  isAdmin = Boolean(me.is_admin);

  if (isAdmin && isLoginPage) {
    loginPanel.classList.add("is-hidden");
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
    loginPanel.classList.add("is-hidden");
    adminLogin.classList.add("is-hidden");
    setLoginLayout(false);
    setAdminLayout(true);
    setActiveAdminView(initialAdminView);
    activeAdminView = initialAdminView;
    if (initialAdminView === "guests") {
      await loadGuests();
      return;
    }
    await loadCrudView(adminViewCrudTypes[initialAdminView] || "categories");
    return;
  }

  if (isLoginPage || isAdminPage) {
    if (isLoginPage) {
      openLoginSection();
      return;
    }

    setAdminLayout(false);
    adminPanel.classList.add("is-hidden");
    loginPanel.classList.add("is-hidden");
    adminLogin.classList.remove("is-hidden");
    loginStatusText.textContent = "Sessiya tugagan. Admin login va parolni qayta kiriting.";
  }
}

saveAdminKeyButton.addEventListener("click", async () => {
  adminLoginName = adminLoginInput.value.trim() || "admin";
  const adminPassword = adminKeyInput.value.trim();
  clearAdminToken();
  loginStatusText.textContent = "Login tekshirilmoqda...";

  const response = await fetch("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      login: adminLoginName,
      password: adminPassword,
    }),
  });

  if (!response.ok) {
    loginStatusText.textContent = "Login yoki parol xato.";
    return;
  }

  storeAdminToken(await response.json());
  loginPanel.classList.add("is-hidden");
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

  adminStatusText.textContent = "Rasm kichraytirilib yuklanmoqda...";
  try {
    const upload = await uploadImageFile(fileInput.files[0]);
    targetInput.value = upload.url;
    if (preview) {
      preview.onload = () => {
        adminStatusText.textContent = `Rasm yuklandi (${Math.round(Number(upload.size || 0) / 1024)} KB). Saqlashni bosing.`;
      };
      preview.onerror = () => {
        adminStatusText.textContent = "Rasm yuklandi, lekin preview ochilmadi. Sahifani yangilab ko'ring.";
      };
      preview.src = imageDisplayUrl(upload.absolute_url || upload.url, true);
      preview.classList.remove("is-hidden");
    }
    if (!preview) {
      adminStatusText.textContent = `Rasm yuklandi (${Math.round(Number(upload.size || 0) / 1024)} KB). Saqlashni bosing.`;
    }
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

applyTheme();
updateStaticLanguage();
checkAdmin();
loadCatalog();
