import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const kkId = Number(url.searchParams.get("kkId"));

  if (!Number.isInteger(kkId)) {
    return NextResponse.json({ error: "ID KK tidak valid." }, { status: 400 });
  }

  const [{ data: kk, error: kkError }, { data: tarifRows, error: tarifError }, { data: pembayaran, error: pembayaranError }] =
    await Promise.all([
      supabaseAdmin.from("kk").select("id, mulai_iuran").eq("id", kkId).single(),
      supabaseAdmin
        .from("iuran_tarif_bulanan")
        .select("mulai_bulan, tarif_per_kk")
        .order("mulai_bulan", { ascending: true }),
      supabaseAdmin
        .from("iuran_pembayaran_bulanan")
        .select("periode_bulan, jumlah_bayar")
        .eq("kk_id", kkId)
        .order("periode_bulan", { ascending: true }),
    ]);

  if (kkError || !kk) {
    return NextResponse.json({ error: "KK tidak ditemukan." }, { status: 404 });
  }
  if (tarifError) {
    return NextResponse.json({ error: tarifError.message }, { status: 500 });
  }
  if (pembayaranError) {
    return NextResponse.json({ error: pembayaranError.message }, { status: 500 });
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // KK lama yang belum punya mulai_iuran diperlakukan aktif sejak Januari 2023.
  const active = kk.mulai_iuran
    ? String(kk.mulai_iuran).slice(0, 7)
    : "2023-01";
  const [activeYear, activeMonth] = active.split("-").map(Number);

  const tarifUntukBulan = (periode: string) => {
    const candidates = (tarifRows || []).filter(
      (row) => String(row.mulai_bulan).slice(0, 10) <= periode
    );
    if (!candidates.length) return 12000;
    return Number(candidates[candidates.length - 1].tarif_per_kk || 0);
  };

  const pembayaranByPeriode = new Map<string, number>();
  for (const row of pembayaran || []) {
    const periode = String(row.periode_bulan).slice(0, 10);
    pembayaranByPeriode.set(
      periode,
      (pembayaranByPeriode.get(periode) || 0) + Number(row.jumlah_bayar || 0)
    );
  }

  const statuses: Array<{
    tahun: number;
    bulan: number;
    status: "LUNAS" | "MASIH ADA TAGIHAN" | "BELUM BAYAR";
  }> = [];

  let saldo = 0;

  for (let year = activeYear; year <= currentYear; year++) {
    const firstMonth = year === activeYear ? activeMonth : 1;
    const maxMonth = year === currentYear ? currentMonth : 12;

    for (let month = firstMonth; month <= maxMonth; month++) {
      const periode = `${year}-${String(month).padStart(2, "0")}-01`;
      const tarif = tarifUntukBulan(periode);
      const dibayar = pembayaranByPeriode.get(periode) || 0;
      const saldoSebelum = saldo;

      // Samakan dengan perhitungan Admin: saldo berjalan antarbulan.
      saldo = saldo + tarif - dibayar;

      statuses.push({
        tahun: year,
        bulan: month,
        status:
          saldo <= 0
            ? "LUNAS"
            : dibayar === 0 && saldoSebelum === 0
              ? "BELUM BAYAR"
              : "MASIH ADA TAGIHAN",
      });
    }
  }

  return NextResponse.json({
    statuses,
    activeYear,
    activeMonth,
    monthNames: MONTHS,
  });
}
