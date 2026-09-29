import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { auth } from "@clerk/nextjs/server";

// GET: Fetch status changes for a sub (statusChanges:getSubscription)
export async function GET(request) {
  try {
    // 1. Authenticate the user
    const { userId } = auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    // 2. Extract the subscription_id from the URL
    // e.g., fetch('/api/status-changes?subscription_id=abc-123')
    const { searchParams } = new URL(request.url);
    const subscriptionId = searchParams.get("subscription_id");

    if (!subscriptionId) {
      return new NextResponse("Missing subscription_id", { status: 400 });
    }

    // 3. Query Postgres (filtering by both subscription_id AND user_id for security)
    const query = `
      SELECT * FROM status_changes 
      WHERE subscription_id = $1 AND user_id = $2 
      ORDER BY timestamp ASC
    `;

    const { rows } = await pool.query(query, [subscriptionId, userId]);

    // 4. Return the timeline data
    return NextResponse.json(rows);
  } catch (error) {
    console.error("GET Status Changes Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
