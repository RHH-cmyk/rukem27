import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const START_YEAR = 2023;

export async function GET(request: NextRequest) {
  const kkId = Number(request.nextUrl.searchParams.get("kkId"));

  if (!Number.isInteger(kkId) || kkId <= 0) {
    return NextResponse.json({ error: "KK tidak valid." }, { status: 400 });
  }

  const { data: config, error: configError } = await supabaseAdmin
    .from("iuran_config")
    .select("tarif_per_bulan")
    .eq("id", 1)
    .single();

  if (configError) {
    console.error(configError);
    return NextResponse.json({ error: "Gagal memuat tarif iuran." }, { status: 500 });
  }

  const { data: pembayaran, error: pembayaranError } = await supabaseAdmin
    .from("iuran_pembayaran")
    .select("tahun, bulan, total_dibayar, dibayar")
    .eq("kk_id", kkId)
    .gte("tahun", START_YEAR)
    .order("tahun", { ascending: true })
    .order("bulan", { ascending: true });

  if (pembayaranError) {
    console.error(pembayaranError);
    return NextResponse.json({ error: "Gagal memuat pembayaran iuran." }, { status: 500 });
  }

  const map = new Map<string, number>();
  for (const row of pembayaran || []) {
    const key = `${row.tahun}-${row.bulan}`;
    map.set(key, Number(row.total_dibayar || 0));
  }

  const tarif = Math.max(0, Number(config.tarif_per_bulan || 0));
  const currentYear = new Date().getFullYear();
  const endYear = Math.max(START_YEAR, currentYear);
  const statuses: Array<{ tahun: number; bulan: number; status: "LUNAS" | "MASIH ADA TAGIHAN" | "BELUM BAYAR" }> = [];

  let saldoBawaan = 0;

  for (let tahun = START_YEAR; tahun <= endYear; tahun++) {
    for (let bulan = 1; bulan <= 12; bulan++) {
      const key = `${tahun}-${bulan}`;
      const adaCatatan = map.has(key);
      const dibayar = map.get(key) || 0;
      const tagihan = Math.max(0, tarif + saldoBawaan);

      let status: "LUNAS" | "MASIH ADA TAGIHAN" | "BELUM BAYAR";
      if (!adaCatatan && saldoBawaan === 0) {
        status = "BELUM BAYAR";
        saldoBawaan = tagihan;
      } else if (dibayar >= tagihan) {
        status = "LUNAS";
        saldoBawaan = dibayar - tagihan;
      } else if (dibayar > 0) {
        status = "MASIH ADA TAGIHAN";
        saldoBawaan = tagihan - dibayar;
      } else {
        status = "BELUM BAYAR";
        saldoBawaan = tagihan;
      }

      statuses.push({ tahun, bulan, status });
    }
  }

  return NextResponse.json({ statuses });
}
