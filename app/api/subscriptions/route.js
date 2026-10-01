import { NextResponse } from "next/server";
import pool from "@/app/lib/db";
import { auth } from "@clerk/nextjs/server"; // Ensures only logged-in users can access this
import crypto from "crypto"; // Built-in Node tool, replaces uuidv4()
import { checkStatusChange } from "@/app/lib/statusUtils";

// GET: Fetch all subscriptions
export async function GET(request) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const query = `
      SELECT 
        s.*, 
        c.name AS client_name,
        c.url as client_url,
        c.logo_url as client_logo
      FROM subscriptions s
      LEFT JOIN clients c ON s.client_id = c.id
      WHERE s.user_id = $1
      ORDER BY s.next_due_date ASC
    `;

    const { rows } = await pool.query(query, [userId]);

    // Append services array to each row before sending to React
    const formatted = rows.map((row) => ({
      ...row,
      services: row.services_str ? row.services_str.split(", ") : [],
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("GET Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Add new subscription
export async function POST(request) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const sub = await request.json();
    const servicesStr = Array.isArray(sub.services)
      ? sub.services.join(", ")
      : "";
    const subId = crypto.randomUUID();

    const query = `
      INSERT INTO subscriptions 
      (id, user_id, provider_name, preset_id, client_id, billing_url, amount, frequency, start_date, next_due_date, status, payment_status, notes, services_str)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    `;

    const params = [
      subId,
      userId,
      sub.provider_name ? String(sub.provider_name).trim() : null,
      sub.preset_id || "",
      sub.client_id || null,
      sub.billing_url ? String(sub.billing_url).trim() : null,
      Number(sub.amount) || 0,
      sub.frequency || "monthly",
      sub.start_date || "",
      sub.next_due_date || null,
      (sub.status || "active").toLowerCase(),
      (sub.payment_status || "").toLowerCase(),
      sub.notes || "",
      servicesStr || "",
    ];

    await pool.query(query, params);
    return NextResponse.json({ success: true, id: subId });
  } catch (error) {
    console.error("POST Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: Update subscription (subscriptions:update)
export async function PUT(request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const rawSub = await request.json();
  const servicesStr = Array.isArray(rawSub.services)
    ? rawSub.services.join(", ")
    : "";

  const { subscription: sub } = checkStatusChange(rawSub);

  const newStatus = sub.status?.toLowerCase();
  const newPaymentStatus = sub.payment_status?.toLowerCase() || "";

  // 1. Check out a dedicated connection for the transaction
  const client = await pool.connect();

  try {
    // Start Transaction
    await client.query("BEGIN");

    // 2. Fetch former statuses securely
    const { rows } = await client.query(
      "SELECT status, payment_status FROM subscriptions WHERE id = $1 AND user_id = $2",
      [sub.id, userId],
    );

    if (rows.length === 0) {
      throw new Error("Subscription not found or not owned by user");
    }

    const formerSubStatus = rows[0].status || "";
    const formerPaymentStatus = rows[0].payment_status || "";

    const statusChanged =
      formerSubStatus.trim().toUpperCase() !== newStatus.trim().toUpperCase();
    const paymentStatusChanged =
      formerPaymentStatus.trim().toUpperCase() !==
      newPaymentStatus.trim().toUpperCase();

    console.log(statusChanged);

    // 3. Update main subscription row
    const updateQuery = `
      UPDATE subscriptions 
      SET provider_name = $1, preset_id = $2, client_id = $3, billing_url = $4,
          amount = $5, frequency = $6, start_date = $7, next_due_date = $8, status = $9, payment_status = $10, notes = $11, services_str = $12
      WHERE id = $13 AND user_id = $14
    `;

    const updateParams = [
      sub.provider_name || null,
      sub.preset_id || "",
      sub.client_id || null,
      sub.billing_url ? String(sub.billing_url).trim() : null,
      Number(sub.amount) || 0,
      sub.frequency || "monthly",
      sub.start_date || null,
      sub.next_due_date || null,
      newStatus,
      newPaymentStatus,
      sub.notes ? String(sub.notes).trim() : "",
      servicesStr,
      sub.id,
      userId,
    ];

    await client.query(updateQuery, updateParams);

    // 4. Insert status changes ONLY if they actually changed
    if (statusChanged) {
      await client.query(
        `INSERT INTO status_changes (id, user_id, subscription_id, former_status, new_status, concerns_payment) VALUES ($1, $2, $3, $4, $5, 0)`,
        [crypto.randomUUID(), userId, sub.id, formerSubStatus, newStatus],
      );
    }

    if (paymentStatusChanged) {
      await client.query(
        `INSERT INTO status_changes (id, user_id, subscription_id, former_status, new_status, concerns_payment) VALUES ($1, $2, $3, $4, $5, 1)`,
        [
          crypto.randomUUID(),
          userId,
          sub.id,
          formerPaymentStatus,
          newPaymentStatus,
        ],
      );
    }

    // 5. Commit changes
    await client.query("COMMIT");
    return NextResponse.json({ success: true });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("PUT Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    // MUST release the connection back to the pool
    client.release();
  }
}

// DELETE: Remove subscription (subscriptions:delete)
export async function DELETE(request) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    // Read the ID from the URL (e.g., /api/subscriptions?id=123)
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) return new NextResponse("Missing ID", { status: 400 });

    const query = "DELETE FROM subscriptions WHERE id = $1 AND user_id = $2";
    const result = await pool.query(query, [id, userId]);

    return NextResponse.json({ success: true, deletedRows: result.rowCount });
  } catch (error) {
    console.error("DELETE Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
