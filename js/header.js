// js/header.js - Tüm sayfalarda ortak header işlevleri

// Bu fonksiyonlar global scope'a atanacak ki diğer script'lerden (örn: auth.js) de çağrılabilsin.
// Ve admin sayfalarındaki çıkış butonları da bunları kullanabilsin.
let globalUpdateHeaderAuthLinks = () => {};
let globalHandleLogout = () => {};

document.addEventListener('DOMContentLoaded', () => {
    console.log("header.js: DOMContentLoaded Tetiklendi.");

    const backendUrl = 'http://localhost:5000';

    // Ana site için elementler
    const categoryDropdownElement = document.getElementById('header-category-dropdown');
    const authLinksLi = document.getElementById('auth-links'); // Ana site header'ındaki giriş/çıkış/kullanıcı adı için

    // Admin paneli için elementler (eğer o anki sayfada varsa)
    const adminUsernameDisplay = document.getElementById('admin-username-display');
    const adminSidebarLogoutBtn = document.getElementById('admin-logout-btn');
    const adminHeaderLogoutBtn = document.getElementById('admin-header-logout-btn');


    const searchForm = document.getElementById('header-search-form');
    const searchInput = document.getElementById('header-search-input');

    if (searchForm && searchInput) {
        searchForm.addEventListener('submit', function(event) {
            event.preventDefault(); // Formun normal submit olmasını engelle
            const searchTerm = searchInput.value.trim();

            if (searchTerm) {
                // Kullanıcıyı urunler.html sayfasına arama terimi ile yönlendir
                window.location.href = `urunler.html?search_term=${encodeURIComponent(searchTerm)}`;
            } else {
                // Arama terimi boşsa, sadece urunler.html'e git (veya hiçbir şey yapma)
                window.location.href = 'urunler.html';
                // Veya kullanıcıya bir uyarı verebilirsin:
                // alert("Lütfen aramak istediğiniz bir terim girin.");
            }
        });
    }
    // Aktif menü linkini işaretleme (Opsiyonel ama güzel bir UX detayı)
    const currentPage = window.location.pathname.split("/").pop(); // Örneğin "index.html", "urunler.html"
    if (currentPage) {
        const navLinks = document.querySelectorAll('#navbarNavDropdown .nav-link');
        navLinks.forEach(link => {
            if (link.getAttribute('href') === currentPage) {
                link.classList.add('active');
                link.setAttribute('aria-current', 'page');
            } else {
                link.classList.remove('active');
                link.removeAttribute('aria-current');
            }
        });
        // Eğer urunler.html'de kategoriye göre filtrelenmişse, "Ürünler" linkini aktif yap
        if (window.location.pathname.includes('urunler.html') && window.location.search.includes('category=')) {
            const urunlerLink = document.getElementById('nav-urunler');
            if (urunlerLink) {
                urunlerLink.classList.add('active');
                urunlerLink.setAttribute('aria-current', 'page');
            }
        }
         // Eğer anasayfadaysak ve path boşsa (örn: site.com/)
        if (currentPage === '' && window.location.pathname.endsWith('/')) {
             const anasayfaLink = document.getElementById('nav-anasayfa');
             if (anasayfaLink) {
                anasayfaLink.classList.add('active');
                anasayfaLink.setAttribute('aria-current', 'page');
             }
        }
    }

    // --- Yardımcı Fonksiyonlar ---
    const escapeHtml = (unsafe) => {
        if (typeof unsafe !== 'string') return unsafe;
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    };

    // --- Çıkış Yapma Fonksiyonu ---
    const handleLogout = () => {
        console.log("Çıkış yapılıyor...");
        localStorage.removeItem('authToken');
        localStorage.removeItem('userInfo');
        
        // Header'ı hemen güncelle
        updateHeaderAuthLinks(); 
        
        // Admin panelindeki kullanıcı adını da temizle (eğer varsa)
        if (adminUsernameDisplay) {
            adminUsernameDisplay.textContent = 'Yönetici'; // Varsayılan değere döndür
        }

        // Bulunulan sayfaya göre yönlendirme
        if (window.location.pathname.includes('/admin/')) {
            window.location.href = '../giris-kayit.html'; // Admin sayfasından çıkış yapılıyorsa, bir üst dizindeki giriş sayfasına
        } else {
            window.location.href = 'giris-kayit.html'; // Ana siteden çıkış yapılıyorsa, aynı dizindeki giriş sayfasına (veya index.html)
        }
    };
    globalHandleLogout = handleLogout; // Global scope'a ata

    // --- Header'daki Yetkilendirme Linklerini ve Admin Kullanıcı Adını Güncelleme ---
    const updateHeaderAuthLinks = () => {
        console.log("header.js: updateHeaderAuthLinks çağrıldı.");
        const token = localStorage.getItem('authToken');
        const userInfoString = localStorage.getItem('userInfo');
        let userInfo = null;

        if (userInfoString) {
            try {
                userInfo = JSON.parse(userInfoString);
            } catch (e) {
                console.error("updateHeaderAuthLinks: userInfo parse edilemedi:", e);
                localStorage.removeItem('userInfo');
                localStorage.removeItem('authToken');
            }
        }

        // 1. Ana Sitedeki Header Linklerini Güncelle (auth-links)
        if (authLinksLi) {
            if (token && userInfo) { // Kullanıcı giriş yapmış
                authLinksLi.innerHTML = ''; // İçini boşalt

                const displayName = escapeHtml(userInfo.fullName || userInfo.email || (userInfo.role === 'admin' ? 'Admin Paneli' : 'Hesabım'));
                
                const accountLink = document.createElement('a');
                accountLink.href = (userInfo.role === 'admin') ? 'admin/admin-urunler.html' : 'hesabim.html';
                accountLink.textContent = displayName;
                authLinksLi.appendChild(accountLink);

                authLinksLi.appendChild(document.createTextNode(' / '));

                const logoutLink = document.createElement('a');
                logoutLink.href = '#';
                logoutLink.textContent = 'Çıkış Yap';
                logoutLink.style.cursor = 'pointer';
                logoutLink.addEventListener('click', (event) => {
                    event.preventDefault();
                    handleLogout();
                });
                authLinksLi.appendChild(logoutLink);

            } else { // Kullanıcı giriş yapmamış
                authLinksLi.innerHTML = '<a href="giris-kayit.html">Giriş Yap / Üye Ol</a>';
            }
        } else {
            console.warn("updateHeaderAuthLinks: 'auth-links' ID'li LI elementi bu sayfada bulunamadı (Ana site için).");
        }

        // 2. Admin Panelindeki Kullanıcı Adını Güncelle (admin-username-display)
        // Bu kısım auth-guard.js tarafından da yapılıyordu. Çakışmayı önlemek veya tek bir yerden yönetmek için
        // auth-guard.js'deki bu kısmı kaldırıp sadece header.js'in yapmasını sağlayabiliriz.
        // Ya da auth-guard.js ilk yüklemede yapar, bu fonksiyon da sonraki güncellemelerde.
        // Şimdilik burada da kalsın, auth-guard.js'den önce veya sonra çalışmasına göre birisi baskın çıkar.
        if (adminUsernameDisplay) {
            if (token && userInfo && userInfo.role === 'admin') {
                adminUsernameDisplay.textContent = escapeHtml(userInfo.fullName || userInfo.email || 'Admin');
            } else {
                // Eğer admin değilse veya giriş yapılmamışsa, bu alan normalde auth-guard tarafından
                // sayfaya erişim engellendiği için görünmemeli. Ama bir fallback olarak.
                adminUsernameDisplay.textContent = 'Yönetici'; 
            }
        }
    };
    globalUpdateHeaderAuthLinks = updateHeaderAuthLinks; // Global scope'a ata


    // --- Kategorileri Yükleme Fonksiyonu (Ana Sitedeki Dropdown İçin) ---
    const loadCategories = async () => {
        if (!categoryDropdownElement) {
            // Bu sayfada kategori dropdown'ı yoksa (örn: admin sayfaları) sessizce çık.
            // console.warn("header.js loadCategories: 'header-category-dropdown' ID'li eleman bu sayfada bulunamadı.");
            return;
        }
        
        // Eğer dropdown zaten doluysa (başka bir script tarafından veya cache'den), tekrar yükleme.
        // Bu kontrolü daha sağlam yapmak gerekebilir. Şimdilik basit bir innerHTML kontrolü.
        if (categoryDropdownElement.children.length > 0 && !categoryDropdownElement.textContent.includes('Yükleniyor...')) {
            // console.log("Kategoriler zaten yüklenmiş gibi duruyor.");
            // return; 
        }

        categoryDropdownElement.innerHTML = '<li><a class="dropdown-item" href="#">Yükleniyor...</a></li>'; // Bootstrap stili için class

        try {
            const response = await fetch(`${backendUrl}/api/categories`);
            if (!response.ok) {
                throw new Error(`Kategoriler alınamadı. HTTP ${response.status}`);
            }
            const categories = await response.json();
            categoryDropdownElement.innerHTML = ''; // Listeyi temizle

            if (categories.length === 0) {
                categoryDropdownElement.innerHTML = '<li><a class="dropdown-item" href="#">Kategori Yok</a></li>';
                return;
            }

            categories.forEach(category => {
    const li = document.createElement('li'); // li hala gerekli çünkü Bootstrap dropdown-menu ul > li > a bekler
    const link = document.createElement('a');
    link.classList.add('dropdown-item'); // BOOTSTRAP CLASS'I EKLENDİ
    link.href = `urunler.html?category=${category.category_id}`;
    link.textContent = escapeHtml(category.category_name);
    li.appendChild(link);
    categoryDropdownElement.appendChild(li); // categoryDropdownElement bir <ul> olmalı
});

        } catch (error) {
            console.error("Header kategori yükleme hatası:", error);
            if (categoryDropdownElement) { // Hata durumunda da eleman varsa mesajı göster
                categoryDropdownElement.innerHTML = `<li><a class="dropdown-item" href="#">Kategoriler Yüklenemedi!</a></li>`;
            }
        }
    };

    // --- Admin Paneli Çıkış Butonlarına Olay Dinleyicisi Ekleme ---
    if (adminSidebarLogoutBtn) {
        adminSidebarLogoutBtn.addEventListener('click', (event) => {
            event.preventDefault();
            handleLogout();
        });
    }
    if (adminHeaderLogoutBtn) {
        adminHeaderLogoutBtn.addEventListener('click', (event) => {
            event.preventDefault();
            handleLogout();
        });
    }

    // --- Sayfa Yüklendiğinde Çalışacak İlk İşlemler ---
    loadCategories();          // Ana sitedeki kategori dropdown'ını yükle (eğer varsa)
    updateHeaderAuthLinks();   // Giriş/çıkış linklerini ve admin kullanıcı adını güncelle (eğer ilgili elementler varsa)

}); // DOMContentLoaded Sonu

// Diğer scriptlerin (örn: auth.js) bu fonksiyonlara erişebilmesi için
// DOMContentLoaded dışında da window objesine atama yapabiliriz.
// Ancak, fonksiyonlar DOM elementlerine erişiyorsa, DOM yüklendikten sonra çağrılmaları daha güvenlidir.
// Zaten updateHeaderAuthLinks ve handleLogout globalUpdateHeaderAuthLinks ve globalHandleLogout aracılığıyla
// DOMContentLoaded içinde tanımlanıp sonra global scope'a atanıyor.
// auth.js'nin bu script'ten sonra yüklenmesi veya bu fonksiyonların varlığını kontrol etmesi iyi olur.

// Alternatif olarak, bu fonksiyonları doğrudan window objesine atayabiliriz:
// window.updateHeaderAuthLinks = function() { ... }
// window.handleLogout = function() { ... }
// Ama bu durumda, fonksiyonların içindeki DOM element seçicilerinin (örn: authLinksLi)
// fonksiyon her çağrıldığında yeniden seçilmesi veya DOM yüklendikten sonra cache'lenmesi gerekebilir.
// Mevcut yapı (DOMContentLoaded içinde tanımlayıp global değişkene atama ve sonra çağırma) daha güvenli.