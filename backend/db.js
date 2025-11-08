const { Pool } = require('pg');
require('dotenv').config(); // Loads variables from .env

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // If you deploy to production, you might need SSL
   ssl: {
     rejectUnauthorized: false 
  }
});

module.exports = {
  // We export a query function that will be used by all our API routes
  query: (text, params) => pool.query(text, params),
  
  // We also export the pool directly for transactions
  pool: pool 
};
