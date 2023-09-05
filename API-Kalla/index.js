const express = require('express');
const app = express();
const port = process.env.POR||3000;
const bodyParser = require('body-parser');
const db = require('./connection');
const response = require('./response');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/users', (req, res) => {
  const sql = "SELECT * FROM user";
  db.query(sql, (error, result) => {
    if (error) {
      console.error('Error executing SQL query:', error);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
    response(200, result, "Success Get Data", res);
  });
});

app.post('/register', (req, res) => {
  const { firstName, lastName, email, username, password } = req.body;

  if (!firstName || !lastName || !email || !username || !password) {
    return res.status(400).json({ message: 'Semua data harus terisi' });
  }

  const sql = "INSERT INTO user (firstName, lastName, email, username, password) VALUES (?, ?, ?, ?, ?)";

  db.query(sql, [firstName, lastName, email, username, password], (error, result) => {
    if (error) {
      console.error('Error executing SQL query:', error);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
    res.status(201).json({ error:false,message: 'Pendaftaran berhasil' });
  });
});


app.post('/login', (req, res) => {
    const { email, password } = req.body;
  
    if (!email || !password) {
      return res.status(400).json({ message: 'Email dan password diperlukan' });
    }
    else{
        const sql = "SELECT * FROM user WHERE email = ? AND password = ?";
    db.query(sql, [email, password], (error, results) => {
      if (error) {
        console.error('Error executing SQL query:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
      }
      if (results.length === 0) {
        return res.status(401).json({ message: 'Email atau kata sandi salah' });
      }
      const user=results[0]
      res.status(200).json({ message: 'Login berhasil',user });
    });

    }
    
  });
  
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
