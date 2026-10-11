
(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) =>
    Array.from(root.querySelectorAll(selector));

  const state = {
    products: [],
    category: "all",
    search: "",
    store: "all",
    sort: "latest"
  };

  const container = $("#productsContainer");
  const template = $("#productTemplate");
  const status = $("#loadStatus");
  const emptyState = $("#emptyState");
  const productCount = $("#productCount");
  const categoryFilters = $("#categoryFilters");
  const searchInput = $("#searchInput");
  const storeFilter = $("#storeFilter");
  const sortSelect = $("#sortSelect");

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    $("#currentYear").textContent = String(new Date().getFullYear());
    bindControls();

    try {
      const response = await fetch("./products.json?v=41", {
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error(`products.json returned ${response.status}`);
      }

      const raw = await response.json();
      const products = Array.isArray(raw)
        ? raw
        : Array.isArray(raw.products)
          ? raw.products
          : [];

      state.products = products
        .filter(product => product && typeof product === "object")
        .map((product, index) => ({
          ...product,
          _originalIndex: index,
          _category: normalizeCategory(
            product.category || product.categories || product.type || "Other"
          ),
          _name: String(
            product.name || product.title || product.productName ||
            "Untitled product"
          ),
          _store: String(
            product.store || product.storeName || product.merchant ||
            product.platform || "Store"
          ),
          _priceNumber: parsePrice(
            product.price ?? product.salePrice ?? product.displayPrice
          ),
          _date: getProductDate(product)
        }));

      buildCategoryFilters();
      buildStoreFilter();

      status.textContent = state.products.length
        ? ""
        : "No products were found. Check the contents of products.json.";

      renderProducts();
    } catch (error) {
      console.error("Unable to load products:", error);
      status.textContent =
        "We couldn't load the products. Check that products.json is in the same folder as index.html and contains valid JSON.";
      container.innerHTML = "";
      productCount.textContent = "0";
    }
  }

  function bindControls() {
    searchInput.addEventListener("input", () => {
      state.search = searchInput.value.trim().toLowerCase();
      renderProducts();
    });

    storeFilter.addEventListener("change", () => {
      state.store = storeFilter.value;
      renderProducts();
    });

    sortSelect.addEventListener("change", () => {
      state.sort = sortSelect.value;
      renderProducts();
    });

    categoryFilters.addEventListener("click", event => {
      const button = event.target.closest("[data-category]");
      if (!button) return;

      state.category = button.dataset.category;

      $$(".category-chip", categoryFilters).forEach(chip => {
        chip.classList.toggle("active", chip === button);
      });

      renderProducts();
    });

    $("#clearFilters").addEventListener("click", () => {
      state.category = "all";
      state.search = "";
      state.store = "all";
      state.sort = "latest";

      searchInput.value = "";
      storeFilter.value = "all";
      sortSelect.value = "latest";

      $$(".category-chip", categoryFilters).forEach(chip => {
        chip.classList.toggle("active", chip.dataset.category === "all");
      });

      renderProducts();
    });
  }

  function normalizeCategory(value) {
    if (Array.isArray(value)) value = value[0];
    return String(value || "Other").trim() || "Other";
  }

  function parsePrice(value) {
    if (typeof value === "number") return value;

    if (value === null || value === undefined || value === "") {
      return Number.POSITIVE_INFINITY;
    }

    const number = Number(String(value).replace(/[^0-9.]/g, ""));
    return Number.isFinite(number)
      ? number
      : Number.POSITIVE_INFINITY;
  }

  /*
   * Supported date fields:
   * dateAdded, addedAt, createdAt, created_at, addedDate,
   * publishedAt, published_at, date, created, uploadDate.
   *
   * Products without a valid date will not get a NEW badge.
   */
  function getProductDate(product) {
    const keys = [
      "dateAdded",
      "addedAt",
      "createdAt",
      "created_at",
      "addedDate",
      "publishedAt",
      "published_at",
      "date",
      "created",
      "uploadDate"
    ];

    for (const key of keys) {
      if (!product[key]) continue;

      const parsed = new Date(product[key]);

      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }

    return null;
  }

  // NEW only when the product was added within the previous 48 hours.
  function isNewProduct(product) {
    if (!product._date) return false;

    const age = Date.now() - product._date.getTime();

    return age >= 0 && age <= 48 * 60 * 60 * 1000;
  }

  function buildCategoryFilters() {
    const categories = [
      ...new Set(state.products.map(product => product._category))
    ]
      .filter(category => category && category.toLowerCase() !== "all")
      .sort((a, b) => a.localeCompare(b));

    categoryFilters.innerHTML = "";
    addCategoryButton("All picks", "all");

    categories.forEach(category => {
      addCategoryButton(category, category);
    });
  }

  function addCategoryButton(label, value) {
    const button = document.createElement("button");

    button.type = "button";
    button.className =
      "category-chip" + (value === "all" ? " active" : "");
    button.dataset.category = value;
    button.textContent = label;

    categoryFilters.appendChild(button);
  }

  function buildStoreFilter() {
    const stores = [
      ...new Set(state.products.map(product => product._store))
    ]
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));

    storeFilter.innerHTML = '<option value="all">All stores</option>';

    stores.forEach(store => {
      const option = document.createElement("option");
      option.value = store;
      option.textContent = store;
      storeFilter.appendChild(option);
    });
  }

  function renderProducts() {
    const filtered = state.products.filter(product => {
      const matchesCategory =
        state.category === "all" ||
        product._category === state.category;

      const matchesStore =
        state.store === "all" ||
        product._store === state.store;

      const searchable = [
        product._name,
        product._category,
        product._store,
        product.description,
        product.brand,
        product.tags
      ]
        .flat()
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        matchesCategory &&
        matchesStore &&
        (!state.search || searchable.includes(state.search))
      );
    });

    filtered.sort((a, b) => {
      if (state.sort === "oldest") {
        return compareDates(a, b, true);
      }

      if (state.sort === "price-low") {
        return a._priceNumber - b._priceNumber;
      }

      if (state.sort === "price-high") {
        return b._priceNumber - a._priceNumber;
      }

      if (state.sort === "name") {
        return a._name.localeCompare(b._name);
      }

      return compareDates(a, b, false);
    });

    container.innerHTML = "";

    const fragment = document.createDocumentFragment();

    filtered.forEach(product => {
      fragment.appendChild(createProductCard(product));
    });

    container.appendChild(fragment);

    productCount.textContent = String(filtered.length);
    emptyState.hidden = filtered.length > 0;

    if (state.products.length > 0) {
      status.textContent = "";
    }
  }

  function compareDates(a, b, oldestFirst) {
    // Prefer actual dates; otherwise use numeric IDs or JSON order.
    if (a._date && b._date) {
      const difference = a._date.getTime() - b._date.getTime();

      if (difference !== 0) {
        return oldestFirst ? difference : -difference;
      }
    } else if (a._date || b._date) {
      return a._date ? -1 : 1;
    }

    const aId = Number(a.id);
    const bId = Number(b.id);

    if (
      Number.isFinite(aId) &&
      Number.isFinite(bId) &&
      aId !== bId
    ) {
      return oldestFirst ? aId - bId : bId - aId;
    }

    return oldestFirst
      ? a._originalIndex - b._originalIndex
      : b._originalIndex - a._originalIndex;
  }

  function createProductCard(product) {
    const fragment = template.content.cloneNode(true);
    const card = $(".product-card", fragment);
    const image = $(".product-image", fragment);
    const placeholder = $(".image-placeholder", fragment);
    const imageLink = $(".product-image-link", fragment);
    const buyButton = $(".buy-button", fragment);

    const name = product._name;
    const storeUrl = firstValue(product, [
      "url",
      "link",
      "productUrl",
      "affiliateUrl",
      "affiliateLink",
      "buyLink",
      "productLink",
      "storeUrl"
    ]);

    const imageUrl = firstValue(product, [
      "image",
      "imageUrl",
      "imageURL",
      "img",
      "photo",
      "thumbnail"
    ]);

    const price =
      product.price ?? product.salePrice ?? product.displayPrice ?? "";

    const rating = product.rating ?? product.stars ?? "";

    $(".product-name", fragment).textContent = name;
    $(".product-category", fragment).textContent = product._category;
    $(".product-store", fragment).textContent = product._store;
    $(".product-price", fragment).textContent = formatPrice(price);
    $(".product-rating", fragment).textContent =
      rating ? `★ ${rating}` : "";

    image.alt = name;
    imageLink.setAttribute("aria-label", `View ${name}`);

    if (imageUrl) {
      image.src = resolveAssetUrl(imageUrl);

      image.addEventListener("error", () => {
        image.classList.add("is-hidden");
        placeholder.classList.remove("is-hidden");
      }, { once: true });

      image.addEventListener("load", () => {
        placeholder.classList.add("is-hidden");
      }, { once: true });
    } else {
      image.classList.add("is-hidden");
    }

    if (storeUrl) {
      const safeUrl = safeExternalUrl(storeUrl);

      if (safeUrl) {
        imageLink.href = safeUrl;
        imageLink.removeAttribute("tabindex");
        imageLink.removeAttribute("aria-hidden");

        buyButton.href = safeUrl;

        trackAffiliateClick(product, safeUrl, buyButton);
        trackAffiliateClick(product, safeUrl, imageLink);
      } else {
        disableLink(imageLink, "Product link unavailable");
        disableLink(buyButton, "Product link unavailable");
      }
    } else {
      disableLink(imageLink, "Product link unavailable");
      disableLink(buyButton, "Product link unavailable");
    }

    // Always set the badge explicitly; it never defaults to visible.
    const badge = $(".latest-badge", fragment);
    badge.hidden = !isNewProduct(product);

    const extraLinks = $(".product-extra-links", fragment);

    const extras = [
      ["detailsUrl", "More details"],
      ["reviewUrl", "Watch review"],
      ["videoUrl", "Watch video"]
    ];

    extras.forEach(([key, label]) => {
      if (!product[key]) return;

      const url = safeExternalUrl(product[key]);
      if (!url) return;

      const link = document.createElement("a");
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = label;

      link.addEventListener("click", () => {
        trackEvent("product_extra_link_click", {
          product_name: name,
          link_type: key
        });
      });

      extraLinks.appendChild(link);
    });

    card.setAttribute(
      "aria-label",
      `${name}${price ? ", " + formatPrice(price) : ""}`
    );

    return fragment;
  }

  function firstValue(object, keys) {
    for (const key of keys) {
      const value = object[key];

      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
    }

    return "";
  }

  function resolveAssetUrl(path) {
    const clean = String(path).trim();

    if (/^(https?:|data:|blob:)/i.test(clean)) {
      return clean;
    }

    return new URL(
      clean.replace(/^\.?\//, ""),
      document.baseURI
    ).href;
  }

  function safeExternalUrl(value) {
    try {
      const url = new URL(String(value), document.baseURI);

      if (url.protocol !== "http:" && url.protocol !== "https:") {
        return "";
      }

      return url.href;
    } catch (_) {
      return "";
    }
  }

  function disableLink(link, label) {
    link.removeAttribute("href");
    link.removeAttribute("target");
    link.removeAttribute("rel");
    link.setAttribute("aria-disabled", "true");

    if (link.classList.contains("buy-button")) {
      link.textContent = label;
      link.style.opacity = ".55";
      link.style.cursor = "not-allowed";
    }
  }

  function formatPrice(value) {
    if (value === null || value === undefined || value === "") {
      return "Check price";
    }

    if (typeof value === "number") {
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0
      }).format(value);
    }

    const text = String(value).trim();

    if (!text) return "Check price";
    if (/^(₹|rs\.?|inr)/i.test(text)) return text;

    const number = Number(text.replace(/[^0-9.]/g, ""));

    if (Number.isFinite(number) && number > 0) {
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0
      }).format(number);
    }

    return text;
  }

  function trackAffiliateClick(product, url, element) {
    element.addEventListener("click", () => {
      trackEvent("affiliate_click", {
        product_name: product._name,
        store_name: product._store,
        destination: url
      });
    });
  }

  function trackEvent(name, params) {
    if (typeof window.gtag === "function") {
      window.gtag("event", name, params);
    }
  }
})();
