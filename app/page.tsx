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

// --- ICONS ---
const IconSearch = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>;
const IconAdd = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const IconTrash = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>;
const IconClose = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;
const IconMoon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>;
const IconSun = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>;
const IconFile = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>;
const IconUsers = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>;


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
  const [activeAutocomplete, setActiveAutocomplete] = useState<number | null>(null);
  const [hubunganTersimpan, setHubunganTersimpan] = useState<string[]>([]);

  // PENGATURAN DARK MODE YANG BENAR (MENGGUNAKAN CLASS TAILWIND)
  useEffect(() => {
    const savedTheme = localStorage.getItem("rk-theme");
    if (savedTheme === "dark") {
      setDarkMode(true);
    } else if (savedTheme === "light") {
      setDarkMode(false);
    } else {
      setDarkMode(window.matchMedia("(prefers-color-scheme: dark)").matches);
    }
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      document.documentElement.style.colorScheme = "dark";
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.style.colorScheme = "light";
    }
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
    const { data, error } = await supabase.from("anggota").select("hubungan_keluarga");
    if (!error && data) {
      const unique = Array.from(new Set(data.map((item) => item.hubungan_keluarga?.trim()).filter(Boolean)));
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
  const totalJiwa = dataKK.reduce((total, kk) => total + kk.jumlah_jiwa, 0);

  function resetForm() {
    setNoKK("");
    setKepalaKeluarga("");
    setAnggota([{ nik: "", nama: "", hubungan_keluarga: "Kepala Keluarga" }]);
    setActiveAutocomplete(null);
  }

  function tambahAnggota() {
    setAnggota([...anggota, { nik: "", nama: "", hubungan_keluarga: "Anak" }]);
  }

  function hapusAnggota(index: number) {
    if (anggota.length === 1) return;
    setAnggota(anggota.filter((_, i) => i !== index));
  }

  function updateAnggota(index: number, field: keyof Anggota, value: string) {
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
      .filter((item) => item.toLowerCase() !== keyword && item !== "Kepala Keluarga")
      .slice(0, 6);
  }

  async function simpanKK() {
    if (!kepalaKeluarga.trim()) return alert("Nama kepala keluarga wajib diisi.");
    if (!noKK.trim() || noKK.length !== 16) return alert("No. KK harus terdiri dari 16 digit.");

    for (const item of anggota) {
      if (!item.nik.trim() || item.nik.length !== 16) return alert("Semua NIK harus terdiri dari 16 digit.");
      if (!item.nama.trim()) return alert("Nama semua anggota wajib diisi.");
      if (!item.hubungan_keluarga.trim()) return alert("Hubungan keluarga wajib diisi.");
    }

    setSaving(true);
    const { data: kkBaru, error: kkError } = await supabase
      .from("kk")
      .insert({ no_kk: noKK, nama_kepala_keluarga: kepalaKeluarga, jumlah_jiwa: anggota.length })
      .select()
      .single();

    if (kkError || !kkBaru) {
      console.error(kkError);
      alert(kkError?.message || "Gagal menyimpan data KK.");
      setSaving(false);
      return;
    }

    const dataAnggota = anggota.map((item) => ({
      kk_id: kkBaru.id, nik: item.nik, nama: item.nama, hubungan_keluarga: item.hubungan_keluarga,
    }));

    const { error: anggotaError } = await supabase.from("anggota").insert(dataAnggota);
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
    setAnggota(anggotaDetail.map((item) => ({ id: item.id, nik: item.nik, nama: item.nama, hubungan_keluarga: item.hubungan_keluarga })));
    setShowDetail(false);
    setShowEdit(true);
    setActiveAutocomplete(null);
  }

  async function simpanEdit() {
    if (!selectedKK) return;
    if (!kepalaKeluarga.trim()) return alert("Nama kepala keluarga wajib diisi.");
    if (!noKK.trim() || noKK.length !== 16) return alert("No. KK harus terdiri dari 16 digit.");

    for (const item of anggota) {
      if (!item.nik.trim() || item.nik.length !== 16) return alert("Semua NIK harus terdiri dari 16 digit.");
      if (!item.nama.trim()) return alert("Nama semua anggota wajib diisi.");
      if (!item.hubungan_keluarga.trim()) return alert("Hubungan keluarga wajib diisi.");
    }

    setSaving(true);
    const { error: kkError } = await supabase
      .from("kk")
      .update({ no_kk: noKK, nama_kepala_keluarga: kepalaKeluarga, jumlah_jiwa: anggota.length })
      .eq("id", selectedKK.id);

    if (kkError) {
      alert(kkError.message);
      setSaving(false);
      return;
    }

    const { error: deleteError } = await supabase.from("anggota").delete().eq("kk_id", selectedKK.id);
    if (deleteError) {
      alert(deleteError.message);
      setSaving(false);
      return;
    }

    const { error: insertError } = await supabase.from("anggota").insert(
      anggota.map((item) => ({ kk_id: selectedKK.id, nik: item.nik, nama: item.nama, hubungan_keluarga: item.hubungan_keluarga }))
    );

    if (insertError) {
      alert(insertError.message);
      setSaving(false);
      return;
    }

    const updatedKK = { ...selectedKK, no_kk: noKK, nama_kepala_keluarga: kepalaKeluarga, jumlah_jiwa: anggota.length };
    setSelectedKK(updatedKK);
    setSaving(false);
    setShowEdit(false);
    resetForm();
    await Promise.all([loadKK(), loadHubungan()]);
    await bukaDetail(updatedKK);
  }

  function ModalHeader({ title, subtitle, onClose }: { title: string; subtitle?: string; onClose: () => void }) {
    return (
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 p-5 sm:p-6 bg-white dark:bg-slate-900 z-10 sticky top-0">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h2>
          {subtitle && <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>}
        </div>
        <button onClick={onClose} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
          <IconClose />
        </button>
      </div>
    );
  }

  function HubunganInput({ index, disabled = false }: { index: number; disabled?: boolean }) {
    const suggestions = hubunganSuggestions(index);
    return (
      <div className="relative">
        <input
          disabled={disabled}
          value={anggota[index]?.hubungan_keluarga || ""}
          onFocus={() => setActiveAutocomplete(index)}
          onChange={(e) => setHubungan(index, e.target.value)}
          onBlur={() => setTimeout(() => { setActiveAutocomplete((current) => current === index ? null : current); }, 150)}
          className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 transition-all text-slate-900 dark:text-white placeholder:text-slate-400"
          placeholder="Hubungan (cth: Anak)"
        />
        {activeAutocomplete === index && suggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 max-h-48 overflow-y-auto custom-scrollbar rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1.5 shadow-xl">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pilihHubungan(index, suggestion)}
                className="block w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700/50 dark:hover:text-white transition-colors"
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
      <style jsx global>{`
        /* Menambahkan scrollbar tipis yang elegan */
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #475569; }
      `}</style>

      <main className="min-h-screen bg-slate-50 dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200">
        <div className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8">
          
          {/* HEADER */}
          <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-xl shadow-lg shadow-blue-500/30">
                RK
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Rukun Kematian</h1>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Manajemen Data Keluarga RT</p>
              </div>
            </div>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="flex items-center justify-center gap-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm font-bold text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-all"
            >
              {darkMode ? <><IconSun /> Terang</> : <><IconMoon /> Gelap</>}
            </button>
          </header>

          {/* STATS */}
          <div className="grid grid-cols-2 gap-4 sm:gap-6 mb-8">
            <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <IconFile />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Total KK</p>
                <p className="text-3xl font-black text-slate-900 dark:text-white">{totalKK}</p>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <IconUsers />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Total Jiwa</p>
                <p className="text-3xl font-black text-slate-900 dark:text-white">{totalJiwa}</p>
              </div>
            </div>
          </div>

          {/* LIST SECTION */}
          <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 sm:p-5 lg:p-6 border-b border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"> <IconSearch /> </span>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-full pl-11 pr-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white dark:placeholder:text-slate-500 shadow-sm"
                  placeholder="Cari kepala keluarga..." 
                />
              </div>
              <button
                onClick={() => { resetForm(); setShowTambah(true); }}
                className="bg-blue-600 text-white hover:bg-blue-700 px-6 py-3 rounded-full text-sm font-bold shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
              >
                <IconAdd /> Tambah KK
              </button>
            </div>

            {/* List Data */}
            <div className="flex flex-col flex-1 divide-y divide-slate-100 dark:divide-slate-800/80">
              {loading ? (
                <div className="p-12 text-center text-slate-500 dark:text-slate-400 font-semibold">Memuat data keluarga...</div>
              ) : filteredKK.length === 0 ? (
                <div className="p-12 text-center text-slate-500 dark:text-slate-400 font-semibold">Belum ada data KK ditemukan.</div>
              ) : (
                filteredKK.map((kk, index) => (
                  <div
                    key={kk.id}
                    onClick={() => bukaDetail(kk)}
                    className="p-4 sm:p-5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 font-bold text-sm shrink-0">
                        {index + 1}
                      </div>
                      <div>
                        <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {kk.nama_kepala_keluarga}
                        </h3>
                        <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5">No. KK: {kk.no_kk}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      <div className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap">
                        {kk.jumlah_jiwa} Jiwa
                      </div>
                      <span className="text-slate-300 dark:text-slate-600 group-hover:text-slate-500 dark:group-hover:text-slate-400 transition-colors hidden sm:block">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><polyline points="9 18 15 12 9 6"></polyline></svg>
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ======================= MODAL TAMBAH ======================= */}
        {showTambah && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800">
              <ModalHeader title="Tambah Data KK" subtitle="Masukkan data keluarga & anggota" onClose={() => setShowTambah(false)} />
              
              <div className="overflow-y-auto flex-1 custom-scrollbar p-5 sm:p-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Nama Kepala Keluarga</label>
                    <input
                      value={kepalaKeluarga}
                      onChange={(e) => {
                        const value = e.target.value;
                        setKepalaKeluarga(value);
                        const data = [...anggota];
                        if (data[0] && data[0].hubungan_keluarga === "Kepala Keluarga") data[0].nama = value;
                        setAnggota(data);
                      }}
                      className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/50 outline-none text-slate-900 dark:text-white transition-all"
                      placeholder="Nama Lengkap"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Nomor KK</label>
                    <input
                      value={noKK}
                      onChange={(e) => setNoKK(e.target.value.replace(/\D/g, "").slice(0, 16))}
                      className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/50 outline-none text-slate-900 dark:text-white transition-all"
                      placeholder="16 Digit"
                      inputMode="numeric"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-lg text-slate-900 dark:text-white">Anggota Keluarga</h3>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total: {anggota.length} jiwa</p>
                    </div>
                    <button onClick={tambahAnggota} className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-2">
                      <IconAdd /> Tambah
                    </button>
                  </div>

                  <div className="space-y-4">
                    {anggota.map((item, index) => (
                      <div key={index} className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 transition-all relative">
                        <div className="flex justify-between items-center mb-4">
                          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-white dark:bg-slate-800 px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                            Anggota {index + 1}
                          </span>
                          {anggota.length > 1 && (
                            <button onClick={() => hapusAnggota(index)} className="text-red-500 hover:text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 p-2 rounded-lg transition-colors">
                              <IconTrash />
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <input
                            value={item.nik}
                            onChange={(e) => updateAnggota(index, "nik", e.target.value.replace(/\D/g, "").slice(0, 16))}
                            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 transition-all text-slate-900 dark:text-white placeholder:text-slate-400"
                            placeholder="NIK (16 Digit)"
                            inputMode="numeric"
                          />
                          <input
                            value={item.nama}
                            onChange={(e) => updateAnggota(index, "nama", e.target.value)}
                            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 transition-all text-slate-900 dark:text-white placeholder:text-slate-400"
                            placeholder="Nama Lengkap"
                          />
                          <HubunganInput index={index} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 dark:border-slate-800 p-5 bg-slate-50 dark:bg-slate-900 flex justify-end gap-3 z-10">
                <button onClick={() => setShowTambah(false)} className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
                  Batal
                </button>
                <button onClick={simpanKK} disabled={saving} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 shadow-md shadow-blue-500/20 disabled:opacity-50 transition-all">
                  {saving ? "Menyimpan..." : "Simpan Data"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ======================= MODAL DETAIL ======================= */}
        {showDetail && selectedKK && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800">
              <ModalHeader title={selectedKK.nama_kepala_keluarga} subtitle={`No. KK: ${selectedKK.no_kk}`} onClose={() => setShowDetail(false)} />
              
              <div className="overflow-y-auto flex-1 custom-scrollbar p-5 sm:p-6">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/50 rounded-2xl p-4">
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Jumlah Jiwa</span>
                    <p className="text-2xl font-black mt-1 text-blue-700 dark:text-blue-300">{selectedKK.jumlah_jiwa}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-4 flex flex-col justify-center items-start">
                     <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status Data</span>
                     <span className="mt-2 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 px-3 py-1 rounded-md text-xs font-bold">Terverifikasi</span>
                  </div>
                </div>

                <h3 className="font-bold text-lg mb-4 text-slate-900 dark:text-white">Daftar Anggota Keluarga</h3>
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/80">
                  {anggotaDetail.map(item => (
                    <div key={item.id} className="p-4 bg-white dark:bg-slate-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white text-base">{item.nama}</p>
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1.5 inline-block bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md">
                          {item.hubungan_keluarga}
                        </p>
                      </div>
                      <div className="text-sm font-mono font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 rounded-lg text-center sm:text-left">
                        {item.nik}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-200 dark:border-slate-800 p-5 bg-slate-50 dark:bg-slate-900 flex justify-end">
                <button onClick={mulaiEdit} className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-800 dark:hover:bg-slate-200 shadow-md transition-colors w-full sm:w-auto">
                  Edit Data Keluarga
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ======================= MODAL EDIT ======================= */}
        {showEdit && selectedKK && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800">
              <ModalHeader title="Edit Data Keluarga" subtitle={`Perbarui data keluarga ${selectedKK.nama_kepala_keluarga}`} onClose={() => setShowEdit(false)} />
              
              <div className="overflow-y-auto flex-1 custom-scrollbar p-5 sm:p-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Nama Kepala Keluarga</label>
                    <input
                      value={kepalaKeluarga}
                      onChange={(e) => {
                        const value = e.target.value;
                        setKepalaKeluarga(value);
                        const data = [...anggota];
                        if (data[0] && data[0].hubungan_keluarga === "Kepala Keluarga") data[0].nama = value;
                        setAnggota(data);
                      }}
                      className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/50 outline-none text-slate-900 dark:text-white transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Nomor KK</label>
                    <input
                      value={noKK}
                      onChange={(e) => setNoKK(e.target.value.replace(/\D/g, "").slice(0, 16))}
                      className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/50 outline-none text-slate-900 dark:text-white transition-all"
                      inputMode="numeric"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-lg text-slate-900 dark:text-white">Anggota Keluarga</h3>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total: {anggota.length} jiwa</p>
                    </div>
                    <button onClick={tambahAnggota} className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-2">
                      <IconAdd /> Tambah
                    </button>
                  </div>

                  <div className="space-y-4">
                    {anggota.map((item, index) => (
                      <div key={index} className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 transition-all relative">
                        <div className="flex justify-between items-center mb-4">
                          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-white dark:bg-slate-800 px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                            Anggota {index + 1}
                          </span>
                          {anggota.length > 1 && (
                            <button onClick={() => hapusAnggota(index)} className="text-red-500 hover:text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 p-2 rounded-lg transition-colors">
                              <IconTrash />
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <input
                            value={item.nik}
                            onChange={(e) => updateAnggota(index, "nik", e.target.value.replace(/\D/g, "").slice(0, 16))}
                            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 transition-all text-slate-900 dark:text-white placeholder:text-slate-400"
                            placeholder="NIK (16 Digit)"
                            inputMode="numeric"
                          />
                          <input
                            value={item.nama}
                            onChange={(e) => updateAnggota(index, "nama", e.target.value)}
                            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 transition-all text-slate-900 dark:text-white placeholder:text-slate-400"
                            placeholder="Nama Lengkap"
                          />
                          <HubunganInput index={index} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 dark:border-slate-800 p-5 bg-slate-50 dark:bg-slate-900 flex justify-end gap-3 z-10">
                <button onClick={() => setShowEdit(false)} className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
                  Batal
                </button>
                <button onClick={simpanEdit} disabled={saving} className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-800 dark:hover:bg-slate-200 shadow-md disabled:opacity-50 transition-all">
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
