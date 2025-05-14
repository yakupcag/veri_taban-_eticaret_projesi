// js/odeme.js

document.addEventListener('DOMContentLoaded', () => {
    console.log("odeme.js: DOMContentLoaded Tetiklendi.");

    const backendUrl = 'http://localhost:5000';

    // Form ve Genel Sayfa Elemanları
    const checkoutForm = document.getElementById('checkout-form'); // Ana form
    const checkoutMessageArea = document.getElementById('checkout-message-area'); // Sayfa geneli mesaj alanı
    const sameBillingAddressCheckbox = document.getElementById('same-billing-address');
    const billingAddressFieldsDiv = document.getElementById('billing-address-fields');
    const placeOrderBtn = document.getElementById('place-order-btn');

    // Sipariş Özeti Elemanları
    const summaryItemsUl = document.getElementById('checkout-summary-items');
    const summaryItemCountBadge = document.getElementById('checkout-summary-item-count'); // Yeni eklendi
    const summarySubtotalSpan = document.getElementById('checkout-summary-subtotal');
    const summaryShippingSpan = document.getElementById('checkout-summary-shipping');
    const summaryTotalSpan = document.getElementById('checkout-summary-total');

    // --- Yardımcı Fonksiyonlar ---
    const escapeHtml = (unsafe) => {
        if (typeof unsafe !== 'string') return String(unsafe);
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    };

    const showCheckoutMessage = (message, type = 'danger', autoHide = false) => { // Hata için varsayılan type 'danger'
        if (!checkoutMessageArea) {
            alert(`${type === 'danger' ? 'Hata: ' : (type === 'success' ? 'Başarılı: ' : 'Bilgi: ')}${message}`);
            return;
        }
        checkoutMessageArea.innerHTML = `<p>${escapeHtml(message)}</p>`;
        checkoutMessageArea.className = `alert alert-${type} mt-2`; // Bootstrap alert class'ları
        checkoutMessageArea.style.display = 'block';
        if (autoHide) {
            setTimeout(() => { checkoutMessageArea.style.display = 'none'; }, 5000);
        }
    };

    // --- Sayfa Yüklendiğinde Yapılacak Kontroller ve İşlemler ---
    const authToken = localStorage.getItem('authToken');
    const userInfoString = localStorage.getItem('userInfo');
    let currentUser = null;
    if (userInfoString) {
        try { currentUser = JSON.parse(userInfoString); } catch (e) { console.error("Kullanıcı bilgisi parse edilemedi."); }
    }

    if (!authToken || !currentUser) {
        showCheckoutMessage('Sipariş verebilmek için lütfen giriş yapın.', 'warning');
        if (placeOrderBtn) placeOrderBtn.disabled = true;
        setTimeout(() => { window.location.href = 'giris-kayit.html?redirect=odeme.html'; }, 2500);
        return;
    }

    let currentCart = [];
    if (typeof window.getCart === 'function') {
        currentCart = window.getCart();
    } else {
        showCheckoutMessage('Sepet bilgileri alınamadı (Sistem Hatası - getCart).', 'danger');
        if (placeOrderBtn) placeOrderBtn.disabled = true;
        return;
    }

    if (currentCart.length === 0) {
        showCheckoutMessage('Sepetiniz boş. Sipariş oluşturmak için ürün eklemelisiniz.', 'info');
        if (placeOrderBtn) placeOrderBtn.disabled = true;
        // Sipariş özeti bölümünü de gizleyebilir veya "Sepet Boş" mesajı gösterebiliriz.
        const orderSummaryAside = document.getElementById('order-summary-checkout');
        if (orderSummaryAside) orderSummaryAside.innerHTML = '<div class="card-body text-center"><p class="text-muted">Sepetiniz boş.</p><a href="index.html" class="btn btn-primary">Alışverişe Devam Et</a></div>';
        return;
    }

    // Sipariş Özetini Doldurma (Bootstrap List Group ile)
    const populateOrderSummary = () => {
        if (!summaryItemsUl || !summarySubtotalSpan || !summaryShippingSpan || !summaryTotalSpan || !summaryItemCountBadge) {
            showCheckoutMessage('Sipariş özeti görüntülenirken bir sorun oluştu (HTML Element Eksik).', 'danger');
            return;
        }

        summaryItemsUl.innerHTML = ''; // Önceki ürün listesini temizle
        currentCart.forEach(item => {
            const li = document.createElement('li');
            li.classList.add('list-group-item', 'd-flex', 'justify-content-between', 'lh-sm');

            const itemName = escapeHtml(item.name);
            const itemQuantity = parseInt(item.quantity) || 0;
            const itemPrice = parseFloat(item.price) || 0;
            const lineItemTotal = (itemPrice * itemQuantity).toFixed(2);

            li.innerHTML = `
                <div>
                    <h6 class="my-0">${itemName}</h6>
                    <small class="text-muted">Adet: ${itemQuantity}</small>
                </div>
                <span class="text-muted">${lineItemTotal} TL</span>
            `;
            summaryItemsUl.appendChild(li);
        });

        if (typeof window.calculateTotals === 'function') {
            const totals = window.calculateTotals();
            summaryItemCountBadge.textContent = totals.itemCount; // Sepetteki toplam ürün sayısı
            summarySubtotalSpan.textContent = `${totals.subtotal} TL`;
            summaryShippingSpan.textContent = `${totals.shippingCost} TL`;
            summaryTotalSpan.textContent = `${totals.totalAmount} TL`;
        } else {
            showCheckoutMessage('Toplam tutar hesaplanamadı (Sistem Hatası - calculateTotals).', 'danger');
        }
    };

    populateOrderSummary();

    // Fatura Adresi Checkbox Kontrolü
    if (sameBillingAddressCheckbox && billingAddressFieldsDiv) {
        billingAddressFieldsDiv.style.display = sameBillingAddressCheckbox.checked ? 'none' : 'block';
        sameBillingAddressCheckbox.addEventListener('change', () => {
            billingAddressFieldsDiv.style.display = sameBillingAddressCheckbox.checked ? 'none' : 'block';
            // Eğer işaret kaldırılırsa, fatura adresi alanlarını zorunlu yapabiliriz (opsiyonel)
            // Veya backend'de bu kontrolü yapabiliriz.
        });
    }

    // Form Gönderme (Sipariş Oluşturma) - Bootstrap validasyonunu da entegre edebiliriz
    if (checkoutForm && placeOrderBtn) {
        checkoutForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            event.stopPropagation(); // Diğer olası submitleri engelle

            // Bootstrap'in kendi validasyonunu tetikle
            if (!checkoutForm.checkValidity()) {
                checkoutForm.classList.add('was-validated'); // Hatalı alanları göster
                showCheckoutMessage('Lütfen formdaki zorunlu alanları doğru şekilde doldurun.', 'warning', true);
                return;
            }
            checkoutForm.classList.add('was-validated');


            placeOrderBtn.disabled = true;
            placeOrderBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Sipariş İşleniyor...';
            if (checkoutMessageArea) checkoutMessageArea.style.display = 'none'; // Önceki mesajı gizle

            const shippingAddress = {
                fullName: document.getElementById('shipping-name')?.value.trim(),
                addressLine1: document.getElementById('shipping-address1')?.value.trim(),
                addressLine2: document.getElementById('shipping-address2')?.value.trim() || null,
                city: document.getElementById('shipping-city')?.value.trim(),
                postalCode: document.getElementById('shipping-postcode')?.value.trim(),
                country: document.getElementById('shipping-country')?.value.trim(),
                phone: document.getElementById('shipping-phone')?.value.trim()
            };

            let billingAddressData = null;
            if (sameBillingAddressCheckbox && !sameBillingAddressCheckbox.checked) {
                billingAddressData = {
                    fullName: document.getElementById('billing-name')?.value.trim(),
                    addressLine1: document.getElementById('billing-address1')?.value.trim(),
                    city: document.getElementById('billing-city')?.value.trim(),
                    // Diğer fatura adresi alanları (eğer eklendiyse)
                };
                // Fatura adresi için de validasyon eklenebilir
                if (!billingAddressData.fullName || !billingAddressData.addressLine1 || !billingAddressData.city) {
                     showCheckoutMessage('Fatura adresi farklıysa, lütfen tüm fatura adresi alanlarını doldurun.', 'warning', true);
                     placeOrderBtn.disabled = false;
                     placeOrderBtn.innerHTML = '<i class="fas fa-check-circle"></i> Siparişi Onayla';
                     return;
                }
            }

            const orderData = {
                cart: currentCart,
                shippingAddress: shippingAddress,
                billingAddress: billingAddressData,
                paymentMethod: document.querySelector('input[name="payment_method"]:checked')?.value || 'cod',
            };

            try {
                const response = await fetch(`${backendUrl}/api/orders`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    },
                    body: JSON.stringify(orderData)
                });
                const result = await response.json();

                if (response.ok) {
                    showCheckoutMessage(`Siparişiniz başarıyla oluşturuldu! Sipariş No: ${result.orderId}`, 'success', false);
                    if (typeof window.clearCartGlobally === 'function') {
                        window.clearCartGlobally();
                    }
                    placeOrderBtn.classList.remove('btn-success');
                    placeOrderBtn.classList.add('btn-outline-success');
                    placeOrderBtn.innerHTML = '<i class="fas fa-check-circle"></i> Sipariş Alındı';
                    // Ödeme sayfasındaki formu ve özeti gizleyip sadece başarı mesajını bırakabiliriz.
                    // document.querySelector('.row.g-5').innerHTML = `<div class="col-12 text-center">${checkoutMessageArea.innerHTML} <p><a href="index.html" class="btn btn-primary mt-3">Anasayfaya Dön</a></p></div>`;
                    setTimeout(() => { window.location.href = `siparis-basarili.html?orderId=${result.orderId}`; }, 3000);
                } else {
                    throw new Error(result.message || `Sipariş oluşturulamadı (HTTP ${response.status})`);
                }
            } catch (error) {
                console.error('Sipariş oluşturma hatası:', error);
                showCheckoutMessage(error.message || 'Siparişiniz oluşturulurken bir sorun oluştu. Lütfen bilgilerinizi kontrol edin veya daha sonra tekrar deneyin.', 'danger', false);
                placeOrderBtn.disabled = false;
                placeOrderBtn.innerHTML = '<i class="fas fa-check-circle"></i> Siparişi Onayla';
            }
        });
    }
});