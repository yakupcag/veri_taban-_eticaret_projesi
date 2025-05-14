// admin/js/admin-kategoriler.js
document.addEventListener('DOMContentLoaded', () => {
    const backendUrl = 'http://localhost:5000';
    const categoryTableBody = document.getElementById('category-table-body');
    const addCategoryForm = document.getElementById('add-category-form');
    const categoryNameAddInput = document.getElementById('category-name-add');
    const messageAreaAdd = document.getElementById('message-area-category-add');
    const messageAreaList = document.getElementById('message-area-category-list');
    const messageAreaEdit = document.getElementById('message-area-category-edit');

    // Düzenleme Formu Elemanları
    const editModal = document.getElementById('edit-category-modal');
    const editCategoryForm = document.getElementById('edit-category-form');
    const categoryIdEditInput = document.getElementById('category-id-edit');
    const categoryNameEditInput = document.getElementById('category-name-edit');
    const cancelEditCategoryBtn = document.getElementById('cancel-edit-category-btn');

    const escapeHtml = (unsafe) => {
        if (typeof unsafe !== 'string') return unsafe;
        return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    };

    const showMessage = (areaElement, message, type = 'info') => {
        if (!areaElement) return;
        areaElement.innerHTML = `<p>${escapeHtml(message)}</p>`;
        areaElement.className = `form-message ${type}`;
        areaElement.style.display = 'block';
        setTimeout(() => { areaElement.style.display = 'none'; }, 4000);
    };

    // Kategorileri Listele
    async function fetchAndDisplayCategories() {
        if (!categoryTableBody) return;
        categoryTableBody.innerHTML = '<tr><td colspan="3" style="text-align:center;">Kategoriler yükleniyor...</td></tr>';
        const token = localStorage.getItem('authToken');
        // !!! TEST İÇİN TOKEN KONTROLÜ ESNEMİŞTİR. NORMALDE OLMALI.
        //if (!token) console.warn("fetchAndDisplayCategories: authToken bulunamadı. Test amacıyla devam.");

        try {
            const response = await fetch(`${backendUrl}/api/categories`, { // GET isteği için token gerekmiyordu ama admin paneli olduğu için eklenebilir.
                headers: { 'Authorization': `Bearer ${token}` } // server.js'deki GET /api/categories'e verifyTokenAndAdmin eklenebilir. Şimdilik public endpoint'i kullanıyoruz.
            });
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.message || `HTTP Hata: ${response.status}`);
            }
            const categories = await response.json();
            categoryTableBody.innerHTML = '';

            if (categories.length === 0) {
                categoryTableBody.innerHTML = '<tr><td colspan="3" style="text-align:center;">Kayıtlı kategori bulunamadı.</td></tr>';
                return;
            }

            categories.forEach(category => {
                const row = categoryTableBody.insertRow();
                row.insertCell().textContent = category.category_id;
                row.insertCell().textContent = escapeHtml(category.category_name);

                const actionsCell = row.insertCell();
                actionsCell.classList.add('actions');

                const editButton = document.createElement('button');
                editButton.title = 'Düzenle';
                editButton.classList.add('btn-edit');
                editButton.innerHTML = '<i class="fas fa-edit"></i>';
                editButton.onclick = () => openEditModal(category);
                actionsCell.appendChild(editButton);

                const deleteButton = document.createElement('button');
                deleteButton.title = 'Sil';
                deleteButton.classList.add('btn-delete');
                deleteButton.innerHTML = '<i class="fas fa-trash-alt"></i>';
                deleteButton.onclick = () => deleteCategory(category.category_id, category.category_name);
                actionsCell.appendChild(deleteButton);
            });
        } catch (error) {
            console.error('Kategoriler yüklenirken hata:', error);
            showMessage(messageAreaList, `Kategoriler yüklenemedi: ${error.message}`, 'error');
            if (categoryTableBody) categoryTableBody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:red;">Kategoriler yüklenemedi.</td></tr>`;
        }
    }

    // Yeni Kategori Ekleme
    if (addCategoryForm) {
        addCategoryForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const categoryName = categoryNameAddInput.value.trim();
            if (!categoryName) {
                showMessage(messageAreaAdd, 'Kategori adı boş olamaz!', 'error');
                return;
            }
            const token = localStorage.getItem('authToken');
            //if (!token) { showMessage(messageAreaAdd, 'Yetkilendirme tokenı bulunamadı.', 'error'); return; }

            try {
                const response = await fetch(`${backendUrl}/api/categories`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ category_name: categoryName })
                });
                const result = await response.json();
                if (response.ok) {
                    showMessage(messageAreaAdd, result.message || 'Kategori başarıyla eklendi!', 'success');
                    addCategoryForm.reset();
                    fetchAndDisplayCategories(); // Listeyi yenile
                } else {
                    throw new Error(result.message || `HTTP Hata: ${response.status}`);
                }
            } catch (error) {
                console.error('Kategori ekleme hatası:', error);
                showMessage(messageAreaAdd, `Hata: ${error.message || 'Kategori eklenemedi.'}`, 'error');
            }
        });
    }

    // Kategori Silme
    async function deleteCategory(categoryId, categoryName) {
        if (!confirm(`'${escapeHtml(categoryName)}' isimli kategoriyi silmek istediğinize emin misiniz? Bu kategoriye bağlı ürünlerin kategorisi boş olacaktır.`)) {
            return;
        }
        const token = localStorage.getItem('authToken');
        //if (!token) { showMessage(messageAreaList, 'Yetkilendirme tokenı bulunamadı.', 'error'); return; }

        try {
            const response = await fetch(`${backendUrl}/api/categories/${categoryId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await response.json().catch(()=>({}));
            if (response.ok) {
                showMessage(messageAreaList, result.message || 'Kategori başarıyla silindi.', 'success');
                fetchAndDisplayCategories(); // Listeyi yenile
            } else {
                throw new Error(result.message || `HTTP Hata: ${response.status}`);
            }
        } catch (error) {
            console.error('Kategori silme hatası:', error);
            showMessage(messageAreaList, `Hata: ${error.message || 'Kategori silinemedi.'}`, 'error');
        }
    }

    // Kategori Düzenleme Modalını Açma
    function openEditModal(category) {
        if (!editModal || !categoryIdEditInput || !categoryNameEditInput) return;
        categoryIdEditInput.value = category.category_id;
        categoryNameEditInput.value = category.category_name;
        editModal.style.display = 'block';
        messageAreaEdit.style.display = 'none'; // Önceki düzenleme mesajlarını temizle
    }

    // Kategori Düzenleme Modalını Kapatma
    if (cancelEditCategoryBtn) {
        cancelEditCategoryBtn.addEventListener('click', () => {
            if (editModal) editModal.style.display = 'none';
        });
    }

    // Kategori Güncelleme Formu
    if (editCategoryForm) {
        editCategoryForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const categoryId = categoryIdEditInput.value;
            const newCategoryName = categoryNameEditInput.value.trim();

            if (!newCategoryName) {
                showMessage(messageAreaEdit, 'Kategori adı boş olamaz!', 'error');
                return;
            }
            const token = localStorage.getItem('authToken');
            //if (!token) { showMessage(messageAreaEdit, 'Yetkilendirme tokenı bulunamadı.', 'error'); return; }

            try {
                const response = await fetch(`${backendUrl}/api/categories/${categoryId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ category_name: newCategoryName })
                });
                const result = await response.json();
                if (response.ok) {
                    showMessage(messageAreaEdit, result.message || 'Kategori başarıyla güncellendi!', 'success');
                    if (editModal) editModal.style.display = 'none'; // Modalı kapat
                    fetchAndDisplayCategories(); // Listeyi yenile
                } else {
                    throw new Error(result.message || `HTTP Hata: ${response.status}`);
                }
            } catch (error) {
                console.error('Kategori güncelleme hatası:', error);
                showMessage(messageAreaEdit, `Hata: ${error.message || 'Kategori güncellenemedi.'}`, 'error');
            }
        });
    }

    // Sayfa yüklendiğinde kategorileri listele
    fetchAndDisplayCategories();

    // Logout butonları için (admin-urunler.html'dekiyle aynı)
    const adminLogoutBtn = document.getElementById('admin-logout-btn');
    const adminHeaderLogoutBtn = document.getElementById('admin-header-logout-btn');
    const handleAdminLogout = () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userInfo');
        window.location.href = '../giris-kayit.html';
    };
    if(adminLogoutBtn) adminLogoutBtn.addEventListener('click', handleAdminLogout);
    if(adminHeaderLogoutBtn) adminHeaderLogoutBtn.addEventListener('click', handleAdminLogout);
});