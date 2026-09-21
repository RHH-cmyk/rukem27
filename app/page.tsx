"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type KK = {
  id: number;
  no_kk: string;
  nama_kepala_keluarga: string;
  jumlah_jiwa: number;
};

export default function Home() {
  const [dataKK, setDataKK] = useState<KK[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

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

  const filteredKK = dataKK.filter((kk) => {
    const keyword = search.toLowerCase();

    return (
      kk.nama_kepala_keluarga.toLowerCase().includes(keyword) ||
      kk.no_kk.includes(keyword)
    );
  });

  const totalKK = dataKK.length;
  const totalJiwa = dataKK.reduce(
    (total, kk) => total + kk.jumlah_jiwa,
    0
  );

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
            <p className="text-sm text-gray-500">Total KK</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">
              {totalKK}
            </p>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Total Jiwa</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">
              {totalJiwa}
            </p>
          </div>
        </div>

        {/* DATA KK */}
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
                placeholder="Cari nama atau No. KK..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border px-4 py-2 text-sm outline-none focus:border-black md:w-72"
              />

              <button
                className="whitespace-nowrap rounded-lg bg-black px-4 py-2 text-sm font-medium text-white"
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
                    No. KK
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
                      colSpan={4}
                      className="px-5 py-10 text-center text-gray-500"
                    >
                      Memuat data...
                    </td>
                  </tr>
                ) : filteredKK.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
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
                        <button className="font-semibold text-gray-900 hover:underline">
                          {kk.nama_kepala_keluarga}
                        </button>
                      </td>

                      <td className="px-5 py-4 text-gray-600">
                        {kk.no_kk}
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
    </main>
  );
}