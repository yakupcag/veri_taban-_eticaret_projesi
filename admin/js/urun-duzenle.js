// admin/js/urun-duzenle.js
document.addEventListener('DOMContentLoaded', () => {
    const backendUrl = 'http://localhost:5000';
    const editProductForm = document.getElementById('edit-product-form');
    const categorySelect = document.getElementById('product-category');
    const messageArea = document.getElementById('message-area-edit');
    const productIdField = document.getElementById('product-id-edit'); // Gizli input
    const currentImagePreview = document.getElementById('current-product-image-preview');

    // Form elemanlarını seç (değerleri doldurmak için)
    const productNameInput = document.getElementById('product-name');
    const productDescriptionInput = document.getElementById('product-description');
    const productPriceInput = document.getElementById('product-price');
    const productStockInput = document.getElementById('product-stock');
    const productStatusSelect = document.getElementById('product-status');
    // product-image-edit ID'li file input'u zaten var.

    const escapeHtml = (unsafe) => {
        if (typeof unsafe !== 'string') return unsafe;
        return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    };

    const showMessage = (message, type = 'info') => {
        if (!messageArea) return;
        messageArea.innerHTML = `<p>${escapeHtml(message)}</p>`;
        messageArea.className = `form-message ${type}`;
        messageArea.style.display = 'block';
        // setTimeout(() => { messageArea.style.display = 'none'; }, 7000); // Biraz daha uzun kalsın mesaj
    };

    // URL'den ürün ID'sini al
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    if (!productId) {
        showMessage('Düzenlenecek ürün ID\'si bulunamadı! Ürün listesine yönlendiriliyorsunuz.', 'error');
        setTimeout(() => { window.location.href = 'admin-urunler.html'; }, 3000);
        return;
    }
    if(productIdField) productIdField.value = productId; // Gizli inputa ID'yi ata

    // Kategorileri Yükle ve Seçili Olanı Ayarla
    const loadCategoriesAndSelect = async (selectedCategoryId) => {
        if (!categorySelect) return;
        try {
            const response = await fetch(`${backendUrl}/api/categories`); // Token gerektirmez
            if (!response.ok) throw new Error('Kategoriler forma yüklenemedi.');
            const categories = await response.json();

            categorySelect.innerHTML = '<option value="">-- Kategori Seçin --</option>'; // Temizle ve varsayılan ekle
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.category_id;
                option.textContent = escapeHtml(category.category_name);
                if (selectedCategoryId && parseInt(category.category_id) === parseInt(selectedCategoryId)) {
                    option.selected = true;
                }
                categorySelect.appendChild(option);
            });
        } catch (error) {
            console.error("Form için kategori yükleme hatası:", error);
            showMessage(`Kategoriler yüklenirken hata: ${error.message}`, 'error');
        }
    };

    // Ürün Bilgilerini Yükle ve Formu Doldur
    const loadProductDetails = async () => {
        const token = localStorage.getItem('authToken');
        // !!! GEÇİCİ TEST İÇİN TOKEN YOKSA UYARI VER (Normalde burada return veya login'e yönlendirme olmalı)
        /*if (!token) {
            console.warn("loadProductDetails: authToken bulunamadı. Test amacıyla devam ediliyor ama normalde engellenmeli.");
            // showMessage("Yetkilendirme tokenı bulunamadı. Lütfen giriş yapın.", "error");
            // return;
        }*/

        try {
            const response = await fetch(`${backendUrl}/api/products/${productId}`, {
                headers: { 'Authorization': `Bearer ${token}` } // Admin yetkisi gerekebilir (GET için server.js'de yoktu ama eklenebilir)
            });
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.message || `Ürün bilgileri alınamadı. HTTP ${response.status}`);
            }
            const product = await response.json();

            // Form alanlarını doldur
            if(productNameInput) productNameInput.value = product.name;
            if(productDescriptionInput) productDescriptionInput.value = product.description || '';
            if(productPriceInput) productPriceInput.value = parseFloat(product.price).toFixed(2);
            if(productStockInput) productStockInput.value = product.stock;
            if(productStatusSelect) productStatusSelect.value = product.status;

            if (currentImagePreview && product.image_url) {
                currentImagePreview.src = `${backendUrl}${product.image_url}`;
                currentImagePreview.style.display = 'block';
            } else if (currentImagePreview) {
                currentImagePreview.style.display = 'none';
            }
            
            // Kategorileri yükle ve bu ürünün kategorisini seç
            await loadCategoriesAndSelect(product.category_id);

        } catch (error) {
            console.error("Ürün detayları yüklenirken hata:", error);
            showMessage(`Hata: ${error.message || 'Ürün bilgileri yüklenemedi.'}`, 'error');
        }
    };

    // Form Gönderme (Güncelleme) İşlemi
    if (editProductForm) {
        editProductForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            showMessage('Değişiklikler kaydediliyor...', 'info');

            const formData = new FormData(editProductForm); // Form verilerini ve yeni resmi al
            const token = localStorage.getItem('authToken');

            // !!! GEÇİCİ TEST İÇİN TOKEN KONTROLÜ YORUMDA (Normalde aktif olmalı)
            /*if (!token) {
                 showMessage('Yetkilendirme hatası: Lütfen admin olarak giriş yapın.', 'error');
                 return;
            }*/

            // Boş dosya inputunu FormData'dan sil (eğer backend boş dosyayı istemiyorsa)
            const productImageFile = document.getElementById('product-image-edit').files[0];
            if (!productImageFile) {
                formData.delete('product_image'); // Eğer resim seçilmediyse, 'product_image' alanını sil
            }

            try {
                const response = await fetch(`${backendUrl}/api/products/${productId}`, { // productId URL'den alınıyor
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    body: formData
                });

                const result = await response.json().catch(() => ({})); // Yanıt JSON değilse veya boşsa

                if (response.ok) {
                    showMessage(result.message || `Ürün (ID: ${productId}) başarıyla güncellendi!`, 'success');
                    // Mevcut resmi de güncelle (eğer değiştiyse)
                    if (result.updatedProduct && result.updatedProduct.image_url && currentImagePreview) {
                         currentImagePreview.src = `${backendUrl}${result.updatedProduct.image_url}`;
                         currentImagePreview.style.display = 'block';
                    } else if (result.updatedProduct && !result.updatedProduct.image_url && currentImagePreview){
                         currentImagePreview.style.display = 'none'; // Eğer resim kaldırıldıysa
                    }
                     // Formu temizlemeye gerek yok, güncel verilerle kalabilir veya listeye yönlendirilebilir.
                    setTimeout(() => { window.location.href = 'admin-urunler.html'; }, 2000);
                } else {
                    throw new Error(result.message || `HTTP Durumu: ${response.status}`);
                }
            } catch (error) {
                console.error('Ürün güncelleme hatası:', error);
                showMessage(`Hata: ${error.message || 'Ürün güncellenirken bir sorun oluştu.'}`, 'error');
            }
        });
    }

    // Sayfa yüklendiğinde ürün detaylarını ve kategorileri yükle
    loadProductDetails();
});