// config/db.js
const mysql = require('mysql2');
require('dotenv').config(); // .env dosyasını yükle

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Bağlantıyı test etmek için (opsiyonel)
pool.getConnection((err, connection) => {
    if (err) {
        console.error('MySQL Veritabanı bağlantı hatası:', err);
        return;
    }
    console.log('MySQL Veritabanına başarıyla bağlanıldı!');
    connection.release(); // Bağlantıyı havuza geri bırak
});

// Havuzu promise tabanlı kullanmak için
module.exports = pool.promise();