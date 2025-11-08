const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const db = require('./db'); // Our db.js file
const authMiddleware = require('./authMiddleware'); // Our authMiddleware.js file
require('dotenv').config();

const app = express();

// --- Middleware ---
// Allow requests from our frontend (running on localhost:3000)
app.use(cors({
  origin: 'http://localhost:3000' 
}));
// Allow our server to read JSON data from requests
app.use(express.json());


// --- Routes ---

// 1. REGISTER
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ msg: 'Please enter all fields' });
    }

    const userCheck = await db.query("SELECT * FROM users WHERE username = $1", [username]);
    if (userCheck.rows.length > 0) {
      return res.status(400).json({ msg: 'Username already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    
    // Baseline currency: 100
    const newUser = await db.query(
      "INSERT INTO users (username, password_hash, currency_balance) VALUES ($1, $2, $3) RETURNING id, username, currency_balance",
      [username, passwordHash, 100]
    );

    res.status(201).json(newUser.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// 2. LOGIN
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const user = await db.query("SELECT * FROM users WHERE username = $1", [username]);
    if (user.rows.length === 0) {
      return res.status(401).json({ msg: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.rows[0].password_hash);
    if (!isMatch) {
      return res.status(401).json({ msg: 'Invalid credentials' });
    }

    const payload = { user: { id: user.rows[0].id } };

    jwt.sign(
      payload, 
      process.env.JWT_SECRET, 
      { expiresIn: '3h' }, // Token expires in 3 hours
      (err, token) => {
        if (err) throw err;
        res.json({ token }); // Send token to client
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// 3. GET USER TRANSACTIONS
// This route is protected. You must have a valid token.
app.get('/api/transactions', authMiddleware, async (req, res) => {
  try {
    const transactions = await db.query(
      "SELECT timestamp, delta, final_updated_value, source FROM transactions WHERE user_id = $1 ORDER BY timestamp DESC",
      [req.user.id] // req.user.id comes from the authMiddleware
    );
    res.json(transactions.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// 4. REFILL CURRENCY
app.post('/api/currency/refill', authMiddleware, async (req, res) => {
  const refillAmount = 100;
  const threshold = 10;
  
  const client = await db.pool.connect(); 
  
  try {
    await client.query('BEGIN'); // Start transaction

    const userResult = await client.query("SELECT currency_balance FROM users WHERE id = $1 FOR UPDATE", [req.user.id]);
    const currentBalance = parseFloat(userResult.rows[0].currency_balance);

    if (currentBalance >= threshold) {
      await client.query('ROLLBACK');
      return res.status(400).json({ msg: `Balance must be below ${threshold} to refill.` });
    }

    const newBalance = currentBalance + refillAmount;
    await client.query("UPDATE users SET currency_balance = $1 WHERE id = $2", [newBalance, req.user.id]);
    await client.query(
      "INSERT INTO transactions (user_id, delta, final_updated_value, source) VALUES ($1, $2, $3, $4)",
      [req.user.id, refillAmount, newBalance, 'refill']
    );

    await client.query('COMMIT');
    res.json({ newBalance, msg: 'Refill successful!' });
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err.message);
    res.status(500).send('Server error');
  } finally {
    client.release();
  }
});

// 5. PLAY COINFLIP
app.post('/api/game/coinflip', authMiddleware, async (req, res) => {
  const { betAmount, choice } = req.body;
  const bet = parseFloat(betAmount);
  
  if (!bet || bet <= 0 || (choice !== 'heads' && choice !== 'tails')) {
    return res.status(400).json({ msg: 'Invalid bet or choice' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const userResult = await client.query("SELECT currency_balance FROM users WHERE id = $1 FOR UPDATE", [req.user.id]);
    let currentBalance = parseFloat(userResult.rows[0].currency_balance);

    if (currentBalance < bet) {
      await client.query('ROLLBACK');
      return res.status(400).json({ msg: 'Insufficient funds' });
    }

    currentBalance -= bet;
    await client.query("UPDATE users SET currency_balance = $1 WHERE id = $2", [currentBalance, req.user.id]);
    await client.query(
      "INSERT INTO transactions (user_id, delta, final_updated_value, source) VALUES ($1, $2, $3, $4)",
      [req.user.id, -bet, currentBalance, 'coinflip-bet']
    );

    const serverResult = Math.random() < 0.5 ? 'heads' : 'tails';
    
    let userWon = serverResult === choice;
    let payout = 0;
    
    if (userWon) {
      payout = bet * 2;
      currentBalance += payout;
      await client.query("UPDATE users SET currency_balance = $1 WHERE id = $2", [currentBalance, req.user.id]);
      await client.query(
        "INSERT INTO transactions (user_id, delta, final_updated_value, source) VALUES ($1, $2, $3, $4)",
        [req.user.id, payout, currentBalance, 'coinflip-win']
      );
    }

    await client.query('COMMIT');
    
    res.json({
      result: serverResult,
      won: userWon,
      newBalance: currentBalance
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err.message);
    res.status(500).send('Server error');
  } finally {
    client.release();
  }
});

// --- Start Server ---
const PORT = process.env.PORT || 5000; // Use 5000 as a default
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
