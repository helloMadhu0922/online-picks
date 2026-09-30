const productsContainer = document.getElementById("productsContainer");
const searchInput = document.getElementById("searchInput");
const productCount = document.getElementById("productCount");
const productTemplate = document.getElementById("productTemplate");
const categoryChips = document.getElementById("categoryChips");
const clearSearch = document.getElementById("clearSearch");
const storeFilter = document.getElementById("storeFilter");
const sortSelect = document.getElementById("sortSelect");

let allProducts = [];
let activeCategory = "All";
let activeStore = "All";
let activeSort = "latest";


async function loadProducts() {
    try {
        const response = await fetch("./products.json?v=31");

        if (!response.ok) {
            throw new Error("Could not load products.json");
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
            throw new Error("products.json is not an array");
        }

        allProducts = data.map(function(product) {
            return {
                ...product,
                displayCategory: normalizeCategory(product.category)
            };
        });

        allProducts.sort(function(a, b) {
            return new Date(b.added || 0) - new Date(a.added || 0);
        });

        buildCategoryChips();
        buildStoreFilter();
        renderFiltered();

    } catch (error) {
        console.error("Product loading error:", error);

        productsContainer.innerHTML = `
            <div class="error-message">
                <div class="error-icon">!</div>
                <h2>We couldn't load the picks</h2>
                <p>Please refresh the page and try again.</p>
            </div>
        `;

        productCount.textContent = "";
    }
}


function normalizeCategory(category) {
    const value = String(category || "").trim();

    if (value.toLowerCase() === "gadget") {
        return "Gadgets";
    }

    return value || "General";
}


function buildCategoryChips() {
    const categories = [
        ...new Set(
            allProducts
                .map(function(product) {
                    return product.displayCategory;
                })
                .filter(Boolean)
        )
    ];

    categoryChips.innerHTML = "";

    ["All", ...categories].forEach(function(category) {
        const chip = document.createElement("button");

        chip.type = "button";
        chip.className = "category-chip";

        if (category === activeCategory) {
            chip.classList.add("active");
        }

        chip.textContent = category;

        chip.addEventListener("click", function() {
            activeCategory = category;

            categoryChips
                .querySelectorAll(".category-chip")
                .forEach(function(item) {
                    item.classList.remove("active");
                });

            chip.classList.add("active");

            renderFiltered();
        });

        categoryChips.appendChild(chip);
    });
}


function buildStoreFilter() {
    if (!storeFilter) {
        return;
    }

    const stores = [
        ...new Set(
            allProducts
                .map(function(product) {
                    return product.store;
                })
                .filter(Boolean)
        )
    ];

    storeFilter.innerHTML =
        '<option value="All">All stores</option>';

    stores.forEach(function(store) {
        const option = document.createElement("option");

        option.value = store;
        option.textContent = store;

        storeFilter.appendChild(option);
    });

    storeFilter.value = activeStore;
}


function renderFiltered() {
    const keyword =
        searchInput.value.toLowerCase().trim();

    let filtered = allProducts.filter(function(product) {

        const categoryMatch =
            activeCategory === "All" ||
            product.displayCategory === activeCategory;

        const storeMatch =
            activeStore === "All" ||
            product.store === activeStore;

        if (!categoryMatch || !storeMatch) {
            return false;
        }

        if (!keyword) {
            return true;
        }

        const searchableText = [
            product.name,
            product.category,
            product.displayCategory,
            product.store,
            product.price
        ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

        return searchableText.includes(keyword);
    });

    filtered = sortProducts(filtered);

    renderProducts(filtered);
}


function sortProducts(products) {
    const sorted = [...products];

    if (activeSort === "latest") {
        sorted.sort(function(a, b) {
            return new Date(b.added || 0) -
                   new Date(a.added || 0);
        });
    }

    if (activeSort === "oldest") {
        sorted.sort(function(a, b) {
            return new Date(a.added || 0) -
                   new Date(b.added || 0);
        });
    }

    if (activeSort === "price-low") {
        sorted.sort(function(a, b) {
            return getPriceNumber(a.price) -
                   getPriceNumber(b.price);
        });
    }

    if (activeSort === "price-high") {
        sorted.sort(function(a, b) {
            return getPriceNumber(b.price) -
                   getPriceNumber(a.price);
        });
    }

    return sorted;
}


function getPriceNumber(price) {
    if (!price) {
        return Number.MAX_SAFE_INTEGER;
    }

    const number = Number(
        String(price).replace(/[^\d.]/g, "")
    );

    return Number.isFinite(number)
        ? number
        : Number.MAX_SAFE_INTEGER;
}


function renderProducts(products) {
    productsContainer.innerHTML = "";

    productCount.textContent =
        products.length +
        (products.length === 1 ? " pick" : " picks");

    if (products.length === 0) {

        productsContainer.innerHTML = `
            <div class="no-products">
                <div class="empty-icon">⌕</div>
                <h2>Nothing matched your search</h2>
                <p>Try another keyword or clear the filters.</p>
                <button
                    type="button"
                    class="reset-button"
                    id="resetFilters">
                    Clear filters
                </button>
            </div>
        `;

        const resetButton =
            document.getElementById("resetFilters");

        if (resetButton) {
            resetButton.addEventListener(
                "click",
                resetFilters
            );
        }

        return;
    }

    products.forEach(function(product) {
        productsContainer.appendChild(
            createProductCard(product)
        );
    });
}


function createProductCard(product) {
    const card =
        productTemplate.content.cloneNode(true);

    card.querySelector(".category").textContent =
        product.displayCategory || "General";

    card.querySelector(".product-name").textContent =
        product.name || "Product";

    card.querySelector(".price").textContent =
        product.price || "";

    card.querySelector(".store-badge").textContent =
        product.store || "Store";

    const rating =
        card.querySelector(".rating");

    if (product.rating) {
        rating.hidden = false;

        rating.querySelector("b").textContent =
            Number(product.rating).toFixed(1);
    }

    const latestBadge =
        card.querySelector(".latest-badge");

    if (!isNewProduct(product.added)) {
        latestBadge.remove();
    }

    setupProductImage(card, product);

    const buyButton =
        card.querySelector(".buy-button");

    const productLinks =
        card.querySelector(".product-links");

    const linksList =
        card.querySelector(".links-list");


    if (
        Array.isArray(product.links) &&
        product.links.length > 0
    ) {

        buyButton.style.display = "none";

        product.links.forEach(function(link, index) {

            if (!link.affiliateLink) {
                return;
            }

            const element =
                document.createElement("a");

            element.className = "multi-link";

            element.href =
                link.affiliateLink;

            element.target = "_blank";

            element.rel =
                "noopener noreferrer";

            element.innerHTML = `
                <span class="multi-link-name">
                    ${escapeHtml(
                        link.name ||
                        "Option " + (index + 1)
                    )}
                </span>

                <span class="multi-link-right">
                    ${
                        link.price
                            ? `<span class="multi-link-price">
                                ${escapeHtml(link.price)}
                               </span>`
                            : ""
                    }

                    <span class="multi-link-arrow">
                        ↗
                    </span>
                </span>
            `;

            element.addEventListener(
                "click",
                function() {
                    trackAffiliateClick(
                        product,
                        link.name ||
                        "Option " + (index + 1)
                    );
                }
            );

            linksList.appendChild(element);
        });

    } else {

        productLinks.style.display = "none";

        if (product.affiliateLink) {

            buyButton.href =
                product.affiliateLink;

            buyButton.innerHTML =
                "View on " +
                escapeHtml(
                    product.store || "store"
                ) +
                ' <span>↗</span>';

            buyButton.addEventListener(
                "click",
                function() {
                    trackAffiliateClick(
                        product,
                        "Main Product"
                    );
                }
            );

        } else {
            buyButton.style.display = "none";
        }
    }

    return card;
}


/* =========================
   IMAGE HANDLING
========================= */

function setupProductImage(card, product) {

    const image =
        card.querySelector(".product-image");

    const placeholder =
        card.querySelector(".image-placeholder");

    if (!product.image) {
        return;
    }

    image.alt =
        product.name || "Product image";

    const imageUrl =
        getImageUrl(product.image);

    if (!imageUrl) {
        return;
    }

    function showImage() {
        image.classList.add("is-loaded");
        placeholder.classList.add("hidden");
    }

    function showPlaceholder() {
        image.classList.remove("is-loaded");
        placeholder.classList.remove("hidden");

        console.warn(
            "Image failed:",
            product.image,
            imageUrl
        );
    }

    image.addEventListener(
        "load",
        showImage,
        { once: true }
    );

    image.addEventListener(
        "error",
        showPlaceholder,
        { once: true }
    );

    image.src = imageUrl;

    if (image.complete) {

        if (image.naturalWidth > 0) {
            showImage();
        } else {
            showPlaceholder();
        }
    }
}


function getImageUrl(path) {

    if (!path) {
        return "";
    }

    const rawPath =
        String(path)
            .trim()
            .replace(/\\/g, "/");

    if (/^https?:\/\//i.test(rawPath)) {
        return rawPath;
    }

    const cleanPath =
        rawPath
            .replace(/^(\.\/)+/, "")
            .replace(/^\/+/, "");

    try {
        return new URL(
            cleanPath,
            document.baseURI
        ).href;
    } catch (error) {
        console.error(
            "Invalid image path:",
            path
        );

        return "";
    }
}


/* =========================
   SEARCH
========================= */

searchInput.addEventListener(
    "input",
    function() {

        clearSearch.style.display =
            searchInput.value
                ? "flex"
                : "none";

        renderFiltered();
    }
);


clearSearch.addEventListener(
    "click",
    function() {

        searchInput.value = "";

        clearSearch.style.display = "none";

        renderFiltered();

        searchInput.focus();
    }
);


/* =========================
   FILTERS
========================= */

if (storeFilter) {

    storeFilter.addEventListener(
        "change",
        function() {

            activeStore =
                storeFilter.value;

            renderFiltered();
        }
    );
}


if (sortSelect) {

    sortSelect.addEventListener(
        "change",
        function() {

            activeSort =
                sortSelect.value;

            renderFiltered();
        }
    );
}


/* =========================
   RESET
========================= */

function resetFilters() {

    activeCategory = "All";
    activeStore = "All";
    activeSort = "latest";

    searchInput.value = "";

    clearSearch.style.display = "none";

    if (storeFilter) {
        storeFilter.value = "All";
    }

    if (sortSelect) {
        sortSelect.value = "latest";
    }

    categoryChips
        .querySelectorAll(".category-chip")
        .forEach(function(chip) {

            chip.classList.toggle(
                "active",
                chip.textContent === "All"
            );
        });

    renderFiltered();
}


/* =========================
   HELPERS
========================= */

function isNewProduct(dateString) {

    if (!dateString) {
        return false;
    }

    const date =
        new Date(dateString);

    if (Number.isNaN(date.getTime())) {
        return false;
    }

    const days =
        (new Date() - date) / 86400000;

    return days >= 0 && days <= 7;
}


function trackAffiliateClick(product, linkName) {

    if (typeof gtag !== "function") {
        return;
    }

    gtag(
        "event",
        "affiliate_click",
        {
            product_name:
                product.name || "Unknown",

            store:
                product.store || "Unknown",

            link_name:
                linkName,

            product_category:
                product.category || "Unknown"
        }
    );
}


function escapeHtml(value) {

    return String(value).replace(
        /[&<>'"]/g,
        function(character) {

            const entities = {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                "'": "&#39;",
                '"': "&quot;"
            };

            return entities[character];
        }
    );
}


loadProducts();
