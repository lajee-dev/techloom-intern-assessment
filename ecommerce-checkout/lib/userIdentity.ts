import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";

export const USER_ID_COOKIE = "checkout_user_id";

export async function getOrCreateUserId() {
  const cookieStore = await cookies();
  const existingUserId = cookieStore.get(USER_ID_COOKIE)?.value;

  if (existingUserId) {
    return existingUserId;
  }

  const userId = randomUUID();
  cookieStore.set(USER_ID_COOKIE, userId, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return userId;
}