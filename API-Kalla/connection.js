const mysql = require('mysql')
const db = mysql.createConnection({
    host:"localhost",
    user: "root",
    password:"",
    database:"kalla_tracking"

})

module.exports=db