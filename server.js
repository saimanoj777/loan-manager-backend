const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// PostgreSQL connection
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'loan_manager',
  password: 'Saimanoj@0830', // Replace with your actual password
  port: 5432,
});

// Initialize database
const initDb = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS applications (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        loan_amount INTEGER NOT NULL,
        tenure INTEGER,
        employment_status VARCHAR(255),
        reason TEXT,
        employment_address TEXT,
        purpose TEXT NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Database table "applications" initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

// Ensure the database is initialized before starting the server
initDb().then(() => {
  // API to submit application
  app.post('/api/applications', async (req, res) => {
    const { name, email, loanAmount, tenure, employmentStatus, reason, employmentAddress, purpose } = req.body;
    try {
      console.log('Received application:', req.body);
      await pool.query(
        'INSERT INTO applications (name, email, loan_amount, tenure, employment_status, reason, employment_address, purpose) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [name, email, loanAmount, tenure, employmentStatus, reason, employmentAddress, purpose]
      );
      const status = loanAmount > 100000 ? 'rejected' : 'approved';
      await pool.query(
        'UPDATE applications SET status = $1 WHERE email = $2 AND created_at = (SELECT MAX(created_at) FROM applications WHERE email = $2)',
        [status, email]
      );
      res.status(200).send('Application submitted');
    } catch (error) {
      console.error('Error submitting application:', error);
      res.status(500).send('Server error: ' + error.message);
    }
  });

  // API to get statistics
  app.get('/api/statistics', async (req, res) => {
    try {
      const total = await pool.query('SELECT COUNT(*) FROM applications');
      const approved = await pool.query("SELECT COUNT(*) FROM applications WHERE status = 'approved'");
      const rejected = await pool.query("SELECT COUNT(*) FROM applications WHERE status = 'rejected'");
      const avgLoan = await pool.query('SELECT AVG(loan_amount) FROM applications');
      res.json({
        totalApplications: parseInt(total.rows[0].count),
        approved: parseInt(approved.rows[0].count),
        rejected: parseInt(rejected.rows[0].count),
        averageLoan: parseFloat(avgLoan.rows[0].avg) || 0,
      });
    } catch (error) {
      console.error('Error fetching statistics:', error);
      res.status(500).send('Server error');
    }
  });

  // API to get user applications
  app.get('/api/user-applications', async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM applications ORDER BY created_at DESC');
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching user applications:', error);
      res.status(500).send('Server error');
    }
  });

  app.listen(3000, () => console.log('Server running on port 3000'));
}).catch((error) => {
  console.error('Failed to initialize database. Server not started:', error);
  process.exit(1);
});