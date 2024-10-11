const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const cors = require('cors');

const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: 'your_secret_key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } 
}));

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'signup'
});

connection.connect((err) => {
  if (err) {
    console.error('Error connecting to signup database: ', err);
    return;
  }
  console.log('Connected to signup database');
});

const productsConnection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'products'
});

productsConnection.connect((err) => {
  if (err) {
    console.error('Error connecting to products database:', err);
    return;
  }
  console.log('Connected to the products database.');
});

const cartConnection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'cart'
});

cartConnection.connect((err) => {
  if (err) {
    console.error('Error connecting to cart database: ', err);
    return;
  }
  console.log('Connected to cart database');
});

const notificationConnection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'notification'
});

notificationConnection.connect((err) => {
  if (err) {
    console.error('Error connecting to notification database: ', err);
    return;
  }
  console.log('Connected to notification database');
});

const dbReviews = mysql.createPool({
  connectionLimit: 10,
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'reviews'
});

dbReviews.getConnection((err, connection) => {
  if (err) {
    console.error('Error connecting to reviews database: ', err);
    return;
  }
  console.log('Connected to reviews database');
  connection.release();
});

app.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

app.post('/signup', (req, res) => {
  const { Firstname, Lastname, dob, Email, phno, address, password } = req.body;

  const query = 'INSERT INTO signuptable (Firstname, Lastname, dob, Email, phno, address, password) VALUES (?, ?, ?, ?, ?, ?, ?)';
  connection.query(query, [Firstname, Lastname, dob, Email, phno, address, password], (err, results) => {
    if (err) {
      console.error('Error executing query: ' + err.stack);
      res.status(500).send('Error saving data');
      return;
    }
    res.send('User signed up successfully!');
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/login', (req, res) => {
  const { Email, password } = req.body;

  const sql = `SELECT * FROM signuptable WHERE Email = ? AND password = ?`;
  connection.query(sql, [Email, password], (err, results) => {
    if (err) {
      console.error('Error executing login query: ', err);
      res.status(500).send('Internal Server Error');
      return;
    }
    if (results.length > 0) {
      req.session.userEmail = Email; 
      res.redirect('/price.html');
    } else {
      res.status(401).send('Invalid credentials');
    }
  });
});

app.get('/api/products', (req, res) => {
  const { type, filter } = req.query;
  let sql = 'SELECT * FROM producttable';
  if (type) {
      sql += ` WHERE type LIKE '%${type}%' OR name LIKE '%${type}%'`;
  }
  if (filter) {
      sql += ` ORDER BY ${filter}`;
  }
  productsConnection.query(sql, (err, results) => {
      if (err) {
          console.error('Error fetching products:', err);
          return res.status(500).send('Internal Server Error');
      }
      res.json(results);
  });
});

app.post('/api/cart/add', (req, res) => {
  const { name, price, source, quantity, created_at } = req.body;
  const Email = req.session.userEmail;
  
  if (!Email) {
    console.error('User not logged in');
    return res.status(401).send('User not logged in');
  }

  const checkExistingItemSql = `SELECT * FROM cart_items WHERE Email = ? AND name = ?`;
  cartConnection.query(checkExistingItemSql, [Email, name], (checkErr, checkResults) => {
    if (checkErr) {
      console.error('Error checking existing item:', checkErr);
      return res.status(500).send('Internal Server Error');
    }

    if (checkResults.length > 0) {
      const updateQuantitySql = `UPDATE cart_items SET quantity = quantity + 1 WHERE Email = ? AND name = ?`;
      cartConnection.query(updateQuantitySql, [Email, name], (updateErr, updateResults) => {
        if (updateErr) {
          console.error('Error updating item quantity:', updateErr);
          return res.status(500).send('Internal Server Error');
        }
        console.log('Quantity updated successfully');
        res.status(200).send('Quantity updated successfully');
      });
    } else {
      const insertItemSql = `INSERT INTO cart_items (Email, name, price, source, quantity, created_at) VALUES (?, ?, ?, ?, ?, ?)`;
      cartConnection.query(insertItemSql, [Email, name, price, source, quantity, created_at], (insertErr, insertResults) => {
        if (insertErr) {
          console.error('Error adding item to cart:', insertErr);
          return res.status(500).send('Internal Server Error');
        }
        console.log('Item added to cart successfully');
        const updateImageSql = `CALL UpdateCartItemImage(?)`;
        cartConnection.query(updateImageSql, [name], (updateErr, updateResults) => {
          if (updateErr) {
            console.error('Error updating item image:', updateErr);
            return res.status(500).send('Internal Server Error');
          }
          console.log('Item image updated successfully');
          res.status(200).send('Item added to cart successfully');
        });
      });
    }
  });
});



app.post('/api/cart/remove', (req, res) => {
  const { name, price, source } = req.body;
  const Email = req.session.userEmail;

  if (!Email) {
    console.error('User not logged in');
    return res.status(401).send('User not logged in');
  }

  const checkItemSql = `SELECT * FROM cart_items WHERE Email = ? AND name = ? AND price = ? AND source = ?`;
  cartConnection.query(checkItemSql, [Email, name, price, source], (checkErr, checkResults) => {
    if (checkErr) {
      console.error('Error checking item in cart:', checkErr);
      return res.status(500).send('Internal Server Error');
    }

    if (checkResults.length === 0) {
      console.error('Item not found in cart');
      return res.status(404).send('Item not found in cart');
    }

    if (checkResults[0].quantity > 1) {
      const updateQuantitySql = `UPDATE cart_items SET quantity = quantity - 1 WHERE Email = ? AND name = ? AND price = ? AND source = ?`;
      cartConnection.query(updateQuantitySql, [Email, name, price, source], (updateErr, updateResults) => {
        if (updateErr) {
          console.error('Error updating item quantity:', updateErr);
          return res.status(500).send('Internal Server Error');
        }
        console.log('Item quantity decremented successfully');
        res.status(200).send('Item quantity decremented successfully');
      });
    } else {
      const deleteItemSql = `DELETE FROM cart_items WHERE Email = ? AND name = ? AND price = ? AND source = ?`;
      cartConnection.query(deleteItemSql, [Email, name, price, source], (deleteErr, deleteResults) => {
        if (deleteErr) {
          console.error('Error removing item from cart:', deleteErr);
          return res.status(500).send('Internal Server Error');
        }
        console.log('Item removed from cart successfully');
        res.status(200).send('Item removed from cart successfully');
      });
    }
  });
});


app.get('/api/cart/items', (req, res) => {
  const Email = req.session.userEmail;

  if (!Email) {
    console.error('User not logged in');
    return res.status(401).send('User not logged in');
  }

  const sql = `SELECT * FROM cart_items WHERE Email = ?`;
  cartConnection.query(sql, [Email], (err, results) => {
    if (err) {
      console.error('Error fetching cart items: ', err);
      res.status(500).send('Internal Server Error');
      return;
    }
    res.json(results);
  });
});

app.get('/api/notifications', (req, res) => {
  const sql = `SELECT * FROM notification ORDER BY created_at DESC LIMIT 10`;
  notificationConnection.query(sql, (err, results) => {
    if (err) {
      console.error('Error fetching notifications:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    res.status(200).json(results);
  });
});

app.post('/show-reviews', (req, res) => {
  const { name, review, rating, quantity, created_at } = req.body;
  const Email = req.session.userEmail;

  if (!Email) {
    console.error('User not logged in');
    return res.status(401).send('User not logged in');
  }

  const sql = `INSERT INTO demo (Email, name, review, rating, quantity, created_at) VALUES (?, ?, ?, ?, ?, ?)`;
  console.log('Adding to reviews:', { Email, name, review, rating, quantity, created_at });
  dbReviews.query(sql, [Email, name, review, rating, quantity, created_at], (err, results) => {
    if (err) {
      console.error('Error adding review to database: ', err);
      return res.status(500).send('Internal Server Error');
    }
    res.status(200).send('Review added successfully');
  });
});

app.get('/api/reviews', (req, res) => {
  const { name } = req.query;
  const sql = 'SELECT * FROM demo WHERE name = ?';
  dbReviews.query(sql, [name], (err, results) => {
    if (err) {
      console.error('Error fetching data from database:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    res.json(results);
  });
});

app.put('/api/products/:id', (req, res) => {
  const { id } = req.params;
  const { name, price, type } = req.body;

  const productUpdateSql = `UPDATE producttable SET name = ?, price = ?, type = ? WHERE id = ?`;
  productsConnection.query(productUpdateSql, [name, price, type, id], (err, results) => {
    if (err) {
      console.error('Error updating product:', err);
      return res.status(500).send('Internal Server Error');
    }

    const cartUpdateSql = `UPDATE cart_items SET name = ?, price = ? WHERE name = ?`;
    cartConnection.query(cartUpdateSql, [name, price, name], (err, cartResults) => {
      if (err) {
        console.error('Error updating cart items:', err);
        return res.status(500).send('Internal Server Error');
      }

      res.status(200).send('Product and cart items updated successfully');
    });
  });
});

app.delete('/api/products/:id', (req, res) => {
  const { id } = req.params;

  const fetchProductSql = `SELECT name FROM producttable WHERE id = ?`;
  productsConnection.query(fetchProductSql, [id], (err, fetchResults) => {
    if (err) {
      console.error('Error fetching product:', err);
      return res.status(500).send('Internal Server Error');
    }

    const productName = fetchResults[0]?.name;
    if (!productName) {
      return res.status(404).send('Product not found');
    }

    const deleteCartSql = `DELETE FROM cart_items WHERE name = ?`;
    cartConnection.query(deleteCartSql, [productName], (err, cartResults) => {
      if (err) {
        console.error('Error deleting cart items:', err);
        return res.status(500).send('Internal Server Error');
      }

      const deleteProductSql = `DELETE FROM producttable WHERE id = ?`;
      productsConnection.query(deleteProductSql, [id], (err, results) => {
        if (err) {
          console.error('Error deleting product:', err);
          return res.status(500).send('Internal Server Error');
        }

        res.status(200).send('Product and cart items deleted successfully');
      });
    });
  });
});





const sug = mysql.createConnection({
  host: 'localhost',
  user: 'root', 
  password: '',
  database: 'suggestions'
});

sug.connect(err => {
  if (err) {
      console.error('Error connecting to the database:', err.message);
      return;
  }
  console.log('Connected to the MySQL database.');

  const createTableQuery = `
      CREATE TABLE IF NOT EXISTS suggestions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          suggestion TEXT NOT NULL,
          rating INT NOT NULL
      )
  `;
  sug.query(createTableQuery, err => {
      if (err) {
          console.error('Error creating table:', err.message);
      }
  });
});

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.post('/submit-suggestion', (req, res) => {
  const { name, suggestion, rating } = req.body;
  const sql = `INSERT INTO suggestions (name, suggestion, rating) VALUES (?, ?, ?)`;
  sug.query(sql, [name, suggestion, rating], (err) => {
      if (err) {
          return res.status(500).send(err.message);
      }
      res.redirect('/');
  });
});

app.get('/view-suggestions', (req, res) => {
  const sql = `SELECT name, suggestion, rating FROM suggestions`;
  sug.query(sql, (err, results) => {
      if (err) {
          return res.status(500).send(err.message);
      }
      res.json(results);
  });
});

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/suggestions.html');
});





app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: 'your_secret_key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } 
}));





app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));

app.get('/relogin', (req, res) => {
  res.render('login');
});

app.post('/relogin', (req, res) => {
  const { email, password } = req.body;

  const sql = 'SELECT * FROM signuptable WHERE Email = ? AND password = ?';
  connection.query(sql, [email, password], (err, results) => {
    if (err) {
      console.error('Error executing login query: ', err);
      res.status(500).send('Internal Server Error');
      return;
    }

    if (results.length > 0) {
      req.session.email = email;
      res.redirect('/profile');
    } else {
      res.status(401).send('Invalid credentials');
    }
  });
});

app.get('/profile', (req, res) => {
  if (!req.session.email) {
    return res.redirect('/relogin');
  }

  const email = req.session.email;
  const query = 'SELECT * FROM signuptable WHERE Email = ?';
  
  connection.query(query, [email], (err, results) => {
    if (err) {
      console.error('Error executing profile query: ', err);
      res.status(500).send('Internal Server Error');
      return;
    }

    if (results.length > 0) {
      const user = results[0];
      console.log('User data fetched: ', user); 
      res.render('profile', { user });
    } else {
      res.status(404).send('User not found');
    }
  });
});

app.post('/save-profile', (req, res) => {
  if (!req.session.email) {
    return res.redirect('/relogin');
  }

  const email = req.session.email;
  const { firstName, lastName, dob, phno, address, password } = req.body;
  const query = 'UPDATE signuptable SET Firstname = ?, Lastname = ?, dob = ?, phno = ?, address = ?, password = ? WHERE Email = ?';
  
  connection.query(query, [firstName, lastName, dob, phno, address, password, email], (err) => {
    if (err) {
      console.error('Error executing update query: ', err);
      res.status(500).send('Internal Server Error');
      return;
    }
    res.redirect('/profile');
  });
});


app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
