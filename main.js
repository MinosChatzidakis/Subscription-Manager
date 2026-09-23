const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const db = require("./db"); // Expects sqlite3 database instance

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Load Vite server in development, compiled build in production
  if (process.env.NODE_ENV === "development") {
    mainWindow.loadURL("http://localhost:5173");
  } else {
    mainWindow.loadFile(path.join(__dirname, "dist", "index.html"));
  }

  mainWindow.webContents.openDevTools();

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  // Gracefully close the database connection when all windows exit
  if (db) {
    db.close((err) => {
      if (err) console.error("Error closing sqlite3 database:", err.message);
    });
  }

  if (process.platform !== "darwin") {
    app.quit();
  }
});

// ----------------------------------------------------
// IPC: Clients
// ----------------------------------------------------
ipcMain.handle("clients:getAll", () => {
  return new Promise((resolve, reject) => {
    db.all("SELECT * FROM clients ORDER BY name ASC", [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
});

ipcMain.handle("clients:add", (event, { name, logo_url }) => {
  return new Promise((resolve, reject) => {
    const id = uuidv4();
    const query = "INSERT INTO clients (id, name, logo_url) VALUES ( ?, ?, ?)";
    const params = [
      id,
      name ? name.trim() : "",
      //contact_email ? contact_email.trim() : null,
      logo_url ? logo_url.trim() : null,
    ];

    db.run(query, params, function (err) {
      if (err) reject(err);
      else resolve({ id, name, logo_url });
    });
  });
});

// ----------------------------------------------------
// IPC: Subscriptions
// ----------------------------------------------------
ipcMain.handle("subscriptions:getAll", () => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT 
        s.*, 
        c.name AS client_name,
        c.logo_url as client_logo,
        GROUP_CONCAT(ss.name, '||') AS services_str
      FROM subscriptions s
      LEFT JOIN clients c ON s.client_id = c.id
      LEFT JOIN services ss ON s.id = ss.subscription_id
      GROUP BY s.id
      ORDER BY s.next_due_date ASC
    `;

    db.all(query, [], (err, rows) => {
      if (err) return reject(err);

      // Append services array to each row before sending to React
      const formatted = (rows || []).map((row) => ({
        ...row,
        services: row.services_str ? row.services_str.split("||") : [],
      }));

      resolve(formatted);
    });
  });
});

ipcMain.handle("subscriptions:add", (event, sub) => {
  return new Promise((resolve, reject) => {
    const subId = uuidv4();

    const query = `
      INSERT INTO subscriptions 
      (id, provider, client_id, billing_url, cancellation_url, amount, frequency, start_date, next_due_date, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      subId,
      sub.provider ? sub.provider.trim() : "",
      sub.client_id || null,
      sub.billing_url ? sub.billing_url.trim() : null,
      sub.cancellation_url ? sub.cancellation_url.trim() : null,
      Number(sub.amount) || 0,
      sub.frequency || "monthly",
      sub.start_date || "",
      sub.next_due_date || null,
      (sub.status || "active").toLowerCase(),
      sub.notes || "",
    ];

    db.serialize(() => {
      let failed = false;

      // 1. Begin transaction
      db.run("BEGIN TRANSACTION", (err) => {
        if (err) {
          failed = true;
          return reject(err);
        }
      });

      // 2. Insert main subscription record
      db.run(query, params, function (err) {
        if (err && !failed) {
          failed = true;
          db.run("ROLLBACK");
          return reject(err);
        }
      });

      // 3. Insert child services (if any)
      if (Array.isArray(sub.services) && sub.services.length > 0) {
        const stmt = db.prepare(
          "INSERT INTO services (id, subscription_id, name) VALUES (?, ?, ?)",
        );

        for (const service of sub.services) {
          stmt.run([uuidv4(), subId, String(service).trim()], (err) => {
            if (err && !failed) {
              failed = true;
              db.run("ROLLBACK");
              return reject(err);
            }
          });
        }
        stmt.finalize();
      }

      // 4. COMMIT - ONLY resolve here!
      db.run("COMMIT", function (err) {
        if (err && !failed) {
          db.run("ROLLBACK");
          return reject(err);
        }
        if (!failed) {
          // React only continues when the disk write is 100% complete
          resolve({ id: subId, ...sub });
        }
      });
    });
  });
});

ipcMain.handle("subscriptions:delete", (event, id) => {
  return new Promise((resolve, reject) => {
    db.run("DELETE FROM subscriptions WHERE id = ?", [id], function (err) {
      if (err) reject(err);
      else resolve({ success: true, changes: this.changes });
    });
  });
});
// ----------------------------------------------------
// IPC: External Links
// ----------------------------------------------------
ipcMain.handle("utils:openLink", async (event, url) => {
  if (url && (url.startsWith("http://") || url.startsWith("https://"))) {
    await shell.openExternal(url);
  }
});
