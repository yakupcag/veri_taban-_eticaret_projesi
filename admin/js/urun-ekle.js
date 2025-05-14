// admin/js/urun-ekle.js
document.addEventListener('DOMContentLoaded', () => {
    const backendUrl = 'http://localhost:5000';
    const productForm = document.getElementById('add-product-form');
    const categorySelect = document.getElementById('product-category');
    const messageArea = document.getElementById('message-area');

    const escapeHtml = (unsafe) => {
        if (typeof unsafe !== 'string') return unsafe;
        return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    };

    // Kategorileri Yükle
    const loadCategoriesForForm = async () => {
        if (!categorySelect) return;
        try {
            const response = await fetch(`${backendUrl}/api/categories`);
            if (!response.ok) throw new Error('Kategoriler forma yüklenemedi.');
            const categories = await response.json();

            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.category_id;
                option.textContent = escapeHtml(category.category_name);
                categorySelect.appendChild(option);
            });
        } catch (error) {
            console.error("Form için kategori yükleme hatası:", error);
            if (categorySelect) categorySelect.innerHTML = `<option value="">Kategoriler Yüklenemedi</option>`;
            showMessage(`Kategoriler yüklenirken hata oluştu: ${error.message}`, 'error');
        }
    };

    // Kullanıcıya mesaj gösterme fonksiyonu
    const showMessage = (message, type = 'info') => { // type: 'info', 'success', 'error'
        if (!messageArea) return;
        messageArea.innerHTML = `<p class="form-message ${type}">${escapeHtml(message)}</p>`;
        // CSS'de .form-message.success, .form-message.error için stil tanımlayabilirsin
        // Örnek: admin-style.css içine
        // .form-message.success { color: green; border: 1px solid green; padding: 10px; }
        // .form-message.error { color: red; border: 1px solid red; padding: 10px; }
    };

    // Form Gönderme İşlemi
    if (productForm) {
        productForm.addEventListener('submit', async (event) => {
            event.preventDefault(); // Formun normal submit olmasını engelle
            showMessage('Ürün kaydediliyor, lütfen bekleyin...', 'info');

            const formData = new FormData(productForm); // Form verilerini ve dosyayı al
            const token = localStorage.getItem('authToken'); // Admin giriş yapmış olmalı

            /*if (!token) {
                showMessage('Yetkilendirme hatası: Lütfen admin olarak giriş yapın.', 'error');
                // Belki giriş sayfasına yönlendirilebilir: setTimeout(() => { window.location.href = 'admin-login.html'; }, 2000);
                return;
            }*/

            try {
                const response = await fetch(`${backendUrl}/api/products`, {
                    method: 'POST',
                    /*headers: {
                        'Authorization': `Bearer ${token}`
                        // 'Content-Type': 'multipart/form-data' FormData ile otomatik ayarlanır, elle ekleme
                    },*/
                    body: formData
                });

                const result = await response.json();

                if (response.ok) {
                    showMessage(`Ürün başarıyla eklendi! Ürün ID: ${result.productId}`, 'success');
                    productForm.reset(); // Formu temizle
                    // İsteğe bağlı: Ürün listeleme sayfasına yönlendirme
                    // setTimeout(() => { window.location.href = 'admin-urunler.html'; }, 2000);
                } else {
                    throw new Error(result.message || `HTTP Durumu: ${response.status}`);
                }
            } catch (error) {
                console.error('Ürün ekleme hatası:', error);
                showMessage(`Hata: ${error.message || 'Ürün eklenirken bir sorun oluştu.'}`, 'error');
            }
        });
    }

    // Sayfa yüklendiğinde kategorileri yükle
    loadCategoriesForForm();
});