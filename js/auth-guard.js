// js/auth-guard.js

(function() { // IIFE (Immediately Invoked Function Expression - Anında Çağrılan Fonksiyon İfadesi)
              // Bu, global değişken kirliliğini önlemek için kullanılır. Kod tanımlandığı anda hemen çalışır.

    const userInfoString = localStorage.getItem('userInfo'); // Local Storage'dan 'userInfo' verisini al
    const authToken = localStorage.getItem('authToken');     // Local Storage'dan 'authToken' verisini al
    let user = null; // Kullanıcı bilgilerini tutacak değişken, başlangıçta null

    if (userInfoString) { // Eğer 'userInfo' Local Storage'da varsa
        try {
            user = JSON.parse(userInfoString); // JSON string'ini JavaScript objesine çevir
        } catch (e) {
            console.error("Local Storage'dan userInfo parse edilirken hata:", e); // Parse hatası olursa konsola yazdır
            // Muhtemelen bozuk veri, giriş yapılmamış gibi davranalım
            localStorage.removeItem('userInfo');  // Bozuk 'userInfo'yu sil
            localStorage.removeItem('authToken'); // İlişkili 'authToken'u da sil
        }
    }

    // Geçerli sayfanın bir admin sayfası olup olmadığını kontrol et
    // Bu kontrol, admin sayfalarının 'admin' adında bir alt dizinde olduğunu varsayar
    // veya yolunda belirgin bir admin göstergesi olduğunu.
    // Eğer admin sayfaların 'giris-kayit.html'e göre farklı bir konumdaysa bu yolu ayarla.
    const isAdminPage = window.location.pathname.includes('/admin/'); 

    if (isAdminPage) { // Eğer şu anki sayfa bir admin sayfasıysa
        if (!authToken || !user || user.role !== 'admin') {
            // Kullanıcı admin değilse VEYA giriş yapmamışsa (token yoksa veya user bilgisi yoksa),
            // giriş sayfasına yönlendir.

            // admin sayfasından 'giris-kayit.html'e doğru yolu hesapla
            // Eğer 'giris-kayit.html' ana dizindeyse ve admin sayfaları '/admin/' içindeyse,
            // yol '../giris-kayit.html' olur.
            alert("Bu sayfaya erişim yetkiniz yok. Lütfen admin olarak giriş yapın."); // Kullanıcıya uyarı göster
            window.location.href = '../giris-kayit.html'; // Giriş sayfasına yönlendir (gerekirse yolu ayarla)
        } else {
            // Kullanıcı admin ve giriş yapmış, sayfada kalabilir.
            // İsteğe bağlı: Eğer admin kullanıcı adını gösterecek bir eleman varsa, oraya yazdır
            const adminUsernameDisplay = document.getElementById('admin-username-display'); // HTML'de bu ID'li elemanı bul
            if (adminUsernameDisplay && user.fullName) { // Eleman varsa ve kullanıcının tam adı varsa
                adminUsernameDisplay.textContent = user.fullName; // Tam adını yaz
            } else if (adminUsernameDisplay && user.email) { // Ya da e-postası varsa
                adminUsernameDisplay.textContent = user.email; // E-postasını yaz
            }
        }
         // Admin panelindeki çıkış butonlarına olay dinleyicisi ekle
        const adminSidebarLogoutBtn = document.getElementById('admin-logout-btn');
        const adminHeaderLogoutBtn = document.getElementById('admin-header-logout-btn');

        if (typeof window.handleLogout === 'function') { // handleLogout global ise
            if (adminSidebarLogoutBtn) {
                adminSidebarLogoutBtn.addEventListener('click', (event) => {
                    event.preventDefault();
                    window.handleLogout();
                });
            }
            if (adminHeaderLogoutBtn) {
                adminHeaderLogoutBtn.addEventListener('click', (event) => {
                    event.preventDefault();
                    window.handleLogout();
                });
            }
        }
    }
})();