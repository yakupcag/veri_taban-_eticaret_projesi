// js/urun-detayi.js

document.addEventListener('DOMContentLoaded', () => {
    const backendUrl = 'http://localhost:5000';

    // HTML elementlerini seç
    const productImage = document.getElementById('product-image');
    const productNameElement = document.getElementById('product-name');
    const productCategoryNameElement = document.getElementById('product-category-name-detail'); // Yeni eklendi
    const productDescriptionElement = document.getElementById('product-description');
    const productPriceElement = document.getElementById('product-price');
    const productStockElement = document.getElementById('product-stock');
    const addToCartBtn = document.getElementById('add-to-cart-detail-btn');
    const productQuantityInput = document.getElementById('product-quantity-detail'); // Yeni eklendi

    const detailMessageArea = document.getElementById('detail-message-area'); // Genel mesajlar için
    const cartAddMessageArea = document.getElementById('cart-add-message-area'); // Sepete ekleme mesajları için

    const escapeHtml = (unsafe) => {
        if (typeof unsafe !== 'string') return unsafe;
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    };

    const showMessage = (areaElement, message, type = 'info', autoHide = true) => {
        if (!areaElement) {
            console.warn("Mesaj alanı bulunamadı:", message);
            alert(message); // Fallback
            return;
        }
        areaElement.innerHTML = `<p>${escapeHtml(message)}</p>`;
        areaElement.className = `alert alert-${type} mt-2`; // Bootstrap alert class'ları
        areaElement.style.display = 'block';
        if (autoHide) {
            setTimeout(() => { areaElement.style.display = 'none'; }, 4000);
        }
    };

    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    if (!productId) {
        showMessage(detailMessageArea, 'Gösterilecek ürün ID\'si bulunamadı! Anasayfaya yönlendiriliyorsunuz...', 'danger', false);
        if (productNameElement) productNameElement.textContent = 'Ürün Bulunamadı';
        if (addToCartBtn) addToCartBtn.disabled = true;
        setTimeout(() => { window.location.href = 'index.html'; }, 3000);
        return;
    }

    let currentProduct = null; // Mevcut ürün bilgilerini saklamak için

    const fetchProductDetails = async () => {
        if (productNameElement) productNameElement.textContent = 'Yükleniyor...';
        if (addToCartBtn) addToCartBtn.disabled = true;
        if (productQuantityInput) productQuantityInput.disabled = true;
        if (detailMessageArea) detailMessageArea.style.display = 'none';


        try {
            const response = await fetch(`${backendUrl}/api/products/${productId}`);
            if (response.status === 404) {
                throw new Error('Ürün bulunamadı.');
            }
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Bilinmeyen sunucu hatası' }));
                throw new Error(`Veri alınamadı. ${errorData.message || `HTTP ${response.status}`}`);
            }
            currentProduct = await response.json(); // Ürünü global değişkene ata

            document.title = `${escapeHtml(currentProduct.name)} - E-Ticaret Sitem`;

            if (productNameElement) productNameElement.textContent = escapeHtml(currentProduct.name);

            if (productCategoryNameElement && currentProduct.category_name) {
                productCategoryNameElement.textContent = `Kategori: ${escapeHtml(currentProduct.category_name)}`;
                productCategoryNameElement.style.display = 'block';
            } else if (productCategoryNameElement) {
                productCategoryNameElement.style.display = 'none';
            }

            if (productDescriptionElement) {
                productDescriptionElement.innerHTML = escapeHtml(currentProduct.description || 'Açıklama bulunamadı.').replace(/\n/g, '<br>');
            }
            if (productPriceElement) {
                productPriceElement.textContent = `${parseFloat(currentProduct.price).toFixed(2)} TL`;
            }

            if (productStockElement) {
                if (currentProduct.stock > 0) {
                    productStockElement.textContent = `Stokta ${currentProduct.stock} adet mevcut`;
                    productStockElement.className = 'badge bg-success p-2'; // Yeşil badge
                    if (addToCartBtn) addToCartBtn.disabled = false;
                    if (productQuantityInput) {
                        productQuantityInput.disabled = false;
                        productQuantityInput.max = currentProduct.stock; // Maksimum adet stok kadar olabilir
                    }
                } else {
                    productStockElement.textContent = 'Stokta Yok';
                    productStockElement.className = 'badge bg-danger p-2'; // Kırmızı badge
                    if (addToCartBtn) addToCartBtn.disabled = true;
                    if (productQuantityInput) productQuantityInput.disabled = true;
                }
            }

            if (productImage) {
                let imageUrl = 'images/placeholder-large.jpg'; // Varsayılan
                if (currentProduct.image_url) {
                    if (currentProduct.image_url.startsWith('http://') || currentProduct.image_url.startsWith('https://')) {
                        imageUrl = currentProduct.image_url;
                    } else if (currentProduct.image_url.startsWith('/uploads/')) {
                        imageUrl = `${backendUrl}${currentProduct.image_url}`;
                    } else {
                        imageUrl = currentProduct.image_url;
                    }
                }
                productImage.src = imageUrl;
                productImage.alt = escapeHtml(currentProduct.name);
                productImage.onerror = () => { productImage.src = 'images/placeholder-large.jpg'; };
            }

        } catch (error) {
            console.error("Ürün detayı alınırken hata:", error);
            showMessage(detailMessageArea, `Ürün detayları yüklenirken bir hata oluştu: ${error.message}`, 'danger', false);
            if (productNameElement) productNameElement.textContent = 'Hata!';
            if (addToCartBtn) addToCartBtn.disabled = true;
            if (productQuantityInput) productQuantityInput.disabled = true;
        }
    };

    // Sepete Ekle Butonuna olay dinleyici ekle
    if (addToCartBtn && productQuantityInput) {
        addToCartBtn.addEventListener('click', () => {
            if (!currentProduct) {
                showMessage(cartAddMessageArea, 'Ürün bilgileri henüz yüklenmedi.', 'warning');
                return;
            }
            if (typeof window.addToCart === 'function') {
                const quantity = parseInt(productQuantityInput.value);
                if (isNaN(quantity) || quantity < 1) {
                    showMessage(cartAddMessageArea, 'Lütfen geçerli bir adet girin.', 'warning');
                    return;
                }
                if (quantity > currentProduct.stock) {
                    showMessage(cartAddMessageArea, `Stokta yeterli ürün yok (Maksimum ${currentProduct.stock} adet).`, 'warning');
                    return;
                }

                // addToCart fonksiyonunu quantity ile güncellememiz gerekebilir.
                // Şimdilik her tıklamada quantity kadar eklediğini varsayalım veya
                // cart.js'deki addToCart fonksiyonunu quantity parametresi alacak şekilde güncelleyelim.
                // Basitlik adına, addToCart'ın bir adet eklediğini varsayarsak ve döngüyle çağırırsak:
                // for (let i = 0; i < quantity; i++) {
                //     window.addToCart(currentProduct.product_id, currentProduct.name, currentProduct.price, currentProduct.image_url);
                // }
                // Daha iyisi, cart.js'deki addToCart'ı quantity alacak şekilde modifiye etmek.
                // window.addToCart(productId, productName, productPrice, productImageUrl, quantity)
                // Şu anki addToCart yapın (eğer önceki gibiyse) tek seferde 1 adet ekler.
                // Bu yüzden ya addToCart'ı güncelleyeceğiz ya da burada quantity kadar çağıracağız.
                // Şimdilik cart.js'nin quantity desteklediğini varsayarak:
                window.addToCart(currentProduct.product_id, currentProduct.name, currentProduct.price, currentProduct.image_url, quantity);


                showMessage(cartAddMessageArea, `${quantity} adet "${escapeHtml(currentProduct.name)}" sepete eklendi!`, 'success');
            } else {
                console.error('addToCart fonksiyonu bulunamadı. cart.js yüklü mü?');
                showMessage(cartAddMessageArea, 'Sepete ekleme fonksiyonunda bir sorun var.', 'danger');
            }
        });
    } else {
        console.warn("Sepete ekle butonu veya adet input'u bulunamadı.");
    }

    // Adet input'u için stok kontrolü (opsiyonel)
    if (productQuantityInput) {
        productQuantityInput.addEventListener('change', () => {
            if (currentProduct && currentProduct.stock > 0) {
                let qty = parseInt(productQuantityInput.value);
                if (isNaN(qty) || qty < 1) {
                    productQuantityInput.value = 1;
                } else if (qty > currentProduct.stock) {
                    productQuantityInput.value = currentProduct.stock;
                    showMessage(cartAddMessageArea, `Maksimum ${currentProduct.stock} adet seçebilirsiniz.`, 'warning');
                }
            }
        });
    }

    // Sayfa yüklendiğinde ürün detaylarını çek
    fetchProductDetails();
});

// --- ÖNEMLİ NOT: cart.js'deki addToCart Fonksiyonunun Güncellenmesi Gerekebilir ---
// Eğer `js/cart.js` dosyasındaki `window.addToCart` fonksiyonunuz sadece 1 adet ekliyorsa
// ve ürün detay sayfasından birden fazla adet eklemek istiyorsanız, o fonksiyonu
// bir `quantity` parametresi alacak şekilde güncellemeniz gerekir.
// Örneğin:
/*
// js/cart.js içinde:
window.addToCart = (productId, productName, productPrice, productImageUrl, quantity = 1) => { // quantity parametresi eklendi
    const cart = getCart();
    const existingProductIndex = cart.findIndex(item => String(item.id) === String(productId));

    if (existingProductIndex > -1) {
        cart[existingProductIndex].quantity = parseInt(cart[existingProductIndex].quantity) + quantity; // Adet kadar artır
    } else {
        cart.push({
            id: String(productId),
            name: productName || 'Ürün Adı Bilinmiyor',
            price: parseFloat(productPrice),
            quantity: quantity, // Başlangıç adedini ayarla
            imageUrl: productImageUrl || 'images/placeholder.jpg'
        });
    }
    saveCart(cart);
    alert(`${escapeHtml(productName) || 'Ürün'} (${quantity} adet) başarıyla sepete eklendi!`);
};
*/