import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminFromSession } from "@/lib/adminAuth";

export async function GET() {
  const admin = await getAdminFromSession();
  if (!admin) return NextResponse.json({ error: "Belum login." }, { status: 401 });
  return NextResponse.json({ username: admin.username });
}
