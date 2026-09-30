const productsContainer = document.getElementById('productsContainer');
const searchInput = document.getElementById('searchInput');
const productCount = document.getElementById('productCount');
const productTemplate = document.getElementById('productTemplate');
const categoryChips = document.getElementById('categoryChips');
const clearSearch = document.getElementById('clearSearch');

let allProducts = [];
let activeCategory = 'All';

async function loadProducts(){
    try{
        const response = await fetch('products.json?v=41');
        if(!response.ok) throw new Error('Unable to load products.json');
        allProducts = await response.json();
        allProducts.sort((a,b) => new Date(b.added) - new Date(a.added));
        buildCategoryChips();
        renderProducts(allProducts);
    }catch(error){
        productsContainer.innerHTML = '<div class="error-message"><h2>We could not load the picks</h2><p>Please refresh the page and try again.</p></div>';
        productCount.textContent = '';
        console.error(error);
    }
}

function buildCategoryChips(){
    const categories = [...new Set(allProducts.map(p => p.category).filter(Boolean))];
    categoryChips.innerHTML = '';
    ['All', ...categories].forEach(category => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = `category-chip${category === activeCategory ? ' active' : ''}`;
        chip.textContent = category;
        chip.addEventListener('click', () => {
            activeCategory = category;
            categoryChips.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            renderFiltered();
        });
        categoryChips.appendChild(chip);
    });
}

function renderFiltered(){
    const keyword = searchInput.value.toLowerCase().trim();
    const filtered = allProducts.filter(product => {
        const categoryMatch = activeCategory === 'All' || product.category === activeCategory;
        if(!categoryMatch) return false;
        if(!keyword) return true;
        const fields = [product.name, product.category, product.store, product.price].filter(Boolean).join(' ').toLowerCase();
        const linkMatch = Array.isArray(product.links) && product.links.some(link => (link.name || '').toLowerCase().includes(keyword));
        return fields.includes(keyword) || linkMatch;
    });
    renderProducts(filtered);
}

function renderProducts(products){
    productsContainer.innerHTML = '';
    productCount.textContent = `${products.length} pick${products.length === 1 ? '' : 's'}${activeCategory !== 'All' ? ` in ${activeCategory}` : ''}`;

    if(!products.length){
        productsContainer.innerHTML = '<div class="no-products"><h2>Nothing matched that search</h2><p>Try another keyword or browse all categories.</p></div>';
        return;
    }

    const productsByStore = products.reduce((stores, product) => {
        const store = product.store || 'Other';
        (stores[store] ||= []).push(product);
        return stores;
    }, {});

    Object.entries(productsByStore).forEach(([storeName, storeProducts]) => {
        const section = document.createElement('section');
        section.className = 'store-section';

        const header = document.createElement('div');
        header.className = 'store-header';
        header.innerHTML = `<div class="store-title-area"><div class="store-icon">${getStoreIcon(storeName)}</div><div><h2>${escapeHtml(storeName)}</h2><p>${storeProducts.length} ${storeProducts.length === 1 ? 'pick' : 'picks'} to explore</p></div></div>`;

        const grid = document.createElement('div');
        grid.className = 'store-products-grid';
        storeProducts.forEach(product => grid.appendChild(createProductCard(product)));
        section.append(header, grid);
        productsContainer.appendChild(section);
    });
}

function createProductCard(product){
    const card = productTemplate.content.cloneNode(true);
    card.querySelector('.category').textContent = product.category || 'General';
    card.querySelector('.product-name').textContent = product.name || 'Product';
    card.querySelector('.price').textContent = product.price || '';
    card.querySelector('.store-badge').textContent = product.store || 'Store';

    const rating = card.querySelector('.rating');
    if(product.rating){
        rating.hidden = false;
        rating.querySelector('b').textContent = Number(product.rating).toFixed(1);
    }

    const latest = card.querySelector('.latest-badge');
    if(!isNewProduct(product.added)) latest.remove();

    setupProductImage(card, product);

    const buyButton = card.querySelector('.buy-button');
    const productLinks = card.querySelector('.product-links');
    const linksList = card.querySelector('.links-list');

    if(Array.isArray(product.links) && product.links.length){
        buyButton.style.display = 'none';
        product.links.forEach((link, index) => {
            if(!link.affiliateLink) return;
            const el = document.createElement('a');
            el.className = 'multi-link';
            el.href = link.affiliateLink;
            el.target = '_blank';
            el.rel = 'noopener noreferrer';
            el.innerHTML = `<span class="multi-link-name">${escapeHtml(link.name || `Option ${index + 1}`)}</span><span style="display:flex;align-items:center;gap:7px">${link.price ? `<span class="multi-link-price">${escapeHtml(link.price)}</span>` : ''}<span class="multi-link-arrow">↗</span></span>`;
            el.addEventListener('click', () => trackAffiliateClick(product, link.name || `Option ${index + 1}`));
            linksList.appendChild(el);
        });
    }else{
        productLinks.style.display = 'none';
        if(product.affiliateLink){
            buyButton.href = product.affiliateLink;
            buyButton.innerHTML = `View on ${escapeHtml(product.store || 'store')} <span>↗</span>`;
            buyButton.addEventListener('click', () => trackAffiliateClick(product, 'Main Product'));
        }else{
            buyButton.style.display = 'none';
        }
    }
    return card;
}

function setupProductImage(card, product){
    const image = card.querySelector('.product-image');
    const placeholder = card.querySelector('.image-placeholder');
    if(!product.image) return;
    image.alt = product.name || 'Product image';
    image.onload = () => { image.style.display = 'block'; placeholder.style.display = 'none'; };
    image.onerror = () => { image.style.display = 'none'; placeholder.style.display = 'flex'; };
    image.src = product.image;
}

function getStoreIcon(storeName){
    const store = storeName.toLowerCase();
    if(store.includes('amazon')) return '◈';
    if(store.includes('meesho')) return '✿';
    if(store.includes('flipkart')) return '◆';
    if(store.includes('myntra')) return '◇';
    return '✦';
}

searchInput.addEventListener('input', () => {
    clearSearch.style.display = searchInput.value ? 'block' : 'none';
    renderFiltered();
});

clearSearch.addEventListener('click', () => {
    searchInput.value = '';
    clearSearch.style.display = 'none';
    renderFiltered();
    searchInput.focus();
});

function isNewProduct(dateString){
    if(!dateString) return false;
    const days = (new Date() - new Date(dateString)) / 86400000;
    return days >= 0 && days <= 7;
}

function trackAffiliateClick(product, linkName){
    if(typeof gtag !== 'function') return;
    gtag('event','affiliate_click',{product_name:product.name || 'Unknown',store:product.store || 'Unknown',link_name:linkName,product_category:product.category || 'Unknown'});
}

function escapeHtml(value){
    return String(value).replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
}

loadProducts();
