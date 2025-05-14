// js/hesabim.js
document.addEventListener('DOMContentLoaded', () => {

    // --- Header Sepet Sayacını Güncelle ---
    if (typeof window.updateCartIcon === 'function') {
        console.log("hesabim.js: updateCartIcon fonksiyonu çağrılıyor...");
        window.updateCartIcon();
    } else if (typeof updateCartIcon === 'function') { // Eğer window'a atanmamışsa ama aynı scope'taysa
        console.log("hesabim.js: Lokal updateCartIcon fonksiyonu çağrılıyor...");
        updateCartIcon();
    } else {
        console.warn("hesabim.js: updateCartIcon fonksiyonu bulunamadı. Sepet sayacı güncellenemedi. cart.js yüklü mü?");
    }

    const backendUrl = 'http://localhost:5000';
    const authToken = localStorage.getItem('authToken');
    let currentUserInfo = localStorage.getItem('userInfo') ? JSON.parse(localStorage.getItem('userInfo')) : null;

    if (!authToken || !currentUserInfo) {
        alert("Bu sayfayı görüntülemek için giriş yapmalısınız.");
        window.location.href = 'giris-kayit.html?redirect=hesabim.html';
        return;
    }

    // --- YENİ: Sipariş Durumları İçin Türkçe Karşılıklar ---
    const siparisDurumTurkce = {
        'pending': 'Beklemede',
        'processing': 'Hazırlanıyor',
        'shipped': 'Kargolandı',
        'delivered': 'Teslim Edildi',
        'cancelled': 'İptal Edildi'
    };

    // --- GENEL YARDIMCI FONKSİYONLAR ---
    const escapeHtml = (unsafe) => {
        // ... (escapeHtml fonksiyonu aynı kalacak) ...
        if (typeof unsafe !== 'string') return String(unsafe);
        return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    };

    const showMessage = (areaElement, message, type = 'danger', autoHide = true) => {
        // ... (showMessage fonksiyonu aynı kalacak) ...
        if (!areaElement) {
            console.warn("Mesaj alanı bulunamadı. Mesaj:", message);
            alert(`${type.charAt(0).toUpperCase() + type.slice(1)}: ${message}`);
            return;
        }
        areaElement.innerHTML = `<p>${escapeHtml(message)}</p>`;
        areaElement.className = `alert alert-${type} mt-2`;
        areaElement.style.display = 'block';
        if (autoHide) {
            setTimeout(() => { if(areaElement) areaElement.style.display = 'none'; }, 5000);
        }
    };

    // --- ELEMENT SEÇİMLERİ ---
    // ... (Tüm element seçicileri aynı kalacak) ...
    const sidebarLinks = document.querySelectorAll('.account-sidebar .list-group-item-action[data-section]');
    const contentSections = document.querySelectorAll('.account-content .content-section');
    const profileForm = document.getElementById('profile-form');
    const profileFullNameInput = document.getElementById('profile-fullName');
    const profileEmailInput = document.getElementById('profile-email');
    const profilePhoneInput = document.getElementById('profile-phone');
    const profileCurrentPasswordInput = document.getElementById('profile-current-password');
    const profileNewPasswordInput = document.getElementById('profile-new-password');
    const profileConfirmPasswordInput = document.getElementById('profile-confirm-password');
    const profileMessageArea = document.getElementById('profile-message-area');
    const orderHistoryTableBody = document.getElementById('order-history-table-body');
    const ordersMessageArea = document.getElementById('orders-message-area');
    const orderDetailModalElement = document.getElementById('order-detail-modal');
    let orderDetailModalInstance = null;
    if (orderDetailModalElement) {
        orderDetailModalInstance = new bootstrap.Modal(orderDetailModalElement);
    }
    const modalOrderIdSpan = document.getElementById('modal-order-id');
    const modalOrderInfoDiv = document.getElementById('modal-order-info');
    const modalOrderItemsTbody = document.getElementById('modal-order-items');
    const modalShippingAddressSpan = document.getElementById('modal-shipping-address');
    const modalOrderTotalSpan = document.getElementById('modal-order-total');
    const modalMessageArea = document.getElementById('modal-order-message-area');
    const showAddAddressFormBtn = document.getElementById('show-add-address-form-btn');
    const addressFormContainer = document.getElementById('address-form-container');
    const addressForm = document.getElementById('address-form');
    const addressFormTitle = document.getElementById('address-form-title');
    const addressIdInputForm = document.getElementById('address-id-form');
    const cancelAddressFormBtn = document.getElementById('cancel-address-form-btn');
    const addressListContainer = document.getElementById('address-list-container');
    const addressListMessageArea = document.getElementById('address-list-message-area');
    const addressFormMessageArea = document.getElementById('address-form-message-area');
    const addressTypeInput = document.getElementById('address-type');
    const addressContactNameInput = document.getElementById('address-contact-name');
    const addressLine1Input = document.getElementById('address-line1');
    const addressLine2Input = document.getElementById('address-line2');
    const addressCityInput = document.getElementById('address-city');
    const addressPostalCodeInput = document.getElementById('address-postal-code');
    const addressCountryInput = document.getElementById('address-country');
    const addressPhoneInput = document.getElementById('address-phone');

    // --- PROFİL BİLGİLERİ İŞLEVLERİ ---
    async function loadProfileInfo() {
        // ... (Bu fonksiyonun içeriği aynı kalacak) ...
        if (!profileFullNameInput || !profileEmailInput || !profilePhoneInput) return;
        showMessage(profileMessageArea, "Profil bilgileri yükleniyor...", "info", false);
        try {
            const response = await fetch(`${backendUrl}/api/user/profile`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            const result = await response.json();
            if (response.ok) {
                profileFullNameInput.value = result.fullName || '';
                profileEmailInput.value = result.email || '';
                profilePhoneInput.value = result.phone || '';
                if(profileForm) profileForm.classList.remove('was-validated');
                if(profileMessageArea) profileMessageArea.style.display = 'none';
            } else {
                throw new Error(result.message || 'Profil bilgileri alınamadı.');
            }
        } catch (error) {
            showMessage(profileMessageArea, error.message, 'danger');
        }
    }

    if (profileForm) {
        // ... (Bu event listener'ın içeriği aynı kalacak) ...
        profileForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (!profileForm.checkValidity()) {
                event.stopPropagation();
                profileForm.classList.add('was-validated');
                return;
            }
            profileForm.classList.add('was-validated');

            const fullName = profileFullNameInput.value.trim();
            const phone = profilePhoneInput.value.trim();
            const currentPassword = profileCurrentPasswordInput.value;
            const newPassword = profileNewPasswordInput.value;
            const confirmPassword = profileConfirmPasswordInput.value;
            let updateData = { fullName, phone };

            if (newPassword) {
                if (newPassword.length < 6) {
                    showMessage(profileMessageArea, 'Yeni şifre en az 6 karakter olmalıdır.', 'warning');
                    profileNewPasswordInput.classList.add('is-invalid'); return;
                }
                profileNewPasswordInput.classList.remove('is-invalid');
                if (newPassword !== confirmPassword) {
                    showMessage(profileMessageArea, 'Yeni şifreler eşleşmiyor.', 'warning');
                    profileConfirmPasswordInput.classList.add('is-invalid'); return;
                }
                profileConfirmPasswordInput.classList.remove('is-invalid');
                if (!currentPassword) {
                    showMessage(profileMessageArea, 'Yeni şifre için mevcut şifrenizi girmelisiniz.', 'warning');
                    profileCurrentPasswordInput.classList.add('is-invalid'); return;
                }
                profileCurrentPasswordInput.classList.remove('is-invalid');
                updateData.currentPassword = currentPassword;
                updateData.newPassword = newPassword;
            }
            if (!newPassword && fullName === (currentUserInfo.fullName || '') && phone === (currentUserInfo.phone || '')) {
                 showMessage(profileMessageArea, 'Güncellenecek bilgi girmediniz.', 'info'); return;
            }
            showMessage(profileMessageArea, 'Profil güncelleniyor...', 'info', false);
            const submitButton = profileForm.querySelector('button[type="submit"]');
            if(submitButton) submitButton.disabled = true;
            try {
                const response = await fetch(`${backendUrl}/api/user/profile`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
                    body: JSON.stringify(updateData)
                });
                const result = await response.json();
                if (response.ok) {
                    showMessage(profileMessageArea, result.message || 'Profil güncellendi!', 'success');
                    if (result.updatedUser) {
                        localStorage.setItem('userInfo', JSON.stringify(result.updatedUser));
                        currentUserInfo = result.updatedUser;
                        if (window.updateHeaderAuthLinks) window.updateHeaderAuthLinks();
                    }
                    if(profileCurrentPasswordInput) profileCurrentPasswordInput.value = '';
                    if(profileNewPasswordInput) profileNewPasswordInput.value = '';
                    if(profileConfirmPasswordInput) profileConfirmPasswordInput.value = '';
                    profileForm.classList.remove('was-validated');
                    loadProfileInfo();
                } else { throw new Error(result.message || 'Profil güncellenemedi.'); }
            } catch (error) { showMessage(profileMessageArea, error.message, 'danger');
            } finally { if(submitButton) submitButton.disabled = false; }
        });
    }

    // --- SİPARİŞ GEÇMİŞİ İŞLEVLERİ ---
    async function loadOrderHistory() {
        if (!orderHistoryTableBody) return;
        showMessage(ordersMessageArea, "Siparişler yükleniyor...", "info", false);
        orderHistoryTableBody.innerHTML = `<tr><td colspan="6" class="text-center p-3"><div class="spinner-border spinner-border-sm" role="status"></div></td></tr>`;
        try {
            const response = await fetch(`${backendUrl}/api/user/orders`, { headers: { 'Authorization': `Bearer ${authToken}` } });
            const orders = await response.json();
            if (response.ok) {
                orderHistoryTableBody.innerHTML = '';
                if (orders.length === 0) {
                    orderHistoryTableBody.innerHTML = '<tr><td colspan="6" class="text-center p-3">Siparişiniz bulunmamaktadır.</td></tr>';
                    if(ordersMessageArea) ordersMessageArea.style.display = 'none'; return;
                }
                orders.forEach(order => {
                    const row = orderHistoryTableBody.insertRow();
                    // --- DEĞİŞİKLİK: Durumu Türkçe göster ---
                    const durumText = siparisDurumTurkce[order.status.toLowerCase()] || escapeHtml(order.status);
                    row.innerHTML = `
                        <td>#${order.order_id}</td>
                        <td>${escapeHtml(order.order_date_formatted)}</td>
                        <td><span class="status-badge status-${order.status.toLowerCase()}">${durumText}</span></td>
                        <td>${escapeHtml(order.product_summary || '-')} (${order.total_items_in_order} ürün)</td>
                        <td class="text-end">${parseFloat(order.total_amount).toFixed(2)} TL</td>
                        <td class="text-center">
                            <button class="btn btn-sm btn-outline-primary view-order-details-btn"
                                    data-bs-toggle="modal" data-bs-target="#order-detail-modal"
                                    data-order-id="${order.order_id}">
                                <i class="fas fa-eye"></i> Detay
                            </button>
                        </td>
                    `;
                });
                if(ordersMessageArea) ordersMessageArea.style.display = 'none';
            } else { throw new Error(orders.message || 'Sipariş geçmişi alınamadı.'); }
        } catch (error) {
            showMessage(ordersMessageArea, error.message, 'danger');
            if(orderHistoryTableBody) orderHistoryTableBody.innerHTML = `<tr><td colspan="6" class="text-center p-3 text-danger">Siparişler yüklenemedi.</td></tr>`;
        }
    }

    // --- SİPARİŞ DETAY MODAL İÇERİĞİ YÜKLEME ---
    async function showOrderDetailModalContent(orderId) {
        // ... (LOG'lar aynı kalabilir) ...
        console.log(`LOG 1 [hesabim.js]: showOrderDetailModalContent çağrıldı. Order ID: ${orderId}`);
        if (!orderDetailModalElement || !modalOrderIdSpan || !modalOrderItemsTbody || !modalShippingAddressSpan || !modalOrderTotalSpan || !modalOrderInfoDiv) {
            console.error("Modal için gerekli bazı HTML elementleri bulunamadı.");
            return;
        }
        if (modalMessageArea) modalMessageArea.style.display = 'none';

        try {
            console.log(`LOG 2 [hesabim.js]: API isteği gönderiliyor: ${backendUrl}/api/user/orders/${orderId}`);
            const response = await fetch(`${backendUrl}/api/user/orders/${orderId}`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            console.log(`LOG 3 [hesabim.js]: API yanıtı alındı. Status: ${response.status}, OK: ${response.ok}`);

            if (!response.ok) { /* ... (Hata yakalama aynı kalabilir) ... */
                const errorText = await response.text();
                console.error("LOG 3.1 [hesabim.js]: API Hata Yanıtı (text):", errorText);
                let errorJson = {}; try { errorJson = JSON.parse(errorText); } catch(e) {}
                throw new Error(errorJson.message || `Sipariş detayı alınamadı. HTTP ${response.status} - ${errorText.substring(0,100)}`);
            }

            const result = await response.json();
            console.log("LOG 4 [hesabim.js]: API'den gelen JSON sonuç:", JSON.stringify(result, null, 2));

            const { order, details } = result;
            if (!order || !details) { /* ... (Hata yakalama aynı kalabilir) ... */
                console.error("LOG 4.1 [hesabim.js]: API yanıtında 'order' veya 'details' eksik.");
                throw new Error("API yanıt formatı hatalı.");
            }

            // --- DEĞİŞİKLİK: Durumu Türkçe göster ---
            const durumTextModal = siparisDurumTurkce[order.status.toLowerCase()] || escapeHtml(order.status);
            modalOrderInfoDiv.innerHTML = `
                <p><strong>Sipariş Tarihi:</strong> ${escapeHtml(order.order_date_formatted)}</p>
                <p><strong>Durum:</strong> <span class="status-badge status-${order.status.toLowerCase()}">${durumTextModal}</span></p>
            `;
            // ... (Geri kalan modal doldurma işlemleri aynı kalabilir, loglar dahil) ...
            modalShippingAddressSpan.textContent = `${escapeHtml(order.address_line1)}, ${escapeHtml(order.address_line2 || '')} ${escapeHtml(order.postal_code)} ${escapeHtml(order.city)}, ${escapeHtml(order.country)}`;
            modalOrderTotalSpan.textContent = `${parseFloat(order.total_amount).toFixed(2)} TL`;
            modalOrderItemsTbody.innerHTML = '';

            if (Array.isArray(details)) {
                console.log(`LOG 5 [hesabim.js]: ${details.length} adet ürün detayı işlenecek.`);
                if (details.length === 0) {
                    modalOrderItemsTbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Bu siparişte ürün bulunmuyor.</td></tr>';
                } else {
                    details.forEach((item, index) => {
                        console.log(`LOG 6 [hesabim.js]: Ürün detayı ${index + 1} işleniyor:`, item);
                        const row = modalOrderItemsTbody.insertRow();
                        let imageUrl = item.product_image_url ? `${backendUrl}${item.product_image_url}` : 'images/placeholder-thumb.jpg';
                        row.innerHTML = `
                            <td><img src="${imageUrl}" alt="${escapeHtml(item.product_name)}" onerror="this.src='images/placeholder-error.jpg';" style="width:40px;height:auto; margin-right:10px; border-radius:4px;"/> ${escapeHtml(item.product_name)}</td>
                            <td class="text-center align-middle">${item.quantity}</td>
                            <td class="text-end align-middle">${parseFloat(item.price_per_unit).toFixed(2)} TL</td>
                            <td class="text-end fw-semibold align-middle">${(item.quantity * item.price_per_unit).toFixed(2)} TL</td>
                        `;
                    });
                }
            } else {
                console.warn("LOG 5.1 [hesabim.js]: API'den gelen 'details' bir dizi değil:", details);
                modalOrderItemsTbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Ürün detayları yüklenemedi.</td></tr>';
            }
            console.log("LOG 7 [hesabim.js]: Modal içeriği dolduruldu.");
        } catch (error) {
            console.error("LOG 8 [hesabim.js]: Sipariş detayı modal yükleme hatası:", error);
            showMessage(modalMessageArea, error.message, 'danger', false);
            if (modalOrderInfoDiv) modalOrderInfoDiv.innerHTML = '<p class="text-danger">Sipariş detayları yüklenirken bir hata oluştu.</p>';
        }
    }

    // Bootstrap modal event listener'ları
    // ... (Bu kısım bir önceki mesajdaki gibi kalabilir) ...
    let currentOrderIdForModal = null;
    if (orderDetailModalElement) {
        orderDetailModalElement.addEventListener('show.bs.modal', function (event) {
            console.log("Bootstrap 'show.bs.modal' eventi tetiklendi.");
            const button = event.relatedTarget;
            if (button && button.matches('.view-order-details-btn')) {
                currentOrderIdForModal = button.getAttribute('data-order-id');
                console.log(`Modal açılıyor. Order ID: ${currentOrderIdForModal} olarak ayarlandı.`);
                if(modalOrderIdSpan) modalOrderIdSpan.textContent = currentOrderIdForModal || 'N/A';
                if(modalOrderInfoDiv) modalOrderInfoDiv.innerHTML = '<div class="text-center"><div class="spinner-border spinner-border-sm" role="status"></div><p>Yükleniyor...</p></div>';
                if(modalOrderItemsTbody) modalOrderItemsTbody.innerHTML = '';
                if(modalShippingAddressSpan) modalShippingAddressSpan.textContent = '...';
                if(modalOrderTotalSpan) modalOrderTotalSpan.textContent = '--.-- TL';
                if(modalMessageArea) modalMessageArea.style.display = 'none';
            } else {
                currentOrderIdForModal = null;
            }
        });
        orderDetailModalElement.addEventListener('shown.bs.modal', function (event) {
            console.log("Bootstrap 'shown.bs.modal' eventi tetiklendi (Modal tamamen göründü).");
            if (currentOrderIdForModal) {
                console.log(`İçerik yükleniyor. Order ID: ${currentOrderIdForModal}`);
                showOrderDetailModalContent(currentOrderIdForModal);
            } else {
                if(modalOrderInfoDiv) modalOrderInfoDiv.innerHTML = '<p class="text-danger">Sipariş bilgisi alınamadı.</p>';
            }
        });
    }

    // --- ADRESLERİM BÖLÜMÜ İŞLEVLERİ ---
    // ... (Bu bölümün fonksiyonları (loadAddresses, openEditAddressForm, addressForm submit, deleteAddress)
    //      bir önceki mesajdaki gibi kalabilir) ...
    if (showAddAddressFormBtn) {
        showAddAddressFormBtn.addEventListener('click', () => {
            if (!addressFormContainer || !addressForm) return;
            addressForm.reset(); addressForm.classList.remove('was-validated');
            if(addressIdInputForm) addressIdInputForm.value = '';
            if(addressFormTitle) addressFormTitle.textContent = 'Yeni Adres Ekle';
            if(addressFormContainer) addressFormContainer.style.display = 'block';
            showAddAddressFormBtn.style.display = 'none';
            if(addressFormMessageArea) addressFormMessageArea.style.display = 'none';
            if(addressContactNameInput) addressContactNameInput.focus();
        });
    }
    if (cancelAddressFormBtn) {
        cancelAddressFormBtn.addEventListener('click', () => {
            if(addressFormContainer) addressFormContainer.style.display = 'none';
            if(showAddAddressFormBtn) showAddAddressFormBtn.style.display = 'inline-block';
            if(addressForm) addressForm.classList.remove('was-validated');
        });
    }
    async function loadAddresses() {
        if (!addressListContainer || !authToken) return;
        showMessage(addressListMessageArea, "Adresler yükleniyor...", "info", false);
        addressListContainer.innerHTML = '<div class="text-center p-3"><div class="spinner-border spinner-border-sm"></div></div>';
        try {
            const response = await fetch(`${backendUrl}/api/user/addresses`, { headers: { 'Authorization': `Bearer ${authToken}` }});
            const addresses = await response.json();
            if (response.ok) {
                addressListContainer.innerHTML = '';
                if (addresses.length === 0) {
                    addressListContainer.innerHTML = '<p class="text-muted text-center p-3">Kayıtlı adresiniz yok.</p>';
                    if(addressListMessageArea) addressListMessageArea.style.display = 'none'; return;
                }
                const addressRow = document.createElement('div'); addressRow.className = 'row';
                addresses.forEach(addr => {
                    const colDiv = document.createElement('div'); colDiv.className = 'col-md-6';
                    const card = document.createElement('div'); card.className = 'card address-card shadow-sm mb-3';
                    card.innerHTML = `
                        <div class="card-body">
                            <h5 class="card-title d-flex justify-content-between align-items-center">
                                <span><i class="fas ${addr.address_type === 'shipping' ? 'fa-truck' : 'fa-file-invoice'} me-2"></i>${escapeHtml(addr.address_type === 'shipping' ? 'Teslimat' : 'Fatura')}</span>
                                ${addr.contact_name ? `<span class="badge bg-info text-dark">${escapeHtml(addr.contact_name)}</span>` : ''}
                            </h5>
                            <p class="card-text mb-1">${escapeHtml(addr.address_line1)}</p>
                            ${addr.address_line2 ? `<p class="card-text mb-1">${escapeHtml(addr.address_line2)}</p>` : ''}
                            <p class="card-text text-muted small">${escapeHtml(addr.postal_code)} ${escapeHtml(addr.city)} / ${escapeHtml(addr.country)}</p>
                            ${addr.phone ? `<p class="card-text text-muted small"><i class="fas fa-phone-alt fa-sm"></i> ${escapeHtml(addr.phone)}</p>` : ''}
                            <div class="mt-3">
                                <button class="btn btn-sm btn-outline-primary edit-address-btn me-2" data-address-id="${addr.address_id}"><i class="fas fa-edit"></i> Düzenle</button>
                                <button class="btn btn-sm btn-outline-danger delete-address-btn" data-address-id="${addr.address_id}"><i class="fas fa-trash"></i> Sil</button>
                            </div>
                        </div>`;
                    colDiv.appendChild(card); addressRow.appendChild(colDiv);
                });
                addressListContainer.appendChild(addressRow);
                document.querySelectorAll('.edit-address-btn').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        const addressId = e.currentTarget.dataset.addressId;
                        try {
                            const addrResp = await fetch(`${backendUrl}/api/user/addresses`, { headers: { 'Authorization': `Bearer ${authToken}` }});
                            if (!addrResp.ok) throw new Error('Adres bilgisi alınamadı.');
                            const allAddr = await addrResp.json();
                            const addrToEdit = allAddr.find(ad => String(ad.address_id) === String(addressId));
                            if(addrToEdit) openEditAddressForm(addrToEdit);
                            else showMessage(addressListMessageArea, 'Adres bulunamadı.', 'warning');
                        } catch (err) { showMessage(addressListMessageArea, err.message, 'danger'); }
                    });
                });
                document.querySelectorAll('.delete-address-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => deleteAddress(e.currentTarget.dataset.addressId));
                });
                if(addressListMessageArea) addressListMessageArea.style.display = 'none';
            } else { throw new Error(addresses.message || 'Adresler yüklenemedi.'); }
        } catch (error) {
            showMessage(addressListMessageArea, error.message, 'danger');
            if(addressListContainer) addressListContainer.innerHTML = '<p class="text-center p-3 text-danger">Adresler yüklenirken sorun oluştu.</p>';
        }
    }
    function openEditAddressForm(address) {
        if (!addressFormContainer || !addressForm || !addressIdInputForm || !addressFormTitle ||
            !addressTypeInput || !addressContactNameInput || !addressLine1Input || !addressLine2Input ||
            !addressCityInput || !addressPostalCodeInput || !addressCountryInput || !addressPhoneInput) return;
        addressForm.reset(); addressForm.classList.remove('was-validated');
        addressIdInputForm.value = address.address_id;
        addressFormTitle.textContent = 'Adresi Düzenle';
        addressTypeInput.value = address.address_type || 'shipping';
        addressContactNameInput.value = address.contact_name || '';
        addressLine1Input.value = address.address_line1 || '';
        addressLine2Input.value = address.address_line2 || '';
        addressCityInput.value = address.city || '';
        addressPostalCodeInput.value = address.postal_code || '';
        addressCountryInput.value = address.country || 'Türkiye';
        addressPhoneInput.value = address.phone || '';
        addressFormContainer.style.display = 'block';
        if(showAddAddressFormBtn) showAddAddressFormBtn.style.display = 'none';
        if(addressFormMessageArea) addressFormMessageArea.style.display = 'none';
        addressContactNameInput.focus();
    }
    if (addressForm) {
        addressForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (!addressForm.checkValidity()) { event.stopPropagation(); addressForm.classList.add('was-validated'); return; }
            addressForm.classList.add('was-validated');
            const addressId = addressIdInputForm.value;
            const formData = {
                address_type: addressTypeInput.value, contact_name: addressContactNameInput.value.trim() || null,
                address_line1: addressLine1Input.value.trim(), address_line2: addressLine2Input.value.trim() || null,
                city: addressCityInput.value.trim(), postal_code: addressPostalCodeInput.value.trim(),
                country: addressCountryInput.value.trim(), phone: addressPhoneInput.value.trim() || null
            };
            const apiUrl = addressId ? `${backendUrl}/api/user/addresses/${addressId}` : `${backendUrl}/api/user/addresses`;
            const apiMethod = addressId ? 'PUT' : 'POST';
            showMessage(addressFormMessageArea, 'Adres kaydediliyor...', 'info', false);
            const submitButton = addressForm.querySelector('button[type="submit"]');
            if(submitButton) submitButton.disabled = true;
            try {
                const response = await fetch(apiUrl, {
                    method: apiMethod, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
                    body: JSON.stringify(formData)
                });
                const result = await response.json();
                if (response.ok) {
                    showMessage(addressFormMessageArea, result.message || `Adres ${addressId ? 'güncellendi' : 'eklendi'}!`, 'success');
                    if(addressFormContainer) addressFormContainer.style.display = 'none';
                    if(showAddAddressFormBtn) showAddAddressFormBtn.style.display = 'inline-block';
                    addressForm.classList.remove('was-validated'); loadAddresses();
                } else { throw new Error(result.message || 'Adres kaydedilemedi.'); }
            } catch (error) { showMessage(addressFormMessageArea, error.message, 'danger');
            } finally { if(submitButton) submitButton.disabled = false; }
        });
    }
    async function deleteAddress(addressId) {
        if (!confirm(`Bu adresi silmek istediğinize emin misiniz?`)) return;
        showMessage(addressListMessageArea, 'Adres siliniyor...', 'info', false);
        try {
            const response = await fetch(`${backendUrl}/api/user/addresses/${addressId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${authToken}` }});
            const result = await response.json().catch(() => ({}));
            if (response.ok || response.status === 204) {
                showMessage(addressListMessageArea, result.message || 'Adres silindi.', 'success'); loadAddresses();
            } else { throw new Error(result.message || 'Adres silinemedi.'); }
        } catch (error) { showMessage(addressListMessageArea, error.message, 'danger'); }
    }

    // --- SIDEBAR NAVİGASYONU VE İÇERİK GÖSTERME ---
    // ... (Bu bölümün kodu bir önceki mesajdaki gibi kalabilir) ...
    function setActiveSection(targetId) {
        contentSections.forEach(section => {
            section.style.display = (section.id === targetId) ? 'block' : 'none';
        });
        sidebarLinks.forEach(link => {
            if (link.getAttribute('href') === `#${targetId}`) link.classList.add('active');
            else link.classList.remove('active');
        });
        if (targetId === 'profile') loadProfileInfo();
        if (targetId === 'orders') loadOrderHistory();
        if (targetId === 'addresses') loadAddresses();
    }
    sidebarLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            if (e.currentTarget.id === 'sidebar-logout-btn') return;
            const targetId = e.currentTarget.getAttribute('href').substring(1);
            window.location.hash = targetId;
        });
    });
    function handleHashChange() {
        let sectionId = window.location.hash.substring(1);
        const validSections = Array.from(sidebarLinks).map(link => link.getAttribute('href').substring(1)).filter(id => id && id !== '#');
        if (!sectionId || !validSections.includes(sectionId) || !document.getElementById(sectionId)) {
            sectionId = 'orders'; window.location.hash = sectionId;
        }
        setActiveSection(sectionId);
    }
    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();

    // --- ÇIKIŞ BUTONU ---
    // ... (Bu bölümün kodu bir önceki mesajdaki gibi kalabilir) ...
    const sidebarLogoutBtn = document.getElementById('sidebar-logout-btn');
    if (sidebarLogoutBtn) {
        sidebarLogoutBtn.addEventListener('click', (event) => {
            event.preventDefault();
            if (typeof window.handleLogout === 'function') window.handleLogout();
            else {
                localStorage.removeItem('authToken'); localStorage.removeItem('userInfo');
                window.location.href = 'giris-kayit.html';
            }
        });
    }
});