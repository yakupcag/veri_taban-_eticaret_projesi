// admin/js/admin-siparisler.js
document.addEventListener('DOMContentLoaded', () => {
    const backendUrl = 'http://localhost:5000';
    const authToken = localStorage.getItem('authToken');

    const ordersTableBody = document.getElementById('admin-orders-table-body');
    const messageAreaList = document.getElementById('orders-list-message-area');

    // Modal Elementleri
    const orderDetailModal = document.getElementById('admin-order-detail-modal');
    const closeModalBtn = document.getElementById('admin-order-modal-close-btn');
    const modalOrderIdSpan = document.getElementById('modal-admin-order-id');
    const modalCustomerNameSpan = document.getElementById('modal-admin-customer-name');
    const modalCustomerEmailSpan = document.getElementById('modal-admin-customer-email');
    const modalCustomerPhoneSpan = document.getElementById('modal-admin-customer-phone');
    const modalShippingAddressSpan = document.getElementById('modal-admin-shipping-address');
    const modalOrderDateSpan = document.getElementById('modal-admin-order-date');
    const modalCurrentStatusSpan = document.getElementById('modal-admin-current-status');
    const modalOrderTotalSpan = document.getElementById('modal-admin-order-total');
    const modalOrderStatusSelect = document.getElementById('modal-admin-order-status-select');
    const modalUpdateStatusBtn = document.getElementById('modal-admin-update-status-btn');
    const modalOrderItemsTbody = document.getElementById('modal-admin-order-items-tbody');
    const modalMessageArea = document.getElementById('modal-admin-order-message-area');

    let currentEditingOrderId = null; // Düzenlenen siparişin ID'sini tutmak için

    const escapeHtml = (unsafe) => {
        if (typeof unsafe !== 'string') return unsafe;
        return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    };

    const showMessage = (areaElement, message, type = 'error', autoHide = true) => {
        if (!areaElement) { console.warn("Mesaj alanı bulunamadı:", message); return; }
        areaElement.innerHTML = `<p class="form-message ${type}">${escapeHtml(message)}</p>`;
        areaElement.className = `form-message ${type}`; // Önceki classları temizle
        areaElement.style.display = 'block';
        if (autoHide) setTimeout(() => { areaElement.style.display = 'none'; }, 5000);
    };

    async function fetchAndDisplayAdminOrders() {
        if (!ordersTableBody) { console.warn("Admin sipariş tablo body'si bulunamadı."); return; }
        showMessage(messageAreaList, "Siparişler yükleniyor...", "info", false);
        ordersTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Siparişler yükleniyor...</td></tr>';

        if (!authToken) {
            showMessage(messageAreaList, "Yetkilendirme tokenı bulunamadı. Lütfen tekrar giriş yapın.", "error");
            return;
        }

        try {
            const response = await fetch(`${backendUrl}/api/admin/orders`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            const result = await response.json();
            if (response.ok) {
                const orders = result;
                ordersTableBody.innerHTML = '';
                if (orders.length === 0) {
                    ordersTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Henüz hiç sipariş yok.</td></tr>';
                    if(messageAreaList) messageAreaList.style.display = 'none';
                    return;
                }
                orders.forEach(order => {
                    const row = ordersTableBody.insertRow();
                    row.innerHTML = `
                        <td>#${order.order_id}</td>
                        <td>${escapeHtml(order.customer_name)}<br><small>${escapeHtml(order.customer_email)}</small></td>
                        <td>${escapeHtml(order.order_date_formatted)}</td>
                        <td>${parseFloat(order.total_amount).toFixed(2)} TL</td>
                        <td><span class="status status-${order.status.toLowerCase()}">${escapeHtml(order.status)}</span></td>
                        <td><button class="btn btn-sm btn-info view-admin-order-details" data-order-id="${order.order_id}"><i class="fas fa-eye"></i> Detay/Düzenle</button></td>
                    `;
                });
                document.querySelectorAll('.view-admin-order-details').forEach(button => {
                    button.addEventListener('click', (e) => openAdminOrderDetailModal(e.target.closest('button').dataset.orderId));
                });
                 if(messageAreaList) messageAreaList.style.display = 'none';
            } else {
                throw new Error(result.message || 'Siparişler yüklenemedi.');
            }
        } catch (error) {
            console.error("Admin siparişleri yükleme hatası:", error);
            showMessage(messageAreaList, `Siparişler yüklenemedi: ${error.message}`, 'error');
            if(ordersTableBody) ordersTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:red;">Siparişler yüklenirken hata oluştu.</td></tr>`;
        }
    }

    async function openAdminOrderDetailModal(orderId) {
        if (!orderDetailModal || !authToken) return;
        currentEditingOrderId = orderId; // Mevcut düzenlenecek sipariş ID'sini sakla

        // Modal alanlarını temizle/yükleniyor yap
        modalOrderIdSpan.textContent = orderId;
        modalCustomerNameSpan.textContent = 'Yükleniyor...';
        // ... diğer alanlar için de benzeri ...
        modalOrderItemsTbody.innerHTML = '';
        modalMessageArea.style.display = 'none';
        orderDetailModal.style.display = 'block';

        try {
            const response = await fetch(`${backendUrl}/api/admin/orders/${orderId}`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            const result = await response.json();
            if (response.ok) {
                const { order, details } = result;
                modalCustomerNameSpan.textContent = escapeHtml(order.customer_name);
                modalCustomerEmailSpan.textContent = escapeHtml(order.customer_email);
                modalCustomerPhoneSpan.textContent = escapeHtml(order.customer_phone || 'N/A');
                modalShippingAddressSpan.innerHTML = `
                    ${escapeHtml(order.address_line1 || '')}<br>
                    ${order.address_line2 ? escapeHtml(order.address_line2) + '<br>' : ''}
                    ${escapeHtml(order.postal_code || '')} ${escapeHtml(order.city || '')}<br>
                    ${escapeHtml(order.country || '')}
                `;
                modalOrderDateSpan.textContent = escapeHtml(order.order_date_formatted);
                modalCurrentStatusSpan.className = `status status-${order.status.toLowerCase()}`; // Class'ı da güncelle
                modalCurrentStatusSpan.textContent = escapeHtml(order.status);
                modalOrderTotalSpan.textContent = parseFloat(order.total_amount).toFixed(2);
                modalOrderStatusSelect.value = order.status.toLowerCase(); // Select'i ayarla

                modalOrderItemsTbody.innerHTML = '';
                details.forEach(item => {
                    const row = modalOrderItemsTbody.insertRow();
                    let imageUrl = item.product_image_url ? `${backendUrl}${item.product_image_url}` : '../images/placeholder-thumb.jpg';
                    row.innerHTML = `
                        <td>${escapeHtml(item.product_name)}</td>
                        <td><img src="${imageUrl}" alt="${escapeHtml(item.product_name)}" onerror="this.src='../images/placeholder-error.jpg';" /></td>
                        <td>${item.quantity}</td>
                        <td>${parseFloat(item.price_per_unit).toFixed(2)} TL</td>
                        <td>${parseFloat(item.item_total_price).toFixed(2)} TL</td>
                    `;
                });

            } else {
                throw new Error(result.message || `Sipariş detayı (ID: ${orderId}) alınamadı.`);
            }
        } catch (error) {
            console.error("Admin sipariş detayı modal yükleme hatası:", error);
            showMessage(modalMessageArea, `Sipariş detayları yüklenemedi: ${error.message}`, 'error');
        }
    }

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            if (orderDetailModal) orderDetailModal.style.display = 'none';
            currentEditingOrderId = null; // Düzenleme ID'sini temizle
        });
    }
    window.addEventListener('click', (event) => {
        if (event.target == orderDetailModal) {
            if (orderDetailModal) orderDetailModal.style.display = 'none';
            currentEditingOrderId = null;
        }
    });

    if (modalUpdateStatusBtn) {
        modalUpdateStatusBtn.addEventListener('click', async () => {
            if (!currentEditingOrderId || !modalOrderStatusSelect.value) return;
            const newStatus = modalOrderStatusSelect.value;
            
            showMessage(modalMessageArea, `Sipariş ID ${currentEditingOrderId} durumu '${newStatus}' olarak güncelleniyor...`, 'info', false);

            if (!authToken) {
                 showMessage(modalMessageArea, "Yetkilendirme tokenı bulunamadı.", "error");
                 return;
            }

            try {
                const response = await fetch(`${backendUrl}/api/admin/orders/${currentEditingOrderId}/status`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    },
                    body: JSON.stringify({ status: newStatus })
                });
                const result = await response.json();
                if (response.ok) {
                    showMessage(modalMessageArea, result.message || 'Sipariş durumu başarıyla güncellendi!', 'success');
                    // Modal içindeki mevcut durumu da güncelle
                    if(modalCurrentStatusSpan) {
                        modalCurrentStatusSpan.textContent = newStatus;
                        modalCurrentStatusSpan.className = `status status-${newStatus.toLowerCase()}`;
                    }
                    fetchAndDisplayAdminOrders(); // Ana listeyi yenile
                    // Modalı açık bırakabiliriz veya kapatabiliriz
                    // setTimeout(() => { if (orderDetailModal) orderDetailModal.style.display = 'none'; currentEditingOrderId = null; }, 2000);
                } else {
                    throw new Error(result.message || 'Sipariş durumu güncellenemedi.');
                }
            } catch (error) {
                console.error("Sipariş durumu güncelleme hatası:", error);
                showMessage(modalMessageArea, `Hata: ${error.message}`, 'error');
            }
        });
    }

    // Sayfa yüklendiğinde
    fetchAndDisplayAdminOrders();

    // Logout butonları için (admin-urunler.html'dekiyle aynı mantık)
    const adminLogoutBtn = document.getElementById('admin-logout-btn');
    const adminHeaderLogoutBtn = document.getElementById('admin-header-logout-btn');
    const handleAdminLogout = () => {
        if (typeof window.handleLogout === 'function') {
            window.handleLogout();
        } else { // Fallback
            localStorage.removeItem('authToken');
            localStorage.removeItem('userInfo');
            window.location.href = '../giris-kayit.html';
        }
    };
    if(adminLogoutBtn) adminLogoutBtn.addEventListener('click', (e)=>{ e.preventDefault(); handleAdminLogout();});
    if(adminHeaderLogoutBtn) adminHeaderLogoutBtn.addEventListener('click', (e)=>{ e.preventDefault(); handleAdminLogout();});
});