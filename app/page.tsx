"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type KK = {
  id: number;
  no_kk: string;
  nama_kepala_keluarga: string;
  jumlah_jiwa: number;
};

type Anggota = {
  id?: number;
  nik: string;
  nama: string;
  hubungan_keluarga: string;
};

const defaultHubungan = [
  "Kepala Keluarga",
  "Istri",
  "Suami",
  "Anak",
  "Ayah",
  "Ibu",
  "Adik",
  "Kakak",
  "Menantu",
  "Cucu",
  "Keponakan",
];

export default function Home() {
  const [dataKK, setDataKK] = useState<KK[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [showTambah, setShowTambah] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const [selectedKK, setSelectedKK] = useState<KK | null>(null);
  const [anggotaDetail, setAnggotaDetail] = useState<Anggota[]>([]);

  const [noKK, setNoKK] = useState("");
  const [kepalaKeluarga, setKepalaKeluarga] = useState("");

  const [anggota, setAnggota] = useState<Anggota[]>([
    { nik: "", nama: "", hubungan_keluarga: "Kepala Keluarga" },
  ]);

  const [saving, setSaving] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [activeAutocomplete, setActiveAutocomplete] = useState<number | null>(
    null
  );
  const [hubunganTersimpan, setHubunganTersimpan] = useState<string[]>([]);

  useEffect(() => {
    const savedTheme = localStorage.getItem("rk-theme");
    setDarkMode(savedTheme === "dark");
  }, []);

  useEffect(() => {
    localStorage.setItem("rk-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

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

  async function loadHubungan() {
    const { data, error } = await supabase
      .from("anggota")
      .select("hubungan_keluarga");

    if (!error && data) {
      const unique = Array.from(
        new Set(
          data
            .map((item) => item.hubungan_keluarga?.trim())
            .filter(Boolean)
        )
      );

      setHubunganTersimpan(unique);
    }
  }

  useEffect(() => {
    loadKK();
    loadHubungan();
  }, []);

  const semuaHubungan = useMemo(() => {
    return Array.from(new Set([...defaultHubungan, ...hubunganTersimpan]));
  }, [hubunganTersimpan]);

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
      { nik: "", nama: "", hubungan_keluarga: "Kepala Keluarga" },
    ]);
    setActiveAutocomplete(null);
  }

  function tambahAnggota() {
    setAnggota([
      ...anggota,
      { nik: "", nama: "", hubungan_keluarga: "Anak" },
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
    data[index] = { ...data[index], [field]: value };
    setAnggota(data);
  }

  function setHubungan(index: number, value: string) {
    updateAnggota(index, "hubungan_keluarga", value);
    setActiveAutocomplete(index);
  }

  function pilihHubungan(index: number, value: string) {
    updateAnggota(index, "hubungan_keluarga", value);
    setActiveAutocomplete(null);
  }

  function hubunganSuggestions(index: number) {
    const keyword = anggota[index]?.hubungan_keluarga?.toLowerCase() || "";

    return semuaHubungan
      .filter((item) => item.toLowerCase().includes(keyword))
      .filter(
        (item) => item.toLowerCase() !== keyword && item !== "Kepala Keluarga"
      )
      .slice(0, 6);
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
      if (!item.nik.trim() || item.nik.length !== 16) {
        alert("Semua NIK harus terdiri dari 16 digit.");
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
    await Promise.all([loadKK(), loadHubungan()]);
  }

  async function bukaDetail(kk: KK) {
    setSelectedKK(kk);

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

    setShowDetail(true);
  }

  function mulaiEdit() {
    if (!selectedKK) return;

    setNoKK(selectedKK.no_kk);
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
    setActiveAutocomplete(null);
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
      if (!item.nik.trim() || item.nik.length !== 16) {
        alert("Semua NIK harus terdiri dari 16 digit.");
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

    await Promise.all([loadKK(), loadHubungan()]);
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

  function HubunganInput({
    index,
    disabled = false,
  }: {
    index: number;
    disabled?: boolean;
  }) {
    const suggestions = hubunganSuggestions(index);

    return (
      <div className="relative">
        <input
          disabled={disabled}
          value={anggota[index]?.hubungan_keluarga || ""}
          onFocus={() => setActiveAutocomplete(index)}
          onChange={(e) => setHubungan(index, e.target.value)}
          onBlur={() =>
            setTimeout(() => {
              setActiveAutocomplete((current) =>
                current === index ? null : current
              );
            }, 150)
          }
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 outline-none focus:border-black dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
          placeholder="Hubungan keluarga"
        />

        {activeAutocomplete === index && suggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-lg border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pilihHubungan(index, suggestion)}
                className="block w-full rounded-md px-3 py-2 text-left text-sm text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <style>{`
        .rk-app {
          min-height: 100vh;
          transition: background-color 180ms ease, color 180ms ease;
        }

        .rk-dark {
          background-color: #030712 !important;
          color: #f9fafb !important;
        }

        .rk-dark .bg-white { background-color: #111827 !important; }
        .rk-dark .bg-gray-50 { background-color: #1f2937 !important; }
        .rk-dark .bg-gray-100 { background-color: #030712 !important; }
        .rk-dark .bg-gray-800 { background-color: #1f2937 !important; }
        .rk-dark .bg-gray-900 { background-color: #111827 !important; }

        .rk-dark .text-gray-900 { color: #f9fafb !important; }
        .rk-dark .text-gray-600 { color: #d1d5db !important; }
        .rk-dark .text-gray-500 { color: #9ca3af !important; }
        .rk-dark .text-gray-400 { color: #9ca3af !important; }
        .rk-dark .text-gray-300 { color: #d1d5db !important; }

        .rk-dark .border-gray-100,
        .rk-dark .border-gray-200,
        .rk-dark .border-gray-300 {
          border-color: #374151 !important;
        }

        .rk-dark input,
        .rk-dark textarea,
        .rk-dark select {
          color: #f9fafb !important;
          background-color: #111827 !important;
          border-color: #4b5563 !important;
          color-scheme: dark;
        }

        .rk-dark input::placeholder,
        .rk-dark textarea::placeholder {
          color: #6b7280 !important;
        }

        .rk-dark .hover\:bg-gray-50:hover { background-color: #1f2937 !important; }
        .rk-dark .hover\:bg-gray-100:hover { background-color: #374151 !important; }
        .rk-dark .hover\:bg-gray-200:hover { background-color: #e5e7eb !important; }
        .rk-dark .hover\:bg-gray-700:hover { background-color: #374151 !important; }
        .rk-dark .hover\:bg-gray-800:hover { background-color: #374151 !important; }

        .rk-dark .bg-black { background-color: #f9fafb !important; }
        .rk-dark .bg-black.text-white { color: #111827 !important; }

        .rk-dark .divide-gray-200 > :not([hidden]) ~ :not([hidden]) {
          border-color: #374151 !important;
        }
      `}</style>

      <main className={`rk-app min-h-screen p-4 md:p-8 ${darkMode ? "rk-dark" : "bg-gray-100 text-gray-900"}`}>
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
                      className="border-b border-gray-100 last:border-0 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800"
                    >
                      <td className="px-5 py-4 text-gray-500">
                        {index + 1}
                      </td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() => bukaDetail(kk)}
                          className="font-semibold text-gray-900 hover:underline dark:text-white"
                        >
                          {kk.nama_kepala_keluarga}
                        </button>
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
                        data[0].hubungan_keluarga === "Kepala Keluarga"
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
                          value={item.nik}
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

                        <HubunganInput index={index} />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white text-gray-900 shadow-xl dark:bg-gray-900 dark:text-white">
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
                  {anggotaDetail.map((item, index) => (
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

              <div className="flex justify-end">
                <button
                  onClick={mulaiEdit}
                  className="rounded-lg bg-black px-5 py-2 text-sm font-medium text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
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
                        data[0].hubungan_keluarga === "Kepala Keluarga"
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
                          value={item.nik}
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
                          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 outline-none focus:border-black dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                          placeholder="Nama"
                        />

                        <HubunganInput index={index} />
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
    </>
  );
}
