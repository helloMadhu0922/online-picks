/* =========================================================
   HELLO MADHU — ONLINE PICKS
   Main Product Script
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

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


    /* =====================================================
       LOAD PRODUCTS
       ===================================================== */

    async function loadProducts() {

        try {

            const response = await fetch(
                "./products.json?v=40",
                {
                    cache: "no-store"
                }
            );

            if (!response.ok) {
                throw new Error(
                    `products.json failed: ${response.status}`
                );
            }

            const products = await response.json();

            if (!Array.isArray(products)) {
                throw new Error("products.json is not an array");
            }

            allProducts = products.map((product, index) => {

                return {
                    ...product,

                    originalIndex: index,

                    displayCategory:
                        normalizeCategory(product.category)
                };

            });

            allProducts.sort(
                (a, b) =>
                    (Number(b.id) || 0) -
                    (Number(a.id) || 0)
            );

            buildCategoryChips();
            buildStoreFilter();
            renderFiltered();

        } catch (error) {

            console.error(
                "Failed to load products:",
                error
            );

            if (productsContainer) {

                productsContainer.innerHTML = `
                    <div class="empty-state">
                        <h3>Products couldn't be loaded</h3>
                        <p>Please refresh the page and try again.</p>
                    </div>
                `;

            }

        }

    }


    /* =====================================================
       CATEGORY NORMALIZATION
       ===================================================== */

    function normalizeCategory(category) {

        if (!category) {
            return "Other";
        }

        const value =
            String(category).trim();

        if (value.toLowerCase() === "gadget") {
            return "Gadgets";
        }

        return value;
    }


    /* =====================================================
       CATEGORY CHIPS
       ===================================================== */

    function buildCategoryChips() {

        if (!categoryChips) {
            return;
        }

        const categories = [
            ...new Set(
                allProducts
                    .map(product => product.displayCategory)
                    .filter(Boolean)
            )
        ];

        categories.sort(
            (a, b) => a.localeCompare(b)
        );

        categoryChips.innerHTML = "";

        const allButton =
            document.createElement("button");

        allButton.type = "button";

        allButton.className =
            "category-chip active";

        allButton.textContent = "All";

        allButton.dataset.category = "All";

        categoryChips.appendChild(allButton);

        categories.forEach(category => {

            const button =
                document.createElement("button");

            button.type = "button";

            button.className =
                "category-chip";

            button.textContent = category;

            button.dataset.category = category;

            categoryChips.appendChild(button);

        });

        categoryChips
            .querySelectorAll(".category-chip")
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        activeCategory =
                            button.dataset.category;

                        categoryChips
                            .querySelectorAll(
                                ".category-chip"
                            )
                            .forEach(chip => {

                                chip.classList.toggle(
                                    "active",
                                    chip === button
                                );

                            });

                        renderFiltered();

                    }
                );

            });

    }


    /* =====================================================
       STORE FILTER
       ===================================================== */

    function buildStoreFilter() {

        if (!storeFilter) {
            return;
        }

        const stores = [
            ...new Set(
                allProducts
                    .map(product =>
                        getStoreName(product)
                    )
                    .filter(Boolean)
            )
        ];

        stores.sort(
            (a, b) => a.localeCompare(b)
        );

        storeFilter.innerHTML =
            `<option value="All">All Stores</option>`;

        stores.forEach(store => {

            const option =
                document.createElement("option");

            option.value = store;

            option.textContent = store;

            storeFilter.appendChild(option);

        });

    }


    /* =====================================================
       STORE NAME
       ===================================================== */

    function getStoreName(product) {

        if (product.store) {
            return String(product.store);
        }

        if (
            product.links &&
            Array.isArray(product.links) &&
            product.links.length
        ) {

            return (
                product.links[0].store ||
                product.links[0].name ||
                ""
            );

        }

        return "";
    }


    /* =====================================================
       FILTER + SORT
       ===================================================== */

    function renderFiltered() {

        const searchTerm =
            searchInput
                ? searchInput.value
                    .trim()
                    .toLowerCase()
                : "";

        let filtered =
            allProducts.filter(product => {

                const matchesCategory =
                    activeCategory === "All" ||
                    product.displayCategory ===
                        activeCategory;

                const matchesStore =
                    activeStore === "All" ||
                    getStoreName(product) ===
                        activeStore;

                const searchableText = [
                    product.name,
                    product.category,
                    product.store,
                    product.description
                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();

                const matchesSearch =
                    !searchTerm ||
                    searchableText.includes(searchTerm);

                return (
                    matchesCategory &&
                    matchesStore &&
                    matchesSearch
                );

            });

        filtered =
            sortProducts(
                filtered,
                activeSort
            );

        renderProducts(filtered);

    }


    /* =====================================================
       SORT
       ===================================================== */

    function sortProducts(
        products,
        sortType
    ) {

        const result =
            [...products];

        switch (sortType) {

            case "oldest":

                return result.sort(
                    (a, b) =>
                        (Number(a.id) || 0) -
                        (Number(b.id) || 0)
                );

            case "price-low":

                return result.sort(
                    (a, b) =>
                        getPriceNumber(a.price) -
                        getPriceNumber(b.price)
                );

            case "price-high":

                return result.sort(
                    (a, b) =>
                        getPriceNumber(b.price) -
                        getPriceNumber(a.price)
                );

            case "latest":

            default:

                return result.sort(
                    (a, b) =>
                        (Number(b.id) || 0) -
                        (Number(a.id) || 0)
                );
        }

    }


    /* =====================================================
       PRICE NUMBER
       ===================================================== */

    function getPriceNumber(price) {

        if (
            price === null ||
            price === undefined
        ) {
            return Number.MAX_SAFE_INTEGER;
        }

        const number =
            String(price)
                .replace(/[^\d.]/g, "");

        const parsed =
            parseFloat(number);

        return Number.isNaN(parsed)
            ? Number.MAX_SAFE_INTEGER
            : parsed;
    }


    /* =====================================================
       RENDER PRODUCTS
       ===================================================== */

    function renderProducts(products) {

        if (!productsContainer) {
            return;
        }

        productsContainer.innerHTML = "";

        if (productCount) {

            productCount.textContent =
                `${products.length} ${
                    products.length === 1
                        ? "product"
                        : "products"
                }`;

        }

        if (!products.length) {

            productsContainer.innerHTML = `
                <div class="empty-state">
                    <h3>No products found</h3>
                    <p>Try changing your search or filters.</p>
                </div>
            `;

            return;
        }

        products.forEach(product => {

            const card =
                createProductCard(product);

            if (card) {
                productsContainer.appendChild(card);
            }

        });

    }


    /* =====================================================
       CREATE PRODUCT CARD
       ===================================================== */

    function createProductCard(product) {

        if (!productTemplate) {
            return null;
        }

        const fragment =
            productTemplate.content.cloneNode(true);

        const card =
            fragment.querySelector(".product-card");

        const image =
            fragment.querySelector(".product-image");

        const placeholder =
            fragment.querySelector(
                ".image-placeholder"
            );

        const latestBadge =
            fragment.querySelector(
                ".latest-badge"
            );

        const category =
            fragment.querySelector(".category");

        const rating =
            fragment.querySelector(".rating");

        const ratingValue =
            fragment.querySelector(
                ".rating b"
            );

        const productName =
            fragment.querySelector(
                ".product-name"
            );

        const price =
            fragment.querySelector(".price");

        const storeBadge =
            fragment.querySelector(
                ".store-badge"
            );

        const buyButton =
            fragment.querySelector(
                ".buy-button"
            );

        const productLinks =
            fragment.querySelector(
                ".product-links"
            );

        const linksList =
            fragment.querySelector(
                ".links-list"
            );


        /* =================================================
           CATEGORY
           ================================================= */

        if (category) {

            category.textContent =
                product.displayCategory ||
                product.category ||
                "Product";

        }


        /* =================================================
           NAME
           ================================================= */

        if (productName) {

            productName.textContent =
                product.name ||
                "Product";

        }


        /* =================================================
           PRICE
           ================================================= */

        if (price) {

            price.textContent =
                product.price
                    ? String(product.price)
                    : "";

        }


        /* =================================================
           STORE
           ================================================= */

        const storeName =
            getStoreName(product);

        if (storeBadge) {

            storeBadge.textContent =
                storeName || "Store";

        }


        /* =================================================
           RATING
           ================================================= */

        if (
            product.rating !== undefined &&
            product.rating !== null &&
            product.rating !== ""
        ) {

            if (rating) {
                rating.hidden = false;
            }

            if (ratingValue) {
                ratingValue.textContent =
                    product.rating;
            }

        } else {

            if (rating) {
                rating.hidden = true;
            }

        }


        /* =================================================
           LATEST BADGE
           ================================================= */

        if (latestBadge) {

            if (
                product.isNew === false
            ) {

                latestBadge.style.display =
                    "none";

            }

        }


        /* =================================================
           IMAGE
           ================================================= */

        setupProductImage(
            image,
            placeholder,
            product.image,
            product.name
        );


        /* =================================================
           BUY LINK
           ================================================= */

        const primaryLink =
            getPrimaryLink(product);

        if (buyButton) {

            if (primaryLink) {

                buyButton.href =
                    primaryLink;

                buyButton.style.display =
                    "flex";

                buyButton.addEventListener(
                    "click",
                    () => {

                        trackAffiliateClick(
                            product
                        );

                    }
                );

            } else {

                buyButton.style.display =
                    "none";

            }

        }


        /* =================================================
           MULTIPLE LINKS
           ================================================= */

        if (
            product.links &&
            Array.isArray(product.links) &&
            product.links.length
        ) {

            if (linksList) {

                linksList.innerHTML = "";

                product.links.forEach(
                    link => {

                        if (!link.url) {
                            return;
                        }

                        const anchor =
                            document.createElement("a");

                        anchor.href =
                            link.url;

                        anchor.target =
                            "_blank";

                        anchor.rel =
                            "noopener noreferrer";

                        anchor.textContent =
                            link.store ||
                            link.name ||
                            "View";

                        anchor.addEventListener(
                            "click",
                            () => {

                                trackAffiliateClick(
                                    product,
                                    link
                                );

                            }
                        );

                        linksList.appendChild(
                            anchor
                        );

                    }
                );

            }

        } else {

            if (productLinks) {

                productLinks.style.display =
                    "none";

            }

        }


        return card;

    }


    /* =====================================================
       PRIMARY LINK
       ===================================================== */

    function getPrimaryLink(product) {

        if (product.affiliateLink) {
            return product.affiliateLink;
        }

        if (
            product.links &&
            Array.isArray(product.links)
        ) {

            const first =
                product.links.find(
                    link => link && link.url
                );

            return first
                ? first.url
                : "";
        }

        return "";

    }


    /* =====================================================
       IMAGE URL
       ===================================================== */

    function getImageUrl(imagePath) {

        if (!imagePath) {
            return "";
        }

        let cleanPath =
            String(imagePath).trim();

        /*
         * Remove leading ./ or /
         * so GitHub Pages correctly resolves:
         *
         * images/file.jpeg
         */

        cleanPath =
            cleanPath.replace(
                /^(\.\/|\/)+/,
                ""
            );

        /*
         * document.baseURI on GitHub Pages
         * should be:
         *
         * https://hellomadhu0922.github.io/online-picks/
         */

        try {

            return new URL(
                cleanPath,
                document.baseURI
            ).href;

        } catch (error) {

            console.error(
                "Could not create image URL:",
                imagePath,
                error
            );

            return cleanPath;

        }

    }


    /* =====================================================
       SETUP IMAGE
       ===================================================== */

    function setupProductImage(
        img,
        placeholder,
        imagePath,
        productName
    ) {

        if (!img) {
            return;
        }

        const imageUrl =
            getImageUrl(imagePath);

        if (!imageUrl) {

            img.style.display =
                "none";

            if (placeholder) {
                placeholder.style.display =
                    "flex";
            }

            return;
        }


        /*
         * IMPORTANT:
         * Set handlers BEFORE src.
         */

        img.onload = () => {

            img.classList.add(
                "loaded"
            );

            img.style.display =
                "block";

            if (placeholder) {

                placeholder.style.display =
                    "none";

            }

        };


        img.onerror = () => {

            console.error(
                "IMAGE FAILED TO LOAD:",
                {
                    product:
                        productName,

                    originalPath:
                        imagePath,

                    generatedUrl:
                        imageUrl
                }
            );

            img.classList.remove(
                "loaded"
            );

            img.style.display =
                "none";

            if (placeholder) {

                placeholder.style.display =
                    "flex";

            }

        };


        img.alt =
            productName ||
            "Product image";

        img.loading =
            "lazy";

        img.decoding =
            "async";

        img.src =
            imageUrl;


        /*
         * Handles browser cache.
         */

        if (
            img.complete &&
            img.naturalWidth > 0
        ) {

            img.onload();

        }

    }


    /* =====================================================
       SEARCH
       ===================================================== */

    if (searchInput) {

        searchInput.addEventListener(
            "input",
            () => {

                renderFiltered();

            }
        );

    }


    /* =====================================================
       CLEAR SEARCH
       ===================================================== */

    if (clearSearch) {

        clearSearch.addEventListener(
            "click",
            () => {

                if (searchInput) {

                    searchInput.value =
                        "";

                    searchInput.focus();

                }

                renderFiltered();

            }
        );

    }


    /* =====================================================
       STORE FILTER
       ===================================================== */

    if (storeFilter) {

        storeFilter.addEventListener(
            "change",
            () => {

                activeStore =
                    storeFilter.value;

                renderFiltered();

            }
        );

    }


    /* =====================================================
       SORT
       ===================================================== */

    if (sortSelect) {

        sortSelect.addEventListener(
            "change",
            () => {

                activeSort =
                    sortSelect.value;

                renderFiltered();

            }
        );

    }


    /* =====================================================
       AFFILIATE ANALYTICS
       ===================================================== */

    function trackAffiliateClick(
        product,
        link = null
    ) {

        if (
            typeof window.gtag !==
            "function"
        ) {
            return;
        }

        window.gtag(
            "event",
            "affiliate_click",
            {
                product_name:
                    product.name || "",

                store:
                    link?.store ||
                    product.store ||
                    "",

                product_id:
                    product.id || ""
            }
        );

    }


    /* =====================================================
       START
       ===================================================== */

    loadProducts();

});
