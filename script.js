// ===============================
// Online Picks
// script.js
// ===============================

const productsContainer =
    document.getElementById("productsContainer");

const searchInput =
    document.getElementById("searchInput");

const productCount =
    document.getElementById("productCount");

const productTemplate =
    document.getElementById("productTemplate");

let allProducts = [];


// ===============================
// Load Products
// ===============================

async function loadProducts() {

    try {

        const response =
            await fetch("products.json?v=22");

        if (!response.ok) {
            throw new Error("Unable to load products.json");
        }

        allProducts = await response.json();


        // Latest product first

        allProducts.sort(
            (a, b) =>
                new Date(b.added) - new Date(a.added)
        );


        renderProducts(allProducts);

    } catch (error) {

        productsContainer.innerHTML = `
            <div class="error-message">
                <h2>Unable to load products</h2>
                <p>Please try again later.</p>
            </div>
        `;

        productCount.textContent = "";

        console.error(error);
    }

}


// ===============================
// Render Products
// ===============================

function renderProducts(products) {

    productsContainer.innerHTML = "";


    // Product count

    productCount.textContent =
        `${products.length} Product${products.length !== 1 ? "s" : ""} Found`;


    // No products

    if (products.length === 0) {

        productsContainer.innerHTML = `
            <div class="no-products">

                <h2>No products found.</h2>

                <p>
                    Try searching with another keyword.
                </p>

            </div>
        `;

        return;
    }


    // ===============================
    // Group By Store
    // ===============================

    const productsByStore =
        products.reduce((stores, product) => {

            const storeName =
                product.store || "Other";


            if (!stores[storeName]) {
                stores[storeName] = [];
            }


            stores[storeName].push(product);


            return stores;

        }, {});


    // ===============================
    // Create Store Sections
    // ===============================

    Object.entries(productsByStore)
        .forEach(([storeName, storeProducts]) => {

            const storeSection =
                document.createElement("section");

            storeSection.className =
                "store-section";


            // ===============================
            // Store Header
            // ===============================

            const storeHeader =
                document.createElement("div");

            storeHeader.className =
                "store-header";


            const titleArea =
                document.createElement("div");

            titleArea.className =
                "store-title-area";


            const icon =
                document.createElement("div");

            icon.className =
                "store-icon";

            icon.textContent =
                getStoreIcon(storeName);


            const titleText =
                document.createElement("div");


            const title =
                document.createElement("h2");

            title.textContent =
                storeName;


            const count =
                document.createElement("p");

            count.textContent =
                `${storeProducts.length} Product${storeProducts.length !== 1 ? "s" : ""}`;


            titleText.appendChild(title);
            titleText.appendChild(count);

            titleArea.appendChild(icon);
            titleArea.appendChild(titleText);

            storeHeader.appendChild(titleArea);


            // ===============================
            // Product Grid
            // ===============================

            const productsGrid =
                document.createElement("div");

            productsGrid.className =
                "store-products-grid";


            // ===============================
            // Create Product Cards
            // ===============================

            storeProducts.forEach(product => {

                const card =
                    createProductCard(product);

                productsGrid.appendChild(card);

            });


            storeSection.appendChild(storeHeader);

            storeSection.appendChild(productsGrid);

            productsContainer.appendChild(storeSection);

        });

}


// ===============================
// Create Product Card
// ===============================

function createProductCard(product) {

    const card =
        productTemplate.content.cloneNode(true);


    // ===============================
    // Category
    // ===============================

    const category =
        card.querySelector(".category");

    category.textContent =
        product.category || "General";


    // ===============================
    // Product Name
    // ===============================

    const productName =
        card.querySelector(".product-name");

    productName.textContent =
        product.name || "Product";


    // ===============================
    // Price
    // ===============================

    const price =
        card.querySelector(".price");

    price.textContent =
        product.price || "";


    // ===============================
    // Store
    // ===============================

    const storeBadge =
        card.querySelector(".store-badge");

    storeBadge.textContent =
        product.store || "Store";


    // ===============================
    // NEW Badge
    // ===============================

    const latestBadge =
        card.querySelector(".latest-badge");


    if (!isNewProduct(product.added)) {

        latestBadge.style.display =
            "none";

    }


    // ===============================
    // Product Image
    // ===============================

    setupProductImage(card, product);


    // ===============================
    // Normal Affiliate Link
    // ===============================

    const buyButton =
        card.querySelector(".buy-button");


    const productLinks =
        card.querySelector(".product-links");


    const linksList =
        card.querySelector(".links-list");


    // ===============================
    // Multiple Links Product
    // ===============================

    if (
        Array.isArray(product.links) &&
        product.links.length > 0
    ) {

        // Hide normal Buy button

        buyButton.style.display =
            "none";


        productLinks.style.display =
            "block";


        product.links.forEach((link, index) => {

            if (
                !link.affiliateLink
            ) {
                return;
            }


            const linkElement =
                document.createElement("a");

            linkElement.className =
                "multi-link";


            linkElement.href =
                link.affiliateLink;

            linkElement.target =
                "_blank";

            linkElement.rel =
                "noopener noreferrer";


            // Link name

            const linkName =
                document.createElement("span");

            linkName.className =
                "multi-link-name";

            linkName.textContent =
                link.name ||
                `Option ${index + 1}`;


            // Right side

            const rightSide =
                document.createElement("span");

            rightSide.style.display =
                "flex";

            rightSide.style.alignItems =
                "center";

            rightSide.style.gap =
                "8px";


            // Link price

            if (link.price) {

                const linkPrice =
                    document.createElement("span");

                linkPrice.className =
                    "multi-link-price";

                linkPrice.textContent =
                    link.price;

                rightSide.appendChild(
                    linkPrice
                );

            }


            // Arrow

            const arrow =
                document.createElement("span");

            arrow.className =
                "multi-link-arrow";

            arrow.textContent =
                "→";


            rightSide.appendChild(arrow);


            linkElement.appendChild(linkName);

            linkElement.appendChild(rightSide);


            // ===============================
            // Google Analytics
            // ===============================

            linkElement.addEventListener(
                "click",
                function () {

                    trackAffiliateClick(
                        product,
                        link.name || `Option ${index + 1}`
                    );

                }
            );


            linksList.appendChild(
                linkElement
            );

        });

    }


    // ===============================
    // Normal Product
    // ===============================

    else {

        productLinks.style.display =
            "none";


        if (product.affiliateLink) {

            buyButton.href =
                product.affiliateLink;

            buyButton.textContent =
                `Buy on ${product.store || "Store"}`;


            // ===============================
            // Google Analytics
            // ===============================

            buyButton.addEventListener(
                "click",
                function () {

                    trackAffiliateClick(
                        product,
                        "Main Product"
                    );

                }
            );

        }

        else {

            buyButton.style.display =
                "none";

        }

    }


    return card;

}


// ===============================
// Product Image
// ===============================

function setupProductImage(card, product) {

    const image =
        card.querySelector(".product-image");

    const placeholder =
        card.querySelector(".image-placeholder");

    // No image provided
    if (!product.image) {

        image.style.display = "none";
        placeholder.style.display = "flex";

        return;
    }

    // Set image information
    image.alt =
        product.name || "Product image";

    // Show image when successfully loaded
    image.onload = function () {

        image.style.display = "block";
        placeholder.style.display = "none";

    };

    // Show placeholder if image fails
    image.onerror = function () {

        image.style.display = "none";
        placeholder.style.display = "flex";

    };

    // Set image URL AFTER registering events
    image.src = product.image;

    // Handle cached/already-loaded images
    if (image.complete && image.naturalWidth > 0) {

        image.style.display = "block";
        placeholder.style.display = "none";

    }

}


// ===============================
// Store Icons
// ===============================

function getStoreIcon(storeName) {

    const store =
        storeName.toLowerCase();


    if (store.includes("amazon")) {
        return "🛒";
    }


    if (store.includes("meesho")) {
        return "🛍️";
    }


    if (store.includes("flipkart")) {
        return "🛒";
    }


    if (store.includes("myntra")) {
        return "👗";
    }


    return "🛍️";

}


// ===============================
// Search
// ===============================

searchInput.addEventListener(
    "input",
    function () {

        const keyword =
            this.value
                .toLowerCase()
                .trim();


        const filteredProducts =
            allProducts.filter(product => {


                // Main product fields

                const mainFieldsMatch =

                    (product.name || "")
                        .toLowerCase()
                        .includes(keyword)

                    ||

                    (product.category || "")
                        .toLowerCase()
                        .includes(keyword)

                    ||

                    (product.store || "")
                        .toLowerCase()
                        .includes(keyword);


                if (mainFieldsMatch) {
                    return true;
                }


                // ===============================
                // Search Multiple Links
                // ===============================

                if (
                    Array.isArray(product.links)
                ) {

                    return product.links.some(
                        link =>
                            (link.name || "")
                                .toLowerCase()
                                .includes(keyword)
                    );

                }


                return false;

            });


        renderProducts(
            filteredProducts
        );

    }
);


// ===============================
// Check if Product is NEW
// ===============================

function isNewProduct(dateString) {

    if (!dateString) {
        return false;
    }


    const addedDate =
        new Date(dateString);

    const today =
        new Date();


    const difference =
        today - addedDate;


    const days =
        difference /
        (1000 * 60 * 60 * 24);


    return days >= 0 && days <= 7;

}


// ===============================
// Google Analytics
// ===============================

function trackAffiliateClick(
    product,
    linkName
) {

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


// ===============================
// Start App
// ===============================

loadProducts();
