"use client";

import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/lib/supabase";

type KK = {
  id: number;
  no_kk: string | null;
  nama_kepala_keluarga: string;
  jumlah_jiwa: number;
};

type Anggota = {
  id?: number;
  nik: string | null;
  nama: string;
  hubungan_keluarga: string;
};



export default function Home() {
  const [dataKK, setDataKK] = useState<KK[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [showTambah, setShowTambah] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [deletingKK, setDeletingKK] = useState(false);

  const [selectedKK, setSelectedKK] = useState<KK | null>(null);
  const [anggotaDetail, setAnggotaDetail] = useState<Anggota[]>([]);

  const [noKK, setNoKK] = useState("");
  const [kepalaKeluarga, setKepalaKeluarga] = useState("");

  const [anggota, setAnggota] = useState<Anggota[]>([
    { nik: "", nama: "", hubungan_keluarga: "KEPALA KELUARGA" },
  ]);

  const [saving, setSaving] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string>("");

  useEffect(() => {
    const savedTheme = localStorage.getItem("rk-theme");
    setDarkMode(savedTheme === "dark");
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("rk-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  // Kunci scroll halaman saat modal terbuka. Scroll tetap aktif di dalam modal.
  useEffect(() => {
    const modalTerbuka = showTambah || showDetail || showEdit;
    if (!modalTerbuka) return;

    const scrollY = window.scrollY;
    const body = document.body;
    const html = document.documentElement;

    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.overflow = "hidden";
    html.style.overflow = "hidden";

    return () => {
      body.style.position = "";
      body.style.top = "";
      body.style.left = "";
      body.style.right = "";
      body.style.overflow = "";
      html.style.overflow = "";
      window.scrollTo(0, scrollY);
    };
  }, [showTambah, showDetail, showEdit]);

  async function loadKK() {
    setLoading(true);

    const { data, error } = await supabase
      .from("kk")
      .select("*")
      .order("nama_kepala_keluarga", { ascending: true });

    if (error) {
      console.error(error);
      setDataKK([]);
    } else {
      setDataKK(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadKK();
  }, []);

  const filteredKK = dataKK.filter((kk) =>
    kk.nama_kepala_keluarga.toLowerCase().includes(search.toLowerCase())
  );

  const totalKK = dataKK.length;
  const totalJiwa = dataKK.reduce(
    (total, kk) => total + kk.jumlah_jiwa,
    0
  );

  function resetForm() {
    setNoKK("");
    setKepalaKeluarga("");
    setAnggota([
      { nik: "", nama: "", hubungan_keluarga: "KEPALA KELUARGA" },
    ]);
  }

  function tambahAnggota() {
    setAnggota([
      ...anggota,
      { nik: "", nama: "", hubungan_keluarga: "ANAK" },
    ]);
  }

  function hapusAnggota(index: number) {
    if (anggota.length === 1) return;
    setAnggota(anggota.filter((_, i) => i !== index));
  }

  function updateAnggota(
    index: number,
    field: keyof Anggota,
    value: string
  ) {
    const data = [...anggota];
    const finalValue =
      field === "hubungan_keluarga" ? value.toUpperCase() : value;
    data[index] = { ...data[index], [field]: finalValue };
    setAnggota(data);
  }

  async function simpanKK() {
    if (!kepalaKeluarga.trim()) {
      alert("Nama kepala keluarga wajib diisi.");
      return;
    }

    if (!noKK.trim() || noKK.length !== 16) {
      alert("No. KK harus terdiri dari 16 digit.");
      return;
    }

    for (const item of anggota) {
      if (item.nik && item.nik.length !== 16) {
        alert("NIK harus terdiri dari 16 digit jika diisi.");
        return;
      }

      if (!item.nama.trim()) {
        alert("Nama semua anggota wajib diisi.");
        return;
      }

      if (!item.hubungan_keluarga.trim()) {
        alert("Hubungan keluarga wajib diisi.");
        return;
      }
    }

    setSaving(true);

    const { data: kkBaru, error: kkError } = await supabase
      .from("kk")
      .insert({
        no_kk: noKK,
        nama_kepala_keluarga: kepalaKeluarga,
        jumlah_jiwa: anggota.length,
      })
      .select()
      .single();

    if (kkError || !kkBaru) {
      console.error(kkError);
      alert(kkError?.message || "Gagal menyimpan data KK.");
      setSaving(false);
      return;
    }

    const dataAnggota = anggota.map((item) => ({
      kk_id: kkBaru.id,
      nik: item.nik,
      nama: item.nama,
      hubungan_keluarga: item.hubungan_keluarga,
    }));

    const { error: anggotaError } = await supabase
      .from("anggota")
      .insert(dataAnggota);

    if (anggotaError) {
      await supabase.from("kk").delete().eq("id", kkBaru.id);
      alert(anggotaError.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    setShowTambah(false);
    resetForm();
    await loadKK();
  }


  function nilaiExcel(value: unknown): string {
    if (value === null || value === undefined) return "";
    return String(value).replace(/\.0$/, "").trim();
  }

  async function importExcel(file: File) {
    setImporting(true);
    setImportResult("");

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];

      if (!sheet) throw new Error("Sheet Excel tidak ditemukan.");

      const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
        header: 1,
        defval: "",
        raw: false,
      });

      const headerIndex = rows.findIndex((row) =>
        row.some(
          (cell) =>
            nilaiExcel(cell).toUpperCase() === "NAMA KEPALA KELUARGA"
        )
      );

      if (headerIndex === -1) {
        throw new Error(
          "Format Excel tidak dikenali. Header NAMA KEPALA KELUARGA tidak ditemukan."
        );
      }

      const dataRows = rows.slice(headerIndex + 1);
      const keluarga: Array<{
        noKK: string | null;
        kepala: string;
        anggota: Array<{
          nik: string | null;
          nama: string;
          hubungan: string;
        }>;
      }> = [];

      let current:
        | (typeof keluarga)[number]
        | null = null;

      for (const row of dataRows) {
        const no = nilaiExcel(row[0]);
        const kepala = nilaiExcel(row[1]);
        const noKKRaw = nilaiExcel(row[2]);
        const nik = nilaiExcel(row[3]);
        const namaAnggota = nilaiExcel(row[5]);
        const hubungan = nilaiExcel(row[6]).toUpperCase();

        if (no && kepala) {
          current = {
            noKK: noKKRaw || null,
            kepala,
            anggota: [
              {
                nik: null,
                nama: kepala,
                hubungan: "Kepala Keluarga",
              },
            ],
          };
          keluarga.push(current);
        }

        if (!current) continue;

        if (namaAnggota || nik) {
          current.anggota.push({
            nik: nik || null,
            nama: namaAnggota || "Tanpa Nama",
            hubungan: hubungan || "Anggota",
          });
        }
      }

      if (keluarga.length === 0) {
        throw new Error("Tidak ada data KK yang ditemukan.");
      }

      let berhasil = 0;
      let dilewati = 0;
      let gagal = 0;
      const errorList: string[] = [];

      for (const keluargaItem of keluarga) {
        // Kalau nama kepala keluarga sudah ada, lewati. Ini mencegah
        // nama yang sama masuk lagi walaupun No KK-nya berbeda.
        const namaKepala = keluargaItem.kepala.trim().toLowerCase();
        const sudahAdaNama = dataKK.some(
          (item) => item.nama_kepala_keluarga.trim().toLowerCase() === namaKepala
        );

        if (sudahAdaNama) {
          dilewati++;
          continue;
        }

        // Kalau No KK sudah ada, lewati juga supaya import ulang
        // tidak menggandakan data yang sudah berhasil masuk sebelumnya.
        if (keluargaItem.noKK) {
          const { data: kkExisting, error: cekError } = await supabase
            .from("kk")
            .select("id")
            .eq("no_kk", keluargaItem.noKK)
            .maybeSingle();

          if (cekError) {
            gagal++;
            errorList.push(
              `${keluargaItem.kepala}: gagal mengecek No KK (${cekError.message})`
            );
            continue;
          }

          if (kkExisting) {
            dilewati++;
            continue;
          }
        }

        const { data: kkBaru, error: kkError } = await supabase
          .from("kk")
          .insert({
            no_kk: keluargaItem.noKK,
            nama_kepala_keluarga: keluargaItem.kepala,
            jumlah_jiwa: keluargaItem.anggota.length,
          })
          .select()
          .single();

        if (kkError || !kkBaru) {
          gagal++;
          errorList.push(
            `${keluargaItem.kepala}: ${kkError?.message || "gagal membuat KK"}`
          );
          continue;
        }

        const dataAnggota = keluargaItem.anggota.map((item) => ({
          kk_id: kkBaru.id,
          nik: item.nik,
          nama: item.nama,
          hubungan_keluarga: item.hubungan,
        }));

        const { error: anggotaError } = await supabase
          .from("anggota")
          .insert(dataAnggota);

        if (anggotaError) {
          await supabase.from("kk").delete().eq("id", kkBaru.id);
          gagal++;
          errorList.push(`${keluargaItem.kepala}: ${anggotaError.message}`);
          continue;
        }

        berhasil++;
      }

      await loadKK();

      const ringkasan =
        `Import selesai. Baru: ${berhasil} KK. Dilewati: ${dilewati} KK. Gagal: ${gagal} KK.` +
        (errorList.length
          ? `\n\nContoh error:\n${errorList.slice(0, 5).join("\n")}`
          : "");

      setImportResult(ringkasan);
      alert(ringkasan);
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error ? error.message : "Gagal membaca file Excel.";
      setImportResult(message);
      alert(message);
    } finally {
      setImporting(false);
    }
  }

  async function bukaDetail(kk: KK) {
    setSelectedKK(kk);
    setAnggotaDetail([]);
    setDetailLoading(true);
    setShowDetail(true);

    const { data, error } = await supabase
      .from("anggota")
      .select("id, nik, nama, hubungan_keluarga")
      .eq("kk_id", kk.id)
      .order("id", { ascending: true });

    if (error) {
      console.error(error);
      setAnggotaDetail([]);
    } else {
      setAnggotaDetail(data || []);
    }

    setDetailLoading(false);
  }

  async function hapusKK() {
    if (!selectedKK) return;

    const yakin = window.confirm(
      `Hapus data KK ${selectedKK.nama_kepala_keluarga}?\n\nSemua anggota dalam KK ini juga akan ikut terhapus.`
    );

    if (!yakin) return;

    setDeletingKK(true);

    const { error } = await supabase
      .from("kk")
      .delete()
      .eq("id", selectedKK.id);

    if (error) {
      alert(`Gagal menghapus: ${error.message}`);
      setDeletingKK(false);
      return;
    }

    setDeletingKK(false);
    setShowDetail(false);
    setSelectedKK(null);
    setAnggotaDetail([]);
    await loadKK();
  }

  function mulaiEdit() {
    if (!selectedKK) return;

    setNoKK(selectedKK.no_kk || "");
    setKepalaKeluarga(selectedKK.nama_kepala_keluarga);
    setAnggota(
      anggotaDetail.map((item) => ({
        id: item.id,
        nik: item.nik,
        nama: item.nama,
        hubungan_keluarga: item.hubungan_keluarga,
      }))
    );
    setShowDetail(false);
    setShowEdit(true);
  }

  async function simpanEdit() {
    if (!selectedKK) return;

    if (!kepalaKeluarga.trim()) {
      alert("Nama kepala keluarga wajib diisi.");
      return;
    }

    if (!noKK.trim() || noKK.length !== 16) {
      alert("No. KK harus terdiri dari 16 digit.");
      return;
    }

    for (const item of anggota) {
      if (item.nik && item.nik.length !== 16) {
        alert("NIK yang diisi harus terdiri dari 16 digit.");
        return;
      }
      if (!item.nama.trim()) {
        alert("Nama semua anggota wajib diisi.");
        return;
      }
      if (!item.hubungan_keluarga.trim()) {
        alert("Hubungan keluarga wajib diisi.");
        return;
      }
    }

    setSaving(true);

    const { error: kkError } = await supabase
      .from("kk")
      .update({
        no_kk: noKK,
        nama_kepala_keluarga: kepalaKeluarga,
        jumlah_jiwa: anggota.length,
      })
      .eq("id", selectedKK.id);

    if (kkError) {
      alert(kkError.message);
      setSaving(false);
      return;
    }

    const { error: deleteError } = await supabase
      .from("anggota")
      .delete()
      .eq("kk_id", selectedKK.id);

    if (deleteError) {
      alert(deleteError.message);
      setSaving(false);
      return;
    }

    const { error: insertError } = await supabase.from("anggota").insert(
      anggota.map((item) => ({
        kk_id: selectedKK.id,
        nik: item.nik,
        nama: item.nama,
        hubungan_keluarga: item.hubungan_keluarga,
      }))
    );

    if (insertError) {
      alert(insertError.message);
      setSaving(false);
      return;
    }

    const updatedKK = {
      ...selectedKK,
      no_kk: noKK,
      nama_kepala_keluarga: kepalaKeluarga,
      jumlah_jiwa: anggota.length,
    };

    setSelectedKK(updatedKK);
    setSaving(false);
    setShowEdit(false);
    resetForm();

    await loadKK();
    await bukaDetail(updatedKK);
  }

  function ModalHeader({
    title,
    subtitle,
    onClose,
  }: {
    title: string;
    subtitle?: string;
    onClose: () => void;
  }) {
    return (
      <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white p-5 text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white">
        <div>
          <h2 className="text-lg font-bold">{title}</h2>
          {subtitle && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {subtitle}
            </p>
          )}
        </div>

        <button
          onClick={onClose}
          className="text-2xl text-gray-400 hover:text-black dark:hover:text-white"
        >
          ×
        </button>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4 text-gray-900 transition-colors md:p-8 dark:bg-gray-950 dark:text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Rukun Kematian</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Data Keluarga RT
            </p>
          </div>

          <button
            onClick={() => setDarkMode((value) => !value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:hover:bg-gray-800"
          >
            {darkMode ? "Mode Terang" : "Mode Gelap"}
          </button>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-4">
          <div className="rounded-xl bg-white p-5 shadow-sm dark:bg-gray-900">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total KK</p>
            <p className="mt-1 text-3xl font-bold">{totalKK}</p>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm dark:bg-gray-900">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Total Jiwa
            </p>
            <p className="mt-1 text-3xl font-bold">{totalJiwa}</p>
          </div>
        </div>

        <div className="rounded-xl bg-white shadow-sm dark:bg-gray-900">
          <div className="flex flex-col gap-4 border-b border-gray-200 p-5 md:flex-row md:items-center md:justify-between dark:border-gray-700">
            <div>
              <h2 className="text-lg font-semibold">Data Keluarga</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Klik nama kepala keluarga untuk melihat detail.
              </p>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Cari kepala keluarga..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 outline-none focus:border-black dark:border-gray-600 dark:bg-gray-800 dark:text-white md:w-72"
              />

              <label className="cursor-pointer whitespace-nowrap rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:hover:bg-gray-800">
                {importing ? "Mengimpor..." : "Import Excel"}
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  disabled={importing}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.currentTarget.value = "";
                    if (file) importExcel(file);
                  }}
                />
              </label>

              <button
                onClick={() => {
                  resetForm();
                  setShowTambah(true);
                }}
                className="whitespace-nowrap rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
              >
                + Tambah KK
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                <tr>
                  <th className="px-5 py-3 font-medium text-gray-500 dark:text-gray-400">
                    No
                  </th>
                  <th className="px-5 py-3 font-medium text-gray-500 dark:text-gray-400">
                    Kepala Keluarga
                  </th>
                  <th className="px-5 py-3 font-medium text-gray-500 dark:text-gray-400">
                    Jumlah Jiwa
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-5 py-10 text-center text-gray-500"
                    >
                      Memuat data...
                    </td>
                  </tr>
                ) : filteredKK.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-5 py-10 text-center text-gray-500"
                    >
                      Belum ada data KK.
                    </td>
                  </tr>
                ) : (
                  filteredKK.map((kk, index) => (
                    <tr
                      key={kk.id}
                      onClick={() => bukaDetail(kk)}
                      className="cursor-pointer border-b border-gray-100 last:border-0 transition-colors hover:bg-gray-50 active:bg-gray-100 dark:border-gray-800 dark:hover:bg-gray-800 dark:active:bg-gray-700"
                    >
                      <td className="px-5 py-4 text-gray-500">
                        {index + 1}
                      </td>
                      <td className="px-5 py-4">
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {kk.nama_kepala_keluarga}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-gray-600 dark:text-gray-300">
                        {kk.jumlah_jiwa} jiwa
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showTambah && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white text-gray-900 shadow-xl dark:bg-gray-900 dark:text-white">
            <ModalHeader
              title="Tambah Data KK"
              subtitle="Masukkan data keluarga dan seluruh anggotanya."
              onClose={() => setShowTambah(false)}
            />

            <div className="space-y-5 p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-900 dark:text-white">
                    Nama Kepala Keluarga
                  </label>

                  <input
                    value={kepalaKeluarga}
                    onChange={(e) => {
                      const value = e.target.value;
                      setKepalaKeluarga(value);

                      const data = [...anggota];

                      if (
                        data[0] &&
                        data[0].hubungan_keluarga.trim().toUpperCase() === "KEPALA KELUARGA"
                      ) {
                        data[0].nama = value;
                      }

                      setAnggota(data);
                    }}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 outline-none focus:border-black dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
                    placeholder="Nama kepala keluarga"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-900 dark:text-white">
                    No. KK
                  </label>

                  <input
                    value={noKK}
                    onChange={(e) =>
                      setNoKK(
                        e.target.value.replace(/\D/g, "").slice(0, 16)
                      )
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 outline-none focus:border-black dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
                    placeholder="16 digit"
                    inputMode="numeric"
                  />
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      Anggota Keluarga
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Jumlah jiwa: {anggota.length}
                    </p>
                  </div>

                  <button
                    onClick={tambahAnggota}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 dark:border-gray-600 dark:text-white dark:hover:bg-gray-800"
                  >
                    + Tambah Anggota
                  </button>
                </div>

                <div className="space-y-4">
                  {anggota.map((item, index) => (
                    <div
                      key={index}
                      className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <span className="font-medium text-gray-900 dark:text-white">
                          Anggota {index + 1}
                        </span>

                        {anggota.length > 1 && (
                          <button
                            onClick={() => hapusAnggota(index)}
                            className="text-sm text-red-600 hover:underline"
                          >
                            Hapus
                          </button>
                        )}
                      </div>

                      <div className="grid gap-3 md:grid-cols-3">
                        <input
                          value={item.nik ?? ""}
                          onChange={(e) =>
                            updateAnggota(
                              index,
                              "nik",
                              e.target.value
                                .replace(/\D/g, "")
                                .slice(0, 16)
                            )
                          }
                          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 outline-none focus:border-black dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-500"
                          placeholder="NIK (16 digit)"
                          inputMode="numeric"
                        />

                        <input
                          value={item.nama}
                          onChange={(e) =>
                            updateAnggota(index, "nama", e.target.value)
                          }
                          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 outline-none focus:border-black dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-500"
                          placeholder="Nama"
                        />

                        <input
                          value={item.hubungan_keluarga}
                          onChange={(e) =>
                            updateAnggota(
                              index,
                              "hubungan_keluarga",
                              e.target.value
                            )
                          }
                          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 outline-none uppercase focus:border-black dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-500"
                          placeholder="Hubungan keluarga"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 flex justify-end gap-2 border-t border-gray-200 bg-white p-5 text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white">
              <button
                onClick={() => setShowTambah(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
              >
                Batal
              </button>

              <button
                onClick={simpanKK}
                disabled={saving}
                className="rounded-lg bg-black px-5 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-gray-200"
              >
                {saving ? "Menyimpan..." : "Simpan KK"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDetail && selectedKK && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white text-gray-900 shadow-xl dark:bg-gray-900 dark:text-white">
            {detailLoading && (
              <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-white/75 backdrop-blur-sm dark:bg-gray-900/75">
                <div className="flex flex-col items-center gap-3">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-300 border-t-black dark:border-gray-600 dark:border-t-white" />
                  <p className="text-sm font-medium">Memuat data...</p>
                </div>
              </div>
            )}
            <ModalHeader
              title={selectedKK.nama_kepala_keluarga}
              subtitle="Detail keluarga"
              onClose={() => setShowDetail(false)}
            />

            <div className="space-y-5 p-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    No. KK
                  </p>
                  <p className="mt-1 font-semibold">
                    {selectedKK.no_kk}
                  </p>
                </div>

                <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Jumlah Jiwa
                  </p>
                  <p className="mt-1 font-semibold">
                    {selectedKK.jumlah_jiwa} orang
                  </p>
                </div>
              </div>

              <div>
                <h3 className="mb-3 font-semibold">Anggota Keluarga</h3>

                <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                  {!detailLoading && anggotaDetail.map((item, index) => (
                    <div
                      key={item.id || index}
                      className="border-b border-gray-200 p-4 last:border-b-0 dark:border-gray-700"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold">{item.nama}</p>
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            {item.hubungan_keluarga}
                          </p>
                        </div>

                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          {item.nik}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  onClick={hapusKK}
                  disabled={deletingKK || detailLoading}
                  className="rounded-lg border border-red-300 px-5 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:hover:bg-red-950"
                >
                  {deletingKK ? "Menghapus..." : "Hapus KK"}
                </button>

                <button
                  onClick={mulaiEdit}
                  disabled={detailLoading || deletingKK}
                  className="rounded-lg bg-black px-5 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-gray-200"
                >
                  Edit Data
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEdit && selectedKK && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white text-gray-900 shadow-xl dark:bg-gray-900 dark:text-white">
            <ModalHeader
              title={`Edit ${selectedKK.nama_kepala_keluarga}`}
              subtitle="Ubah data keluarga dan anggota."
              onClose={() => setShowEdit(false)}
            />

            <div className="space-y-5 p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Nama Kepala Keluarga
                  </label>
                  <input
                    value={kepalaKeluarga}
                    onChange={(e) => {
                      const value = e.target.value;
                      setKepalaKeluarga(value);

                      const data = [...anggota];
                      if (
                        data[0] &&
                        data[0].hubungan_keluarga.trim().toUpperCase() === "KEPALA KELUARGA"
                      ) {
                        data[0].nama = value;
                      }
                      setAnggota(data);
                    }}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none focus:border-black dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    No. KK
                  </label>
                  <input
                    value={noKK}
                    onChange={(e) =>
                      setNoKK(
                        e.target.value.replace(/\D/g, "").slice(0, 16)
                      )
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none focus:border-black dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    inputMode="numeric"
                  />
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">Anggota Keluarga</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Jumlah jiwa: {anggota.length}
                    </p>
                  </div>

                  <button
                    onClick={tambahAnggota}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
                  >
                    + Tambah Anggota
                  </button>
                </div>

                <div className="space-y-4">
                  {anggota.map((item, index) => (
                    <div
                      key={index}
                      className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <span className="font-medium">
                          Anggota {index + 1}
                        </span>

                        {anggota.length > 1 && (
                          <button
                            onClick={() => hapusAnggota(index)}
                            className="text-sm text-red-600 hover:underline"
                          >
                            Hapus
                          </button>
                        )}
                      </div>

                      <div className="grid gap-3 md:grid-cols-3">
                        <input
                          value={item.nik ?? ""}
                          onChange={(e) =>
                            updateAnggota(
                              index,
                              "nik",
                              e.target.value
                                .replace(/\D/g, "")
                                .slice(0, 16)
                            )
                          }
                          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 outline-none focus:border-black dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                          placeholder="NIK (16 digit)"
                          inputMode="numeric"
                        />

                        <input
                          value={item.nama}
                          onChange={(e) =>
                            updateAnggota(index, "nama", e.target.value)
                          }
                          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 outline-none uppercase focus:border-black dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                          placeholder="Nama"
                        />

                        <input
                          value={item.hubungan_keluarga}
                          onChange={(e) =>
                            updateAnggota(
                              index,
                              "hubungan_keluarga",
                              e.target.value
                            )
                          }
                          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 outline-none uppercase focus:border-black dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-500"
                          placeholder="Hubungan keluarga"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 flex justify-end gap-2 border-t border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
              <button
                onClick={() => setShowEdit(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
              >
                Batal
              </button>

              <button
                onClick={simpanEdit}
                disabled={saving}
                className="rounded-lg bg-black px-5 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-gray-200"
              >
                {saving ? "Menyimpan..." : "Simpan Perubahan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
