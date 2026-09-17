// app/api/health/route.ts
import { dbConnect } from "@/lib/db";

export async function GET() {
  await dbConnect();
  return Response.json({ status: "connected" });
}
