const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const { app } = require("electron");

const dbPath = path.join(app.getPath("userData"), "sub_tracker.db");
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(
    `
    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      logo_url TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `,
    //logo BLOB
    (err) => {
      if (err) console.error("Error in clients table syntax:", err.message);
    },
  );

  db.run(
    `
    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      provider TEXT,
      client_id TEXT,
      billing_url TEXT,
      cancellation_url TEXT,
      amount REAL NOT NULL,
      frequency TEXT NOT NULL,
      start_date TEXT NOT NULL,
      next_due_date TEXT NOT NULL,
      status TEXT CHECK(status IN ('active', 'paused', 'canceled', 'past_due', 'invoice_issued', 'invoice_paid')) DEFAULT 'active',
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `,
    (err) => {
      if (err)
        console.error("Error in subscriptions table syntax:", err.message);
    },
  );

  db.run(
    `
    CREATE TABLE IF NOT EXISTS services (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    subscription_id TEXT NOT NULL
    )`,
    (err) => {
      if (err) console.error("Error in services table syntax:", err.message);
    },
  );

  db.run(
    `
    CREATE TABLE IF NOT EXISTS status_changes (
      id TEXT PRIMARY KEY,
      subscription TEXT,
      former_status TEXT NOT NULL CHECK(former_status IN ('active', 'paused', 'canceled', 'past_due', 'invoice_issued', 'invoice_paid')) DEFAULT 'active',
      new_status TEXT NOT NULL CHECK(new_status IN ('active', 'paused', 'canceled', 'past_due', 'invoice_issued', 'invoice_paid')) DEFAULT 'active',
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
    (err) => {
      if (err)
        console.error("Error in status_change table syntax:", err.message);
    },
  );
});

//add billing history -- invoices??
//add billing url and cancellation url
//add client url
//add notes to subscription

module.exports = db;
