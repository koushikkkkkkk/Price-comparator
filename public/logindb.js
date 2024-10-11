const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const cors = require('cors');

// Create Express app
const app = express();
const port = 3000;

// Middleware to parse JSON and URL-encoded request bodies
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Use sessions for login tracking
app.use(session({
  secret: 'your_secret_key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Set to true if using HTTPS
}));

// Database connection parameters for login database
const loginConnection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'signup'
});

// Connect to the login database
loginConnection.connect((err) => {
  if (err) {
    console.error('Error connecting to login database: ', err);
    return;
  }
  console.log('Connected to login database');
});

// Database connection parameters for products database
const productsConnection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'products'
});

// Connect to the products database
productsConnection.connect((err) => {
  if (err) {
    console.error('Error connecting to products database:', err);
    return;
  }
  console.log('Connected to the products database.');
});

// Handle GET request to the root URL
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Handle POST request to /login
app.post('/login', (req, res) => {
  const { Email, password } = req.body;

  const sql = `SELECT * FROM signuptable WHERE Email = ? AND password = ?`;
  loginConnection.query(sql, [Email, password], (err, results) => {
    if (err) {
      console.error('Error executing login query: ', err);
      res.status(500).send('Internal Server Error');
      return;
    }

    if (results.length > 0) {
      req.session.userEmail = Email; // Store email in session
      res.redirect('/price.html');
    } else {
      res.status(401).send('Invalid credentials');
    }
  });
});

// Endpoint to get products by type
app.get('/api/products', (req, res) => {
  const { type } = req.query;
  let sql = 'SELECT * FROM producttable';
  if (type) {
    sql += ` WHERE type = '${type}'`;
  }
  productsConnection.query(sql, (err, results) => {
    if (err) {
      console.error('Error fetching products:', err);
      return res.status(500).send('Internal Server Error');
    }
    res.json(results);
  });
});

// Database connection parameters for cart database
const cartConnection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'cart'
});

// Connect to the cart database
cartConnection.connect((err) => {
  if (err) {
    console.error('Error connecting to cart database: ', err);
    return;
  }
  console.log('Connected to cart database');
});

// Endpoint to add an item to the cart
app.post('/api/cart/add', (req, res) => {
  const { name, price, source, quantity, created_at } = req.body;
  const Email = req.session.userEmail; // Get email from session

  if (!Email) {
    console.error('User not logged in');
    return res.status(401).send('User not logged in');
  }

  const sql = `INSERT INTO cart_items (Email, name, price, source, quantity, created_at) VALUES (?, ?, ?, ?, ?, ?)`;
  console.log('Adding to cart:', { Email, name, price, source, quantity, created_at }); // Debug log
  cartConnection.query(sql, [Email, name, price, source, quantity, created_at], (err, results) => {
    if (err) {
      console.error('Error adding item to cart: ', err);
      res.status(500).send('Internal Server Error');
      return;
    }
    res.status(200).send('Item added to cart successfully');
  });
});

// Endpoint to remove an item from the cart
app.post('/api/cart/remove', (req, res) => {
  const { name } = req.body;
  const Email = req.session.userEmail; // Get email from session

  if (!Email) {
    console.error('User not logged in');
    return res.status(401).send('User not logged in');
  }

  const sql = `DELETE FROM cart_items WHERE Email = ? AND name = ?`;
  cartConnection.query(sql, [Email, name], (err, results) => {
    if (err) {
      console.error('Error removing item from cart: ', err);
      res.status(500).send('Internal Server Error');
      return;
    }
    res.status(200).send('Item removed from cart successfully');
  });
});

// Endpoint to fetch all cart items for a user






// Database connection parameters for notification database
const notificationConnection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'notification'
});

// Connect to the notification database
notificationConnection.connect((err) => {
  if (err) {
    console.error('Error connecting to notification database: ', err);
    return;
  }
  console.log('Connected to notification database');
});

// Endpoint to fetch notifications
app.get('/api/notifications', (req, res) => {
  const sql = `SELECT * FROM notification ORDER BY created_at DESC LIMIT 10`; // Fetch latest 10 notifications
  notificationConnection.query(sql, (err, results) => {
    if (err) {
      console.error('Error fetching notifications:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    res.status(200).json(results);
  });
});








app.get('/api/cart/items', (req, res) => {
  const Email = req.session.userEmail; // Get email from session

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









// Database connection parameters for products database
const productsPool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'products',
  connectionLimit: 10 // Adjust according to your requirements
});

// Database connection parameters for cart database
const cartPool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'cart',
  connectionLimit: 10 // Adjust according to your requirements
});


app.put('/api/products/:id', (req, res) => {
  const { id } = req.params;
  const { name, price, type } = req.body;

  // Update product in products database
  const productUpdateSql = `UPDATE producttable SET name = ?, price = ?, type = ? WHERE id = ?`;
  productsPool.query(productUpdateSql, [name, price, type, id], (err, results) => {
    if (err) {
      logger.error('Error updating product:', err);
      return res.status(500).send('Internal Server Error');
    }

    // Update corresponding cart items in cart database
    const cartUpdateSql = `UPDATE cart_items SET name = ?, price = ? WHERE name = ?`;
    cartPool.query(cartUpdateSql, [name, price, name], (err, cartResults) => {
      if (err) {
        logger.error('Error updating cart items:', err);
        return res.status(500).send('Internal Server Error');
      }

      res.status(200).send('Product and cart items updated successfully');
    });
  });
});

app.delete('/api/products/:id', (req, res) => {
  const { id } = req.params;

  // Fetch product details before deletion
  const fetchProductSql = `SELECT name FROM producttable WHERE id = ?`;
  productsPool.query(fetchProductSql, [id], (err, fetchResults) => {
    if (err) {
      console.error('Error fetching product:', err);
      return res.status(500).send('Internal Server Error');
    }

    const productName = fetchResults[0]?.name;
    if (!productName) {
      return res.status(404).send('Product not found');
    }

    // Delete corresponding cart items from cart database
    const deleteCartSql = `DELETE FROM cart_items WHERE name = ?`;
    cartPool.query(deleteCartSql, [productName], (err, cartResults) => {
      if (err) {
        console.error('Error deleting cart items:', err);
        return res.status(500).send('Internal Server Error');
      }

      // Delete product from products database
      const deleteProductSql = `DELETE FROM producttable WHERE id = ?`;
      productsPool.query(deleteProductSql, [id], (err, results) => {
        if (err) {
          console.error('Error deleting product:', err);
          return res.status(500).send('Internal Server Error');
        }

        res.status(200).send('Product and cart items deleted successfully');
      });
    });
  });
});



// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
