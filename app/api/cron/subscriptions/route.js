import { NextResponse } from "next/server";
import pool from "@/app/lib/db";
import crypto from "crypto";
import { checkStatusChange } from "@/app/lib/statusUtils"; // Adjust path if needed

export async function GET(request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const client = await pool.connect();

  try {
    const { rows: subscriptions } = await client.query(
      "SELECT * FROM subscriptions",
    );

    // Arrays for updating subscriptions
    const ids = [];
    const statuses = [];
    const dueDates = [];
    const paymentStatuses = [];

    // Arrays for inserting into status_changes
    const sc_ids = [];
    const sc_user_ids = [];
    const sc_sub_ids = [];
    const sc_former_statuses = [];
    const sc_new_statuses = [];
    const sc_concerns_payment = [];

    for (const sub of subscriptions) {
      const { updated, subscription: updatedSub } = checkStatusChange(sub);

      if (updated) {
        // Queue the main subscription updates
        ids.push(updatedSub.id);
        statuses.push(updatedSub.status);
        dueDates.push(updatedSub.next_due_date);
        paymentStatuses.push(updatedSub.payment_status);

        // Check if the main status changed
        const formerStatus = sub.status?.toLowerCase() || "";
        const newStatus = updatedSub.status?.toLowerCase() || "active";

        if (formerStatus !== newStatus) {
          sc_ids.push(crypto.randomUUID());
          sc_user_ids.push(sub.user_id);
          sc_sub_ids.push(sub.id);
          sc_former_statuses.push(formerStatus);
          sc_new_statuses.push(newStatus);
          sc_concerns_payment.push(0);
        }

        // Check if the payment status changed
        const formerPaymentStatus = sub.payment_status?.toLowerCase() || "";
        const newPaymentStatus = updatedSub.payment_status?.toLowerCase() || "";

        if (formerPaymentStatus !== newPaymentStatus) {
          sc_ids.push(crypto.randomUUID());
          sc_user_ids.push(sub.user_id);
          sc_sub_ids.push(sub.id);
          sc_former_statuses.push(formerPaymentStatus);
          sc_new_statuses.push(newPaymentStatus);
          sc_concerns_payment.push(1);
        }
      }
    }

    // 3. Execute bulk database operations within a transaction
    if (ids.length > 0) {
      await client.query("BEGIN");

      // Bulk Update Subscriptions
      const updateQuery = `
        UPDATE subscriptions 
        SET 
          status = data.status, 
          next_due_date = CAST(data.next_due_date AS DATE), 
          payment_status = data.payment_status
        FROM (
          SELECT 
            unnest($1::uuid[]) AS id,
            unnest($2::text[]) AS status, 
            unnest($3::text[]) AS next_due_date, 
            unnest($4::text[]) AS payment_status
        ) AS data
        WHERE subscriptions.id = data.id;
      `;
      await client.query(updateQuery, [
        ids,
        statuses,
        dueDates,
        paymentStatuses,
      ]);

      // Bulk Insert Status Changes (only run if there are actual logs to insert)
      if (sc_ids.length > 0) {
        const insertLogsQuery = `
          INSERT INTO status_changes 
          (id, user_id, subscription_id, former_status, new_status, concerns_payment)
          SELECT * FROM unnest(
            $1::uuid[], 
            $2::text[], 
            $3::uuid[], 
            $4::text[], 
            $5::text[], 
            $6::int[]
          )
        `;
        await client.query(insertLogsQuery, [
          sc_ids,
          sc_user_ids,
          sc_sub_ids,
          sc_former_statuses,
          sc_new_statuses,
          sc_concerns_payment,
        ]);
      }

      await client.query("COMMIT");
    }

    return NextResponse.json({
      success: true,
      updatedSubscriptions: ids.length,
      logsGenerated: sc_ids.length,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Cron Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}
