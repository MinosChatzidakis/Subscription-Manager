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
      url TEXT,
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
      services_str TEXT
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
    CREATE TABLE IF NOT EXISTS status_changes (
      id TEXT PRIMARY KEY,
      subscription_id TEXT,
      former_status TEXT CHECK(former_status IN (NULL, 'active', 'canceled', 'renewal coming up', 'pending', 'invoice issued', 'paid')) DEFAULT 'active',
      new_status TEXT CHECK(new_status IN (NULL, 'active', 'paused', 'canceled', 'past_due', 'invoice issued', 'invoice paid')) DEFAULT 'active',
      concerns_payment INTEGER NOT NULL DEFAULT 0,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
    (err) => {
      if (err)
        console.error("Error in status_change table syntax:", err.message);
    },
  );

  db.run(
    `
    CREATE TABLE IF NOT EXISTS presets (
      id TEXT PRIMARY KEY,
      service_name TEXT NOT NULL,
      provider_name TEXT,
      amount REAL DEFAULT 0,
      frequency TEXT NOT NULL CHECK (frequency IN ('monthly', 'anualy', 'bi-anualy')),
      services_str TEXT,
      url TEXT
  )`,
    (err) => {
      if (err)
        console.error("Error in available_services table syntax:", err.message);
    },
  );
});

//add billing history -- invoices??
//add billing url and cancellation url
//add client url
//add notes to subscription

module.exports = db;
