"use client";

import { useEffect, useState } from "react";
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

export default function Home() {
  const [dataKK, setDataKK] = useState<KK[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [showTambah, setShowTambah] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  const [selectedKK, setSelectedKK] = useState<KK | null>(null);
  const [anggotaDetail, setAnggotaDetail] = useState<Anggota[]>([]);

  const [noKK, setNoKK] = useState("");
  const [kepalaKeluarga, setKepalaKeluarga] = useState("");

  const [anggota, setAnggota] = useState<Anggota[]>([
    {
      nik: "",
      nama: "",
      hubungan_keluarga: "Kepala Keluarga",
    },
  ]);

  const [saving, setSaving] = useState(false);

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
    kk.nama_kepala_keluarga
      .toLowerCase()
      .includes(search.toLowerCase())
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
      {
        nik: "",
        nama: "",
        hubungan_keluarga: "Kepala Keluarga",
      },
    ]);
  }

  function tambahAnggota() {
    setAnggota([
      ...anggota,
      {
        nik: "",
        nama: "",
        hubungan_keluarga: "Anak",
      },
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
    data[index] = {
      ...data[index],
      [field]: value,
    };

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
      console.error(anggotaError);

      await supabase
        .from("kk")
        .delete()
        .eq("id", kkBaru.id);

      alert(anggotaError.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    setShowTambah(false);
    resetForm();
    await loadKK();
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

  return (
    <main className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="mx-auto max-w-6xl">

        {/* HEADER */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Rukun Kematian
          </h1>

          <p className="text-sm text-gray-500">
            Data Keluarga RT
          </p>
        </div>

        {/* STATISTIK */}
        <div className="mb-6 grid grid-cols-2 gap-4">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Total KK
            </p>

            <p className="mt-1 text-3xl font-bold text-gray-900">
              {totalKK}
            </p>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Total Jiwa
            </p>

            <p className="mt-1 text-3xl font-bold text-gray-900">
              {totalJiwa}
            </p>
          </div>
        </div>

        {/* DATA KELUARGA */}
        <div className="rounded-xl bg-white shadow-sm">

          <div className="flex flex-col gap-4 border-b p-5 md:flex-row md:items-center md:justify-between">

            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Data Keluarga
              </h2>

              <p className="text-sm text-gray-500">
                Klik nama kepala keluarga untuk melihat detail.
              </p>
            </div>

            <div className="flex gap-2">

              <input
                type="text"
                placeholder="Cari kepala keluarga..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border px-4 py-2 text-sm outline-none focus:border-black md:w-72"
              />

              <button
                onClick={() => {
                  resetForm();
                  setShowTambah(true);
                }}
                className="whitespace-nowrap rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
              >
                + Tambah KK
              </button>

            </div>
          </div>

          {/* TABLE */}
          <div className="overflow-x-auto">

            <table className="w-full text-left text-sm">

              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-5 py-3 font-medium text-gray-500">
                    No
                  </th>

                  <th className="px-5 py-3 font-medium text-gray-500">
                    Kepala Keluarga
                  </th>

                  <th className="px-5 py-3 font-medium text-gray-500">
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
                      className="border-b last:border-0 hover:bg-gray-50"
                    >
                      <td className="px-5 py-4 text-gray-500">
                        {index + 1}
                      </td>

                      <td className="px-5 py-4">
                        <button
                          onClick={() => bukaDetail(kk)}
                          className="font-semibold text-gray-900 hover:underline"
                        >
                          {kk.nama_kepala_keluarga}
                        </button>
                      </td>

                      <td className="px-5 py-4 text-gray-600">
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

      {/* ========================= */}
      {/* MODAL TAMBAH KK */}
      {/* ========================= */}

      {showTambah && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">

          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl">

            <div className="sticky top-0 flex items-center justify-between border-b bg-white p-5">

              <div>
                <h2 className="text-lg font-bold">
                  Tambah Data KK
                </h2>

                <p className="text-sm text-gray-500">
                  Masukkan data keluarga dan seluruh anggotanya.
                </p>
              </div>

              <button
                onClick={() => setShowTambah(false)}
                className="text-2xl text-gray-400 hover:text-black"
              >
                ×
              </button>

            </div>

            <div className="space-y-5 p-5">

              {/* DATA KK */}

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
                    className="w-full rounded-lg border px-3 py-2 outline-none focus:border-black"
                    placeholder="Nama kepala keluarga"
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
                    className="w-full rounded-lg border px-3 py-2 outline-none focus:border-black"
                    placeholder="16 digit"
                    inputMode="numeric"
                  />
                </div>

              </div>

              {/* ANGGOTA */}

              <div>

                <div className="mb-3 flex items-center justify-between">

                  <div>
                    <h3 className="font-semibold">
                      Anggota Keluarga
                    </h3>

                    <p className="text-sm text-gray-500">
                      Jumlah jiwa: {anggota.length}
                    </p>
                  </div>

                  <button
                    onClick={tambahAnggota}
                    className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-gray-50"
                  >
                    + Tambah Anggota
                  </button>

                </div>

                <div className="space-y-4">

                  {anggota.map((item, index) => (
                    <div
                      key={index}
                      className="rounded-xl border bg-gray-50 p-4"
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
                          className="rounded-lg border bg-white px-3 py-2 outline-none focus:border-black"
                          placeholder="NIK (16 digit)"
                          inputMode="numeric"
                        />

                        <input
                          value={item.nama}
                          onChange={(e) =>
                            updateAnggota(
                              index,
                              "nama",
                              e.target.value
                            )
                          }
                          className="rounded-lg border bg-white px-3 py-2 outline-none focus:border-black"
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
                          className="rounded-lg border bg-white px-3 py-2 outline-none focus:border-black"
                          placeholder="Hubungan keluarga"
                        />

                      </div>

                    </div>
                  ))}

                </div>

              </div>

            </div>

            <div className="sticky bottom-0 flex justify-end gap-2 border-t bg-white p-5">

              <button
                onClick={() => setShowTambah(false)}
                className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50"
              >
                Batal
              </button>

              <button
                onClick={simpanKK}
                disabled={saving}
                className="rounded-lg bg-black px-5 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {saving ? "Menyimpan..." : "Simpan KK"}
              </button>

            </div>

          </div>
        </div>
      )}

      {/* ========================= */}
      {/* MODAL DETAIL KK */}
      {/* ========================= */}

      {showDetail && selectedKK && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">

          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl">

            <div className="flex items-center justify-between border-b p-5">

              <div>
                <h2 className="text-lg font-bold">
                  {selectedKK.nama_kepala_keluarga}
                </h2>

                <p className="text-sm text-gray-500">
                  Detail keluarga
                </p>
              </div>

              <button
                onClick={() => setShowDetail(false)}
                className="text-2xl text-gray-400 hover:text-black"
              >
                ×
              </button>

            </div>

            <div className="space-y-5 p-5">

              <div className="grid grid-cols-2 gap-4">

                <div className="rounded-lg bg-gray-50 p-4">
                  <p className="text-xs text-gray-500">
                    No. KK
                  </p>

                  <p className="mt-1 font-semibold">
                    {selectedKK.no_kk}
                  </p>
                </div>

                <div className="rounded-lg bg-gray-50 p-4">
                  <p className="text-xs text-gray-500">
                    Jumlah Jiwa
                  </p>

                  <p className="mt-1 font-semibold">
                    {selectedKK.jumlah_jiwa} orang
                  </p>
                </div>

              </div>

              <div>

                <h3 className="mb-3 font-semibold">
                  Anggota Keluarga
                </h3>

                <div className="overflow-hidden rounded-xl border">

                  {anggotaDetail.map((item, index) => (
                    <div
                      key={item.id || index}
                      className="border-b p-4 last:border-b-0"
                    >

                      <div className="flex items-start justify-between gap-4">

                        <div>
                          <p className="font-semibold">
                            {item.nama}
                          </p>

                          <p className="mt-1 text-sm text-gray-500">
                            {item.hubungan_keluarga}
                          </p>
                        </div>

                        <p className="text-sm text-gray-600">
                          {item.nik}
                        </p>

                      </div>

                    </div>
                  ))}

                </div>

              </div>

            </div>

          </div>
        </div>
      )}

    </main>
  );
}
