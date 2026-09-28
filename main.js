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
    db.all(
      "SELECT id, name, logo_url, url FROM clients ORDER BY name ASC",
      [],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      },
    );
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

ipcMain.handle("clients:update", (event, client) => {
  return new Promise((resolve, reject) => {
    const query = `
      UPDATE clients 
      SET name = ?, logo_url = ?, url = ?
      WHERE id = ?
    `;
    const params = [
      client.name ? client.name.trim() : "",
      client.logo_url ? client.logo_url.trim() : null,
      client.url ? client.url.trim() : null,
      client.id,
    ];
    db.run(query, params, function (err) {
      if (err) reject(err);
      else resolve({ success: true, changes: this.changes });
    });
  });
});

ipcMain.handle("clients:delete", (event, id) => {
  return new Promise((resolve, reject) => {
    db.run("DELETE FROM clients WHERE id = ?", [id], function (err) {
      if (err) reject(err);
      else resolve({ success: true, changes: this.changes });
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
        c.url as client_url,
        c.logo_url as client_logo
      FROM subscriptions s
      LEFT JOIN clients c ON s.client_id = c.id
      GROUP BY s.id
      ORDER BY s.next_due_date ASC
    `;

    db.all(query, [], (err, rows) => {
      if (err) return reject(err);

      // Append services array to each row before sending to React
      const formatted = (rows || []).map((row) => ({
        ...row,
        services: row.services_str ? row.services_str.split(", ") : [],
      }));
      resolve(formatted); //send back services as an array which is what the frontend expects to operate
    });
  });
});

ipcMain.handle("subscriptions:add", (event, sub) => {
  return new Promise((resolve, reject) => {
    const servicesArray = sub.services;
    let servicesStr;
    if (servicesArray && Array.isArray(servicesArray)) {
      servicesStr = servicesArray.join(", ");
    }

    const subId = uuidv4();

    const query = `
      INSERT INTO subscriptions 
      (id, provider_name, preset_id, client_id, billing_url, amount, frequency, start_date, next_due_date, status, payment_status, notes, services_str)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      subId,
      sub.provider_name ? String(sub.provider_name).trim() : null, // Clean provider ID
      sub.preset_id || "",
      sub.client_id || null,
      sub.billing_url ? sub.billing_url.trim() : null,
      Number(sub.amount) || 0,
      sub.frequency || "monthly",
      sub.start_date || "",
      sub.next_due_date || null,
      (sub.status || "active").toLowerCase(),
      (sub.payment_status || "").toLowerCase(),
      sub.notes || "",
      servicesStr || "",
    ];

    db.run(query, params, function (err) {
      if (err) {
        reject(err.message);
      } else {
        resolve({ success: true });
      }
    });
  });
});

ipcMain.handle("subscriptions:update", (event, sub) => {
  return new Promise((resolve, reject) => {
    const servicesArray = sub.services;
    let servicesStr;
    if (servicesArray && Array.isArray(servicesArray)) {
      servicesStr = servicesArray.join(", "); //disassemble the services array
    }

    const subQuery = `SELECT status, payment_status FROM subscriptions WHERE id = ?`;

    db.get(subQuery, [sub.id], (error, row) => {
      if (error) {
        return reject(error);
      }

      // Extract the old status string safely
      const formerSubStatus = row ? row.status : "";
      const newStatus = sub.status?.toLowerCase();

      // Determine if status changed
      const statusChanged =
        String(formerSubStatus).trim()?.toUpperCase() !==
        String(newStatus).trim()?.toUpperCase();

      const formerPaymentStatus = row ? row.payment_status : "";
      const newPaymentStatus = sub.payment_status?.toLowerCase() || "";
      const paymentStatusChanged =
        String(formerPaymentStatus).trim()?.toUpperCase() !==
        String(newPaymentStatus).trim()?.toUpperCase();

      // 2. Start serialized execution for the transaction
      db.serialize(() => {
        let failed = false;

        db.run("BEGIN TRANSACTION", (err) => {
          if (err) {
            failed = true;
            return reject(err);
          }
        });

        // 3. Update main subscription row
        const updateQuery = `
          UPDATE subscriptions 
          SET provider_name = ?, preset_id = ?, client_id = ?, billing_url = ?,
              amount = ?, frequency = ?, start_date = ?, next_due_date = ?, status = ?, payment_status = ?, notes = ?, services_str = ?
          WHERE id = ?
        `;
        const updateParams = [
          sub.provider_name || null,
          sub.client_id || null,
          sub.preset_id || "",
          sub.billing_url ? sub.billing_url.trim() : null,
          Number(sub.amount) || 0,
          sub.frequency || "monthly",
          sub.start_date || null,
          sub.next_due_date || null,
          newStatus,
          newPaymentStatus,
          sub.notes ? sub.notes.trim() : "",
          servicesStr || "",
          sub.id,
        ];

        db.run(updateQuery, updateParams, function (err) {
          if (err && !failed) {
            failed = true;
            db.run("ROLLBACK");
            return reject(err);
          }
        });

        // 4. Insert status change ONLY if it actually changed
        if (statusChanged) {
          const insertStatusQuery = `INSERT INTO status_changes (id, subscription_id, former_status, new_status, concerns_payment) VALUES (?, ?, ?, ?, 0)`;
          db.run(
            insertStatusQuery,
            [uuidv4(), sub.id, formerSubStatus, newStatus],
            function (err) {
              if (err && !failed) {
                failed = true;
                db.run("ROLLBACK");
                return reject(err);
              }
            },
          );
        }

        if (paymentStatusChanged) {
          const insertStatusQuery = `INSERT INTO status_changes (id, subscription_id, former_status, new_status, concerns_payment) VALUES (?, ?, ?, ?, 1)`;
          db.run(
            insertStatusQuery,
            [uuidv4(), sub.id, formerPaymentStatus, newPaymentStatus],
            function (err) {
              if (err && !failed) {
                failed = true;
                db.run("ROLLBACK");
                return reject(err);
              }
            },
          );
        }

        // 7. Commit changes
        db.run("COMMIT", function (err) {
          if (err && !failed) {
            db.run("ROLLBACK");
            return reject(err);
          }
          if (!failed) resolve({ success: true, ...sub });
        });
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

// ----------------------------------------------------
// IPC: available_services
// ----------------------------------------------------
ipcMain.handle("presets:getAll", (event) => {
  return new Promise((resolve, reject) => {
    const query = "SELECT * FROM presets";
    db.all(query, [], function (err, rows) {
      if (err) {
        reject(err);
      } else {
        const formatted = (rows || []).map((row) => ({
          //convert to usable array
          ...row,
          services: row.services_str ? row.services_str.split(", ") : [],
        }));
        resolve(formatted || []);
      }
    });
  });
});

ipcMain.handle(
  "presets:add",
  (
    event,
    { service_name, provider_name, amount, frequency, services, url },
  ) => {
    let servicesStr;
    if (services && Array.isArray(services)) {
      servicesStr = services.join(", ");
    }
    return new Promise((resolve, reject) => {
      const uid = uuidv4();
      const query =
        "INSERT INTO presets (id, service_name, provider_name, amount, frequency, services_str, url) VALUES ( ?, ?, ?, ?, ?, ?, ?)";
      const params = [
        uid,
        service_name ? service_name.trim() : "",
        provider_name ? provider_name.trim() : "",
        amount || 0,
        frequency in Array.from(("monthly", "anualy", "bi-anualy"))
          ? frequency.trim()
          : "anualy",
        servicesStr || "",
        url ? url.trim() : "",
      ];
      db.run(query, params, function (err) {
        if (err) reject(err);
        else resolve({ success: true });
      });
    });
  },
);

ipcMain.handle("presets:update", (event, preset) => {
  const servicesArray = preset.services;
  let servicesStr;
  if (servicesArray && Array.isArray(servicesArray)) {
    servicesStr = servicesArray.join(", ");
  }
  return new Promise((resolve, reject) => {
    const query = `
      UPDATE presets 
      SET service_name = ?, provider_name = ?, amount = ?, frequency = ?, services_str = ?, url = ?
      WHERE id = ?
    `;
    const params = [
      preset.service_name ? preset.service_name.trim() : "",
      preset.provider_name ? preset.provider_name.trim() : "",
      preset.amount || 0,
      preset.frequency || "",
      servicesStr || "",
      preset.url ? preset.url.trim() : null,
      preset.id,
    ];
    db.run(query, params, function (err) {
      if (err) reject(err);
      else resolve({ preset });
    });
  });
});

ipcMain.handle("presets:delete", (event, id) => {
  return new Promise((resolve, reject) => {
    db.run("DELETE FROM presets WHERE id = ?", [id], function (err) {
      if (err) reject(err);
      else resolve({ success: true });
    });
  });
});

// ----------------------------------------------------
// IPC: ststus change
// ----------------------------------------------------
ipcMain.handle("statusChanges:getSubscription", (event, id) => {
  return new Promise((resolve, reject) => {
    const query = `SELECT * FROM status_changes WHERE subscription_id = ? ORDER BY timestamp ASC`;

    db.all(query, [id], (error, rows) => {
      if (error) {
        reject(error);
      } else {
        resolve(rows);
      }
    });
  });
});

ipcMain.handle("statusChanges:add", (event, sc) => {}); //manual changes get created in update subscription
