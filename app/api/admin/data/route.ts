import { NextResponse } from "next/server";
import { getAdminFromSession } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

async function requireAdmin() {
  const admin = await getAdminFromSession();
  return admin;
}

export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Belum login." }, { status: 401 });

  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  if (action === "listKK") {
    const { data, error } = await supabaseAdmin
      .from("kk")
      .select("*")
      .order("nama_kepala_keluarga", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data: data || [] });
  }

  if (action === "detail") {
    const id = Number(url.searchParams.get("id"));
    if (!Number.isInteger(id)) {
      return NextResponse.json({ error: "ID KK tidak valid." }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("anggota")
      .select("id, nik, nama, hubungan_keluarga")
      .eq("kk_id", id)
      .order("id", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data: data || [] });
  }

  if (action === "iuran") {
    const kkId = Number(url.searchParams.get("kkId"));
    if (!Number.isInteger(kkId)) {
      return NextResponse.json({ error: "ID KK tidak valid." }, { status: 400 });
    }

    const { data: tarif, error: tarifError } = await supabaseAdmin
      .from("iuran_tarif_bulanan")
      .select("mulai_bulan, tarif_per_kk")
      .order("mulai_bulan", { ascending: true });

    if (tarifError) return NextResponse.json({ error: tarifError.message }, { status: 500 });

    const { data: pembayaran, error: pembayaranError } = await supabaseAdmin
      .from("iuran_pembayaran_bulanan")
      .select("id, kk_id, periode_bulan, jumlah_bayar, paid_at, catatan")
      .eq("kk_id", kkId)
      .order("periode_bulan", { ascending: true })
      .order("id", { ascending: true });

    if (pembayaranError) return NextResponse.json({ error: pembayaranError.message }, { status: 500 });

    return NextResponse.json({ tarif: tarif || [], pembayaran: pembayaran || [] });
  }

  if (action === "iuranSettings") {
    const { data, error } = await supabaseAdmin
      .from("iuran_tarif_bulanan")
      .select("mulai_bulan, tarif_per_kk")
      .order("mulai_bulan", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data: data || [] });
  }

  return NextResponse.json({ error: "Action tidak dikenal." }, { status: 400 });
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Belum login." }, { status: 401 });

  const body = await request.json();

  if (body.action === "createKK") {
    const noKK = String(body.noKK || "").trim();
    const kepalaKeluarga = String(body.kepalaKeluarga || "").trim();
    const anggota = Array.isArray(body.anggota) ? body.anggota : [];

    const { data: kk, error: kkError } = await supabaseAdmin
      .from("kk")
      .insert({
        no_kk: noKK,
        nama_kepala_keluarga: kepalaKeluarga,
        jumlah_jiwa: anggota.length,
      })
      .select()
      .single();

    if (kkError || !kk) {
      return NextResponse.json(
        { error: kkError?.message || "Gagal membuat KK." },
        { status: 400 }
      );
    }

    const rows = anggota.map((item: any) => ({
      kk_id: kk.id,
      nik: item.nik || null,
      nama: String(item.nama || "").trim(),
      hubungan_keluarga: String(item.hubungan_keluarga || "").trim().toUpperCase(),
    }));

    const { error: anggotaError } = await supabaseAdmin.from("anggota").insert(rows);

    if (anggotaError) {
      await supabaseAdmin.from("kk").delete().eq("id", kk.id);
      return NextResponse.json({ error: anggotaError.message }, { status: 400 });
    }

    return NextResponse.json({ data: kk });
  }

  if (body.action === "saveIuranTarif") {
    const tarif = Array.isArray(body.tarif) ? body.tarif : [];
    if (!tarif.length) {
      return NextResponse.json({ error: "Minimal satu tarif iuran harus ada." }, { status: 400 });
    }

    const normalized = tarif.map((item: any) => ({
      mulai_bulan: String(item.mulai_bulan || "").slice(0, 10),
      tarif_per_kk: Math.round(Number(item.tarif_per_kk)),
    }));

    const valid = normalized.every((item: any) =>
      /^\d{4}-\d{2}-01$/.test(item.mulai_bulan) &&
      Number.isFinite(item.tarif_per_kk) && item.tarif_per_kk >= 0
    );
    if (!valid) return NextResponse.json({ error: "Data tarif iuran tidak valid." }, { status: 400 });

    const uniqueMonths = new Set(normalized.map((x: any) => x.mulai_bulan));
    if (uniqueMonths.size !== normalized.length) {
      return NextResponse.json({ error: "Tanggal mulai tarif tidak boleh sama." }, { status: 400 });
    }

    normalized.sort((a: any, b: any) => a.mulai_bulan.localeCompare(b.mulai_bulan));
    const { error: deleteError } = await supabaseAdmin
      .from("iuran_tarif_bulanan")
      .delete()
      .gte("mulai_bulan", "2023-01-01");
    if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 400 });

    const { error: insertError } = await supabaseAdmin
      .from("iuran_tarif_bulanan")
      .insert(normalized);
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 400 });

    return NextResponse.json({ ok: true });
  }

  if (body.action === "bayarIuran") {
    const kkId = Number(body.kkId);
    const periodeBulan = String(body.periodeBulan || "").slice(0, 10);
    const jumlahBayar = Math.round(Number(body.jumlahBayar));

    if (!Number.isInteger(kkId) || !/^\d{4}-\d{2}-01$/.test(periodeBulan) || !Number.isFinite(jumlahBayar) || jumlahBayar <= 0) {
      return NextResponse.json({ error: "Data pembayaran iuran tidak valid." }, { status: 400 });
    }

    const { data: kk, error: kkError } = await supabaseAdmin
      .from("kk")
      .select("id")
      .eq("id", kkId)
      .single();
    if (kkError || !kk) return NextResponse.json({ error: "KK tidak ditemukan." }, { status: 404 });

    const { data, error } = await supabaseAdmin
      .from("iuran_pembayaran_bulanan")
      .insert({
        kk_id: kkId,
        periode_bulan: periodeBulan,
        jumlah_bayar: jumlahBayar,
        paid_at: new Date().toISOString(),
      })
      .select("id, kk_id, periode_bulan, jumlah_bayar, paid_at, catatan")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ data });
  }

  if (body.action === "import") {
    const keluarga = Array.isArray(body.keluarga) ? body.keluarga : [];
    let berhasil = 0;
    let dilewati = 0;
    let gagal = 0;
    const errorList: string[] = [];

    const { data: existingKK, error: existingError } = await supabaseAdmin
      .from("kk")
      .select("id, no_kk, nama_kepala_keluarga");

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 });
    }

    const names = new Set(
      (existingKK || []).map((x) => String(x.nama_kepala_keluarga || "").trim().toLowerCase())
    );
    const noKKs = new Set(
      (existingKK || []).filter((x) => x.no_kk).map((x) => String(x.no_kk))
    );

    for (const item of keluarga) {
      const kepala = String(item.kepala || "").trim();
      const noKK = item.noKK ? String(item.noKK).trim() : null;

      if (names.has(kepala.toLowerCase()) || (noKK && noKKs.has(noKK))) {
        dilewati++;
        continue;
      }

      const anggota = Array.isArray(item.anggota) ? item.anggota : [];

      const { data: kk, error: kkError } = await supabaseAdmin
        .from("kk")
        .insert({
          no_kk: noKK,
          nama_kepala_keluarga: kepala,
          jumlah_jiwa: anggota.length,
        })
        .select()
        .single();

      if (kkError || !kk) {
        gagal++;
        errorList.push(`${kepala}: ${kkError?.message || "gagal membuat KK"}`);
        continue;
      }

      const rows = anggota.map((member: any) => ({
        kk_id: kk.id,
        nik: member.nik || null,
        nama: String(member.nama || "").trim(),
        hubungan_keluarga: String(member.hubungan || "").trim().toUpperCase(),
      }));

      const { error: anggotaError } = await supabaseAdmin
        .from("anggota")
        .insert(rows);

      if (anggotaError) {
        await supabaseAdmin.from("kk").delete().eq("id", kk.id);
        gagal++;
        errorList.push(`${kepala}: ${anggotaError.message}`);
        continue;
      }

      names.add(kepala.toLowerCase());
      if (noKK) noKKs.add(noKK);
      berhasil++;
    }

    return NextResponse.json({ berhasil, dilewati, gagal, errorList });
  }

  return NextResponse.json({ error: "Action tidak dikenal." }, { status: 400 });
}

export async function PUT(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Belum login." }, { status: 401 });

  const body = await request.json();

  if (body.action !== "updateKK") {
    return NextResponse.json({ error: "Action tidak dikenal." }, { status: 400 });
  }

  const id = Number(body.id);
  const noKK = String(body.noKK || "").trim();
  const kepalaKeluarga = String(body.kepalaKeluarga || "").trim();
  const anggota = Array.isArray(body.anggota) ? body.anggota : [];

  const { error: kkError } = await supabaseAdmin
    .from("kk")
    .update({
      no_kk: noKK,
      nama_kepala_keluarga: kepalaKeluarga,
      jumlah_jiwa: anggota.length,
    })
    .eq("id", id);

  if (kkError) return NextResponse.json({ error: kkError.message }, { status: 400 });

  const { error: deleteError } = await supabaseAdmin
    .from("anggota")
    .delete()
    .eq("kk_id", id);

  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 400 });

  const rows = anggota.map((item: any) => ({
    kk_id: id,
    nik: item.nik || null,
    nama: String(item.nama || "").trim(),
    hubungan_keluarga: String(item.hubungan_keluarga || "").trim().toUpperCase(),
  }));

  const { error: insertError } = await supabaseAdmin.from("anggota").insert(rows);

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Belum login." }, { status: 401 });

  const body = await request.json();

  if (body.action !== "deleteKK") {
    return NextResponse.json({ error: "Action tidak dikenal." }, { status: 400 });
  }

  const id = Number(body.id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "ID KK tidak valid." }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("kk").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
