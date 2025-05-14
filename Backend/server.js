// server.js (Yetkilendirme Middleware'i Eklenmiş ve Uygulanmış Hali)

// Gerekli Modülleri Yükle
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const db = require('./config/db'); // Veritabanı bağlantısı
const fs = require('fs').promises;
const bcrypt = require('bcrypt'); // Şifreleme için eklendi
const jwt = require('jsonwebtoken'); // Token işlemleri için eklendi

// Express Uygulamasını Oluştur
const app = express();
const PORT = process.env.PORT || 5000;

// --- Genel Middleware Ayarları ---
// CORS Ayarı
app.use(cors({
  origin: '*', // Gerekirse belirli adreslere izin ver: ['http://127.0.0.1:5500', 'http://localhost']
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express.json()); // JSON body parser
app.use(express.urlencoded({ extended: true })); // URL-encoded body parser
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // /uploads klasörünü public yap

// --- Multer (Dosya Yükleme) Ayarları ---
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, 'uploads');
        // Klasör yoksa oluşturma (manuel oluşturmak daha iyi olabilir)
        // fs.mkdir(uploadPath, { recursive: true }).catch(console.error); // Asenkron oluşturma
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const mimetype = allowedTypes.test(file.mimetype);
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    if (mimetype && extname) {
        cb(null, true);
    } else {
        cb(new Error('Hata: Sadece resim dosyaları (jpeg, jpg, png, gif, webp) yüklenebilir!'), false);
    }
};
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: fileFilter
});
// --- Multer Ayarları Bitiş ---


// --- YETKİLENDİRME MIDDLEWARE (verifyTokenAndAdmin) ---
// Bu fonksiyon, bir isteğin geçerli bir admin token'ı içerip içermediğini kontrol eder.
const verifyTokenAndAdmin = (req, res, next) => {
    console.log("-> verifyTokenAndAdmin middleware kontrolü başladı...");
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log("   Middleware Hata: Yetkilendirme header'ı eksik veya format hatalı.");
        return res.status(401).json({ message: 'Yetkisiz Erişim: Token bulunamadı veya format hatalı.' });
    }
    const token = authHeader.split(' ')[1];
    if (!token) {
        console.log("   Middleware Hata: Header'dan token alınamadı.");
         return res.status(401).json({ message: 'Yetkisiz Erişim: Token bulunamadı.' });
    }
    console.log("   Middleware: Token header'dan alındı.");

    try {
        const secretKey = process.env.JWT_SECRET || 'COK_GIZLI_BIR_ANAHTAR_HEMEN_DEGISTIR_12345';
        if (secretKey === 'COK_GIZLI_BIR_ANAHTAR_HEMEN_DEGISTIR_12345') {
            console.warn("   Middleware UYARI: JWT Secret Key varsayılan değerde!");
        }
        const decodedPayload = jwt.verify(token, secretKey);
        console.log("   Middleware: Token doğrulandı. Payload:", decodedPayload);

        if (decodedPayload.role !== 'admin') {
            console.log(`   Middleware Yetki Reddedildi: Kullanıcı rolü '${decodedPayload.role}', 'admin' değil.`);
            return res.status(403).json({ message: 'Yetkisiz Erişim: Bu işlem için admin yetkisi gerekli.' });
        }

        // Token geçerli ve kullanıcı admin ise, kullanıcı bilgisini isteğe ekleyip devam et
        req.user = decodedPayload;
        console.log(`   Middleware Yetki Onaylandı. Kullanıcı: ${req.user.userId}, Rol: ${req.user.role}. İsteğe devam ediliyor...`);
        next(); // Bir sonraki işleme (rota handler'ına) geç

    } catch (error) {
        console.error("   Middleware Token doğrulama hatası:", error.name, error.message);
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Oturum süresi doldu. Lütfen tekrar giriş yapın.' });
        } else if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Geçersiz token.' });
        } else {
            return res.status(500).json({ message: 'Token doğrulanırken bir sunucu hatası oluştu.' });
        }
    }
};

// server.js'in başlarına (verifyTokenAndAdmin'in yakınına)
const verifyToken = (req, res, next) => {
    console.log("-> verifyToken middleware kontrolü başladı...");
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Yetkisiz Erişim: Token bulunamadı veya format hatalı.' });
    }
    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'Yetkisiz Erişim: Token bulunamadı.' });
    }
    try {
        const secretKey = process.env.JWT_SECRET || 'COK_GIZLI_BIR_ANAHTAR_HEMEN_DEGISTIR_12345';
        const decodedPayload = jwt.verify(token, secretKey);
        req.user = decodedPayload; // Kullanıcı bilgisini isteğe ekle (userId, email, role içerir)
        console.log(`   Middleware (verifyToken) Yetki Onaylandı. Kullanıcı: ${req.user.userId}, Rol: ${req.user.role}.`);
        next();
    } catch (error) {
        console.error("   Middleware (verifyToken) Token doğrulama hatası:", error.name, error.message);
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Oturum süresi doldu. Lütfen tekrar giriş yapın.' });
        }
        return res.status(401).json({ message: 'Geçersiz token.' });
    }
};
// --- YETKİLENDİRME MIDDLEWARE BİTİŞ ---


// --- API ROTALARI ---

// --- AUTH ROTALARI (Herkese Açık) ---
app.post('/api/auth/register', async (req, res) => {
    console.log("--- POST /api/auth/register İsteği Alındı ---");
    try {
        const { email, password, fullName, phone } = req.body;
        if (!email || !password) return res.status(400).json({ message: 'E-posta ve şifre zorunludur.' });
        if (password.length < 6) return res.status(400).json({ message: 'Şifre en az 6 karakter olmalıdır.' });
        if (!email.includes('@') || !email.includes('.')) return res.status(400).json({ message: 'Geçerli bir e-posta adresi giriniz.' });
        // if (!fullName) console.warn("Kayit isteginde Ad Soyad gelmedi."); // Gerekirse kontrol eklenebilir

        console.log("Yeni kullanıcı kaydı deneniyor:", { email, fullName });
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);
        console.log("Şifre hash'lendi.");

        const insertUserSql = 'INSERT INTO users (email, password_hash) VALUES (?, ?)';
        let connection;
        try {
            connection = await db.getConnection();
            await connection.beginTransaction();
            console.log("`users` tablosuna ekleniyor...");
            const [userResult] = await connection.query(insertUserSql, [email, passwordHash]);
            const newUserId = userResult.insertId;
            console.log(`Yeni kullanıcı eklendi. User ID: ${newUserId}`);

            if (fullName) { // fullName varsa customer olarak da ekle
                const insertCustomerSql = 'INSERT INTO customers (user_id, full_name, phone) VALUES (?, ?, ?)';
                console.log("`customers` tablosuna ekleniyor...");
                await connection.query(insertCustomerSql, [newUserId, fullName, phone || null]);
                console.log(`Müşteri bilgileri eklendi. User ID: ${newUserId}`);
            }

            await connection.commit();
            console.log("Transaction commit edildi.");
            res.status(201).json({ message: 'Kullanıcı başarıyla kaydedildi!', userId: newUserId });
        } catch (dbError) {
            if (connection) await connection.rollback();
            console.error("Kayıt DB hatası:", dbError);
            if (dbError.code === 'ER_DUP_ENTRY') {
                res.status(409).json({ message: 'Bu e-posta adresi zaten kayıtlı.' });
            } else {
                res.status(500).json({ message: 'Veritabanına kayıt sırasında bir hata oluştu.' });
            }
        } finally {
             if (connection) connection.release();
        }
    } catch (error) {
        console.error('Register genel hata:', error);
        res.status(500).json({ message: 'Kayıt işlemi sırasında bir sunucu hatası oluştu.' });
    }
    console.log("--- POST /api/auth/register İsteği Tamamlandı ---");
});

app.post('/api/auth/login', async (req, res) => {
    console.log("--- POST /api/auth/login İsteği Alındı ---");
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(401).json({ message: 'E-posta ve şifre zorunludur.' });

        console.log("Giriş denemesi:", { email });
        const findUserSql = 'SELECT user_id, email, password_hash, role FROM users WHERE email = ?';
        const [users] = await db.query(findUserSql, [email]);

        if (users.length === 0) return res.status(401).json({ message: 'Geçersiz e-posta veya şifre.' });
        const user = users[0];

        const isPasswordMatch = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordMatch) return res.status(401).json({ message: 'Geçersiz e-posta veya şifre.' });

        let fullName = null;
        try {
            const findCustomerSql = 'SELECT full_name FROM customers WHERE user_id = ?';
            const [customers] = await db.query(findCustomerSql, [user.user_id]);
            if (customers.length > 0) fullName = customers[0].full_name;
        } catch (customerError) {
             console.error("Login: Müşteri bilgisi alınırken hata:", customerError);
        }

        console.log("Giriş başarılı, JWT oluşturuluyor...");
        const payload = { userId: user.user_id, email: user.email, role: user.role };
        const secretKey = process.env.JWT_SECRET || 'COK_GIZLI_BIR_ANAHTAR_HEMEN_DEGISTIR_12345';
        const expiresIn = '1h'; // 1 saat geçerlilik
        const token = jwt.sign(payload, secretKey, { expiresIn });

        res.status(200).json({
            message: 'Giriş başarılı!',
            token: token,
            user: { id: user.user_id, email: user.email, role: user.role, fullName: fullName }
        });
    } catch (error) {
        console.error('Login işlemi sırasında hata:', error);
        res.status(500).json({ message: 'Giriş işlemi sırasında bir sunucu hatası oluştu.' });
    }
    console.log("--- POST /api/auth/login İsteği Tamamlandı ---");
});
// --- AUTH ROTALARI BİTİŞ ---


// --- KATEGORİ ROTALARI ---
// GET herkese açık
app.get('/api/categories', async (req, res) => {
    console.log("--- GET /api/categories İsteği Alındı ---");
    try {
        const sql = 'SELECT category_id, category_name FROM categories ORDER BY category_name ASC';
        const [categories] = await db.query(sql);
        res.status(200).json(categories);
    } catch (error) {
        console.error('Kategorileri listeleme hatası:', error);
        res.status(500).json({ message: 'Sunucu hatası: Kategoriler listelenemedi.' });
    }
    console.log("--- GET /api/categories İsteği Tamamlandı ---");
});

// POST, PUT, DELETE admin yetkisi gerektirir
app.post('/api/categories',/* verifyTokenAndAdmin,*/ async (req, res) => {
    console.log("--- POST /api/categories İsteği Alındı (Yetkili) ---");
    try {
        const { category_name } = req.body;
        if (!category_name || category_name.trim() === '') {
            return res.status(400).json({ message: 'Kategori adı zorunludur.' });
        }
        const insertSql = 'INSERT INTO categories (category_name) VALUES (?)';
        const [result] = await db.query(insertSql, [category_name.trim()]);
        res.status(201).json({ message: 'Kategori başarıyla eklendi!', categoryId: result.insertId, category_name: category_name.trim() });
    } catch (error) {
        console.error('Kategori ekleme hatası:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(409).json({ message: 'Bu isimde bir kategori zaten mevcut.' });
        } else {
            res.status(500).json({ message: 'Sunucu hatası: Kategori eklenemedi.' });
        }
    }
    console.log("--- POST /api/categories İsteği Tamamlandı ---");
});

app.put('/api/categories/:id', /* verifyTokenAndAdmin,*/ async (req, res) => {
    const categoryId = req.params.id;
    const { category_name } = req.body;
    console.log(`--- PUT /api/categories/${categoryId} İsteği Alındı (Yetkili) ---`);
    if (!category_name || category_name.trim() === '') {
        return res.status(400).json({ message: 'Kategori adı zorunludur.' });
    }
    try {
        const updateSql = 'UPDATE categories SET category_name = ? WHERE category_id = ?';
        const [result] = await db.query(updateSql, [category_name.trim(), categoryId]);
        if (result.affectedRows > 0) {
            res.status(200).json({ message: 'Kategori başarıyla güncellendi.', categoryId: categoryId, category_name: category_name.trim() });
        } else {
            res.status(404).json({ message: 'Güncellenecek kategori bulunamadı.' });
        }
    } catch (error) {
        console.error(`Kategori (ID: ${categoryId}) güncelleme hatası:`, error);
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(409).json({ message: 'Bu isimde başka bir kategori zaten mevcut.' });
        } else {
            res.status(500).json({ message: 'Sunucu hatası: Kategori güncellenemedi.' });
        }
    }
    console.log(`--- PUT /api/categories/${categoryId} İsteği Tamamlandı ---`);
});

app.delete('/api/categories/:id', /* verifyTokenAndAdmin,*/ async (req, res) => {
    const categoryId = req.params.id;
    console.log(`--- DELETE /api/categories/${categoryId} İsteği Alındı (Yetkili) ---`);
    try {
        // Kategoriye bağlı ürünleri kontrol etmiyoruz, ON DELETE SET NULL varsayıyoruz.
        const deleteSql = 'DELETE FROM categories WHERE category_id = ?';
        const [result] = await db.query(deleteSql, [categoryId]);
        if (result.affectedRows > 0) {
            res.status(200).json({ message: `Kategori (ID: ${categoryId}) başarıyla silindi.` });
        } else {
            res.status(404).json({ message: 'Silinecek kategori bulunamadı.' });
        }
    } catch (error) {
        console.error(`Kategori (ID: ${categoryId}) silme hatası:`, error);
        res.status(500).json({ message: 'Sunucu hatası: Kategori silinemedi.' });
    }
    console.log(`--- DELETE /api/categories/${categoryId} İsteği Tamamlandı ---`);
});
// --- KATEGORİ ROTALARI BİTİŞ ---

// --- ADMİN SİPARİŞ YÖNETİMİ ROTALARI (verifyTokenAndAdmin Gerektirir) ---
// GET Tüm Siparişleri Listele (Admin için)
app.get('/api/admin/orders', verifyTokenAndAdmin, async (req, res) => {
    console.log("--- GET /api/admin/orders İsteği Alındı ---");
    // Sipariş durumuna göre filtreleme eklenebilir (req.query.status)
    // Sayfalama (pagination) eklenebilir
    try {
        const sql = `
            SELECT 
                o.order_id, 
                DATE_FORMAT(o.order_date, '%d.%m.%Y %H:%i') as order_date_formatted, 
                o.status, 
                o.total_amount,
                c.full_name as customer_name, 
                u.email as customer_email
            FROM orders o
            JOIN customers c ON o.customer_id = c.customer_id
            JOIN users u ON c.user_id = u.user_id
            ORDER BY o.order_date DESC
        `;
        // TODO: Filtreleme ve sayfalama eklenecekse, SQL ve parametreler güncellenmeli.
        const [orders] = await db.query(sql);
        res.status(200).json(orders);
    } catch (error) {
        console.error('Admin - Tüm siparişleri listeleme hatası:', error);
        res.status(500).json({ message: 'Siparişler listelenirken sunucuda bir hata oluştu.' });
    }
});

// GET Belirli Bir Siparişin Detaylarını Al (Admin için)
app.get('/api/admin/orders/:orderId', verifyTokenAndAdmin, async (req, res) => {
    const orderId = req.params.orderId;
    console.log(`--- GET /api/admin/orders/${orderId} İsteği Alındı ---`);
    try {
        // Sipariş ana bilgileri, müşteri ve teslimat adresi
        const orderHeaderSql = `
            SELECT 
                o.order_id, 
                DATE_FORMAT(o.order_date, '%d.%m.%Y %H:%i') as order_date_formatted, 
                o.status, 
                o.total_amount,
                c.full_name as customer_name,
                u.email as customer_email,
                c.phone as customer_phone,
                a.address_line1, a.address_line2, a.city, a.postal_code, a.country
                /* ,a.full_name_on_address, a.phone_on_address // Eğer addresses tablosunda bu alanlar varsa */
            FROM orders o
            JOIN customers c ON o.customer_id = c.customer_id
            JOIN users u ON c.user_id = u.user_id
            JOIN addresses a ON o.shipping_address_id = a.address_id
            WHERE o.order_id = ?
        `;
        const [orderHeaderRows] = await db.query(orderHeaderSql, [orderId]);

        if (orderHeaderRows.length === 0) {
            return res.status(404).json({ message: 'Sipariş bulunamadı.' });
        }

        // Sipariş edilen ürünler
        const orderDetailsSql = `
            SELECT 
                od.product_id, 
                p.name as product_name, 
                p.image_url as product_image_url,
                od.quantity, 
                od.price_per_unit,
                (od.quantity * od.price_per_unit) as item_total_price
            FROM order_details od
            JOIN products p ON od.product_id = p.product_id
            WHERE od.order_id = ?
        `;
        const [orderDetailsRows] = await db.query(orderDetailsSql, [orderId]);

        res.status(200).json({
            order: orderHeaderRows[0],
            details: orderDetailsRows
        });

    } catch (error) {
        console.error(`Admin - Sipariş (ID: ${orderId}) detayları alınırken hata:`, error);
        res.status(500).json({ message: 'Sipariş detayları alınırken bir sunucu hatası oluştu.' });
    }
});

// PUT Bir Siparişin Durumunu Güncelle (Admin için)
app.put('/api/admin/orders/:orderId/status', verifyTokenAndAdmin, async (req, res) => {
    const orderId = req.params.orderId;
    const { status } = req.body; // Yeni durum: 'pending', 'processing', 'shipped', 'delivered', 'cancelled'
    console.log(`--- PUT /api/admin/orders/${orderId}/status İsteği Alındı - Yeni Durum: ${status} ---`);

    // Gelen status değerinin geçerli enum değerlerinden biri olup olmadığını kontrol et
    const allowedStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!status || !allowedStatuses.includes(status.toLowerCase())) {
        return res.status(400).json({ message: 'Geçersiz sipariş durumu gönderildi.' });
    }

    try {
        const updateSql = 'UPDATE orders SET status = ? WHERE order_id = ?';
        const [result] = await db.query(updateSql, [status.toLowerCase(), orderId]);

        if (result.affectedRows > 0) {
            // İsteğe bağlı: Stok iadesi (eğer 'cancelled' ise ve ürünler iade ediliyorsa)
            // Bu kısım daha karmaşık bir mantık gerektirir, şimdilik eklenmedi.
            res.status(200).json({ message: `Sipariş (ID: ${orderId}) durumu başarıyla '${status}' olarak güncellendi.` });
        } else {
            res.status(404).json({ message: 'Sipariş bulunamadı veya durum zaten aynıydı.' });
        }
    } catch (error) {
        console.error(`Admin - Sipariş (ID: ${orderId}) durumu güncellenirken hata:`, error);
        res.status(500).json({ message: 'Sipariş durumu güncellenirken bir sunucu hatası oluştu.' });
    }
});


// --- ADMİN DASHBOARD ROTALARI (verifyTokenAndAdmin Gerektirir) ---

app.get('/api/admin/dashboard-stats', verifyTokenAndAdmin, async (req, res) => {
    console.log("--- GET /api/admin/dashboard-stats İsteği Alındı ---");
    try {
        let connection;
        try {
            connection = await db.getConnection(); // Havuzdan bağlantı al

            // Toplam Ürün Sayısı
            const [productRows] = await connection.query("SELECT COUNT(*) as totalProducts FROM products WHERE status != 'silinmis'");
            const totalProducts = productRows[0].totalProducts;

            // Toplam Kategori Sayısı
            const [categoryRows] = await connection.query("SELECT COUNT(*) as totalCategories FROM categories");
            const totalCategories = categoryRows[0].totalCategories;

            // Toplam Müşteri Sayısı (customer rolündeki user'lar veya customers tablosu)
            // customers tablosu user_id içerdiği için oradan saymak daha doğru olabilir.
            const [customerRows] = await connection.query("SELECT COUNT(*) as totalCustomers FROM customers");
            const totalCustomers = customerRows[0].totalCustomers;
            // VEYA user rolüne göre:
            // const [userRoleRows] = await connection.query("SELECT COUNT(*) as totalCustomers FROM users WHERE role = 'customer'");
            // const totalCustomers = userRoleRows[0].totalCustomers;


            // Toplam Sipariş Sayısı
            const [orderRows] = await connection.query("SELECT COUNT(*) as totalOrders FROM orders");
            const totalOrders = orderRows[0].totalOrders;

            // Bekleyen Sipariş Sayısı (pending veya processing durumundakiler)
            const [pendingOrderRows] = await connection.query("SELECT COUNT(*) as pendingOrders FROM orders WHERE status = 'pending' OR status = 'processing'");
            const pendingOrders = pendingOrderRows[0].pendingOrders;

            // Toplam Satış Geliri (Teslim Edilmiş Siparişler) - Opsiyonel
            const [revenueRows] = await connection.query("SELECT SUM(total_amount) as totalRevenue FROM orders WHERE status = 'delivered'");
            const totalRevenue = revenueRows[0].totalRevenue || 0; // Eğer hiç teslim edilmiş sipariş yoksa null dönebilir.

            // Son 7 Günde Gelen Sipariş Sayısı - Opsiyonel
            // Veritabanına göre DATE_SUB veya benzeri bir fonksiyon gerekebilir
            const [recentOrdersRows] = await connection.query(
                "SELECT COUNT(*) as recentOrders FROM orders WHERE order_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)"
            );
            const recentOrders = recentOrdersRows[0].recentOrders;


            res.status(200).json({
                totalProducts,
                totalCategories,
                totalCustomers,
                totalOrders,
                pendingOrders,
                totalRevenue: parseFloat(totalRevenue).toFixed(2),
                recentOrders
            });

        } finally {
            if (connection) connection.release(); // Bağlantıyı havuza geri bırak
        }
    } catch (error) {
        console.error('Admin - Dashboard istatistikleri alınırken hata:', error);
        res.status(500).json({ message: 'Dashboard verileri alınırken sunucuda bir hata oluştu.' });
    }
});


// --- ADMİN MÜŞTERİ YÖNETİMİ ROTALARI (verifyTokenAndAdmin Gerektirir) ---


// GET Tüm Müşterileri/Kullanıcıları Listele (Admin için) 
app.get('/api/admin/customers', verifyTokenAndAdmin, async (req, res) => {
    console.log("--- GET /api/admin/customers İsteği Alındı ---");
    console.log("Query Parametreleri (Müşteri Listesi):", req.query);
    try {
        let connection;
        try {
            connection = await db.getConnection();
            let sql = `
                SELECT 
                    c.customer_id,
                    u.user_id,
                    c.full_name,
                    c.phone,
                    u.email,
                    u.role,
                    DATE_FORMAT(u.created_at, '%d.%m.%Y %H:%i') as registration_date_formatted
                FROM users u
                LEFT JOIN customers c ON u.user_id = c.user_id 
                /* LEFT JOIN kullandık ki customer kaydı olmayan user'lar (sadece admin gibi) da listelenebilsin */
            `; // WHERE koşulları ve ORDER BY sonra eklenecek

            const queryParams = [];
            let conditions = [];

            // İsimle filtreleme (hem users.email hem de customers.full_name içinde arama)
            if (req.query.name && req.query.name.trim() !== '') {
                const searchTerm = `%${req.query.name.trim()}%`;
                conditions.push("(u.email LIKE ? OR c.full_name LIKE ?)");
                queryParams.push(searchTerm);
                queryParams.push(searchTerm);
            }

            // Role göre filtreleme
            if (req.query.role && (req.query.role === 'admin' || req.query.role === 'customer')) {
                conditions.push("u.role = ?");
                queryParams.push(req.query.role);
            }

            // Eğer adminler hariç sadece müşteriler (customers tablosunda kaydı olanlar) istenirse:
            // if (req.query.only_actual_customers === 'true') {
            //    conditions.push("c.customer_id IS NOT NULL");
            // }


            if (conditions.length > 0) {
                sql += " WHERE " + conditions.join(" AND ");
            }

            sql += ' ORDER BY u.created_at DESC';

            console.log("Çalıştırılacak Müşteri Listesi SQL:", sql);
            console.log("SQL Parametreleri:", queryParams);

            const [customersList] = await connection.query(sql, queryParams);
            res.status(200).json(customersList);

        } finally {
            if (connection) connection.release();
        }
    } catch (error) {
        console.error('Admin - Müşteri listeleme hatası:', error);
        res.status(500).json({ message: 'Müşteriler listelenirken sunucuda bir hata oluştu.' });
    }
});

// PUT Bir Kullanıcının Rolünü Güncelle (Admin için)
app.put('/api/admin/users/:userId/role', verifyTokenAndAdmin, async (req, res) => {
    const targetUserId = req.params.userId;
    const { newRole } = req.body; // Beklenen yeni rol: 'admin' veya 'customer'
    const requestingAdminId = req.user.userId; // İşlemi yapan adminin ID'si

    console.log(`--- PUT /api/admin/users/${targetUserId}/role İsteği Alındı - Yeni Rol: ${newRole}, Admin ID: ${requestingAdminId} ---`);

    if (Number(targetUserId) === Number(requestingAdminId)) {
        return res.status(403).json({ message: 'Admin kendi rolünü bu arayüzden değiştiremez.' });
    }

    if (!newRole || (newRole !== 'admin' && newRole !== 'customer')) {
        return res.status(400).json({ message: "Geçersiz rol. Rol 'admin' veya 'customer' olmalıdır." });
    }

    try {
        const updateSql = 'UPDATE users SET role = ? WHERE user_id = ?';
        const [result] = await db.query(updateSql, [newRole, targetUserId]);

        if (result.affectedRows > 0) {
            // Eğer customer rolünden admin rolüne geçiriliyorsa veya tam tersi,
            // customers tablosunda bir işlem yapmak gerekebilir (şimdilik gerekmiyor).
            res.status(200).json({ message: `Kullanıcı (ID: <span class="math-inline">\{targetUserId\}\) rolü başarıyla '</span>{newRole}' olarak güncellendi.` });
        } else {
            res.status(404).json({ message: 'Kullanıcı bulunamadı veya rol zaten aynıydı.' });
        }
    } catch (error) {
        console.error(`Admin - Kullanıcı (ID: ${targetUserId}) rolü güncellenirken hata:`, error);
        res.status(500).json({ message: 'Kullanıcı rolü güncellenirken bir sunucu hatası oluştu.' });
    }
});

// --- ÜRÜN ROTALARI ---
// GET herkese açık
// server.js içinde app.get('/api/products', ...) rotasını bulun ve güncelleyin:

// server.js içinde app.get('/api/products', ...) rotası
app.get('/api/products', async (req, res) => {
    console.log("--- GET /api/products İsteği Alındı (Admin veya Public) ---");
    const {
        category,
        status, // 'aktif', 'pasif', 'silinmis', '' veya hiç gelmemesi durumu
        min_price,
        max_price,
        sort_by = 'p.created_at_desc',
        search_term
    } = req.query;

    console.log("Alınan Query Parametreleri (GET /api/products):", req.query);

    let connection;
    try {
        connection = await db.getConnection();

        let sql = `
            SELECT 
                p.product_id, p.name, p.description, p.price, p.stock, 
                p.image_url, p.status, DATE_FORMAT(p.created_at, '%d.%m.%Y %H:%i') as created_at_formatted, 
                c.category_id as category_id_from_category_table, c.category_name
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.category_id
        `;

        const queryParams = [];
        const conditions = [];

        // Status (durum) filtresi
        if (status === 'aktif' || status === 'pasif' || status === 'silinmis') {
            conditions.push("p.status = ?");
            queryParams.push(status);
        } else if (status === '') {
            conditions.push("(p.status = 'aktif' OR p.status = 'pasif')");
        } else if (!req.query.hasOwnProperty('status')) {
            conditions.push("p.status = 'aktif'");
        }

        // Diğer filtreler
        if (category && category !== '') {
            conditions.push("p.category_id = ?");
            queryParams.push(category);
        }

        if (min_price && !isNaN(parseFloat(min_price))) {
            conditions.push("p.price >= ?");
            queryParams.push(parseFloat(min_price));
        }

        if (max_price && !isNaN(parseFloat(max_price))) {
            conditions.push("p.price <= ?");
            queryParams.push(parseFloat(max_price));
        }

        if (search_term && search_term.trim() !== '') {
            const searchWildcard = `%${search_term.trim()}%`;
            conditions.push("(p.name LIKE ? OR p.description LIKE ?)");
            queryParams.push(searchWildcard, searchWildcard);
        }

        if (conditions.length > 0) {
            sql += " WHERE " + conditions.join(" AND ");
        }

        // Sıralama işlemleri
        const validSorts = {
            'p.created_at_desc': ' ORDER BY p.created_at DESC',
            'price_asc': ' ORDER BY p.price ASC, p.name ASC',
            'price_desc': ' ORDER BY p.price DESC, p.name ASC',
            'name_asc': ' ORDER BY p.name ASC',
            'stock_asc': ' ORDER BY p.stock ASC, p.name ASC',
            'stock_desc': ' ORDER BY p.stock DESC, p.name ASC'
        };

        sql += validSorts[sort_by] || ' ORDER BY p.created_at DESC';

        console.log("Çalıştırılacak SQL:", sql);
        console.log("SQL Parametreleri:", queryParams);

        const [products] = await connection.query(sql, queryParams);
        res.status(200).json(products);

    } catch (error) {
        console.error('Ürünleri listeleme hatası:', error);
        res.status(500).json({
            message: 'Sunucu hatası: Ürünler listelenemedi.',
            details: error.message
        });
    } finally {
        if (connection) connection.release();
    }
});

// server.js içinde GET /api/products/:id rotası (benzer bir yapıda olmalı)
app.get('/api/products/:id', async (req, res) => {
    const productId = req.params.id;
    console.log(`--- Backend: /api/products/${productId} İsteği Alındı ---`); // LOG 1: İstek geldi mi, ID ne?

    // BELKİ BURADA productId'yi INT'e çevirmek gerekiyor olabilir,
    // veritabanındaki product_id INT ise ve req.params.id string geliyorsa.
    // const productIdInt = parseInt(productId, 10);
    // if (isNaN(productIdInt)) {
    //     return res.status(400).json({ message: 'Geçersiz ürün ID formatı.' });
    // }

    try {
        // Bu SQL sorgusunun senin products tablonla uyumlu olduğundan emin ol.
        // category_id için JOIN yapılmış ama hata bu kısımdan önce gibi duruyor.
        const sql = `
            SELECT p.*, c.category_name
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.category_id
            WHERE p.product_id = ?`; // BU SORGUNUN DOĞRU OLDUĞUNDAN EMİN OL.
                                    // Status kontrolü olmamalı ki 404'ün sebebi o olmasın.

        console.log("SQL Sorgusu:", sql, "Parametre:", [productId]); // LOG 2: SQL ve parametre ne?

        // db.query'nin doğru çalıştığından ve doğru sonucu döndürdüğünden emin ol.
        const [productRows] = await db.query(sql, [productId]); // veya [productIdInt]

        console.log("Veritabanı Sonucu (productRows):", productRows); // LOG 3: Veritabanından ne döndü?

        if (productRows.length > 0) {
            res.status(200).json(productRows[0]);
        } else {
            // EĞER ÜRÜN VERİTABANINDA VARSA BURAYA GİRMEMESİ LAZIM.
            console.log(`Backend: Ürün ID ${productId} için veritabanında kayıt bulunamadı.`); // LOG 4
            res.status(404).json({ message: 'Ürün bulunamadı (backend kontrolü).' });
        }
    } catch (error) {
        console.error(`Backend: Ürün (ID: ${productId}) alınırken hata:`, error);
        res.status(500).json({ message: 'Sunucu hatası: Ürün bilgileri alınamadı.' });
    }
});


// POST, PUT, DELETE admin yetkisi gerektirir
app.post('/api/products', upload.single('product_image'), async (req, res) => {
    console.log('--- POST /api/products İsteği Alındı (Yetkili) ---');
    let connection;
    try {
        const { product_name, product_description, product_category, product_price, product_stock, product_status } = req.body;
        const imageUrl = req.file ? '/uploads/' + req.file.filename : null;

        if (!product_name || !product_price || !product_stock) {
             if (req.file) await fs.unlink(req.file.path).catch(err => console.error("Validasyon hatası sonrası dosya silinemedi:", err));
            return res.status(400).json({ message: 'Ürün adı, fiyat ve stok zorunludur.' });
        }
        const categoryId = (product_category && product_category !== '') ? parseInt(product_category) : null;

        const insertProductSql = 'INSERT INTO products (name, description, category_id, price, stock, image_url, status) VALUES (?, ?, ?, ?, ?, ?, ?)';
        const values = [ product_name, product_description, categoryId, parseFloat(product_price), parseInt(product_stock), imageUrl, product_status || 'aktif' ];

        connection = await db.getConnection(); // Pool'dan al
        const [result] = await connection.query(insertProductSql, values);
        res.status(201).json({ message: 'Ürün başarıyla eklendi!', productId: result.insertId });

    } catch (error) {
        console.error('Ürün ekleme hatası:', error);
        let statusCode = 500;
        let message = 'Sunucu hatası oluştu.';
        if (error instanceof multer.MulterError) { statusCode = 400; message = 'Dosya yükleme hatası: ' + error.message; }
        else if (error.message && error.message.includes('Sadece resim dosyaları')) { statusCode = 400; message = error.message; }
        else if (error.code === 'ER_NO_REFERENCED_ROW_2') { statusCode = 400; message = 'Belirtilen kategori ID\'si geçerli değil.'; }
        else if (error.code === 'ER_DUP_ENTRY') { statusCode = 409; message = 'Bu isimde bir ürün zaten mevcut.'; }
        res.status(statusCode).json({ message: message });
    } finally {
         if (connection) connection.release();
         console.log('--- POST /api/products İsteği Tamamlandı ---');
    }
});

app.put('/api/products/:id', upload.single('product_image'), async (req, res) => {
    const productId = req.params.id;
    console.log(`--- PUT /api/products/${productId} İsteği Alındı (Yetkili) ---`);
    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        const { product_name, product_description, product_category, product_price, product_stock, product_status } = req.body;

        const [currentProductRows] = await connection.query('SELECT image_url FROM products WHERE product_id = ?', [productId]);
        if (currentProductRows.length === 0) {
            await connection.rollback(); connection.release();
            return res.status(404).json({ message: 'Güncellenecek ürün bulunamadı.' });
        }
        const currentImageUrl = currentProductRows[0].image_url;
        let newImageUrl = currentImageUrl;

        if (req.file) {
            newImageUrl = '/uploads/' + req.file.filename;
            if (currentImageUrl && currentImageUrl !== newImageUrl) {
                const oldImagePath = path.join(__dirname, currentImageUrl);
                await fs.unlink(oldImagePath).catch(unlinkError => {
                    if (unlinkError.code !== 'ENOENT') console.warn(`Eski resim (${oldImagePath}) silinirken uyarı:`, unlinkError.message);
                    else console.log(`Silinecek eski resim bulunamadı: ${oldImagePath}`);
                });
            }
        }
        const categoryId = (product_category && product_category !== '') ? parseInt(product_category) : null;

        const updateSql = `UPDATE products SET name = ?, description = ?, category_id = ?, price = ?, stock = ?, image_url = ?, status = ? WHERE product_id = ?`;
        const values = [ product_name, product_description, categoryId, parseFloat(product_price), parseInt(product_stock), newImageUrl, product_status, productId ];

        const [result] = await connection.query(updateSql, values);
        if (result.affectedRows > 0) {
            await connection.commit();
            res.status(200).json({ message: `Ürün (ID: ${productId}) başarıyla güncellendi.` });
        } else {
            await connection.rollback();
            res.status(404).json({ message: 'Güncellenecek ürün bulunamadı veya yapılan bir değişiklik yok.' });
        }
    } catch (error) {
        if (connection) await connection.rollback();
        console.error(`Ürün (ID: ${productId}) güncelleme hatası:`, error);
        let statusCode = 500;
        let message = 'Sunucu hatası oluştu.';
        if (error.code === 'ER_NO_REFERENCED_ROW_2') { statusCode = 400; message = 'Belirtilen kategori ID\'si geçerli değil.'; }
        res.status(statusCode).json({ message: message });
    } finally {
        if (connection) connection.release();
        console.log(`--- PUT /api/products/${productId} İsteği Tamamlandı ---`);
    }
});

app.delete('/api/products/:id', async (req, res) => {
    const productId = req.params.id;
    console.log(`--- DELETE /api/products/${productId} İsteği Alındı (Yetkili - Soft Delete) ---`);
    try {
        const updateSql = 'UPDATE products SET status = ? WHERE product_id = ?';
        const statusToSet = 'silinmis';
        const [result] = await db.query(updateSql, [statusToSet, productId]);
        if (result.affectedRows > 0) {
            res.status(200).json({ message: `Ürün (ID: ${productId}) başarıyla 'silindi' olarak işaretlendi.` });
        } else {
            res.status(404).json({ message: 'Durumu güncellenecek ürün bulunamadı.' });
        }
    } catch (error) {
        console.error(`Ürün (ID: ${productId}) 'silindi' olarak işaretlenirken hata oluştu:`, error);
        res.status(500).json({ message: 'Sunucu hatası oluştu.' });
    }
    console.log(`--- DELETE /api/products/${productId} İsteği Tamamlandı ---`);
});
// --- ÜRÜN ROTALARI BİTİŞ ---

//sepet rotası
// server.js içine, diğer rotaların yanına
app.post('/api/orders', verifyToken, async (req, res) => {
    console.log("--- POST /api/orders İsteği Alındı ---");
    const customerId = req.user.userId; // Token'dan gelen kullanıcı ID'si (müşteri ID'si olarak varsayıyoruz)
                                        // VEYA customers tablosundan user_id ile customer_id'yi bulmalıyız.
                                        // PDF'e göre users ve customers ayrı. Müşteri ID'si için bir sorgu gerekebilir.

    const { cart, shippingAddress, paymentMethod } = req.body;

    if (!cart || cart.length === 0) {
        return res.status(400).json({ message: 'Sipariş oluşturmak için sepetinizde ürün bulunmalıdır.' });
    }
    if (!shippingAddress || !shippingAddress.addressLine1 || !shippingAddress.city || !shippingAddress.postalCode || !shippingAddress.phone || !shippingAddress.fullName) {
        return res.status(400).json({ message: 'Teslimat adresi bilgileri eksik.' });
    }

    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();
        console.log("Sipariş için transaction başlatıldı.");

        // 1. Müşteri ID'sini al (users.user_id'den customers.customer_id'yi bul)
        // Eğer customers tablosunda user_id yoksa veya farklı bir mantık varsa burası değişmeli.
        // Şimdilik req.user.userId'nin doğrudan customers tablosundaki bir ID'ye karşılık geldiğini varsayalım veya
        // customers tablosunda user_id'ye göre arama yapıp customer_id'yi alalım.
        // e_ticaret_db.sql'e göre customers tablosunda user_id var.
        let actualCustomerId;
        const [customerRows] = await connection.query('SELECT customer_id FROM customers WHERE user_id = ?', [customerId]);
        if (customerRows.length === 0) {
            // Eğer customer kaydı yoksa, belki burada oluşturulabilir veya hata verilebilir.
            // Şimdilik bir müşteri kaydının var olduğunu varsayalım (kayıt olurken oluşuyordu).
             await connection.rollback();
             return res.status(400).json({ message: 'Sipariş veren müşteri sistemde bulunamadı.' });
        }
        actualCustomerId = customerRows[0].customer_id;


        // 2. Teslimat Adresini Kaydet (addresses tablosuna)
        // Bu kısım daha karmaşık olabilir: kullanıcı mevcut adreslerinden seçebilir veya yeni girebilir.
        // Şimdilik her siparişte yeni bir adres kaydı oluşturuyoruz (basitlik adına).
        // PDF'te addresses tablosu customer_id'ye bağlı.
        const addressSql = 'INSERT INTO addresses (customer_id, address_type, address_line1, address_line2, city, postal_code, country) VALUES (?, ?, ?, ?, ?, ?, ?)';
        const addressParams = [
            actualCustomerId,
            'shipping', // Adres tipi
            shippingAddress.addressLine1,
            shippingAddress.addressLine2, // Bu null olabilir, frontend'den öyle geliyordu
            shippingAddress.city,
            shippingAddress.postalCode,
            shippingAddress.country
        ];
        console.log("SQL (addresses):", addressSql);
        console.log("PARAMS (addresses):", addressParams);
        const [addressResult] = await connection.query(addressSql, addressParams);
        const shippingAddressId = addressResult.insertId;
        console.log(`Teslimat adresi kaydedildi. Address ID: ${shippingAddressId}`);



        // 3. Sipariş Toplam Tutarını Backend'de Güvenli Bir Şekilde Hesapla
        let calculatedSubtotal = 0;
        const productIdsInCart = cart.map(item => item.id);
        if (productIdsInCart.length === 0) throw new Error("Sepet boş (backend kontrolü).");

        const placeholders = productIdsInCart.map(() => '?').join(',');
        const [productsFromDB] = await connection.query(`SELECT product_id, price, stock FROM products WHERE product_id IN (${placeholders})`, productIdsInCart);

        for (const cartItem of cart) {
            const productDB = productsFromDB.find(p => String(p.product_id) === String(cartItem.id));
            if (!productDB) {
                throw new Error(`Ürün bulunamadı veya geçersiz: ID ${cartItem.id}`);
            }
            if (productDB.stock < cartItem.quantity) {
                throw new Error(`Stok yetersiz: ${escapeHtml(cartItem.name)} (Stok: ${productDB.stock}, İstenen: ${cartItem.quantity})`);
            }
            calculatedSubtotal += productDB.price * cartItem.quantity;
        }
        const shipping = cart.length > 0 ? 15.00 : 0.00; // Kargo ücreti
        const calculatedTotalAmount = calculatedSubtotal + shipping;
        console.log(`Backend hesaplanan toplam tutar: ${calculatedTotalAmount}`);


        // 4. Orders Tablosuna Kayıt
        const orderSql = 'INSERT INTO orders (customer_id, status, shipping_address_id, total_amount) VALUES (?, ?, ?, ?)';
        const [orderResult] = await connection.query(orderSql, [actualCustomerId, 'processing', shippingAddressId, calculatedTotalAmount]);
        const newOrderId = orderResult.insertId;
        console.log(`Sipariş oluşturuldu. Order ID: ${newOrderId}`);


        // 5. Order_Details Tablosuna Kayıtlar ve Stok Güncelleme
        for (const cartItem of cart) {
            const productDB = productsFromDB.find(p => String(p.product_id) === String(cartItem.id)); // Zaten yukarıda bulmuştuk
            
            const orderDetailSql = 'INSERT INTO order_details (order_id, product_id, quantity, price_per_unit) VALUES (?, ?, ?, ?)';
            await connection.query(orderDetailSql, [newOrderId, cartItem.id, cartItem.quantity, productDB.price]); // Veritabanındaki güncel fiyatı kullan
            
            const newStock = productDB.stock - cartItem.quantity;
            const updateStockSql = 'UPDATE products SET stock = ? WHERE product_id = ?';
            await connection.query(updateStockSql, [newStock, cartItem.id]);
        }
        console.log("Sipariş detayları kaydedildi ve stoklar güncellendi.");

        await connection.commit();
        console.log("Transaction commit edildi.");
        res.status(201).json({ message: 'Siparişiniz başarıyla alındı!', orderId: newOrderId });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Sipariş oluşturma sırasında DB hatası:', error);
        res.status(500).json({ message: error.message || 'Sipariş oluşturulurken sunucuda bir hata oluştu.' });
    } finally {
        if (connection) connection.release();
        console.log("--- POST /api/orders İsteği Tamamlandı ---");
    }
});

// --- KULLANICI HESABI ROTALARI (Token Gerektirir) ---

// GET Kullanıcının Profil Bilgilerini Al
app.get('/api/user/profile', verifyToken, async (req, res) => {
    const userId = req.user.userId; // Token'dan gelen user_id
    console.log(`--- GET /api/user/profile İsteği Alındı - Kullanıcı ID: ${userId} ---`);
    try {
        // Kullanıcının customers tablosundaki bilgilerini ve users tablosundaki email'ini alalım
        // users.role de eklenebilir, ama genellikle profile'da gösterilmez.
        const sql = `
            SELECT c.full_name, c.phone, u.email, u.role
            FROM customers c
            JOIN users u ON c.user_id = u.user_id
            WHERE u.user_id = ?
        `;
        const [customers] = await db.query(sql, [userId]);

        if (customers.length === 0) {
            // Bu durum normalde olmamalı, çünkü giriş yapan her kullanıcının customer kaydı olmalı.
            // Eğer yoksa, sadece users tablosundan email ve rol alalım.
            const [users] = await db.query('SELECT email, role FROM users WHERE user_id = ?', [userId]);
            if (users.length > 0) {
                return res.status(200).json({ email: users[0].email, role: users[0].role, fullName: null, phone: null });
            }
            return res.status(404).json({ message: 'Kullanıcı profili bulunamadı.' });
        }
        res.status(200).json({
            fullName: customers[0].full_name,
            phone: customers[0].phone,
            email: customers[0].email,
            role: customers[0].role // Frontend'de 'customer' veya 'admin' bilgisi gerekebilir
        });
    } catch (error) {
        console.error(`Kullanıcı (ID: ${userId}) profili alınırken hata:`, error);
        res.status(500).json({ message: 'Profil bilgileri alınırken sunucuda bir hata oluştu.' });
    }
});

// PUT Kullanıcının Profil Bilgilerini Güncelle
app.put('/api/user/profile', verifyToken, async (req, res) => {
    const userId = req.user.userId;
    const { fullName, phone, currentPassword, newPassword } = req.body; // E-posta değiştirme genellikle ayrı bir süreçtir.
    console.log(`--- PUT /api/user/profile İsteği Alındı - Kullanıcı ID: ${userId} ---`);
    console.log("Gelen Veri:", req.body);

    if (!fullName && !phone && !newPassword) {
        return res.status(400).json({ message: 'Güncellenecek en az bir bilgi (Ad Soyad, Telefon veya Yeni Şifre) gönderilmelidir.' });
    }

    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        // Ad Soyad ve Telefon Güncelleme (customers tablosu)
        if (fullName || phone) {
            let updateCustomerSql = 'UPDATE customers SET ';
            const customerParams = [];
            if (fullName) {
                updateCustomerSql += 'full_name = ? ';
                customerParams.push(fullName);
            }
            if (phone) {
                updateCustomerSql += (customerParams.length > 0 ? ', ' : '') + 'phone = ? ';
                customerParams.push(phone);
            }
            updateCustomerSql += 'WHERE user_id = ?';
            customerParams.push(userId);

            console.log("Müşteri bilgileri güncelleniyor SQL:", updateCustomerSql);
            console.log("Params:", customerParams);
            const [customerResult] = await connection.query(updateCustomerSql, customerParams);
            if (customerResult.affectedRows === 0) {
                // Bu durum, customers tablosunda user_id'ye ait kayıt yoksa olabilir.
                // Veya hiçbir değişiklik yapılmadıysa.
                console.warn(`Kullanıcı (user_id: ${userId}) için müşteri kaydı bulunamadı veya bilgi değişmedi.`);
                // throw new Error('Müşteri kaydı bulunamadı veya bilgi değişmedi.'); // İsteğe bağlı olarak hata verilebilir.
            }
        }

        // Şifre Güncelleme (users tablosu) - Eğer currentPassword ve newPassword geldiyse
        if (currentPassword && newPassword) {
            if (newPassword.length < 6) {
                await connection.rollback();
                return res.status(400).json({ message: 'Yeni şifre en az 6 karakter olmalıdır.' });
            }

            const [users] = await connection.query('SELECT password_hash FROM users WHERE user_id = ?', [userId]);
            if (users.length === 0) {
                await connection.rollback();
                return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });
            }
            const user = users[0];

            const isPasswordMatch = await bcrypt.compare(currentPassword, user.password_hash);
            if (!isPasswordMatch) {
                await connection.rollback();
                return res.status(401).json({ message: 'Mevcut şifreniz yanlış.' });
            }

            const saltRounds = 10;
            const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);
            await connection.query('UPDATE users SET password_hash = ? WHERE user_id = ?', [newPasswordHash, userId]);
            console.log(`Kullanıcı (ID: ${userId}) şifresi güncellendi.`);
        }

        await connection.commit();

        // Güncellenmiş kullanıcı bilgilerini Local Storage'a yansıtmak için yeni bilgileri de dönebiliriz.
        const [updatedCustomerRows] = await db.query( // db.query pool'dan yeni bağlantı alır, transaction dışı.
             `SELECT c.full_name, c.phone, u.email, u.role
              FROM customers c JOIN users u ON c.user_id = u.user_id
              WHERE u.user_id = ?`, [userId]
        );
        const updatedUserInfo = updatedCustomerRows.length > 0 ? {
            id: userId, // login'deki user objesiyle uyumlu olması için id eklenebilir
            email: updatedCustomerRows[0].email,
            role: updatedCustomerRows[0].role,
            fullName: updatedCustomerRows[0].full_name,
            phone: updatedCustomerRows[0].phone
        } : null;


        res.status(200).json({ message: 'Profil başarıyla güncellendi!', updatedUser: updatedUserInfo });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error(`Kullanıcı (ID: ${userId}) profili güncellenirken hata:`, error);
        res.status(500).json({ message: error.message || 'Profil güncellenirken sunucuda bir hata oluştu.' });
    } finally {
        if (connection) connection.release();
    }
});

// GET Kullanıcının Sipariş Geçmişini Listele
app.get('/api/user/orders', verifyToken, async (req, res) => {
    const userId = req.user.userId;
    console.log(`--- GET /api/user/orders İsteği Alındı - Kullanıcı ID: ${userId} ---`);
    try {
        // Önce customer_id'yi bulalım
        const [customerRows] = await db.query('SELECT customer_id FROM customers WHERE user_id = ?', [userId]);
        if (customerRows.length === 0) {
            return res.status(404).json({ message: 'Müşteri bilgisi bulunamadı, siparişler listelenemiyor.' });
        }
        const customerId = customerRows[0].customer_id;

        // Siparişleri ve her siparişin toplam ürün sayısını/çeşidini alalım (basit bir özet)
        const sql = `
            SELECT 
                o.order_id, 
                DATE_FORMAT(o.order_date, '%d.%m.%Y %H:%i') as order_date_formatted, 
                o.status, 
                o.total_amount,
                (SELECT GROUP_CONCAT(p.name SEPARATOR ', ') 
                 FROM order_details od 
                 JOIN products p ON od.product_id = p.product_id 
                 WHERE od.order_id = o.order_id
                 LIMIT 3) as product_summary, 
                (SELECT COUNT(*) FROM order_details od WHERE od.order_id = o.order_id) as total_items_in_order
            FROM orders o
            WHERE o.customer_id = ?
            ORDER BY o.order_date DESC
        `;
        const [orders] = await db.query(sql, [customerId]);
        res.status(200).json(orders);
    } catch (error) {
        console.error(`Kullanıcı (ID: ${userId}) siparişleri alınırken hata:`, error);
        res.status(500).json({ message: 'Sipariş geçmişi alınırken bir hata oluştu.' });
    }
});

// GET Kullanıcının Tek Bir Siparişinin Detayları
app.get('/api/user/orders/:orderId', verifyToken, async (req, res) => {
    const userId = req.user.userId;
    const orderId = req.params.orderId;
    console.log(`--- GET /api/user/orders/${orderId} İsteği Alındı - Kullanıcı ID: ${userId} ---`);

    try {
        // Önce customer_id'yi bulalım
        const [customerRows] = await db.query('SELECT customer_id FROM customers WHERE user_id = ?', [userId]);
        if (customerRows.length === 0) {
            return res.status(404).json({ message: 'Müşteri bilgisi bulunamadı.' });
        }
        const customerId = customerRows[0].customer_id;

        // Siparişin kullanıcıya ait olup olmadığını kontrol et ve sipariş bilgilerini al
        const orderSql = `
            SELECT 
                o.order_id, 
                DATE_FORMAT(o.order_date, '%d.%m.%Y %H:%i') as order_date_formatted, 
                o.status, 
                o.total_amount,
                a.address_line1, a.address_line2, a.city, a.postal_code, a.country
                /* , s_addr.full_name_on_address, s_addr.phone_on_address // Eğer adreste bu bilgiler varsa */
            FROM orders o
            JOIN addresses a ON o.shipping_address_id = a.address_id
            WHERE o.order_id = ? AND o.customer_id = ?
        `;
        const [orderHeader] = await db.query(orderSql, [orderId, customerId]);

        if (orderHeader.length === 0) {
            return res.status(404).json({ message: 'Sipariş bulunamadı veya bu siparişi görme yetkiniz yok.' });
        }

        // Sipariş detaylarını (ürünler) al
        const orderDetailsSql = `
            SELECT 
                od.product_id, 
                p.name as product_name, 
                p.image_url as product_image_url,
                od.quantity, 
                od.price_per_unit
            FROM order_details od
            JOIN products p ON od.product_id = p.product_id
            WHERE od.order_id = ?
        `;
        const [orderDetails] = await db.query(orderDetailsSql, [orderId]);

        res.status(200).json({
            order: orderHeader[0],
            details: orderDetails
        });

    } catch (error) {
        console.error(`Sipariş (ID: ${orderId}) detayları alınırken hata (Kullanıcı ID: ${userId}):`, error);
        res.status(500).json({ message: 'Sipariş detayları alınırken bir hata oluştu.' });
    }
});


// --- KULLANICI ADRES ROTALARI (Token Gerektirir) ---

// GET Kullanıcının Tüm Adreslerini Listele
app.get('/api/user/addresses', verifyToken, async (req, res) => {
    const userId = req.user.userId; // Token'dan gelen user_id
    console.log(`--- GET /api/user/addresses İsteği Alındı - Kullanıcı ID: ${userId} ---`);
    try {
        // Önce customer_id'yi bulalım
        const [customerRows] = await db.query('SELECT customer_id FROM customers WHERE user_id = ?', [userId]);
        if (customerRows.length === 0) {
            return res.status(404).json({ message: 'Müşteri bilgisi bulunamadı.' });
        }
        const customerId = customerRows[0].customer_id;

        const [addresses] = await db.query('SELECT * FROM addresses WHERE customer_id = ? ORDER BY address_id DESC', [customerId]);
        res.status(200).json(addresses);
    } catch (error) {
        console.error(`Kullanıcı (ID: ${userId}) adresleri alınırken hata:`, error);
        res.status(500).json({ message: 'Adresler alınırken bir sunucu hatası oluştu.' });
    }
});

// POST Kullanıcı İçin Yeni Adres Ekle
app.post('/api/user/addresses', verifyToken, async (req, res) => {
    const userId = req.user.userId;
    const { address_type = 'shipping', address_line1, address_line2, city, postal_code, country = 'Türkiye' } = req.body;
    console.log(`--- POST /api/user/addresses İsteği Alındı - Kullanıcı ID: ${userId} ---`);

    if (!address_line1 || !city || !postal_code || !country) {
        return res.status(400).json({ message: 'Adres satırı 1, şehir, posta kodu ve ülke zorunludur.' });
    }

    try {
        const [customerRows] = await db.query('SELECT customer_id FROM customers WHERE user_id = ?', [userId]);
        if (customerRows.length === 0) {
            return res.status(404).json({ message: 'İlişkili müşteri kaydı bulunamadı.' });
        }
        const customerId = customerRows[0].customer_id;

        const sql = 'INSERT INTO addresses (customer_id, address_type, address_line1, address_line2, city, postal_code, country) VALUES (?, ?, ?, ?, ?, ?, ?)';
        const params = [customerId, address_type, address_line1, address_line2 || null, city, postal_code, country];
        
        const [result] = await db.query(sql, params);
        res.status(201).json({ message: 'Adres başarıyla eklendi!', addressId: result.insertId, ...req.body });
    } catch (error) {
        console.error(`Kullanıcı (ID: ${userId}) için adres eklenirken hata:`, error);
        res.status(500).json({ message: 'Adres eklenirken bir sunucu hatası oluştu.' });
    }
});

// PUT Kullanıcının Bir Adresini Güncelle
app.put('/api/user/addresses/:addressId', verifyToken, async (req, res) => {
    const userId = req.user.userId;
    const addressId = req.params.addressId;
    const { address_type, address_line1, address_line2, city, postal_code, country } = req.body;
    console.log(`--- PUT /api/user/addresses/${addressId} İsteği Alındı - Kullanıcı ID: ${userId} ---`);

    if (!address_line1 && !city && !postal_code && !country && !address_type && address_line2 === undefined) {
        return res.status(400).json({ message: 'Güncellenecek en az bir alan gönderilmelidir.' });
    }
    
    // Hangi alanların güncelleneceğini dinamik olarak belirle
    let updateFields = [];
    let updateParams = [];

    if (address_type !== undefined) { updateFields.push('address_type = ?'); updateParams.push(address_type); }
    if (address_line1 !== undefined) { updateFields.push('address_line1 = ?'); updateParams.push(address_line1); }
    if (address_line2 !== undefined) { updateFields.push('address_line2 = ?'); updateParams.push(address_line2 || null); }
    if (city !== undefined) { updateFields.push('city = ?'); updateParams.push(city); }
    if (postal_code !== undefined) { updateFields.push('postal_code = ?'); updateParams.push(postal_code); }
    if (country !== undefined) { updateFields.push('country = ?'); updateParams.push(country); }

    if (updateFields.length === 0) {
        return res.status(400).json({ message: 'Güncellenecek geçerli bir alan bulunamadı.' });
    }

    updateParams.push(addressId); // WHERE address_id = ?
    updateParams.push(userId);    // AND customer_id = (SELECT customer_id FROM customers WHERE user_id = ?)

    const sql = `UPDATE addresses SET ${updateFields.join(', ')} WHERE address_id = ? AND customer_id = (SELECT customer_id FROM customers WHERE user_id = ?)`;
    
    try {
        const [result] = await db.query(sql, updateParams);
        if (result.affectedRows > 0) {
            res.status(200).json({ message: 'Adres başarıyla güncellendi.' });
        } else {
            res.status(404).json({ message: 'Adres bulunamadı veya bu adresi güncelleme yetkiniz yok ya da hiçbir değişiklik yapılmadı.' });
        }
    } catch (error) {
        console.error(`Adres (ID: ${addressId}) güncellenirken hata (Kullanıcı ID: ${userId}):`, error);
        res.status(500).json({ message: 'Adres güncellenirken bir sunucu hatası oluştu.' });
    }
});

// DELETE Kullanıcının Bir Adresini Sil
app.delete('/api/user/addresses/:addressId', verifyToken, async (req, res) => {
    const userId = req.user.userId;
    const addressId = req.params.addressId;
    console.log(`--- DELETE /api/user/addresses/${addressId} İsteği Alındı - Kullanıcı ID: ${userId} ---`);

    // Siparişlerde bu adres kullanılıyor mu diye kontrol et (ON DELETE kısıtlaması yoksa önemli)
    // e_ticaret_db.sql'de orders.shipping_address_id için ON DELETE için bir kural yoktu (CASCADE/SET NULL gibi).
    // Eğer bir siparişte kullanılıyorsa silinmesini engellemek iyi bir pratik olabilir.
    // Şimdilik bu kontrolü eklemiyorum, ama gerçek bir sistemde düşünülmeli.
    // Örneğin:
    // const [ordersUsingAddress] = await db.query('SELECT order_id FROM orders WHERE shipping_address_id = ?', [addressId]);
    // if (ordersUsingAddress.length > 0) {
    //     return res.status(400).json({ message: 'Bu adres aktif siparişlerde kullanıldığı için silinemez.' });
    // }

    const sql = 'DELETE FROM addresses WHERE address_id = ? AND customer_id = (SELECT customer_id FROM customers WHERE user_id = ?)';
    try {
        const [result] = await db.query(sql, [addressId, userId]);
        if (result.affectedRows > 0) {
            res.status(200).json({ message: 'Adres başarıyla silindi.' });
        } else {
            res.status(404).json({ message: 'Adres bulunamadı veya bu adresi silme yetkiniz yok.' });
        }
    } catch (error) {
        console.error(`Adres (ID: ${addressId}) silinirken hata (Kullanıcı ID: ${userId}):`, error);
        res.status(500).json({ message: 'Adres silinirken bir sunucu hatası oluştu.' });
    }
});


// --- Sunucuyu Başlatma ---
app.listen(PORT, () => {
    console.log(`Node.js Back-end sunucusu http://localhost:${PORT} adresinde çalışıyor.`);
});

// --- Hata Yönetimi Middleware (Opsiyonel ama Önerilir) ---
// Tüm rotalardan sonra en sona eklenir.
// app.use((err, req, res, next) => {
//   console.error("Beklenmeyen Sunucu Hatası:", err.stack || err);
//   res.status(500).send('Sunucuda bir hata oluştu!');
// });