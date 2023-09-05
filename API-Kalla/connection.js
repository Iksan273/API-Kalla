const mysql = require('mysql')
const db = mysql.createConnection({
    // host:"bnwraqawhrfuvvpy2tpx-mysql.services.clever-cloud.com",
    // user: "uyozibhdvgm12nde",
    // password:"T5v27I3QczmffcKGXhk7",
    // database:"bnwraqawhrfuvvpy2tpx"
    host: process.env.DB_HOST, 
    user: process.env.DB_USERNAME, 
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DBNAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0

})

module.exports=db