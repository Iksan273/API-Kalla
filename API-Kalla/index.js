const express =require('express');
const app = express();
const port = process.env.PORT || 3000;
const bodyParser = require('body-parser');
const db = require('./connection');
const response = require('./response');
const createVerificationToken = require('./createVerificationToken');
const transporter = require('./transporter');
const jwt = require('jsonwebtoken');
const bcrypt=require('bcryptjs')
const pool = require('./connection');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Array untuk menyimpan data pengguna yang belum diverifikasi
const unverifiedUsers = [];

app.set('view engine', 'ejs');


// Mengatur direktori tampilan (views)
app.set('views', __dirname + '/views');
app.use(express.static(__dirname + '/views'));

app.get('/verif', (req, res) => {
  res.render('index');
});

app.get('/success', (req, res) => {
  res.render('Success');
});
app.get('/failed', (req, res) => {
  res.render('failed');
});

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

app.get('/', (req, res)=>{
  res.send ("halohaloooo")
})

app.get('/users', (req, res) => {
  const sql = "SELECT * FROM user";

  pool.getConnection((error, connection) => {
    if (error) {
      console.error('Error getting connection from pool:', error);
      return res.status(500).json({ message: 'Internal Server Error' });
    }

    connection.query(sql, (queryError, result) => {
      connection.release(); 

      if (queryError) {
        console.error('Error executing SQL query:', queryError);
        return res.status(500).json({ message: 'Internal Server Error' });
      }
      response(200, result, "Success Get Data", res);
    });
  });
});

app.post('/forgotPassword', (req, res) => {
  const { email } = req.body;
  const expirationTimeInMinutes = 5;

  // Check if the email exists in the user table
  pool.getConnection((err, connection) => {
    if (err) {
      console.error('Error getting connection from pool', err);
      return res.status(500).json({ message: 'Terjadi kesalahan dalam server' });
    }

    connection.query('SELECT * FROM user WHERE email = ?', [email], (userSelectError, userSelectResults) => {
      if (userSelectError) {
        console.error('Error querying user database', userSelectError);
        connection.release();
        return res.status(500).json({ message: 'Terjadi kesalahan dalam server' });
      }

      if (userSelectResults.length === 0) {
        connection.release();
        return res.status(404).json({ message: 'Email tidak ditemukan' });
      }
      let accessCode = generateAccessCode();
      let expirationTime = new Date();
      expirationTime.setMinutes(expirationTime.getMinutes() + expirationTimeInMinutes);

      connection.query('SELECT * FROM forgot_password WHERE email = ?', [email], (selectError, selectResults) => {
        if (selectError) {
          console.error('Error querying forgot_password database', selectError);
          connection.release();
          return res.status(500).json({ message: 'Terjadi kesalahan dalam server' });
        }

        if (selectResults.length > 0) {
          // Access code sudah ada, lakukan perintah update
          connection.query(
            'UPDATE forgot_password SET access_code = ?, expired= ? WHERE email = ?',
            [accessCode, expirationTime, email],
            (updateError, updateResults) => {
              connection.release();

              if (updateError) {
                console.error('Error updating access code', updateError);
                return res.status(500).json({ message: 'Terjadi kesalahan dalam server' });
              }

              sendEmail(email, accessCode, res);
            }
          );
        } else {
          // Access code belum ada, lakukan perintah insert
          connection.query(
            'INSERT INTO forgot_password (email, access_code, expired) VALUES (?, ?, ?)',
            [email, accessCode, expirationTime],
            (insertError, insertResults) => {
              connection.release();

              if (insertError) {
                console.error('Error inserting access code', insertError);
                return res.status(500).json({ message: 'Terjadi kesalahan dalam server' });
              }

              sendEmail(email, accessCode, res);
            }
          );
        }
      });
    });
  });
});

function sendEmail(email, accessCode, res) {
  const mailOptions = {
    from: 'kallatracking01@gmail.com',
    to: email,
    subject: 'Forgot Password',
    text: `Gunakan kode akses berikut untuk mereset password Anda: ${accessCode}`,
  };

  transporter.sendMail(mailOptions, (emailError, info) => {
    if (emailError) {
      console.error('Error sending email', emailError);
      res.status(500).json({ message: 'Gagal mengirim email forgot password' });
    } else {
      res.status(200).json({ message: 'Email Forgot Password Terkirim' });
      console.log('Email forgot password terkirim: ' + info.response);
    }
  });
}
// Fungsi untuk menghasilkan akses code
function generateAccessCode() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

app.post('/verifyAccessCode', (req, res) => {
  const { email, accessCode } = req.body;

  // Memeriksa apakah access code valid
  verifyAccessCode(email, accessCode)
    .then((isValid) => {
      if (isValid) {
        res.status(200).json({ message: 'Access Code Valid' });
      } else {
        res.status(401).json({ message: 'Access Code Tidak Valid atau Sudah Kedaluwarsa' });
      }
    })
    .catch((error) => {
      console.error('Error verifying access code', error);
      res.status(500).json({ message: 'Terjadi kesalahan dalam server' });
    });
});
function verifyAccessCode(email, accessCode) {
  return new Promise((resolve, reject) => {
    pool.getConnection((err, connection) => {
      if (err) {
        console.error('Error getting connection from pool', err);
        reject(false);
      }

      connection.query(
        'SELECT * FROM forgot_password WHERE email = ? AND access_code = ? AND expired < NOW()',
        [email, accessCode],
        (error, results) => {
          connection.release();

          if (error) {
            console.error('Error verifying access code', error);
            reject(false);
          }

          if (results.length > 0) {
            resolve(true); 
          } else {
            resolve(false); 
          }
        }
      );
    });
  });
}

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
    text: `Klik tautan ini untuk verifikasi email Anda: https://mobile-kalla.vercel.app/verify/${verificationToken}`,
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
      const hashedPassword = await bcrypt.hashSync(password, salt);

      // Gunakan pool.getConnection untuk mendapatkan koneksi dari pool
      pool.getConnection((connectionError, connection) => {
        if (connectionError) {
          console.error('Error getting connection from pool:', connectionError);
          return res.status(500).json({ message: 'Internal Server Error' });
        }

        // Eksekusi query menggunakan koneksi dari pool
        connection.query(sql, [firstName, lastName, email, username, hashedPassword], (queryError, result) => {
          connection.release(); // Lepaskan koneksi kembali ke pool setelah selesai

          if (queryError) {
            console.error('Error executing SQL query:', queryError);
            return res.status(500).json({ message: 'Internal Server Error' });
          }
          res.status(201).json({ error: false, message: 'Pendaftaran berhasil. Silakan verifikasi email Anda.' });
        });
      });
    }
  });
});


app.get('/verify/:token', verifyToken, (req, res) => {
  const email = req.decoded.email;

  // Cari pengguna yang belum diverifikasi berdasarkan email
  const unverifiedUserIndex = unverifiedUsers.findIndex((user) => user.email === email);

  if (unverifiedUserIndex !== -1) {
    const user = unverifiedUsers[unverifiedUserIndex];
    // Ubah status pengguna menjadi "verified" di basis data
    const sql = "UPDATE user SET isVerified = '1' WHERE email = ?";

    // Gunakan pool.getConnection untuk mendapatkan koneksi dari pool
    pool.getConnection((connectionError, connection) => {
      if (connectionError) {
        console.error('Error getting connection from pool:', connectionError);
        return res.status(500).json({ message: 'Internal Server Error' });
      }

      // Eksekusi query menggunakan koneksi dari pool
      connection.query(sql, [user.email], (queryError, result) => {
        connection.release(); // Lepaskan koneksi kembali ke pool setelah selesai

        if (queryError) {
          console.error('Error executing SQL query:', queryError);
          return res.status(500).json({ message: 'Internal Server Error' });
        }
        unverifiedUsers.splice(unverifiedUserIndex, 1);
        res.redirect('/success');
      });
    });
  } else {
    res.redirect('/failed');
  }
});

app.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email dan password diperlukan' });
  } else {
    const sql = "SELECT * FROM user WHERE email = ?";
    
    // Gunakan pool.getConnection untuk mendapatkan koneksi dari pool
    pool.getConnection((connectionError, connection) => {
      if (connectionError) {
        console.error('Error getting connection from pool:', connectionError);
        return res.status(500).json({ message: 'Internal Server Error' });
      }

      // Eksekusi query menggunakan koneksi dari pool
      connection.query(sql, [email], async (queryError, results) => {
        connection.release(); // Lepaskan koneksi kembali ke pool setelah selesai

        if (queryError) {
          console.error('Error executing SQL query:', queryError);
          return res.status(500).json({ message: 'Internal Server Error' });
        }
        
        if (results.length === 0) {
          return res.status(401).json({ message: 'Email atau kata sandi salah' });
        }
        const user = results[0];

        if (user.isVerified === 0) {
          return res.status(403).json({ message: 'Verifikasi email terlebih dahulu sebelum login' });
        }

        // Bandingkan password yang diberikan oleh pengguna dengan hashed password di database
        const passwordMatch = await bcrypt.compareSync(password, user.password);

        if (!passwordMatch) {
          return res.status(401).json({ message: 'Email atau kata sandi salah' });
        }

        res.status(200).json({ message: 'Login berhasil', user });
      });
    });
  }
});

                                                               
app.put('/profile/:userId', async (req, res) => {
  const userId = req.params.userId; // Mendapatkan userId dari URL
  const { firstName, lastName, username, password } = req.body;

  // Validasi data
  if (!firstName || !lastName || !username || !password) {
    return res.status(400).json({ message: 'Semua data harus terisi' });
  }
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hashSync(password, salt);
  const updateQuery = "UPDATE user SET firstName = ?, lastName = ?, username = ?, password = ? WHERE id = ?";

  pool.getConnection((connectionError, connection) => {
    if (connectionError) {
      console.error('Error getting connection from pool:', connectionError);
      return res.status(500).json({ message: 'Internal Server Error' });
    }

    connection.query(updateQuery, [firstName, lastName, username, hashedPassword, userId], (queryError, result) => {
      connection.release();

      if (queryError) {
        console.error('Error executing SQL query:', queryError);
        return res.status(500).json({ message: 'Internal Server Error' });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: true, message: 'Pengguna tidak ditemukan' });
      }

      res.status(200).json({ error: false, message: 'Profil pengguna berhasil diperbarui' });
    });
  });
});

app.post('/updatePassword', async (req, res) => {
  const { email, password } = req.body;

  // Validasi data
  if ( !email || !password) {
    return res.status(400).json({ message: 'Semua data harus terisi' });
  }
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hashSync(password, salt);
  const updateQuery = "UPDATE user SET password = ? WHERE email = ?";

  pool.getConnection((connectionError, connection) => {
    if (connectionError) {
      console.error('Error getting connection from pool:', connectionError);
      return res.status(500).json({ message: 'Internal Server Error' });
    }

    connection.query(updateQuery, [ hashedPassword, email], (queryError, result) => {
      connection.release();

      if (queryError) {
        console.error('Error executing SQL query:', queryError);
        return res.status(500).json({ message: 'Internal Server Error' });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: true, message: 'Pengguna tidak ditemukan' });
      }

      res.status(200).json({ error: false, message: 'Password berhasil diperbarui' });
    });
  });
}); 

app.put('/profileImage/:userId', (req, res) => {
  const userId = req.params.userId; // Mendapatkan userId dari URL
  const { url } = req.body;

  // Validasi data
  if (!url) {
    return res.status(400).json({ message: 'Semua data harus terisi' });
  }

  const updateQuery = "UPDATE user SET urlImage = ? WHERE id = ?";

  pool.getConnection((connectionError, connection) => {
    if (connectionError) {
      console.error('Error getting connection from pool:', connectionError);
      return res.status(500).json({ message: 'Internal Server Error' });
    }

    connection.query(updateQuery, [url, userId], (queryError, result) => {
      connection.release();

      if (queryError) {
        console.error('Error executing SQL query:', queryError);
        return res.status(500).json({ message: 'Internal Server Error' });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: true, message: 'Pengguna tidak ditemukan' });
      }

      res.status(200).json({ error: false, message: 'Foto Profile Berhasil di update' });
    });
  });
});

app.get('/historyUser/:userId', (req, res) => {
  const userId = req.params.userId;
  const sql = "SELECT * FROM history WHERE user_id = ? AND status = 'received'";

  pool.getConnection((connectionError, connection) => {
    if (connectionError) {
      console.error('Error getting connection from pool:', connectionError);
      return res.status(500).json({ message: 'Internal Server Error' });
    }

    connection.query(sql, [userId], (queryError, results) => {
      connection.release();

      if (queryError) {
        console.error('Error executing SQL query:', queryError);
        return res.status(500).json({ message: 'Internal Server Error' });
      }

      if (results.length === 0) {
        return res.status(404).json({ message: 'No history found' });
      }

      res.status(200).json({ message: 'Success Get History', data: results });
    });
  });
});

app.post('/history', (req, res) => {
  const { noOrder, date, status, description, user_id } = req.body;
  if (!noOrder || !date || !status || !user_id || !description) {
    return res.status(400).json({ message: 'Semua data harus terisi' });
  }
  const formattedDate = new Date(date).toISOString().slice(0, 19).replace('T', ' ');

  const checkQuery = "SELECT * FROM history WHERE noOrder = ? AND user_id = ?";

  pool.getConnection((connectionError, connection) => {
    if (connectionError) {
      console.error('Error getting connection from pool:', connectionError);
      return res.status(500).json({ message: 'Internal Server Error' });
    }

    connection.query(checkQuery, [noOrder, user_id], (queryError, result) => {
      if (queryError) {
        connection.release();
        console.error('Error:', queryError);
        res.status(500).json({ error: 'Terjadi kesalahan dalam pengecekan riwayat' });
      } else if (result.length > 0) {
        connection.release();
        res.status(409).json({error: true, message: 'Riwayat sudah ada' });
      } else {
        const insertQuery = "INSERT INTO history (noOrder, date, status, description, user_id) VALUES (?, ?, ?, ?, ?)";

        connection.query(insertQuery, [noOrder, formattedDate, status, description, user_id], (insertError, insertResult) => {
          connection.release();

          if (insertError) {
            console.error('Error:', insertError);
            res.status(500).json({ error: false,message: 'Terjadi kesalahan dalam penambahan riwayat' });
          } else {
            res.status(200).json({error: false, message: 'Riwayat berhasil ditambahkan' });
          }
        });
      }
    });
  });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
