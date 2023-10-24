// connection.js
const mysql = require('mysql');

const dbConfig = {
  host: 'bnwraqawhrfuvvpy2tpx-mysql.services.clever-cloud.com',
  user: 'uyozibhdvgm12nde', 
  password: 'EFUIQF2Dj1x0yc99cYM9', 
  database: 'bnwraqawhrfuvvpy2tpx',
};

const pool = mysql.createPool(dbConfig);

module.exports = pool;
