import { NextResponse } from "next/server";
import pool from "@/app/lib/db";
import { auth } from "@clerk/nextjs/server";
import crypto from "crypto";

// GET: Fetch all presets (presets:getAll)
export async function GET(request) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const query = "SELECT * FROM presets WHERE user_id = $1";
    const { rows } = await pool.query(query, [userId]);

    const formatted = rows.map((row) => ({
      ...row,
      services: row.services_str ? row.services_str.split(", ") : [],
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("GET Presets Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Add new preset (presets:add)
export async function POST(request) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const preset = await request.json();

    // Format services array to string
    const servicesStr = Array.isArray(preset.services)
      ? preset.services.join(", ")
      : "";
    const id = crypto.randomUUID();

    // Fix for the frequency array check
    const validFrequencies = ["monthly", "anualy", "bi-anualy"];
    const safeFrequency = validFrequencies.includes(preset.frequency?.trim())
      ? preset.frequency.trim()
      : "anualy";

    const query = `
      INSERT INTO presets 
      (id, user_id, service_name, provider_name, amount, frequency, services_str, url) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;

    const params = [
      id,
      userId,
      preset.service_name ? String(preset.service_name).trim() : "",
      preset.provider_name ? String(preset.provider_name).trim() : "",
      Number(preset.amount) || 0,
      safeFrequency,
      servicesStr,
      preset.url ? String(preset.url).trim() : "",
    ];

    await pool.query(query, params);

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("POST Presets Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: Update preset (presets:update)
export async function PUT(request) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const preset = await request.json();

    // Format services array to string
    const servicesStr = Array.isArray(preset.services)
      ? preset.services.join(", ")
      : "";

    const query = `
      UPDATE presets 
      SET service_name = $1, provider_name = $2, amount = $3, frequency = $4, services_str = $5, url = $6
      WHERE id = $7 AND user_id = $8
    `;

    const params = [
      preset.service_name ? String(preset.service_name).trim() : "",
      preset.provider_name ? String(preset.provider_name).trim() : "",
      Number(preset.amount) || 0,
      preset.frequency ? String(preset.frequency).trim() : "",
      servicesStr,
      preset.url ? String(preset.url).trim() : null,
      preset.id,
      userId, // Ensure they can only update their own preset
    ];

    const result = await pool.query(query, params);

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: "Preset not found or unauthorized" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, preset });
  } catch (error) {
    console.error("PUT Presets Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Remove preset (presets:delete)
export async function DELETE(request) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) return new NextResponse("Missing ID", { status: 400 });

    const query = "DELETE FROM presets WHERE id = $1 AND user_id = $2";
    const result = await pool.query(query, [id, userId]);

    return NextResponse.json({ success: true, deletedRows: result.rowCount });
  } catch (error) {
    console.error("DELETE Presets Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
