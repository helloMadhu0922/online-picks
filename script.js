const productsContainer = document.getElementById('productsContainer');
const searchInput = document.getElementById('searchInput');
const productCount = document.getElementById('productCount');
const productTemplate = document.getElementById('productTemplate');
const categoryChips = document.getElementById('categoryChips');
const clearSearch = document.getElementById('clearSearch');
const storeFilter = document.getElementById('storeFilter');
const sortSelect = document.getElementById('sortSelect');

let allProducts = [];
let activeCategory = 'All';
let activeStore = 'All';
let activeSort = 'latest';


async function loadProducts() {
    try {
        const response = await fetch('./products.json?v=30', {
            cache: 'no-store'
        });

        if (!response.ok) {
            throw new Error('Unable to load products.json');
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
            throw new Error('products.json must contain an array');
        }

        allProducts = data.map(product => ({
            ...product,
            displayCategory: normalizeCategory(product.category)
        }));

        allProducts.sort((a, b) => {
            return new Date(b.added || 0) - new Date(a.added || 0);
        });

        buildCategoryChips();
        buildStoreFilter();
        renderFiltered();

    } catch (error) {
        console.error('Product loading error:', error);

        productsContainer.innerHTML = `
            <div class="error-message">
                <div class="error-icon">!</div>
                <h2>We couldn't load the picks</h2>
                <p>Please refresh the page and try again.</p>
            </div>
        `;

        productCount.textContent = '';
    }
}


/* -----------------------------
   CATEGORY FILTER
----------------------------- */

function normalizeCategory(category) {
    const value = String(category || '').trim();

    if (value.toLowerCase() === 'gadget') {
        return 'Gadgets';
    }

    return value || 'General';
}


function buildCategoryChips() {
    const categories = [
        ...new Set(
            allProducts
                .map(product => product.displayCategory)
                .filter(Boolean)
        )
    ];

    categoryChips.innerHTML = '';

    const allCategories = ['All', ...categories];

    allCategories.forEach(category => {
        const chip = document.createElement('button');

        chip.type = 'button';
        chip.className = 'category-chip';

        if (category === activeCategory) {
            chip.classList.add('active');
        }

        chip.textContent = category;

        chip.addEventListener('click', () => {
            activeCategory = category;

            categoryChips
                .querySelectorAll('.category-chip')
                .forEach(item => item.classList.remove('active'));

            chip.classList.add('active');

            renderFiltered();
        });

        categoryChips.appendChild(chip);
    });
}


/* -----------------------------
   STORE FILTER
----------------------------- */

function buildStoreFilter() {
    if (!storeFilter) {
        return;
    }

    const stores = [
        ...new Set(
            allProducts
                .map(product => product.store)
                .filter(Boolean)
        )
    ];

    storeFilter.innerHTML = '<option value="All">All stores</option>';

    stores.forEach(store => {
        const option = document.createElement('option');

        option.value = store;
        option.textContent = store;

        storeFilter.appendChild(option);
    });

    storeFilter.value = activeStore;
}


/* -----------------------------
   FILTER + SORT
----------------------------- */

function renderFiltered() {
    const keyword = searchInput.value.toLowerCase().trim();

    let filtered = allProducts.filter(product => {

        const categoryMatch =
            activeCategory === 'All' ||
            product.displayCategory === activeCategory;

        const storeMatch =
            activeStore === 'All' ||
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
            .join(' ')
            .toLowerCase();

        const linkMatch =
            Array.isArray(product.links) &&
            product.links.some(link =>
                String(link.name || '')
                    .toLowerCase()
                    .includes(keyword)
            );

        return searchableText.includes(keyword) || linkMatch;
    });

    filtered = sortProducts(filtered);

    renderProducts(filtered);
}


function sortProducts(products) {
    const sorted = [...products];

    if (activeSort === 'latest') {
        sorted.sort((a, b) => {
            return new Date(b.added || 0) - new Date(a.added || 0);
        });
    }

    if (activeSort === 'oldest') {
        sorted.sort((a, b) => {
            return new Date(a.added || 0) - new Date(b.added || 0);
        });
    }

    if (activeSort === 'price-low') {
        sorted.sort((a, b) => {
            return getPriceNumber(a.price) - getPriceNumber(b.price);
        });
    }

    if (activeSort === 'price-high') {
        sorted.sort((a, b) => {
            return getPriceNumber(b.price) - getPriceNumber(a.price);
        });
    }

    return sorted;
}


function getPriceNumber(price) {
    if (!price) {
        return Number.MAX_SAFE_INTEGER;
    }

    const number = Number(
        String(price).replace(/[^\d.]/g, '')
    );

    return Number.isFinite(number)
        ? number
        : Number.MAX_SAFE_INTEGER;
}


/* -----------------------------
   RENDER PRODUCTS
----------------------------- */

function renderProducts(products) {
    productsContainer.innerHTML = '';

    let countText = `${products.length} pick`;

    if (products.length !== 1) {
        countText += 's';
    }

    productCount.textContent = countText;

    if (!products.length) {
        productsContainer.innerHTML = `
            <div class="no-products">
                <div class="empty-icon">⌕</div>
                <h2>Nothing matched your search</h2>
                <p>Try another keyword or clear the filters.</p>
                <button type="button" class="reset-button" id="resetFilters">
                    Clear filters
                </button>
            </div>
        `;

        const resetButton = document.getElementById('resetFilters');

        if (resetButton) {
            resetButton.addEventListener('click', resetFilters);
        }

        return;
    }

    products.forEach(product => {
        productsContainer.appendChild(
            createProductCard(product)
        );
    });
}


/* -----------------------------
   PRODUCT CARD
----------------------------- */

function createProductCard(product) {
    const card = productTemplate.content.cloneNode(true);

    const category = card.querySelector('.category');
    const productName = card.querySelector('.product-name');
    const price = card.querySelector('.price');
    const storeBadge = card.querySelector('.store-badge');
    const rating = card.querySelector('.rating');
    const latestBadge = card.querySelector('.latest-badge');

    category.textContent =
        product.displayCategory || 'General';

    productName.textContent =
        product.name || 'Product';

    price.textContent =
        product.price || '';

    storeBadge.textContent =
        product.store || 'Store';

    if (product.rating) {
        rating.hidden = false;

        rating.querySelector('b').textContent =
            Number(product.rating).toFixed(1);
    }

    if (!isNewProduct(product.added)) {
        latestBadge.remove();
    }

    setupProductImage(card, product);

    const buyButton = card.querySelector('.buy-button');
    const productLinks = card.querySelector('.product-links');
    const linksList = card.querySelector('.links-list');

    /*
     * Multiple links
     */
    if (
        Array.isArray(product.links) &&
        product.links.length > 0
    ) {
        buyButton.style.display = 'none';

        product.links.forEach((link, index) => {

            if (!link.affiliateLink) {
                return;
            }

            const linkElement =
                document.createElement('a');

            linkElement.className = 'multi-link';

            linkElement.href =
                link.affiliateLink;

            linkElement.target = '_blank';

            linkElement.rel =
                'noopener noreferrer';

            const linkName =
                escapeHtml(
                    link.name ||
                    `Option ${index + 1}`
                );

            const linkPrice =
                link.price
                    ? `<span class="multi-link-price">${escapeHtml(link.price)}</span>`
                    : '';

            linkElement.innerHTML = `
                <span class="multi-link-name">
                    ${linkName}
                </span>

                <span class="multi-link-right">
                    ${linkPrice}
                    <span class="multi-link-arrow">↗</span>
                </span>
            `;

            linkElement.addEventListener('click', () => {
                trackAffiliateClick(
                    product,
                    link.name ||
                    `Option ${index + 1}`
                );
            });

            linksList.appendChild(linkElement);
        });

    } else {

        productLinks.style.display = 'none';

        if (product.affiliateLink) {

            buyButton.href =
                product.affiliateLink;

            buyButton.innerHTML = `
                View on ${escapeHtml(product.store || 'store')}
                <span>↗</span>
            `;

            buyButton.addEventListener('click', () => {
                trackAffiliateClick(
                    product,
                    'Main Product'
                );
            });

        } else {
            buyButton.style.display = 'none';
        }
    }

    return card;
}


/* -----------------------------
   IMAGE FIX
----------------------------- */

function setupProductImage(card, product) {
    const image =
        card.querySelector('.product-image');

    const placeholder =
        card.querySelector('.image-placeholder');

    if (!product.image) {
        return;
    }

    image.alt =
        product.name || 'Product image';

    const imageUrl =
        getImageUrl(product.image);

    if (!imageUrl) {
        return;
    }

    const showImage = () => {
        image.classList.add('is-loaded');
        placeholder.classList.add('hidden');
    };

    const showPlaceholder = () => {
        image.classList.remove('is-loaded');
        placeholder.classList.remove('hidden');

        console.warn(
            'Image could not be loaded:',
            product.image,
            'Resolved URL:',
            imageUrl
        );
    };

    image.addEventListener(
        'load',
        showImage,
        { once: true }
    );

    image.addEventListener(
        'error',
        showPlaceholder,
        { once: true }
    );

    /*
     * Important:
     * Use document.baseURI so GitHub Pages project
     * paths such as /online-picks/ work correctly.
     */
    image.src = imageUrl;

    /*
     * Handles cached images.
     */
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
        return '';
    }

    const rawPath =
        String(path)
            .trim()
            .replace(/\\/g, '/');

    /*
     * Allow external image URLs too.
     */
    if (/^https?:\/\//i.test(rawPath)) {
        return rawPath;
    }

    /*
     * Remove accidental leading ./ or /
     * so GitHub Pages keeps the /online-picks/
     * repository path.
     */
    const cleanPath =
        rawPath
            .replace(/^(\.\/)+/, '')
            .replace(/^\/+/, '');

    try {
        return new URL(
            cleanPath,
            document.baseURI
        ).href;
    } catch (error) {
        console.error(
            'Invalid image path:',
            path
        );

        return '';
    }
}


/* -----------------------------
   SEARCH
----------------------------- */

searchInput.addEventListener('input', () => {
    clearSearch.style.display =
        searchInput.value
            ? 'flex'
            : 'none';

    renderFiltered();
});


clearSearch.addEventListener('click', () => {
    searchInput.value = '';

    clearSearch.style.display = 'none';

    renderFiltered();

    searchInput.focus();
});


/* -----------------------------
   STORE + SORT CONTROLS
----------------------------- */

if (storeFilter) {
    storeFilter.addEventListener('change', () => {
        activeStore = storeFilter.value;

        renderFiltered();
    });
}


if (sortSelect) {
    sortSelect.addEventListener('change', () => {
        activeSort = sortSelect.value;

        renderFiltered();
    });
}


/* -----------------------------
   RESET
----------------------------- */

function resetFilters() {
    activeCategory = 'All';
    activeStore = 'All';
    activeSort = 'latest';

    searchInput.value = '';

    clearSearch.style.display = 'none';

    if (storeFilter) {
        storeFilter.value = 'All';
    }

    if (sortSelect) {
        sortSelect.value = 'latest';
    }

    categoryChips
        .querySelectorAll('.category-chip')
        .forEach(chip => {
            chip.classList.toggle(
                'active',
                chip.textContent === 'All'
            );
        });

    renderFiltered();
}


/* -----------------------------
   HELPERS
----------------------------- */

function isNewProduct(dateString) {
    if (!dateString) {
        return false;
    }

    const productDate =
        new Date(dateString);

    if (Number.isNaN(productDate.getTime())) {
        return false;
    }

    const days =
        (new Date() - productDate) /
        86400000;

    return days >= 0 && days <= 7;
}


function trackAffiliateClick(product, linkName) {
    if (typeof gtag !== 'function') {
        return;
    }

    gtag(
        'event',
        'affiliate_click',
        {
            product_name:
                product.name || 'Unknown',

            store:
                product.store || 'Unknown',

            link_name:
                linkName,

            product_category:
                product.category || 'Unknown'
        }
    );
}


function escapeHtml(value) {
    return String(value).replace(
        /[&<>'"]/g,
        character => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[character])
    );
}


/* -----------------------------
   START
----------------------------- */

loadProducts();
