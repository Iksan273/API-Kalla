const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const bodyParser = require('body-parser');
const db = require('./connection');
const response = require('./response');
const createVerificationToken = require('./createVerificationToken');
const transporter = require('./transporter');
const jwt = require('jsonwebtoken');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Array untuk menyimpan data pengguna yang belum diverifikasi
const unverifiedUsers = [];

// Middleware untuk memeriksa token verifikasi
const verifyToken = (req, res, next) => {
  const token = req.params.token;
  const secretKey = 'Kalla-verification'; // Ganti dengan kunci rahasia yang sebenarnya

  jwt.verify(token, secretKey, (err, decoded) => {
    if (err) {
      res.status(401).json({ message: 'Token tidak valid' });
    } else {
      req.decoded = decoded; // Menambahkan informasi token ke req untuk digunakan di rute berikutnya
      next(); // Lanjutkan ke rute berikutnya
    }
  });
};

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
  const hashPass=""

  if (!firstName || !lastName || !email || !username || !password) {
    return res.status(400).json({ message: 'Semua data harus terisi' });
  }
  const verificationToken = createVerificationToken({ email });
  console.log(verificationToken);

  const mailOptions = {
    from: 'kallatracking01@gmail.com',
    to: email,
    subject: 'Verifikasi Email',
    text: `Klik tautan ini untuk verifikasi email Anda: https://api-kalla-ovn3.vercel.app/verify/${verificationToken}`,
  };

  // Simpan pengguna yang belum diverifikasi dalam array
  unverifiedUsers.push({ firstName, lastName, email, username, password:hashPass });

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error(error);
      res.status(500).json({ message: 'Gagal mengirim email verifikasi' });
    } else {
      console.log('Email verifikasi terkirim: ' + info.response);
      const sql = "INSERT INTO user (firstName, lastName, email, username, password) VALUES (?, ?, ?, ?, ?)";

      db.query(sql, [firstName, lastName, email, username, hashPass], (error, result) => {
        if (error) {
          console.error('Error executing SQL query:', error);
          return res.status(500).json({ message: 'Internal Server Error' });
        }
        res.status(201).json({ error: false, message: 'Pendaftaran berhasil. Silakan verifikasi email Anda.' });
      });
    }
    })
  });


// Rute untuk verifikasi email
app.get('/verify/:token', verifyToken, (req, res) => {
  // Mendapatkan email dari informasi token
  const email = req.decoded.email;

  // Cari pengguna yang belum diverifikasi berdasarkan email
  const unverifiedUserIndex = unverifiedUsers.findIndex((user) => user.email === email);

  if (unverifiedUserIndex !== -1) {
    const user = unverifiedUsers[unverifiedUserIndex];
    // Ubah status pengguna menjadi "verified" di basis data
    const sql = "UPDATE user SET isVerified = '1' WHERE email = ?";

    db.query(sql, [user.email], (error, result) => {
      if (error) {
        console.error('Error executing SQL query:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
      }
      // Hapus pengguna dari array unverifiedUsers
      unverifiedUsers.splice(unverifiedUserIndex, 1);
      res.status(200).json({ message: 'Email berhasil diverifikasi' });
    });
  } else {
    res.status(404).json({ message: 'Pengguna tidak ditemukan di dalam antrian verifikasi' });
  }
});

app.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email dan password diperlukan' });
  } else {
    const sql = "SELECT * FROM user WHERE email = ? AND password = ?";
    db.query(sql, [email, password], (error, results) => {
      if (error) {
        console.error('Error executing SQL query:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
      }
      if (results.length === 0) {
        return res.status(401).json({ message: 'Email atau kata sandi salah' });
      }
      const user = results[0];

      if (user.isVerified === 0) {
        return res.status(401).json({ message: 'Verifikasi email terlebih dahulu sebelum login' });
      }

      res.status(200).json({ message: 'Login berhasil', user });
    });
  }
});


app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
