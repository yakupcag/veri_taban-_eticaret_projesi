// js/index.js

document.addEventListener('DOMContentLoaded', () => {
    const backendUrl = 'http://localhost:5000';

    const mainCategoriesList = document.getElementById('main-categories-list');
    const featuredProductGrid = document.getElementById('featured-product-grid');

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

    // Anasayfa Kategorilerini Yükle
    const loadMainCategories = async () => {
        if (!mainCategoriesList) {
            console.warn("Anasayfa için 'main-categories-list' ID'li ul elementi bulunamadı.");
            return;
        }
       mainCategoriesList.innerHTML = ''; // mainCategoriesList bir div olmalı (HTML'de öyle yaptık: <div class="list-group" id="main-categories-list">)
categories.forEach(category => {
    const link = document.createElement('a');
    link.href = `urunler.html?category=${category.category_id}`;
    link.textContent = escapeHtml(category.category_name);
    link.classList.add('list-group-item', 'list-group-item-action'); // BOOTSTRAP CLASS'LARI EKLENDİ
    mainCategoriesList.appendChild(link);
});

        try {
            const response = await fetch(`${backendUrl}/api/categories`);
            if (!response.ok) {
                throw new Error(`Kategoriler alınamadı. HTTP Durumu: ${response.status}`);
            }
            const categories = await response.json();

            mainCategoriesList.innerHTML = ''; // Listeyi temizle

            if (categories.length === 0) {
                mainCategoriesList.innerHTML = '<li>Kategori bulunamadı.</li>';
                return;
            }

            categories.forEach(category => {
                const li = document.createElement('li');
                const link = document.createElement('a');
                // Kategori linkini urunler.html sayfasına yönlendirecek şekilde ayarla
                link.href = `urunler.html?category=${category.category_id}`;
                link.textContent = escapeHtml(category.category_name);
                li.appendChild(link);
                mainCategoriesList.appendChild(li);
            });

        } catch (error) {
            console.error("Anasayfa kategorileri yükleme hatası:", error);
            if (mainCategoriesList) { // Hata durumunda da eleman varsa mesajı göster
                mainCategoriesList.innerHTML = `<li>Kategoriler yüklenemedi!</li>`;
            }
        }
    };

    // Öne Çıkan Ürünleri Yükle
// js/index.js dosyasının içindeki loadFeaturedProducts fonksiyonu

async function loadFeaturedProducts() {
    const featuredProductGrid = document.getElementById('featured-product-grid'); // HTML'de <div class="row ..." id="featured-product-grid"> olmalı
    const backendUrl = 'http://localhost:5000'; // Bu değişkenin fonksiyon dışında veya en başta tanımlı olduğundan emin ol

    if (!featuredProductGrid) {
        console.warn("Anasayfa için 'featured-product-grid' ID'li div elementi bulunamadı.");
        return;
    }
    featuredProductGrid.innerHTML = '<p class="text-center">Öne çıkan ürünler yükleniyor...</p>'; // Bootstrap text class'ı

    try {
        const response = await fetch(`${backendUrl}/api/products?status=aktif&sort_by=p.created_at_desc&limit=4`); // Örn: Son 4 aktif ürün
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({})); // Hata mesajını yakalamaya çalış
            throw new Error(errorData.message || `Öne çıkan ürünler alınamadı. HTTP Durumu: ${response.status}`);
        }
        let products = await response.json();

        // Backend'den limitli gelmiyorsa, burada JS ile de sınırlayabiliriz, ama API'den limitli gelmesi daha iyi.
        // products = products.slice(0, 4); // Eğer API limit parametresini desteklemiyorsa

        featuredProductGrid.innerHTML = ''; // Grid'i temizle

        if (products.length === 0) {
            featuredProductGrid.innerHTML = '<p class="text-center">Gösterilecek öne çıkan ürün bulunamadı.</p>';
            return;
        }

        products.forEach(product => {
            const colDiv = document.createElement('div');
            // Bootstrap grid sütun class'ları. Anasayfada kaç ürün gösterileceğine göre ayarlanabilir.
            // Örneğin, 3 ürün için 'col-lg-4 col-md-6 mb-4' gibi.
            // HTML'deki ana row class'ları: row-cols-1 row-cols-md-2 row-cols-lg-3 g-4
            // Bu, her zaman col kullanmamız gerektiği anlamına gelir.
            colDiv.classList.add('col'); 

            const cardDiv = document.createElement('div');
            cardDiv.classList.add('card', 'h-100', 'shadow-sm'); // Bootstrap card class'ları

            // Eğer product.image_url tam bir URL değilse (yani /uploads/dosya.jpg gibiyse) backendUrl eklenmeli.
            // Eğer product.image_url zaten placeholder ise ('images/placeholder.jpg') veya tam bir dış URL ise, doğrudan kullanılır.
            let imageUrl = 'images/placeholder.jpg'; // Varsayılan placeholder
            if (product.image_url) {
                if (product.image_url.startsWith('http://') || product.image_url.startsWith('https://')) {
                    imageUrl = product.image_url;
                } else if (product.image_url.startsWith('/uploads/')) {
                    imageUrl = `${backendUrl}${product.image_url}`;
                } else {
                    // Belki de product.image_url zaten 'images/urun.jpg' gibi bir yoldur.
                    // Bu durumda doğrudan kullanılabilir veya projenin dosya yapısına göre düzenlenir.
                    // Şimdilik, /uploads/ değilse ve tam URL değilse placeholder varsayalım.
                    // imageUrl = product.image_url; // Eğer frontend/images altında ise
                }
            }
            
            const productUrl = `urun-detay.html?id=${product.product_id}`;
            const imgStyle = "height: 200px; object-fit: cover; border-top-left-radius: calc(0.375rem - 1px); border-top-right-radius: calc(0.375rem - 1px);"; // Bootstrap card uyumu için radius

            // escapeHtml fonksiyonunun bu scope'ta erişilebilir olduğundan emin ol.
            // Genellikle dosyanın başında veya global bir yardımcı script'te tanımlanır.
            // Eğer yoksa, basit bir tanım:
            // const escapeHtml = (unsafe) => unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");

            cardDiv.innerHTML = `
                <a href="${productUrl}">
                    <img src="${escapeHtml(imageUrl)}" class="card-img-top" alt="${escapeHtml(product.name)}" style="${imgStyle}" onerror="this.onerror=null; this.src='images/placeholder-error.jpg';">
                </a>
                <div class="card-body d-flex flex-column">
                    <h5 class="card-title mb-1">
                        <a href="${productUrl}" class="text-decoration-none text-dark ">${escapeHtml(product.name)}</a>
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
            featuredProductGrid.appendChild(colDiv);
        });

        // Dinamik olarak eklenen "Sepete Ekle" butonlarına olay dinleyicisi ekle
        // Bu seçicinin ve fonksiyonun addToCart'ın (cart.js'den global) varlığını kontrol etmesi gerekir
        document.querySelectorAll('#featured-product-grid .add-to-cart-btn-dynamic').forEach(button => {
            button.addEventListener('click', function(event) {
                event.stopPropagation(); // Eğer kartın tamamı link ise, buton tıklamasının linke gitmesini engelle
                const productId = this.dataset.productId;
                const productName = this.dataset.productName;
                const productPrice = this.dataset.productPrice;
                // productImageUrl dataset'ten alınırken escape edilmişti,addToCart'a gönderirken orijinali gerekebilir.
                // Şimdilik escape edilmiş halini gönderiyoruz, addToCart içinde handle edilebilir.
                const productImageUrlFromData = this.dataset.productImageUrl; 
                
                if (window.addToCart) {
                    window.addToCart(productId, productName, productPrice, productImageUrlFromData);
                } else {
                    console.error('addToCart fonksiyonu bulunamadı. cart.js yüklü mü ve fonksiyon global mi?');
                    alert('Sepete ekleme fonksiyonunda bir sorun var.');
                }
            });
        });

    } catch (error) {
        console.error("Öne çıkan ürünleri yükleme hatası:", error);
        if (featuredProductGrid) { // Hata durumunda da eleman varsa mesajı göster
            featuredProductGrid.innerHTML = `<p class="text-center text-danger">Öne çıkan ürünler yüklenirken bir hata oluştu: ${escapeHtml(error.message)}</p>`;
        }
    }
}

    // Fonksiyonları çağır
    loadMainCategories();
    loadFeaturedProducts();
});