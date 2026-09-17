// app/api/cron/release-expired/route.ts
import { NextRequest } from "next/server";
import { dbConnect } from "@/lib/db";
import { releaseExpiredReservations } from "@/lib/reservationService";

// GET /api/cron/release-expired
// Bearer-secured. Meant to be pinged externally (cron-job.org, etc.)
// every ~5 minutes. Lazy expiry (checked on every order read/write)
// is the actual correctness guarantee — this route just keeps stock
// numbers fresh between requests.
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET || auth !== expected) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();
  const releasedCount = await releaseExpiredReservations();

  return Response.json({ releasedCount, checkedAt: new Date() });
}