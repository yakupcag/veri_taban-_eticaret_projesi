// admin/js/urun-listele.js
document.addEventListener('DOMContentLoaded', () => {
    const backendUrl = 'http://localhost:5000';
    const authToken = localStorage.getItem('authToken');

    const tableBody = document.getElementById('product-table-body');
    const messageArea = document.getElementById('message-area-list'); // Bu ID HTML'de olmalı

    // Filtreleme Elemanları
    const filterForm = document.getElementById('admin-product-filter-form');
    const filterProductNameInput = document.getElementById('filter-product-name');
    const filterCategorySelect = document.getElementById('filter-product-category');
    const filterStatusSelect = document.getElementById('filter-product-status');
    const filterSortSelect = document.getElementById('filter-product-sort');
    const resetFiltersBtn = document.getElementById('reset-admin-product-filters-btn');

    const escapeHtml = (unsafe) => {
        if (typeof unsafe !== 'string') return unsafe;
        return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    };

    const showMessage = (msg, type = 'info', autoHide = true) => {
        if (!messageArea) { console.warn("Admin ürün listesi mesaj alanı bulunamadı."); return; }
        messageArea.innerHTML = `<p class="form-message ${type}">${escapeHtml(msg)}</p>`;
        messageArea.className = `form-message ${type}`;
        messageArea.style.display = 'block';
        if (autoHide) setTimeout(() => { messageArea.style.display = 'none'; }, 5000);
    };

    // Kategori Filtresini Doldurma
    async function populateAdminCategoryFilter() {
        if (!filterCategorySelect) return;
        try {
            const response = await fetch(`${backendUrl}/api/categories`); // Bu public endpoint, token gerektirmez
            if (!response.ok) throw new Error('Kategoriler filtre için yüklenemedi.');
            const categories = await response.json();
            
            // Mevcut option'ları koru (örn: "Tüm Kategoriler"), sadece kategorileri ekle
            // veya select'i temizleyip "Tümü" ile başla.
            // filterCategorySelect.innerHTML = '<option value="">Tüm Kategoriler</option>'; // Eğer baştan oluşturulacaksa
            
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.category_id;
                option.textContent = escapeHtml(category.category_name);
                filterCategorySelect.appendChild(option);
            });
        } catch (error) {
            console.error("Admin ürün filtresi için kategori yükleme hatası:", error);
            // filterCategorySelect.innerHTML = '<option value="">Kategori Yüklenemedi</option>';
        }
    }

    // Ürünleri Yükleme ve Gösterme (Filtrelerle)
    async function fetchAndDisplayAdminProducts(filters = {}) {
        if (!tableBody) return;
        showMessage("Ürünler yükleniyor...", "info", false);
        tableBody.innerHTML = '<tr><td colspan="8" style="text-align:center;">Ürünler yükleniyor...</td></tr>';

        if (!authToken) {
            showMessage("Yetkilendirme tokenı bulunamadı.", "error");
            return;
        }

        let queryString = '?';
        if (filters.searchTerm) queryString += `search_term=${encodeURIComponent(filters.searchTerm)}&`;
        if (filters.category) queryString += `category=${encodeURIComponent(filters.category)}&`;
        if (filters.status) queryString += `status=${encodeURIComponent(filters.status)}&`; // Backend 'all_statuses_for_admin' gibi bir değeri de handle etmeli
        if (filters.sortBy) queryString += `sort_by=${encodeURIComponent(filters.sortBy)}&`;
        queryString = queryString.length > 1 ? queryString.slice(0, -1) : '';

        console.log("Admin Ürünler API İsteği Query:", queryString);

        try {
            const response = await fetch(`${backendUrl}/api/products${queryString}`, { // Genel /api/products endpoint'ini kullanıyoruz
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            const result = await response.json();
            if (response.ok) {
                const products = result;
                tableBody.innerHTML = '';
                if (products.length === 0) {
                    tableBody.innerHTML = '<tr><td colspan="8" style="text-align:center;">Bu kriterlere uygun ürün bulunamadı.</td></tr>';
                    if(messageArea) messageArea.style.display = 'none';
                    return;
                }
                products.forEach(product => {
                    const row = tableBody.insertRow();
                    const imageUrl = product.image_url ? `${backendUrl}${product.image_url}` : '../images/placeholder-thumb.jpg'; // Admin paneli bir alt dizinde olduğu için ../
                    row.innerHTML = `
                        <td>${product.product_id}</td>
                        <td><img src="${imageUrl}" alt="${escapeHtml(product.name)}" class="product-thumb" onerror="this.src='../images/placeholder-error.jpg';"></td>
                        <td>${escapeHtml(product.name)}</td>
                        <td>${escapeHtml(product.category_name || '---')}</td>
                        <td>${parseFloat(product.price).toFixed(2)} TL</td>
                        <td><span class="stock-level ${product.stock < 10 && product.stock > 0 ? 'low-stock' : (product.stock <= 0 ? 'no-stock' : '')}">${product.stock}</span></td>
                        <td><span class="status status-${product.status.toLowerCase()}">${escapeHtml(product.status)}</span></td>
                        <td class="actions">
                            <button class="btn-edit" title="Düzenle" onclick="window.location.href='urun_duzenle.html?id=${product.product_id}'"><i class="fas fa-edit"></i></button>
                            <button class="btn-delete delete-product-btn" title="Sil" data-product-id="${product.product_id}" data-product-name="${escapeHtml(product.name)}"><i class="fas fa-trash-alt"></i></button>
                        </td>
                    `;
                });
                // Silme butonlarına olay dinleyici ekle (önceki urun-listele.js'deki gibi)
                document.querySelectorAll('.delete-product-btn').forEach(button => {
                    button.addEventListener('click', handleDeleteProduct);
                });
                if(messageArea) messageArea.style.display = 'none';
            } else {
                throw new Error(result.message || 'Admin için ürünler yüklenemedi.');
            }
        } catch (error) {
            console.error("Admin ürün listesi yükleme hatası:", error);
            showMessage(`Ürünler yüklenemedi: ${error.message}`, 'error');
            if(tableBody) tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:red;">Ürünler yüklenirken hata oluştu.</td></tr>`;
        }
    }

    // Ürün Silme İşlevi (Bu zaten urun-listele.js'de vardı, buraya taşıdık/güncelledik)
    async function handleDeleteProduct(event) {
        const button = event.currentTarget;
        const productId = button.dataset.productId;
        const productName = button.dataset.productName;

        if (!confirm(`'${productName}' isimli ürünü silmek (arşivlemek) istediğinize emin misiniz?`)) return;
        
        if (!authToken) { showMessage("Yetkilendirme tokenı bulunamadı.", "error"); return; }
        showMessage("Ürün siliniyor...", "info", false);

        try {
            const response = await fetch(`${backendUrl}/api/products/${productId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            const result = await response.json().catch(() => ({}));
            if (response.ok) {
                showMessage(result.message || `Ürün başarıyla 'silindi' olarak işaretlendi.`, 'success');
                fetchAndDisplayAdminProducts(getCurrentAdminFilters()); // Listeyi mevcut filtrelerle yenile
            } else {
                throw new Error(result.message || 'Ürün silinemedi.');
            }
        } catch (error) {
            console.error("Admin ürün silme hatası:", error);
            showMessage(`Hata: ${error.message || 'Ürün silinirken bir sorun oluştu.'}`, 'error');
        }
    }
    
    // Mevcut Filtre Değerlerini Al (Admin için)
    function getCurrentAdminFilters() {
        const filters = {};
        if (filterProductNameInput && filterProductNameInput.value.trim() !== '') {
            filters.searchTerm = filterProductNameInput.value.trim();
        }
        if (filterCategorySelect && filterCategorySelect.value !== '') {
            filters.category = filterCategorySelect.value;
        }
        if (filterStatusSelect && filterStatusSelect.value !== '') {
            filters.status = filterStatusSelect.value;
        }
        if (filterSortSelect && filterSortSelect.value !== '') {
            filters.sortBy = filterSortSelect.value;
        }
        return filters;
    }

    // Filtreleme Formu Submit Olayı
    if (filterForm) {
        filterForm.addEventListener('submit', (event) => {
            event.preventDefault();
            fetchAndDisplayAdminProducts(getCurrentAdminFilters());
        });
    }

    // Filtreleri Sıfırlama Butonu
    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', () => {
            if(filterForm) filterForm.reset(); // Formu sıfırla
            // Kategori ve Durum select'lerini de varsayılana döndür (ilk option)
            if(filterCategorySelect) filterCategorySelect.selectedIndex = 0;
            if(filterStatusSelect) filterStatusSelect.selectedIndex = 0;
            if(filterSortSelect) filterSortSelect.selectedIndex = 0;
            fetchAndDisplayAdminProducts(); // Filtresiz yükle
        });
    }

    // Sayfa Yüklendiğinde
    populateAdminCategoryFilter().then(() => { // Önce kategorileri doldur
        fetchAndDisplayAdminProducts(); // Sonra ürünleri ilk filtrelerle yükle
    });

    // Logout (diğer admin sayfalarındaki gibi)
    const adminLogoutBtn = document.getElementById('admin-logout-btn');
    const adminHeaderLogoutBtn = document.getElementById('admin-header-logout-btn');
    const handleAdminLogout = () => {
        if (typeof window.handleLogout === 'function') { window.handleLogout(); } 
        else { localStorage.removeItem('authToken'); localStorage.removeItem('userInfo'); window.location.href = '../giris-kayit.html'; }
    };
    if(adminLogoutBtn) adminLogoutBtn.addEventListener('click', (e)=>{ e.preventDefault(); handleAdminLogout();});
    if(adminHeaderLogoutBtn) adminHeaderLogoutBtn.addEventListener('click', (e)=>{ e.preventDefault(); handleAdminLogout();});
});