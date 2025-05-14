// admin/js/admin-musteriler.js
document.addEventListener('DOMContentLoaded', () => {
    const backendUrl = 'http://localhost:5000';
    const authToken = localStorage.getItem('authToken');

    const customersTableBody = document.getElementById('admin-customers-table-body');
    const messageAreaList = document.getElementById('customers-list-message-area');

    // Filtreleme Elemanları
    const filterForm = document.getElementById('customer-filter-form');
    const filterNameInput = document.getElementById('filter-name');
    const filterRoleSelect = document.getElementById('filter-role');
    const resetFiltersBtn = document.getElementById('reset-customer-filters-btn');

    const escapeHtml = (unsafe) => {
        if (typeof unsafe !== 'string') return unsafe;
        return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    };
    
    const showMessage = (areaElement, message, type = 'error', autoHide = true) => {
        if (!areaElement) { console.warn("Mesaj alanı bulunamadı:", message); return; }
        areaElement.innerHTML = `<p class="form-message ${type}">${escapeHtml(message)}</p>`;
        areaElement.className = `form-message ${type}`;
        areaElement.style.display = 'block';
        if (autoHide) setTimeout(() => { areaElement.style.display = 'none'; }, 5000);
    };

    async function fetchAndDisplayAdminCustomers(filters = {}) {
        if (!customersTableBody) { console.warn("Admin müşteri tablo body'si bulunamadı."); return; }
        showMessage(messageAreaList, "Müşteriler yükleniyor...", "info", false);
        customersTableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Müşteriler yükleniyor...</td></tr>';

        if (!authToken) {
            showMessage(messageAreaList, "Yetkilendirme tokenı bulunamadı. Lütfen tekrar giriş yapın.", "error");
            return;
        }

        // Query string oluştur
        let queryString = '?';
        if (filters.name) queryString += `name=${encodeURIComponent(filters.name)}&`;
        if (filters.role) queryString += `role=${encodeURIComponent(filters.role)}&`;
        // Son & karakterini kaldır (varsa)
        queryString = queryString.length > 1 ? queryString.slice(0, -1) : '';


        try {
            const response = await fetch(`${backendUrl}/api/admin/customers${queryString}`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            const result = await response.json();
            if (response.ok) {
                const customers = result;
                customersTableBody.innerHTML = '';
                if (customers.length === 0) {
                    customersTableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Bu kriterlere uygun müşteri bulunamadı.</td></tr>';
                    if(messageAreaList) messageAreaList.style.display = 'none';
                    return;
                }
                customers.forEach(customer => {
                    const row = customersTableBody.insertRow();
                    const currentRole = customer.role.toLowerCase();
                    const newRole = currentRole === 'admin' ? 'customer' : 'admin'; // Değiştirilecek rol

                    row.innerHTML = `
                        <td>${customer.user_id}</td>
                        <td>${escapeHtml(customer.full_name || 'N/A')}</td>
                        <td>${escapeHtml(customer.email)}</td>
                        <td>${escapeHtml(customer.phone || 'N/A')}</td>
                        <td><span class="status status-${currentRole}">${escapeHtml(customer.role)}</span></td>
                        <td>${escapeHtml(customer.registration_date_formatted)}</td>
                        <td>
                            <button class="btn btn-sm btn-warning change-role-btn" 
                                    data-user-id="${customer.user_id}" 
                                    data-new-role="${newRole}"
                                    data-current-role="${currentRole}"
                                    title="'${newRole.toUpperCase()}' yap">
                                <i class="fas fa-user-shield"></i> ${newRole.charAt(0).toUpperCase() + newRole.slice(1)} Yap
                            </button>
                        </td>
                    `;
                });

                // Rol Değiştirme Butonlarına Olay Dinleyicisi Ekle
                document.querySelectorAll('.change-role-btn').forEach(button => {
                    button.addEventListener('click', handleChangeRole);
                });

                 if(messageAreaList) messageAreaList.style.display = 'none';
            } else {
                throw new Error(result.message || 'Müşteriler yüklenemedi.');
            }
        } catch (error) {
            console.error("Admin müşteri listesi yükleme hatası:", error);
            showMessage(messageAreaList, `Müşteriler yüklenemedi: ${error.message}`, 'error');
            if(customersTableBody) customersTableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:red;">Müşteriler yüklenirken hata oluştu.</td></tr>`;
        }
    }

    // Rol Değiştirme İşlevi
    async function handleChangeRole(event) {
        const button = event.currentTarget;
        const userId = button.dataset.userId;
        const newRole = button.dataset.newRole;
        const currentRole = button.dataset.currentRole;
        const userName = button.closest('tr').cells[1].textContent; // Ad Soyad'ı al

        if (Number(userId) === (JSON.parse(localStorage.getItem('userInfo'))?.id)) {
            alert("Kendi rolünüzü değiştiremezsiniz.");
            return;
        }

        if (!confirm(`'${escapeHtml(userName)}' adlı kullanıcının rolünü '${currentRole}' -> '${newRole}' olarak değiştirmek istediğinize emin misiniz?`)) {
            return;
        }

        if (!authToken) {
            showMessage(messageAreaList, "Yetkilendirme tokenı bulunamadı.", "error");
            return;
        }
        showMessage(messageAreaList, `Rol güncelleniyor...`, "info", false);

        try {
            const response = await fetch(`${backendUrl}/api/admin/users/${userId}/role`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({ newRole: newRole })
            });
            const result = await response.json();
            if (response.ok) {
                showMessage(messageAreaList, result.message || 'Rol başarıyla güncellendi!', 'success');
                fetchAndDisplayAdminCustomers(getCurrentFilters()); // Listeyi mevcut filtrelerle yenile
            } else {
                throw new Error(result.message || 'Rol güncellenemedi.');
            }
        } catch (error) {
            console.error("Rol güncelleme hatası:", error);
            showMessage(messageAreaList, `Hata: ${error.message}`, 'error');
        }
    }
    
    // Mevcut Filtre Değerlerini Al
    function getCurrentFilters() {
        const filters = {};
        if (filterNameInput && filterNameInput.value.trim() !== '') {
            filters.name = filterNameInput.value.trim();
        }
        if (filterRoleSelect && filterRoleSelect.value !== '') {
            filters.role = filterRoleSelect.value;
        }
        return filters;
    }

    // Filtreleme Formu Submit Olayı
    if (filterForm) {
        filterForm.addEventListener('submit', (event) => {
            event.preventDefault();
            fetchAndDisplayAdminCustomers(getCurrentFilters());
        });
    }

    // Filtreleri Sıfırlama Butonu
    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', () => {
            if(filterNameInput) filterNameInput.value = '';
            if(filterRoleSelect) filterRoleSelect.value = '';
            fetchAndDisplayAdminCustomers(); // Filtresiz yükle
        });
    }

    // Sayfa yüklendiğinde
    fetchAndDisplayAdminCustomers();

    // Logout
    const adminLogoutBtn = document.getElementById('admin-logout-btn');
    const adminHeaderLogoutBtn = document.getElementById('admin-header-logout-btn');
    const handleAdminLogout = () => {
        if (typeof window.handleLogout === 'function') { window.handleLogout(); } 
        else { localStorage.removeItem('authToken'); localStorage.removeItem('userInfo'); window.location.href = '../giris-kayit.html'; }
    };
    if(adminLogoutBtn) adminLogoutBtn.addEventListener('click', (e)=>{ e.preventDefault(); handleAdminLogout();});
    if(adminHeaderLogoutBtn) adminHeaderLogoutBtn.addEventListener('click', (e)=>{ e.preventDefault(); handleAdminLogout();});
});