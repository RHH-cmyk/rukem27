import { NextResponse } from "next/server";
import { getAdminFromSession } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

async function requireAdmin() {
  return getAdminFromSession();
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Belum login." }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("pengaturan_iuran_public")
    .select("tampilkan_rincian")
    .eq("id", 1)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    tampilkanRincian: data?.tampilkan_rincian ?? true,
  });
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Belum login." }, { status: 401 });

  const body = await request.json();
  const tampilkanRincian = Boolean(body.tampilkanRincian);

  const { error } = await supabaseAdmin
    .from("pengaturan_iuran_public")
    .upsert(
      {
        id: 1,
        tampilkan_rincian: tampilkanRincian,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({
    ok: true,
    tampilkanRincian,
  });
}
