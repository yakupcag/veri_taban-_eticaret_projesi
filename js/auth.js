// js/auth.js

document.addEventListener('DOMContentLoaded', () => {
    const backendUrl = 'http://localhost:5000';

    // Giriş Formu
    const loginForm = document.getElementById('login-form');
    const loginEmailInput = document.getElementById('login-email');
    const loginPasswordInput = document.getElementById('login-password');
    // Giriş formu için mesaj alanı (giris-kayit.html'de bu ID ile bir div olmalı)
    const loginMessageArea = document.getElementById('login-message-area'); 

    // Kayıt Formu (Bu zaten server.js'de /api/auth/register ile çalışıyor olmalı,
    // ama buraya da basit bir frontend JS ekleyebiliriz.)
    const registerForm = document.getElementById('register-form');
    const registerNameInput = document.getElementById('register-name');
    const registerEmailInput = document.getElementById('register-email');
    const registerPasswordInput = document.getElementById('register-password');
    const registerConfirmPasswordInput = document.getElementById('register-confirm-password');
    // Kayıt formu için mesaj alanı (giris-kayit.html'de bu ID ile bir div olmalı)
    const registerMessageArea = document.getElementById('register-message-area');

    const escapeHtml = (unsafe) => {
        if (typeof unsafe !== 'string') return unsafe;
        return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    };

    const showAuthMessage = (areaElement, message, type = 'danger') => { // Hata için varsayılan type 'danger'
    if (!areaElement) {
        alert(`${type === 'danger' ? 'Hata: ' : (type === 'success' ? 'Başarılı: ' : 'Bilgi: ')}${message}`);
        return;
    }
    // Bootstrap alert class'larını dinamik olarak ata
    areaElement.className = `alert alert-${type} mt-3`; // Eski class'ları silip yenilerini ekler
    areaElement.innerHTML = escapeHtml(message); // escapeHtml fonksiyonun zaten vardı
    areaElement.style.display = 'block';
    areaElement.setAttribute('role', 'alert');

    // Formları Bootstrap validasyon durumuna göre resetle (opsiyonel)
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    if(loginForm) loginForm.classList.remove('was-validated');
    if(registerForm) registerForm.classList.remove('was-validated');


    // Mesajın bir süre sonra kaybolması istenirse:
     if (type !== 'danger') { // Hata mesajları kalıcı olabilir
         setTimeout(() => { areaElement.style.display = 'none'; }, 5000);
    }
};

    // Giriş Formu İşlemleri
    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // Sayfa yenilenmesini her zaman engelle

        if (!loginForm.checkValidity()) { // Bootstrap validasyonunu kontrol et
            event.stopPropagation();
            loginForm.classList.add('was-validated'); // Hatalı alanları göster
            return; // Form geçerli değilse API isteği yapma
        }
        loginForm.classList.add('was-validated'); // Form gönderilmeye hazır, stilleri uygula

            if (loginMessageArea) loginMessageArea.style.display = 'none'; // Önceki mesajı gizle

            const email = loginEmailInput.value.trim();
            const password = loginPasswordInput.value.trim();

            if (!email || !password) {
                showAuthMessage(loginMessageArea, 'E-posta ve şifre alanları boş bırakılamaz.');
                return;
            }

            try {
                const response = await fetch(`${backendUrl}/api/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const result = await response.json();

                if (response.ok) { // HTTP 200-299
                    showAuthMessage(loginMessageArea, result.message || 'Giriş başarılı! Yönlendiriliyorsunuz...', 'success');
                    
                    localStorage.setItem('authToken', result.token);
                    localStorage.setItem('userInfo', JSON.stringify(result.user)); // user objesini sakla

                    // header.js'deki updateHeaderAuthLinks fonksiyonunu çağır (eğer global ise)
                    if (window.updateHeaderAuthLinks) {
                        window.updateHeaderAuthLinks();
                    } else if (typeof updateHeaderAuthLinks === 'function') { 
                        // Eğer header.js bu script'ten sonra yükleniyorsa ve fonksiyon global değilse,
                        // header.js yüklendiğinde bu fonksiyonu çağırmalı.
                        // Şimdilik en iyisi header.js'in updateHeaderAuthLinks'i window'a ataması.
                        // Veya login sonrası sayfayı komple yenilemek: window.location.reload();
                    }

                    // Role göre yönlendirme
                    if (result.user && result.user.role === 'admin') {
                        setTimeout(() => { window.location.href = 'admin/admin-urunler.html'; }, 1500); // Admin paneline yönlendir
                    } else {
                        setTimeout(() => { window.location.href = 'index.html'; }, 1500); // Anasayfaya yönlendir
                    }
                } else {
                    throw new Error(result.message || `Giriş başarısız (HTTP ${response.status})`);
                }
            } catch (error) {
                console.error('Giriş hatası:', error);
                showAuthMessage(loginMessageArea, error.message || 'Giriş sırasında bir sorun oluştu.');
            }
        });
    }

    // Kayıt Formu İşlemleri (Basit Frontend Validasyon ve API İsteği)
    if (registerForm) {
        registerForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        if (!registerForm.checkValidity()) {
            event.stopPropagation();
            registerForm.classList.add('was-validated');
            return;
        }
        registerForm.classList.add('was-validated');
            if (registerMessageArea) registerMessageArea.style.display = 'none';

            const fullName = registerNameInput.value.trim();
            const email = registerEmailInput.value.trim();
            const password = registerPasswordInput.value; // Boşluk kontrolü backend'de
            const confirmPassword = registerConfirmPasswordInput.value;

            if (!fullName || !email || !password || !confirmPassword) {
                showAuthMessage(registerMessageArea, 'Tüm alanların doldurulması zorunludur.');
                return;
            }
            if (password !== confirmPassword) {
                showAuthMessage(registerMessageArea, 'Şifreler eşleşmiyor.');
                return;
            }
            if (password.length < 6) { // Bu kontrol backend'de de var
                showAuthMessage(registerMessageArea, 'Şifre en az 6 karakter olmalıdır.');
                return;
            }
            // Basit e-posta format kontrolü (backend'de daha kapsamlısı var)
            if (!email.includes('@') || !email.includes('.')) {
                showAuthMessage(registerMessageArea, 'Lütfen geçerli bir e-posta adresi girin.');
                return;
            }

            try {
                const response = await fetch(`${backendUrl}/api/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fullName, email, password, phone: '' }) // Telefon opsiyonel, şimdilik boş
                });

                const result = await response.json();

                if (response.status === 201) { // Başarılı kayıt (Created)
                    showAuthMessage(registerMessageArea, result.message || 'Kayıt başarılı! Lütfen giriş yapın.', 'success');
                    registerForm.reset();
                    // Kullanıcıyı giriş formuna odaklayabilir veya login'e yönlendirebiliriz.
                    if(loginEmailInput) loginEmailInput.focus();
                } else {
                    throw new Error(result.message || `Kayıt başarısız (HTTP ${response.status})`);
                }
            } catch (error) {
                console.error('Kayıt hatası:', error);
                showAuthMessage(registerMessageArea, error.message || 'Kayıt sırasında bir sorun oluştu.');
            }
        });
    }
});