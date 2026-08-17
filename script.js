// ===============================
// Amazon Picks
// script.js
// ===============================

const productsContainer = document.getElementById("productsContainer");
const searchInput = document.getElementById("searchInput");
const productCount = document.getElementById("productCount");
const productTemplate = document.getElementById("productTemplate");

let allProducts = [];

// ===============================
// Load Products
// ===============================

async function loadProducts() {

    try {

        const response = await fetch("products.json?v=4");

        allProducts = await response.json();

        // Latest product first
        allProducts.sort((a, b) => new Date(b.added) - new Date(a.added));

        renderProducts(allProducts);

    } catch (error) {

        productsContainer.innerHTML = `
            <div class="error-message">
                Failed to load products.
            </div>
        `;

        console.error(error);
    }

}

// ===============================
// Render Products
// ===============================

function renderProducts(products) {

    productsContainer.innerHTML = "";

    productCount.textContent = `${products.length} Product${products.length !== 1 ? "s" : ""} Found`;

    if (products.length === 0) {

        productsContainer.innerHTML = `
            <div class="no-products">
                <h2>No products found.</h2>
                <p>Try searching with another keyword.</p>
            </div>
        `;

        return;
    }

    products.forEach(product => {

        const card = productTemplate.content.cloneNode(true);

        card.querySelector(".category").textContent = product.category;

        card.querySelector(".product-name").textContent = product.name;

        card.querySelector(".price").textContent = product.price;

        const button = card.querySelector(".buy-button");

        button.href = product.affiliateLink;

        button.textContent = `Buy on ${product.store}`;

        // NEW Badge

        const badge = card.querySelector(".latest-badge");

        if (!isNewProduct(product.added)) {

            badge.style.display = "none";

        }

        productsContainer.appendChild(card);

    });

}

// ===============================
// Search
// ===============================

searchInput.addEventListener("input", function () {

    const keyword = this.value.toLowerCase().trim();

    const filteredProducts = allProducts.filter(product =>

        product.name.toLowerCase().includes(keyword) ||

        product.category.toLowerCase().includes(keyword)

    );

    renderProducts(filteredProducts);

});

// ===============================
// Check if Product is NEW
// ===============================

function isNewProduct(dateString) {

    const addedDate = new Date(dateString);

    const today = new Date();

    const difference = today - addedDate;

    const days = difference / (1000 * 60 * 60 * 24);

    return days <= 7;

}

// ===============================
// Start App
// ===============================

loadProducts();
