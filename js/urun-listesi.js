// js/urun-listesi.js

document.addEventListener('DOMContentLoaded', () => {
    const backendUrl = 'http://localhost:5000'; // Backend adresin doğru olduğundan emin ol

    // Filtreleme ve sıralama elemanları (urunler.html sayfasındaki)
    const categoryFilterSelect = document.getElementById('category-filter');
    const priceMinInput = document.getElementById('price-filter-min');
    const priceMaxInput = document.getElementById('price-filter-max');
    const sortBySelect = document.getElementById('sort-by');
    const applyFiltersBtn = document.getElementById('apply-filters-btn'); // urunler.html'deki filtre butonu

    // Ürünlerin listeleneceği alan ve mesaj alanı
    const productListGrid = document.getElementById('product-list-grid');
    const productListMessageArea = document.getElementById('product-list-message-area');

    // HTML'i güvenli hale getirmek için basit bir fonksiyon
    const escapeHtml = (unsafe) => {
        if (typeof unsafe !== 'string') return unsafe;
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    };

    // Kullanıcıya mesaj gösterme fonksiyonu
    const showProductListMessage = (message, type = 'info') => {
        if (productListMessageArea) {
            productListMessageArea.innerHTML = `<p>${escapeHtml(message)}</p>`;
            // Bootstrap alert class'larını kullanıyoruz
            productListMessageArea.className = `alert alert-${type} w-100`; // Mesajın tam genişlikte olması için
            productListMessageArea.style.display = 'block';
            // Bilgi mesajları dışındakiler bir süre sonra kaybolsun
            if (type !== 'info' && type !== 'light') {
                setTimeout(() => {
                    if (productListMessageArea) productListMessageArea.style.display = 'none';
                }, 5000);
            }
        } else {
            console.warn("Ürün listesi için mesaj alanı (product-list-message-area) bulunamadı.");
        }
    };

    // Kategori Filtresini Doldurma
    const populateCategoryFilter = async () => {
        if (!categoryFilterSelect) return;
        try {
            const response = await fetch(`${backendUrl}/api/categories`);
            if (!response.ok) {
                throw new Error('Kategoriler filtre için yüklenemedi.');
            }
            const categories = await response.json();

            categoryFilterSelect.innerHTML = '<option value="">Tümü</option>'; // Önce temizle ve "Tümü" ekle
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.category_id;
                option.textContent = escapeHtml(category.category_name);
                categoryFilterSelect.appendChild(option);
            });
        } catch (error) {
            console.error("Kategori filtresi doldurulurken hata:", error);
            // Hata durumunda kullanıcıya bilgi verilebilir, şimdilik konsola yazıyoruz.
            // showProductListMessage(error.message, 'danger');
        }
    };

    // Ürünleri Yükleme ve Gösterme (Bootstrap Card ile ve Arama Terimi Entegrasyonu)
    const loadProducts = async () => {
        if (!productListGrid) {
            console.warn("'product-list-grid' ID'li element bulunamadı.");
            return;
        }
        if (productListMessageArea) productListMessageArea.style.display = 'none';
        productListGrid.innerHTML = '<div class="col-12 text-center"><p class="mt-5"><i class="fas fa-spinner fa-spin fa-2x"></i> Ürünler yükleniyor...</p></div>';

        // URL'den arama terimini al
        const urlParams = new URLSearchParams(window.location.search);
        const searchTermFromUrl = urlParams.get('search_term');

        // urunler.html sayfasındaki filtrelerden değerleri al
        const selectedCategory = categoryFilterSelect ? categoryFilterSelect.value : '';
        const minPrice = priceMinInput ? priceMinInput.value : '';
        const maxPrice = priceMaxInput ? priceMaxInput.value : '';
        const sortBy = sortBySelect ? sortBySelect.value : 'created_at_desc'; // Varsayılan sıralama

        let queryParams = `?status=aktif&sort_by=${encodeURIComponent(sortBy)}`;
        if (selectedCategory) queryParams += `&category=${encodeURIComponent(selectedCategory)}`;
        if (minPrice) queryParams += `&min_price=${encodeURIComponent(minPrice)}`;
        if (maxPrice) queryParams += `&max_price=${encodeURIComponent(maxPrice)}`;
        if (searchTermFromUrl) {
            queryParams += `&search_term=${encodeURIComponent(searchTermFromUrl)}`;
            // Arama yapıldığında, urunler.html sayfasındaki arama input'unu da doldurabiliriz (opsiyonel)
            // const headerSearchInput = document.getElementById('header-search-input');
            // if(headerSearchInput) headerSearchInput.value = searchTermFromUrl;
        }

        console.log("API'ye gönderilen query:", queryParams);

        try {
            const response = await fetch(`${backendUrl}/api/products${queryParams}`);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Bilinmeyen bir sunucu hatası oluştu.' }));
                throw new Error(errorData.message || `Ürünler alınamadı. HTTP Durumu: ${response.status}`);
            }
            const products = await response.json();
            productListGrid.innerHTML = ''; // Grid'i temizle

            if (products.length === 0) {
                let noProductMessage = "Bu kriterlere uygun ürün bulunamadı.";
                if (searchTermFromUrl) {
                    noProductMessage = `"${escapeHtml(searchTermFromUrl)}" için arama sonucu bulunamadı.`;
                }
                productListGrid.innerHTML = `<div class="col-12"><p class="text-center mt-5">${noProductMessage}</p></div>`;
                return;
            }

            products.forEach(product => {
                const colDiv = document.createElement('div');
                colDiv.classList.add('col');

                const cardDiv = document.createElement('div');
                cardDiv.classList.add('card', 'h-100', 'shadow-sm');

                let imageUrl = 'images/placeholder.jpg';
                if (product.image_url) {
                    if (product.image_url.startsWith('http://') || product.image_url.startsWith('https://')) {
                        imageUrl = product.image_url;
                    } else if (product.image_url.startsWith('/uploads/')) {
                        imageUrl = `${backendUrl}${product.image_url}`;
                    } else {
                        imageUrl = product.image_url;
                    }
                }

                const productUrl = `urun-detay.html?id=${product.product_id}`;

                // .stretched-link'i kaldırdığımız için, linkleri spesifik elementlere veriyoruz.
                cardDiv.innerHTML = `
                    <a href="${productUrl}">
                        <img src="${escapeHtml(imageUrl)}" class="card-img-top" alt="${escapeHtml(product.name)}" style="height: 200px; object-fit: cover; border-top-left-radius: calc(0.25rem - 1px); border-top-right-radius: calc(0.25rem - 1px);" onerror="this.onerror=null; this.src='images/placeholder-error.jpg';">
                    </a>
                    <div class="card-body d-flex flex-column">
                        <h5 class="card-title">
                            <a href="${productUrl}" class="text-decoration-none text-dark">${escapeHtml(product.name)}</a>
                        </h5>
                        ${product.category_name ? `<p class="card-text text-muted small mb-2">${escapeHtml(product.category_name)}</p>` : ''}
                        <div class="mt-auto d-flex justify-content-between align-items-center">
                            <p class="h5 text-primary mb-0">${parseFloat(product.price).toFixed(2)} TL</p>
                            <button class="btn btn-sm btn-outline-success add-to-cart-btn-dynamic"
                                    data-product-id="${product.product_id}"
                                    data-product-name="${escapeHtml(product.name)}"
                                    data-product-price="${parseFloat(product.price).toFixed(2)}"
                                    data-product-image-url="${escapeHtml(imageUrl)}">
                                <i class="fas fa-cart-plus"></i> Ekle
                            </button>
                        </div>
                    </div>
                `;
                colDiv.appendChild(cardDiv);
                productListGrid.appendChild(colDiv);
            });

            // Dinamik olarak eklenen "Sepete Ekle" butonlarına olay dinleyicisi ekle
            document.querySelectorAll('#product-list-grid .add-to-cart-btn-dynamic').forEach(button => {
                button.addEventListener('click', function(event) {
                    event.preventDefault();
                    event.stopPropagation();

                    if (window.addToCart) {
                        window.addToCart(this.dataset.productId, this.dataset.productName, this.dataset.productPrice, this.dataset.productImageUrl);
                    } else {
                        console.error('addToCart fonksiyonu bulunamadı.');
                        alert('Sepete ekleme fonksiyonunda bir sorun var.');
                    }
                });
            });

        } catch (error) {
            console.error("Ürünleri yükleme hatası:", error);
            productListGrid.innerHTML = '';
            showProductListMessage(`Ürünler yüklenirken bir hata oluştu: ${error.message}`, 'danger');
        }
    };

    // urunler.html sayfasındaki Filtrele/Sırala butonu için olay dinleyici
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', loadProducts);
    }

    // Sayfa ilk yüklendiğinde veya URL değiştiğinde (arama, kategori filtresi vb.) çalışacak fonksiyon
    const initializePage = async () => {
        // Kategori filtresini sadece bir kere doldurmak yeterli olabilir,
        // ama URL'den kategori geliyorsa seçili olması için her sayfa yüklenmesinde çağırabiliriz.
        await populateCategoryFilter();

        // URL'den gelen 'category' parametresini alıp kategori filtresinde seçili yap.
        // Bu populateCategoryFilter içinde zaten yapılıyor olabilir, kontrol et.
        // Eğer orada yapılmıyorsa:
        const urlParamsOnLoad = new URLSearchParams(window.location.search);
        const categoryFromUrlOnLoad = urlParamsOnLoad.get('category');
        if (categoryFilterSelect && categoryFromUrlOnLoad) {
            categoryFilterSelect.value = categoryFromUrlOnLoad;
        }
        // Arama terimi input'unu da URL'den gelenle doldurabiliriz (eğer header'da değil de bu sayfada da arama kutusu varsa)
        const searchTermFromUrlOnLoad = urlParamsOnLoad.get('search_term');
        const pageSearchInput = document.getElementById('urunler-sayfasi-arama-inputu'); // Eğer böyle bir input varsa
        if (pageSearchInput && searchTermFromUrlOnLoad) {
            pageSearchInput.value = searchTermFromUrlOnLoad;
        }


        await loadProducts(); // Ürünleri URL'deki parametrelere (arama dahil) göre yükle
    };

    // Sayfa yüklendiğinde ve URL hash/search değiştiğinde (popstate) initializePage'i çağır
    // Bu, tarayıcının geri/ileri butonlarıyla da sayfanın doğru yüklenmesini sağlar.
    // Ancak, sadece search parametresi değiştiğinde `popstate` tetiklenmeyebilir,
    // bu yüzden header'daki arama formu submit olduğunda direkt `loadProducts` çağırmak yerine
    // `window.location.href` ile sayfayı yönlendirmek ve `DOMContentLoaded` üzerinde `initializePage`
    // çağırmak daha basit ve etkili bir yöntemdir.
    // Mevcut header yapımız zaten sayfayı yönlendiriyor, bu yüzden `DOMContentLoaded` yeterli.

    initializePage();
});