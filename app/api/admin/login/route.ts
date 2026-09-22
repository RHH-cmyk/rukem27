import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function signSession(userId: number) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("ADMIN_SESSION_SECRET belum diatur.");
  const payload = `${userId}.${Date.now()}`;
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return `${Buffer.from(payload).toString("base64url")}.${sig}`;
}

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: "Username dan password wajib diisi." }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("admin_users")
      .select("id, username, password_hash")
      .eq("username", username.trim())
      .maybeSingle();

    if (error || !data || !(await bcrypt.compare(password, data.password_hash))) {
      return NextResponse.json({ error: "Username atau password salah." }, { status: 401 });
    }

    const cookieStore = await cookies();
    cookieStore.set("rk_admin_session", signSession(data.id), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal login." },
      { status: 500 }
    );
  }
}
