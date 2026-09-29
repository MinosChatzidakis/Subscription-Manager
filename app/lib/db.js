// db.js
require("dotenv").config(); // MUST be called to load process.env variables
const { Pool } = require("pg");

// 1. Establish the connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// 2. Define your table creation logic in an async function
async function initializeDB() {
  try {
    // Postgres doesn't need .serialize(), queries run in order when awaited

    await pool.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        logo_url TEXT,
        url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Note: Added missing comma after services_str
    await pool.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        provider_name TEXT,
        preset_id TEXT,
        client_id TEXT,
        billing_url TEXT,
        amount REAL NOT NULL,
        frequency TEXT NOT NULL,
        start_date TEXT NOT NULL,
        next_due_date TEXT NOT NULL,
        status TEXT CHECK(status IN ('active', 'canceled', 'renewal coming up')) DEFAULT 'active',
        payment_status TEXT CHECK (payment_status IN ( NULL, 'pending', 'invoice issued', 'paid')) DEFAULT NULL,
        notes TEXT,
        services_str TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS status_changes (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        subscription_id TEXT,
        former_status TEXT CHECK(former_status IN (NULL, 'active', 'canceled', 'renewal coming up', 'pending', 'invoice issued', 'paid')) DEFAULT 'active',
        new_status TEXT CHECK(new_status IN (NULL, 'active', 'paused', 'canceled', 'past_due', 'invoice issued', 'invoice paid')) DEFAULT 'active',
        concerns_payment INTEGER NOT NULL DEFAULT 0,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS presets (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        service_name TEXT NOT NULL,
        provider_name TEXT,
        amount REAL DEFAULT 0,
        frequency TEXT NOT NULL CHECK (frequency IN ('monthly', 'anualy', 'bi-anualy')),
        services_str TEXT,
        url TEXT
      )
    `);

    console.log("Cloud Database tables verified successfully.");
  } catch (err) {
    console.error("Failed to initialize database tables:", err.message);
  }
}

initializeDB();

module.exports = pool;
