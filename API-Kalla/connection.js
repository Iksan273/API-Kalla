const mysql = require('mysql2');

// Konfigurasi pool koneksi ke database
const pool = mysql.createPool({
  // host: 'bnwraqawhrfuvvpy2tpx-mysql.services.clever-cloud.com',
  // user: 'uyozibhdvgm12nde', 
  // password: 'EFUIQF2Dj1x0yc99cYM9', 
  // database: 'bnwraqawhrfuvvpy2tpx' 
  host: process.env.DB_HOST,
  user: process.env.DB_USERNAME, 
  password: process.env.DB_PASSWORD, 
  database: process.env.DB_DBNAME,
  connectionLimit: 10, // Jumlah maksimum koneksi dalam pool
});

// Membuat pool koneksi
const poolPromise = pool.promise();

module.exports = poolPromise;