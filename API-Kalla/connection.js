const mysql = require('mysql');

// Konfigurasi koneksi ke database
const dbConfig = {
  // host: 'bnwraqawhrfuvvpy2tpx-mysql.services.clever-cloud.com',
  // user: 'uyozibhdvgm12nde', 
  // password: 'EFUIQF2Dj1x0yc99cYM9', 
  // database: 'bnwraqawhrfuvvpy2tpx' 
  host: process.env.DB_HOST,
  user: process.env.DB_USERNAME, 
  password: process.env.DB_PASSWORD, 
  database: process.env.DB_DBNAME 
};

// Membuat koneksi ke database
const connection = mysql.createConnection(dbConfig);

// Membuka koneksi ke database
connection.connect((err) => {
  if (err) {
    console.error('Koneksi ke database gagal:', err);
  } else {
    console.log('Terhubung ke database MySQL');
  }
});

module.exports = connection;
