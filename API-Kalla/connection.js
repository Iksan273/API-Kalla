const mysql = require('mysql')
const db = mysql.createConnection({
    host:"bnwraqawhrfuvvpy2tpx-mysql.services.clever-cloud.com",
    user: "uyozibhdvgm12nde",
    password:"T5v27I3QczmffcKGXhk7",
    database:"bnwraqawhrfuvvpy2tpx"

})

module.exports=db