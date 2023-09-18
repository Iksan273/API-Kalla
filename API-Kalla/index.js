const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const bodyParser = require('body-parser');
const db = require('./connection');
const response = require('./response');
const createVerificationToken = require('./createVerificationToken');
const transporter = require('./transporter');
const jwt = require('jsonwebtoken');
const bcrypt=require('bcrypt')

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
  if (!firstName || !lastName || !email || !username || !password) {
    return res.status(400).json({ message: 'Semua data harus terisi' });
  }
  const verificationToken = createVerificationToken({ email });
  console.log(verificationToken);

  const mailOptions = {
    from: 'kallatracking01@gmail.com',
    to: email,
    subject: 'Verifikasi Email',
    text: `Klik tautan ini untuk verifikasi email Anda: http://127.0.0.1:3000/verify/${verificationToken}`,
  };

  // Simpan pengguna yang belum diverifikasi dalam array
  unverifiedUsers.push({ firstName, lastName, email, username, password });

  transporter.sendMail(mailOptions, async (error, info) => {
    if (error) {
      console.error(error);
      res.status(500).json({ message: 'Gagal mengirim email verifikasi' });
    } else {
      console.log('Email verifikasi terkirim: ' + info.response);
      const sql = "INSERT INTO user (firstName, lastName, email, username, password) VALUES (?, ?, ?, ?, ?)";
      const salt = await bcrypt.genSalt(10);

      // Enkripsi password
      const hashedPassword = await bcrypt.hash(password, salt);
      db.query(sql, [firstName, lastName, email, username, hashedPassword], (error, result) => {
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
    const sql = "SELECT * FROM user WHERE email = ?";
    db.query(sql, [email], async (error, results) => {
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

      // Bandingkan password yang diberikan oleh pengguna dengan hashed password di database
      const passwordMatch = await bcrypt.compare(password, user.password);

      if (!passwordMatch) {
        return res.status(401).json({ message: 'Email atau kata sandi salah' });
      }

      res.status(200).json({ message: 'Login berhasil', user });
    });
  }
});
app.put('/profile/:userId', (req, res) => {
  const userId = req.params.userId; // Mendapatkan userId dari URL
  const { firstName, lastName, username, password } = req.body;

  const updateQuery = "UPDATE user SET firstName = ?, lastName = ?, username = ?, password = ? WHERE id = ?";
  db.query(updateQuery, [firstName, lastName, username, password, userId], (error, result) => {
    if (error) {
      console.error('Error executing SQL query:', error);
      return res.status(500).json({ message: 'Internal Server Error' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Pengguna tidak ditemukan' });
    }

    res.status(200).json({ message: 'Profil pengguna berhasil diperbarui' });
  });
});




app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
