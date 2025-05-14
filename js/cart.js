// js/cart.js

const CART_KEY = 'shoppingCart_v1'; // Local Storage için anahtar
const backendUrl = 'http://localhost:5000'; // Backend resimleri için (eğer kullanılıyorsa)

// --- YARDIMCI FONKSİYON (Her yerde lazım olabilir) ---
const escapeHtml = (unsafe) => {
    if (typeof unsafe !== 'string') return String(unsafe); // Sayı vb. gelirse string'e çevir
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};

// --- TEMEL SEPET İŞLEVLERİ (GLOBAL SCOPE'A ATANACAKLAR) ---

// Sepeti Local Storage'dan alma fonksiyonu
function getCart() {
    const cartJson = localStorage.getItem(CART_KEY);
    try {
        const cart = JSON.parse(cartJson);
        return Array.isArray(cart) ? cart : [];
    } catch (e) {
        console.error("getCart: Sepet verisi okunamadı/parse edilemedi:", e);
        localStorage.removeItem(CART_KEY); // Bozuk veriyi temizle
        return [];
    }
}
window.getCart = getCart; // Global yap

// Sepet toplamlarını hesaplama fonksiyonu
function calculateTotals() {
    const cart = getCart();
    let subtotal = 0;
    let itemCount = 0;

    cart.forEach(item => {
        const price = parseFloat(item.price);
        const quantity = parseInt(item.quantity);
        if (!isNaN(price) && !isNaN(quantity)) {
            subtotal += price * quantity;
            itemCount += quantity;
        }
    });

    const shippingCost = itemCount > 0 ? 15.00 : 0.00; // Sepet boşsa kargo 0
    const totalAmount = subtotal + shippingCost;

    return {
        subtotal: subtotal.toFixed(2),
        shippingCost: shippingCost.toFixed(2),
        totalAmount: totalAmount.toFixed(2),
        itemCount: itemCount
    };
}
window.calculateTotals = calculateTotals; // Global yap

// Sepeti tamamen temizleme fonksiyonu (sipariş sonrası için)
function clearCartGlobally() {
    localStorage.removeItem(CART_KEY);
    if (typeof updateCartIcon === 'function') updateCartIcon();
    if (typeof renderCartPage === 'function' && (window.location.pathname.endsWith('sepet.html') || document.getElementById('cart-table-body'))) {
        renderCartPage();
    }
    console.log("Sepet temizlendi (global).");
}
window.clearCartGlobally = clearCartGlobally; // Global yap


// --- SADECE BU DOSYADA KULLANILACAK İÇ FONKSİYONLAR ---

// Sepeti Local Storage'a kaydetme ve gerekli güncellemeleri tetikleme
function saveCart(cart) {
    try {
        localStorage.setItem(CART_KEY, JSON.stringify(cart));
        if (typeof updateCartIcon === 'function') updateCartIcon();

        if (document.getElementById('cart-table-body') && window.location.pathname.includes('sepet.html')) {
            if (typeof renderCartPage === 'function') renderCartPage();
        }
        // Ödeme sayfasındaysak özeti güncelle (opsiyonel, odeme.js de yapabilir)
        if (document.getElementById('checkout-summary-items') && window.location.pathname.includes('odeme.html')) {
            if (typeof populateOrderSummary === 'function') { // odeme.js'deki fonksiyon (eğer global ise)
                 // populateOrderSummary(); // Bu fonksiyon odeme.js içinde ve global değilse, bu çağrı çalışmaz.
                                         // En iyisi odeme.js'nin kendi içinde özeti güncellemesi.
            } else if (window.populateOrderSummaryFromCartJS) { // Eğer odeme.js böyle bir fonksiyon sunarsa
                window.populateOrderSummaryFromCartJS();
            }
        }


    } catch (e) {
        console.error("saveCart: Sepet kaydedilirken hata:", e);
        alert("Sepet güncellenirken bir hata oluştu!");
    }
}

// Header'daki sepet sayacını güncelleme fonksiyonu
function updateCartIcon() {
    const totals = calculateTotals();
    const cartIconCounter = document.getElementById('cart-item-count');

    if (cartIconCounter) {
        cartIconCounter.textContent = totals.itemCount;
        cartIconCounter.style.display = totals.itemCount > 0 ? 'inline-block' : 'none'; // Bootstrap badge'i için
    }
}

// --- Sepete Ürün Ekleme (Diğer sayfalardaki butonlardan çağrılacak - GLOBAL) ---
// !! ÖNEMLİ DEĞİŞİKLİK: quantity parametresi eklendi !!
window.addToCart = (productId, productName, productPrice, productImageUrl, quantity = 1) => {
    if (!productId || productPrice === undefined || productPrice === null) {
        console.error("addToCart: Geçersiz ürün bilgisi.", { productId, productName, productPrice });
        alert("Sepete eklenirken bir sorun oluştu: Ürün bilgileri eksik.");
        return;
    }

    const cart = getCart();
    const existingProductIndex = cart.findIndex(item => String(item.id) === String(productId));
    const numQuantity = parseInt(quantity);

    if (isNaN(numQuantity) || numQuantity < 1) {
        console.error("addToCart: Geçersiz adet miktarı.", quantity);
        alert("Geçersiz adet miktarı girildi.");
        return;
    }

    if (existingProductIndex > -1) {
        // Ürün zaten sepette, adedini artır
        cart[existingProductIndex].quantity = parseInt(cart[existingProductIndex].quantity) + numQuantity;
    } else {
        // Yeni ürün, sepete ekle
        cart.push({
            id: String(productId), // ID'leri string olarak saklamak tutarlılık sağlar
            name: productName || 'Ürün Adı Bilinmiyor',
            price: parseFloat(productPrice),
            quantity: numQuantity, // Gelen adetle ekle
            imageUrl: productImageUrl || 'images/placeholder.jpg' // Varsayılan resim
        });
    }
    saveCart(cart); // Sepeti kaydet ve ikonları/sayfaları güncelle
    
    // Kullanıcıya geri bildirim. urun-detayi.js kendi mesajını gösterdiği için bu alert'i orada kapatabiliriz.
    // Şimdilik kalsın, gerekirse if(window.location.pathname.includes('urun-detay.html')) kontrolü ile kapatılabilir.
    const messageAreaOnDetailPage = document.getElementById('cart-add-message-area');
    if (!messageAreaOnDetailPage || !window.location.pathname.includes('urun-detay.html') ) {
      alert(`${escapeHtml(String(productName)) || 'Ürün'} (${numQuantity} adet) başarıyla sepete eklendi!`);
    }
    // Eğer urun-detayi.js kendi mesajını gösteriyorsa, buradaki alert'i göstermeyebiliriz:
    // if (!document.getElementById('cart-add-message-area')) {
    //    alert(`${escapeHtml(String(productName)) || 'Ürün'} (${numQuantity} adet) başarıyla sepete eklendi!`);
    // }
};


// --- SADECE `sepet.html` SAYFASINDA ÇALIŞACAK İŞLEVLER ---

// Sepetteki ürün adedini güncelleme (sadece sepet.html'den çağrılır)
function updateQuantityOnCartPage(productId, newQuantity) {
    const quantity = parseInt(newQuantity, 10);
    if (isNaN(quantity) || quantity < 1) {
        alert("Geçersiz adet miktarı. Adet en az 1 olmalıdır.");
        if (typeof renderCartPage === 'function') renderCartPage(); // Hatalı girişte sepeti eski haliyle yeniden çiz
        return;
    }

    const cart = getCart();
    const productIndex = cart.findIndex(item => String(item.id) === String(productId));

    if (productIndex > -1) {
        cart[productIndex].quantity = quantity;
        saveCart(cart); // Bu saveCart zaten renderCartPage'i tetikleyecek (sepet sayfasında olduğumuz için)
    }
}

// Sepetten ürün kaldırma (sadece sepet.html'den çağrılır)
function removeFromCartOnCartPage(productId) {
    let cart = getCart();
    const product = cart.find(item => String(item.id) === String(productId));
    const productName = product ? product.name : `ID'si ${productId} olan ürün`;

    if (confirm(`'${escapeHtml(productName)}' ürününü sepetten kaldırmak istediğinize emin misiniz?`)) {
        cart = cart.filter(item => String(item.id) !== String(productId));
        saveCart(cart); // Bu saveCart zaten renderCartPage'i tetikleyecek
    }
}

// Sepet sayfasını HTML'e çizme fonksiyonu
// js/cart.js içindeki renderCartPage fonksiyonu (Bootstrap uyumlu hale getirilmişti)

function renderCartPage() {
    const cartTableBody = document.getElementById('cart-table-body');
    const cartSummaryContainer = document.getElementById('cart-summary-container'); // Card elementini seçiyor
    const checkoutBtn = document.getElementById('checkout-btn');
    const cartEmptyMessageDiv = document.getElementById('cart-empty-message'); // Boş sepet mesajı için
    const cartMessageArea = document.getElementById('cart-message-area'); // Genel mesajlar için

    if (!cartTableBody || !cartSummaryContainer || !cartEmptyMessageDiv) {
        // Bu elementler yoksa sepet sayfasında değiliz, çık.
        console.warn("Sepet sayfası için gerekli HTML elementlerinden biri eksik.");
        return;
    }

    if (cartMessageArea) cartMessageArea.style.display = 'none'; // Önceki mesajları gizle

    const cart = getCart();
    cartTableBody.innerHTML = ''; // Tablo içini temizle

    if (cart.length === 0) {
        cartTableBody.innerHTML = `<tr><td colspan="6" class="text-center p-5">Alışveriş sepetiniz boş.</td></tr>`;
        cartSummaryContainer.style.display = 'none'; // Özeti gizle
        cartEmptyMessageDiv.style.display = 'block'; // Boş sepet mesajını göster
        if (checkoutBtn) {
            checkoutBtn.classList.add('disabled');
            checkoutBtn.setAttribute('aria-disabled', 'true');
        }
        updateCartIcon(); // Header'daki ikonu da güncelle
        return;
    }

    // Sepette ürün varsa:
    cartSummaryContainer.style.display = 'block'; // Özeti göster
    cartEmptyMessageDiv.style.display = 'none';  // Boş sepet mesajını gizle
    if (checkoutBtn) {
        checkoutBtn.classList.remove('disabled');
        checkoutBtn.removeAttribute('aria-disabled');
    }

    cart.forEach(item => {
        const row = cartTableBody.insertRow();
        row.classList.add('align-middle'); // Tüm satır içeriği dikeyde ortalansın

        const itemPrice = parseFloat(item.price);
        const itemQuantity = parseInt(item.quantity);
        const itemTotal = (itemPrice * itemQuantity).toFixed(2);

        let displayImageUrl = item.imageUrl || 'images/placeholder-small.jpg';
        if (displayImageUrl && displayImageUrl.startsWith('/uploads/')) {
            displayImageUrl = `${backendUrl}${item.imageUrl}`; // backendUrl tanımlı olmalı
        } else if (!displayImageUrl || (!displayImageUrl.startsWith('images/') && !displayImageUrl.startsWith('http'))) {
             displayImageUrl = 'images/placeholder-small.jpg';
        }

        // Ürün resmi ve adı için hücre
        const cellProduct = row.insertCell();
        cellProduct.classList.add('ps-3'); // Sol padding
        cellProduct.setAttribute('colspan', '2');
        cellProduct.innerHTML = `
            <div class="d-flex align-items-center">
                <img src="${escapeHtml(displayImageUrl)}" alt="${escapeHtml(item.name)}" class="img-thumbnail me-3" style="width: 60px; height: 60px; object-fit: cover;" onerror="this.onerror=null; this.src='images/placeholder-error.jpg';">
                <div>
                    <a href="urun-detay.html?id=${item.id}" class="fw-semibold text-decoration-none text-dark">${escapeHtml(item.name)}</a>
                    ${item.category_name ? `<br><small class="text-muted">${escapeHtml(item.category_name)}</small>` : ''}
                </div>
            </div>
        `;

        // Fiyat hücresi
        const cellPrice = row.insertCell();
        cellPrice.classList.add('text-center');
        cellPrice.textContent = `${itemPrice.toFixed(2)} TL`;

        // Adet hücresi
        const cellQuantity = row.insertCell();
        cellQuantity.classList.add('text-center');
        cellQuantity.innerHTML = `<input type="number" value="${itemQuantity}" min="1" class="form-control form-control-sm quantity-input mx-auto" data-product-id="${item.id}" style="width: 80px;">`;

        // Toplam fiyat hücresi
        const cellTotal = row.insertCell();
        cellTotal.classList.add('text-end', 'fw-semibold');
        cellTotal.textContent = `${itemTotal} TL`;

        // İşlem hücresi
        const cellAction = row.insertCell();
        cellAction.classList.add('text-center');
        cellAction.innerHTML = `<button class="btn btn-sm btn-outline-danger remove-item-btn" data-product-id="${item.id}" title="Sepetten Kaldır"><i class="fas fa-trash-alt"></i></button>`;
    });

    // Adet inputlarına ve silme butonlarına olay dinleyicileri (bunlar zaten cart.js'de vardı)
    document.querySelectorAll('#cart-table-body .quantity-input').forEach(input => {
        input.addEventListener('change', (event) => {
            updateQuantityOnCartPage(event.target.dataset.productId, event.target.value);
        });
    });

    document.querySelectorAll('#cart-table-body .remove-item-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            removeFromCartOnCartPage(event.currentTarget.dataset.productId);
        });
    });

    // Sepet özetini güncelle (bu da zaten cart.js'de vardı)
    const totals = calculateTotals();
    const subtotalEl = document.getElementById('cart-subtotal');
    const shippingEl = document.getElementById('cart-shipping');
    const totalAmountEl = document.getElementById('cart-total-amount');

    if(subtotalEl) subtotalEl.textContent = `${totals.subtotal} TL`;
    if(shippingEl) shippingEl.textContent = `${totals.shippingCost} TL`;
    if(totalAmountEl) totalAmountEl.textContent = `${totals.totalAmount} TL`;
}


// --- SAYFA YÜKLENDİĞİNDE ÇALIŞACAK İLK İŞLEMLER ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("cart.js: DOMContentLoaded Tetiklendi.");
    updateCartIcon(); // Her sayfa yüklendiğinde sepet ikonunu güncelle

    // Eğer sepet.html sayfasındaysak, sepet içeriğini çiz
    if (window.location.pathname.endsWith('sepet.html') || document.getElementById('cart-table-body')) {
        console.log("cart.js: Sepet sayfası algılandı, renderCartPage çağrılıyor.");
        renderCartPage();
    }
});