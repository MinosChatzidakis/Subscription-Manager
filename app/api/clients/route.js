import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import crypto from "crypto";

// GET: Fetch all clients
export async function GET(request) {
  try {
    const { userId } = auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    // Added user_id = $1 to ensure users only see their own clients
    const query =
      "SELECT id, name, logo_url, url FROM clients WHERE user_id = $1 ORDER BY name ASC";
    const { rows } = await pool.query(query, [userId]);

    return NextResponse.json(rows);
  } catch (error) {
    console.error("GET Clients Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Add new client
export async function POST(request) {
  try {
    const { userId } = auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const client = await request.json();
    const id = crypto.randomUUID();

    // Added 'url' to the insert since your table and update function support it
    const query =
      "INSERT INTO clients (id, user_id, name, logo_url, url) VALUES ($1, $2, $3, $4, $5)";
    const params = [
      id,
      userId,
      client.name ? String(client.name).trim() : "",
      client.logo_url ? String(client.logo_url).trim() : null,
      client.url ? String(client.url).trim() : null,
    ];

    await pool.query(query, params);

    return NextResponse.json({
      id,
      name: params[2],
      logo_url: params[3],
      url: params[4],
    });
  } catch (error) {
    console.error("POST Clients Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: Update client
export async function PUT(request) {
  try {
    const { userId } = auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const client = await request.json();

    // Check both id AND user_id so they can't maliciously update someone else's client
    const query = `
      UPDATE clients 
      SET name = $1, logo_url = $2, url = $3
      WHERE id = $4 AND user_id = $5
    `;

    const params = [
      client.name ? String(client.name).trim() : "",
      client.logo_url ? String(client.logo_url).trim() : null,
      client.url ? String(client.url).trim() : null,
      client.id,
      userId,
    ];

    const result = await pool.query(query, params);

    // In pg, result.rowCount tells you how many rows were affected (replaces this.changes)
    return NextResponse.json({ success: true, changes: result.rowCount });
  } catch (error) {
    console.error("PUT Clients Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Remove client
export async function DELETE(request) {
  try {
    const { userId } = auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) return new NextResponse("Missing ID", { status: 400 });

    const query = "DELETE FROM clients WHERE id = $1 AND user_id = $2";
    const result = await pool.query(query, [id, userId]);

    return NextResponse.json({ success: true, changes: result.rowCount });
  } catch (error) {
    console.error("DELETE Clients Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
