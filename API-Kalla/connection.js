const mysql = require('mysql')
const db = mysql.createConnection({

    host: process.env.DB_HOST, 
    user: process.env.DB_USERNAME, 
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DBNAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
   
});

// db.getConnection((err,conn)=>{
//     if(err)console.log(err)
//     console.log("Connected Succesfully")
// })

module.exports=db