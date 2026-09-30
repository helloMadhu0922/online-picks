const productsContainer = document.getElementById('productsContainer');
const searchInput = document.getElementById('searchInput');
const productCount = document.getElementById('productCount');
const productTemplate = document.getElementById('productTemplate');
const categoryChips = document.getElementById('categoryChips');
const clearSearch = document.getElementById('clearSearch');

let allProducts = [];
let activeCategory = 'All';

/* =========================
LOAD PRODUCTS
========================= */

async function loadProducts() {

```
try {

    const response = await fetch(
        `products.json?v=${Date.now()}`
    );

    if (!response.ok) {
        throw new Error(
            `Unable to load products.json (${response.status})`
        );
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
        throw new Error('products.json must contain an array');
    }

    allProducts = data
        .filter(product => product && typeof product === 'object')
        .sort(
            (a, b) =>
                new Date(b.added || 0) -
                new Date(a.added || 0)
        );

    buildCategoryChips();

    renderProducts(allProducts);

} catch (error) {

    productsContainer.innerHTML = `
        <div class="error-message">
            <h2>We could not load the picks</h2>
            <p>Please refresh the page and try again.</p>
        </div>
    `;

    productCount.textContent = '';

    console.error('Product loading error:', error);
}
```

}

/* =========================
CATEGORY CHIPS
========================= */

function buildCategoryChips() {

```
const categories = [
    ...new Set(
        allProducts
            .map(product => product.category)
            .filter(Boolean)
    )
];

categoryChips.innerHTML = '';

['All', ...categories].forEach(category => {

    const chip = document.createElement('button');

    chip.type = 'button';

    chip.className =
        `category-chip${category === activeCategory ? ' active' : ''}`;

    chip.textContent = category;

    chip.addEventListener('click', () => {

        activeCategory = category;

        categoryChips
            .querySelectorAll('.category-chip')
            .forEach(item =>
                item.classList.remove('active')
            );

        chip.classList.add('active');

        renderFiltered();
    });

    categoryChips.appendChild(chip);
});
```

}

/* =========================
FILTER
========================= */

function renderFiltered() {

```
const keyword =
    searchInput.value
        .toLowerCase()
        .trim();

const filtered = allProducts.filter(product => {

    const categoryMatch =
        activeCategory === 'All' ||
        product.category === activeCategory;

    if (!categoryMatch) {
        return false;
    }

    if (!keyword) {
        return true;
    }

    const fields = [
        product.name,
        product.category,
        product.store,
        product.price
    ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

    const linkMatch =
        Array.isArray(product.links) &&
        product.links.some(link =>
            (link.name || '')
                .toLowerCase()
                .includes(keyword)
        );

    return (
        fields.includes(keyword) ||
        linkMatch
    );
});

renderProducts(filtered);
```

}

/* =========================
RENDER PRODUCTS
========================= */

function renderProducts(products) {

```
productsContainer.innerHTML = '';

productCount.textContent =
    `${products.length} pick${products.length === 1 ? '' : 's'}`
    +
    (
        activeCategory !== 'All'
            ? ` in ${activeCategory}`
            : ''
    );


if (!products.length) {

    productsContainer.innerHTML = `
        <div class="no-products">
            <h2>Nothing matched that search</h2>
            <p>
                Try another keyword or browse all categories.
            </p>
        </div>
    `;

    return;
}


/*
 * Group products by store
 */
const productsByStore = products.reduce(
    (stores, product) => {

        const store =
            product.store || 'Other';

        if (!stores[store]) {
            stores[store] = [];
        }

        stores[store].push(product);

        return stores;

    },
    {}
);


Object.entries(productsByStore)
    .forEach(([storeName, storeProducts]) => {

        const section =
            document.createElement('section');

        section.className =
            'store-section';


        /*
         * STORE HEADER
         */

        const header =
            document.createElement('div');

        header.className =
            'store-header';

        header.innerHTML = `
            <div class="store-title-area">

                <div class="store-icon">
                    ${getStoreIcon(storeName)}
                </div>

                <div>

                    <h2>
                        ${escapeHtml(storeName)}
                    </h2>

                    <p>
                        ${storeProducts.length}
                        ${storeProducts.length === 1
                            ? 'pick'
                            : 'picks'}
                        to explore
                    </p>

                </div>

            </div>
        `;


        /*
         * PRODUCT GRID
         */

        const grid =
            document.createElement('div');

        grid.className =
            'store-products-grid';


        storeProducts.forEach(product => {

            grid.appendChild(
                createProductCard(product)
            );

        });


        section.append(
            header,
            grid
        );

        productsContainer.appendChild(section);
    });
```

}

/* =========================
CREATE PRODUCT CARD
========================= */

function createProductCard(product) {

```
const card =
    productTemplate.content.cloneNode(true);


/*
 * BASIC DATA
 */

card.querySelector('.category').textContent =
    product.category || 'General';

card.querySelector('.product-name').textContent =
    product.name || 'Product';

card.querySelector('.price').textContent =
    product.price || '';

card.querySelector('.store-badge').textContent =
    product.store || 'Store';


/*
 * RATING
 */

const rating =
    card.querySelector('.rating');

if (product.rating !== undefined && product.rating !== null) {

    const numericRating =
        Number(product.rating);

    if (!Number.isNaN(numericRating)) {

        rating.hidden = false;

        rating.querySelector('b').textContent =
            numericRating.toFixed(1);
    }
}


/*
 * NEW BADGE
 */

const latest =
    card.querySelector('.latest-badge');

if (!isNewProduct(product.added)) {
    latest.remove();
}


/*
 * IMAGE
 */

setupProductImage(card, product);


/*
 * LINKS
 */

const buyButton =
    card.querySelector('.buy-button');

const productLinks =
    card.querySelector('.product-links');

const linksList =
    card.querySelector('.links-list');


if (
    Array.isArray(product.links) &&
    product.links.length
) {

    buyButton.style.display = 'none';

    let validLinks = 0;

    product.links.forEach(
        (link, index) => {

            if (!link || !link.affiliateLink) {
                return;
            }

            validLinks++;

            const el =
                document.createElement('a');

            el.className =
                'multi-link';

            el.href =
                link.affiliateLink;

            el.target =
                '_blank';

            el.rel =
                'noopener noreferrer';

            el.innerHTML = `
                <span class="multi-link-name">
                    ${escapeHtml(
                        link.name ||
                        `Option ${index + 1}`
                    )}
                </span>

                <span
                    style="
                        display:flex;
                        align-items:center;
                        gap:7px
                    "
                >
                    ${
                        link.price
                            ? `
                                <span class="multi-link-price">
                                    ${escapeHtml(link.price)}
                                </span>
                              `
                            : ''
                    }

                    <span class="multi-link-arrow">
                        ↗
                    </span>
                </span>
            `;

            el.addEventListener(
                'click',
                () =>
                    trackAffiliateClick(
                        product,
                        link.name ||
                        `Option ${index + 1}`
                    )
            );

            linksList.appendChild(el);
        }
    );


    if (!validLinks) {
        productLinks.style.display = 'none';

        if (product.affiliateLink) {
            setupBuyButton(
                buyButton,
                product
            );
        }
    }

} else {

    productLinks.style.display =
        'none';

    if (product.affiliateLink) {

        setupBuyButton(
            buyButton,
            product
        );

    } else {

        buyButton.style.display =
            'none';
    }
}


return card;
```

}

/* =========================
BUY BUTTON
========================= */

function setupBuyButton(button, product) {

```
button.href =
    product.affiliateLink;

button.innerHTML =
    `View on ${escapeHtml(
        product.store || 'store'
    )} <span>↗</span>`;

button.addEventListener(
    'click',
    () =>
        trackAffiliateClick(
            product,
            'Main Product'
        )
);
```

}

/* =========================
IMAGE HANDLING
========================= */

function setupProductImage(card, product) {

```
const image =
    card.querySelector('.product-image');

const placeholder =
    card.querySelector('.image-placeholder');


/*
 * No image in JSON
 */

if (
    !product.image ||
    typeof product.image !== 'string' ||
    !product.image.trim()
) {

    showImagePlaceholder(
        placeholder,
        'No image'
    );

    return;
}


const imagePath =
    product.image.trim();


image.alt =
    product.name ||
    'Product image';


/*
 * SUCCESS
 */

image.onload = () => {

    image.style.display =
        'block';

    placeholder.style.display =
        'none';
};


/*
 * ERROR
 */

image.onerror = () => {

    image.style.display =
        'none';

    showImagePlaceholder(
        placeholder,
        'Image unavailable'
    );


    console.warn(
        `Image failed for "${product.name}":`,
        imagePath
    );
};


/*
 * IMPORTANT:
 *
 * Resolve relative image paths
 * against the current GitHub Pages URL.
 *
 * Example:
 *
 * images/Tripod.jpeg
 *
 * becomes:
 *
 * https://username.github.io/repository/images/Tripod.jpeg
 */

try {

    image.src =
        new URL(
            imagePath,
            document.baseURI
        ).href;

} catch (error) {

    image.style.display =
        'none';

    showImagePlaceholder(
        placeholder,
        'Invalid image'
    );

    console.error(
        'Invalid image URL:',
        imagePath,
        error
    );
}
```

}

/* =========================
IMAGE PLACEHOLDER
========================= */

function showImagePlaceholder(
placeholder,
message
) {

```
placeholder.style.display =
    'flex';

const text =
    placeholder.querySelector('p');

if (text) {
    text.textContent =
        message;
}
```

}

/* =========================
STORE ICON
========================= */

function getStoreIcon(storeName) {

```
const store =
    String(storeName)
        .toLowerCase();

if (store.includes('amazon')) {
    return '◈';
}

if (store.includes('meesho')) {
    return '✿';
}

if (store.includes('flipkart')) {
    return '◆';
}

if (store.includes('myntra')) {
    return '◇';
}

return '✦';
```

}

/* =========================
SEARCH
========================= */

searchInput.addEventListener(
'input',
() => {

```
    clearSearch.style.display =
        searchInput.value
            ? 'block'
            : 'none';

    renderFiltered();
}
```

);

/* =========================
CLEAR SEARCH
========================= */

clearSearch.addEventListener(
'click',
() => {

```
    searchInput.value =
        '';

    clearSearch.style.display =
        'none';

    renderFiltered();

    searchInput.focus();
}
```

);

/* =========================
NEW PRODUCT
========================= */

function isNewProduct(dateString) {

```
if (!dateString) {
    return false;
}

const added =
    new Date(dateString);

if (Number.isNaN(added.getTime())) {
    return false;
}

const days =
    (
        new Date() - added
    ) / 86400000;

return (
    days >= 0 &&
    days <= 7
);
```

}

/* =========================
GA4 TRACKING
========================= */

function trackAffiliateClick(
product,
linkName
) {

```
if (
    typeof gtag !== 'function'
) {
    return;
}

gtag(
    'event',
    'affiliate_click',
    {
        product_name:
            product.name ||
            'Unknown',

        store:
            product.store ||
            'Unknown',

        link_name:
            linkName,

        product_category:
            product.category ||
            'Unknown'
    }
);
```

}

/* =========================
HTML ESCAPE
========================= */

function escapeHtml(value) {

```
return String(value)
    .replace(
        /[&<>'"]/g,
        char => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[char])
    );
```

}

/* =========================
START
========================= */

loadProducts();
