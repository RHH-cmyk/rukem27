import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getAdminFromSession } from "@/lib/adminAuth";

export async function PATCH(request: Request) {
  const admin = await getAdminFromSession();
  if (!admin) return NextResponse.json({ error: "Sesi login sudah berakhir." }, { status: 401 });

  try {
    const { username, currentPassword, newPassword } = await request.json();

    if (!username?.trim()) {
      return NextResponse.json({ error: "Username wajib diisi." }, { status: 400 });
    }

    const updates: { username: string; password_hash?: string } = {
      username: username.trim(),
    };

    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json({ error: "Password lama wajib diisi." }, { status: 400 });
      }

      const valid = await bcrypt.compare(currentPassword, admin.password_hash);
      if (!valid) {
        return NextResponse.json({ error: "Password lama salah." }, { status: 400 });
      }

      if (newPassword.length < 8) {
        return NextResponse.json({ error: "Password baru minimal 8 karakter." }, { status: 400 });
      }

      updates.password_hash = await bcrypt.hash(newPassword, 12);
    }

    const { error } = await supabaseAdmin
      .from("admin_users")
      .update(updates)
      .eq("id", admin.id);

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Username sudah digunakan." }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Data pengaturan tidak valid." }, { status: 400 });
  }
}
