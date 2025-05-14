// admin/js/admin-dashboard.js
document.addEventListener('DOMContentLoaded', () => {
    const backendUrl = 'http://localhost:5000';
    const authToken = localStorage.getItem('authToken');

    const statsContainer = document.getElementById('dashboard-stats-container');
    const loadingMessage = document.getElementById('dashboard-loading-message');
    const messageArea = document.getElementById('dashboard-message-area');

    const escapeHtml = (unsafe) => { // Basit HTML escape
        if (typeof unsafe !== 'string') return unsafe;
        return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    };
    
    const showDashboardMessage = (msg, type = 'error') => {
        if(loadingMessage) loadingMessage.style.display = 'none';
        if(statsContainer) statsContainer.style.display = 'none'; // İstatistikleri gizle
        if (!messageArea) { console.warn("Dashboard mesaj alanı bulunamadı."); return; }
        messageArea.innerHTML = `<p class="form-message ${type}">${escapeHtml(msg)}</p>`;
        messageArea.style.display = 'block';
    };

    function createStatCard(title, value, iconClass, iconTypeClass) {
        const card = document.createElement('div');
        card.classList.add('stat-card');
        card.innerHTML = `
            <div class="icon ${iconTypeClass}"><i class="fas ${iconClass}"></i></div>
            <div class="info">
                <h4>${escapeHtml(title)}</h4>
                <p>${escapeHtml(String(value))}</p>
            </div>
        `;
        return card;
    }

    async function loadDashboardStats() {
        if (!statsContainer || !loadingMessage) {
            console.warn("Dashboard için gerekli HTML elementleri bulunamadı.");
            return;
        }

        if (!authToken) {
            showDashboardMessage("Yetkilendirme tokenı bulunamadı. Lütfen tekrar giriş yapın.", "error");
            return;
        }

        try {
            const response = await fetch(`${backendUrl}/api/admin/dashboard-stats`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            const stats = await response.json();

            if (response.ok) {
                statsContainer.innerHTML = ''; // Önceki kartları temizle (varsa)

                statsContainer.appendChild(createStatCard('Toplam Ürün', stats.totalProducts, 'fa-boxes', 'products'));
                statsContainer.appendChild(createStatCard('Toplam Kategori', stats.totalCategories, 'fa-tags', 'categories'));
                statsContainer.appendChild(createStatCard('Toplam Müşteri', stats.totalCustomers, 'fa-users', 'customers'));
                statsContainer.appendChild(createStatCard('Toplam Sipariş', stats.totalOrders, 'fa-shopping-cart', 'orders'));
                statsContainer.appendChild(createStatCard('Bekleyen Sipariş', stats.pendingOrders, 'fa-hourglass-half', 'pending-orders'));
                statsContainer.appendChild(createStatCard('Toplam Gelir (Teslim Edilen)', `${stats.totalRevenue} TL`, 'fa-lira-sign', 'revenue'));
                statsContainer.appendChild(createStatCard('Son 7 Gün Sipariş', stats.recentOrders, 'fa-calendar-alt', 'orders'));

                if(loadingMessage) loadingMessage.style.display = 'none';
                statsContainer.style.display = 'grid'; // Kartları göster (grid olarak ayarlıydı)
                if(messageArea) messageArea.style.display = 'none';

            } else {
                throw new Error(stats.message || 'İstatistikler yüklenemedi.');
            }
        } catch (error) {
            console.error("Dashboard istatistikleri yükleme hatası:", error);
            showDashboardMessage(`İstatistikler yüklenirken hata: ${error.message}`, "error");
        }
    }

    // Sayfa yüklendiğinde istatistikleri çek
    loadDashboardStats();

    // Logout butonları için (diğer admin sayfalarındakiyle aynı mantık)
    // Bu kod auth-guard.js veya header.js içinde zaten olabilir, çakışmaması için kontrol et.
    // Eğer header.js tüm sayfalarda global logout'u yönetiyorsa, buraya tekrar eklemeye gerek yok.
    // Ama auth-guard.js sadece o sayfa içinse ve header.js admin'de farklı çalışıyorsa eklenebilir.
    // Şimdilik, header.js veya auth-guard.js'in bu işi yaptığını varsayıyorum.
});