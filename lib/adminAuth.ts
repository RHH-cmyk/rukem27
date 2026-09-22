import crypto from "node:crypto";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function verifySession(value: string) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) return null;

  const dot = value.indexOf(".");
  if (dot < 1) return null;

  const encoded = value.slice(0, dot);
  const signature = value.slice(dot + 1);
  const payload = Buffer.from(encoded, "base64url").toString("utf8");
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");

  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (sigBuffer.length !== expectedBuffer.length) return null;
  if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) return null;

  const [idText, timestampText] = payload.split(".");
  const id = Number(idText);
  const timestamp = Number(timestampText);

  if (!Number.isInteger(id) || !Number.isFinite(timestamp)) return null;
  if (Date.now() - timestamp > 1000 * 60 * 60 * 24 * 7) return null;

  return id;
}

export async function getAdminFromSession() {
  const value = (await cookies()).get("rk_admin_session")?.value;
  if (!value) return null;

  const id = verifySession(value);
  if (!id) return null;

  const { data } = await supabaseAdmin
    .from("admin_users")
    .select("id, username, password_hash")
    .eq("id", id)
    .maybeSingle();

  return data ?? null;
}
