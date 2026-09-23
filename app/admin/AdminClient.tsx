"use client";

import { useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";

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

type IuranTarif = {
  mulai_bulan: string;
  tarif_per_kk: number;
};

type IuranPembayaran = {
  id: number;
  kk_id: number;
  periode_bulan: string;
  jumlah_bayar: number;
  paid_at: string;
  catatan: string | null;
};



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
    <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-gray-200 bg-white px-5 py-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="min-w-0">
        <h2 className="truncate text-lg font-bold">{title}</h2>
        {subtitle ? (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Tutup"
        className="shrink-0 rounded-lg p-2 text-xl leading-none text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-white"
      >
        ×
      </button>
    </div>
  );
}

export default function AdminClient() {
  const [dataKK, setDataKK] = useState<KK[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showFloatingSearch, setShowFloatingSearch] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showUserSettings, setShowUserSettings] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [savingUser, setSavingUser] = useState(false);

  const [showTambah, setShowTambah] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [deletingKK, setDeletingKK] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showIuranSettings, setShowIuranSettings] = useState(false);
  const [iuranTarif, setIuranTarif] = useState<IuranTarif[]>([]);
  const [iuranPembayaran, setIuranPembayaran] = useState<IuranPembayaran[]>([]);
  const [loadingIuran, setLoadingIuran] = useState(false);
  const [savingIuranTarif, setSavingIuranTarif] = useState(false);
  const [savingIuranBayar, setSavingIuranBayar] = useState(false);
  const [payingMonth, setPayingMonth] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [iuranYear, setIuranYear] = useState(new Date().getFullYear());

  useEffect(() => {
    const savedTheme = localStorage.getItem("rk-theme");
    setDarkMode(savedTheme === "dark");
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("rk-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  useEffect(() => {
    const handleScroll = () => setShowFloatingSearch(window.scrollY > 180);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);


  // Kunci scroll halaman saat modal terbuka tanpa mengubah posisi scroll.
  // Modalnya sendiri tetap bisa di-scroll.
  useEffect(() => {
    const modalTerbuka = showTambah || showDetail || showEdit || showIuranSettings || showUserSettings;
    if (!modalTerbuka) return;

    const body = document.body;
    const html = document.documentElement;
    const previousBodyOverflow = body.style.overflow;
    const previousHtmlOverflow = html.style.overflow;

    body.style.overflow = "hidden";
    html.style.overflow = "hidden";

    return () => {
      body.style.overflow = previousBodyOverflow;
      html.style.overflow = previousHtmlOverflow;
    };
  }, [showTambah, showDetail, showEdit, showIuranSettings, showUserSettings]);

  async function bukaPengaturanUser() {
    setShowUserSettings(true);
    try {
      const res = await fetch("/api/admin/me", { cache: "no-store" });
      const data = await res.json();
      if (res.ok) setNewUsername(data.username || "");
    } catch {
      // UI remains usable; save will show the actual error.
    }
  }

  async function simpanPengaturanUser() {
    if (!newUsername.trim()) {
      alert("Username wajib diisi.");
      return;
    }

    if (newPassword && newPassword !== confirmNewPassword) {
      alert("Konfirmasi password baru tidak sama.");
      return;
    }

    if (newPassword && !currentPassword) {
      alert("Masukkan password lama.");
      return;
    }

    setSavingUser(true);
    try {
      const res = await fetch("/api/admin/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: newUsername.trim(),
          currentPassword,
          newPassword,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Gagal menyimpan pengaturan user.");
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setShowUserSettings(false);
      alert("Pengaturan user berhasil disimpan.");
    } catch {
      alert("Gagal terhubung ke server.");
    } finally {
      setSavingUser(false);
    }
  }

  async function logoutAdmin() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/admin/login";
  }

  async function loadKK() {
    setLoading(true);

    try {
      const res = await fetch("/api/admin/data?action=listKK", { cache: "no-store" });
      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Gagal memuat data KK.");
      }

      setDataKK(result.data || []);
    } catch (error) {
      console.error(error);
      setDataKK([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadKK();
  }, []);

  async function bukaPengaturanIuran() {
    setShowIuranSettings(true);
    try {
      const res = await fetch("/api/admin/data?action=iuranSettings", { cache: "no-store" });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Gagal memuat tarif iuran.");
      setIuranTarif(result.data || []);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Gagal memuat tarif iuran.");
    }
  }

  async function simpanIuranTarif() {
    setSavingIuranTarif(true);
    try {
      const res = await fetch("/api/admin/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "saveIuranTarif", tarif: iuranTarif }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Gagal menyimpan tarif iuran.");
      setShowIuranSettings(false);
      if (selectedKK) await loadIuran(selectedKK.id);
      alert("Tarif iuran berhasil disimpan.");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Gagal menyimpan tarif iuran.");
    } finally {
      setSavingIuranTarif(false);
    }
  }

  async function loadIuran(kkId: number) {
    setLoadingIuran(true);
    try {
      const res = await fetch(`/api/admin/data?action=iuran&kkId=${kkId}`, { cache: "no-store" });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Gagal memuat iuran.");
      setIuranTarif(result.tarif || []);
      setIuranPembayaran(result.pembayaran || []);
    } catch (error) {
      console.error(error);
      setIuranTarif([]);
      setIuranPembayaran([]);
    } finally {
      setLoadingIuran(false);
    }
  }

  async function simpanPembayaranIuran(periodeBulan: string, jumlahBayar: number) {
    if (!selectedKK || !Number.isFinite(jumlahBayar) || jumlahBayar <= 0) return;
    setSavingIuranBayar(true);
    try {
      const res = await fetch("/api/admin/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "bayarIuran",
          kkId: selectedKK.id,
          periodeBulan,
          jumlahBayar: Math.round(jumlahBayar),
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Gagal menyimpan pembayaran.");
      setPayingMonth(null);
      setPaymentAmount("");
      await loadIuran(selectedKK.id);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Gagal menyimpan pembayaran.");
    } finally {
      setSavingIuranBayar(false);
    }
  }

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

    try {
      const res = await fetch("/api/admin/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "createKK",
          noKK,
          kepalaKeluarga,
          anggota,
        }),
      });
      const result = await res.json();

      if (!res.ok) {
        alert(result.error || "Gagal menyimpan data KK.");
        return;
      }

      setShowTambah(false);
      resetForm();
      await loadKK();
    } catch {
      alert("Gagal terhubung ke server.");
    } finally {
      setSaving(false);
    }
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

      const res = await fetch("/api/admin/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "import", keluarga }),
      });
      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Import gagal.");
      }

      await loadKK();

      const ringkasan =
        `Import selesai. Baru: ${result.berhasil} KK. Dilewati: ${result.dilewati} KK. Gagal: ${result.gagal} KK.` +
        (result.errorList?.length
          ? `\n\nContoh error:\n${result.errorList.slice(0, 5).join("\n")}`
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
    setIuranPembayaran([]);
    setIuranTarif([]);
    setPayingMonth(null);
    setPaymentAmount("");
    setIuranYear(new Date().getFullYear());
    loadIuran(kk.id);

    try {
      const res = await fetch(`/api/admin/data?action=detail&id=${kk.id}`, {
        cache: "no-store",
      });
      const result = await res.json();

      if (!res.ok) throw new Error(result.error || "Gagal memuat detail.");

      setAnggotaDetail(result.data || []);
    } catch (error) {
      console.error(error);
      setAnggotaDetail([]);
    } finally {
      setDetailLoading(false);
    }
  }

  function hapusKK() {
    if (!selectedKK || deletingKK) return;
    setShowDeleteConfirm(true);
  }

  async function konfirmasiHapusKK() {
    if (!selectedKK || deletingKK) return;

    setDeletingKK(true);

    try {
      const res = await fetch("/api/admin/data", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deleteKK", id: selectedKK.id }),
      });
      const result = await res.json();

      if (!res.ok) {
        alert(result.error || "Gagal menghapus KK.");
        return;
      }

      setShowDeleteConfirm(false);
      setShowDetail(false);
      setSelectedKK(null);
      setAnggotaDetail([]);
      await loadKK();
    } catch {
      alert("Gagal terhubung ke server.");
    } finally {
      setDeletingKK(false);
    }
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

    try {
      const res = await fetch("/api/admin/data", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateKK",
          id: selectedKK.id,
          noKK,
          kepalaKeluarga,
          anggota,
        }),
      });
      const result = await res.json();

      if (!res.ok) {
        alert(result.error || "Gagal menyimpan perubahan.");
        return;
      }

      const updatedKK = {
        ...selectedKK,
        no_kk: noKK,
        nama_kepala_keluarga: kepalaKeluarga,
        jumlah_jiwa: anggota.length,
      };

      setSelectedKK(updatedKK);
      setShowEdit(false);
      resetForm();

      await loadKK();
      await bukaDetail(updatedKK);
    } catch {
      alert("Gagal terhubung ke server.");
    } finally {
      setSaving(false);
    }
  }


  return (
    <main className="min-h-screen bg-gray-100 p-4 pb-24 text-gray-900 transition-colors md:p-8 md:pb-24 dark:bg-gray-950 dark:text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Admin Rukun Kematian</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Kelola Data Keluarga RT 27
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={bukaPengaturanUser}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:hover:bg-gray-800"
              >
                User
              </button>
              <button
                type="button"
                onClick={bukaPengaturanIuran}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:hover:bg-gray-800"
              >
                Iuran
              </button>
              <button
                type="button"
                onClick={logoutAdmin}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:hover:bg-gray-800"
              >
                Keluar
              </button>
              <button


                type="button"


                onClick={() => fileInputRef.current?.click()}


                disabled={importing}


                aria-label="Import Excel"


                title="Import Excel"


                className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 bg-white text-xl font-medium text-gray-900 shadow-sm hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:hover:bg-gray-800"


              >


                +


              </button>


              <input


                ref={fileInputRef}


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


              <button


                type="button"


                onClick={() => setDarkMode((value) => !value)}


                className="shrink-0 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:hover:bg-gray-800"


              >


                {darkMode ? "Mode Terang" : "Mode Gelap"}


              </button>


            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowInfoModal(true)}
            className="mt-4 w-full rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:border-gray-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-900 dark:hover:border-gray-600"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
                  Wilayah RT
                </p>
                <p className="mt-1 text-base font-bold sm:text-lg">
                  RUKUN KEMATIAN RT 27
                </p>
                <p className="mt-0.5 truncate text-sm text-gray-500 dark:text-gray-400">
                  Kel. Syamsuddin Noor · Kec. Landasan Ulin · Kota Banjarbaru
                </p>
              </div>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-bold dark:bg-gray-800">
                i
              </span>
            </div>
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

            <div className="flex w-full gap-2">
              <div className="relative w-full md:w-72">
                <input
                  type="text"
                  placeholder="Cari kepala keluarga..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoComplete="off"
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 pr-10 text-sm text-gray-900 outline-none focus:border-black dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    aria-label="Hapus pencarian"
                    className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-lg leading-none text-gray-500 hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-gray-700 dark:hover:text-white"
                  >
                    ×
                  </button>
                )}
              </div>

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

              <div>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">Iuran Rukun Kematian</h3>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Bayar cicilan atau lebih. Kelebihan otomatis menjadi saldo bulan berikutnya.</p>
                  </div>
                  {loadingIuran && <span className="text-xs text-gray-500">Memuat...</span>}
                </div>

                {!loadingIuran && (() => {
                  const now = new Date();
                  const currentYear = now.getFullYear();
                  const currentMonth = now.getMonth() + 1;
                  const years = Array.from({ length: currentYear - 2023 + 1 }, (_, i) => 2023 + i);
                  const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
                  const tarifUntukBulan = (periode: string) => {
                    const candidates = iuranTarif.filter((x) => x.mulai_bulan <= periode);
                    if (!candidates.length) return 144000;
                    candidates.sort((a, b) => a.mulai_bulan.localeCompare(b.mulai_bulan));
                    return Number(candidates[candidates.length - 1].tarif_per_kk || 0);
                  };
                  const rows: Array<{ periode: string; label: string; tarif: number; dibayar: number; saldoSebelum: number; saldoSesudah: number; status: string; bayarBerikutnya: number }> = [];
                  let saldo = 0;
                  for (let y = 2023; y <= currentYear; y++) {
                    const maxMonth = y === currentYear ? currentMonth : 12;
                    for (let m = 1; m <= maxMonth; m++) {
                      const periode = `${y}-${String(m).padStart(2, "0")}-01`;
                      const tarif = tarifUntukBulan(periode);
                      const dibayar = iuranPembayaran.filter((x) => x.periode_bulan === periode).reduce((sum, x) => sum + Number(x.jumlah_bayar || 0), 0);
                      const saldoSebelum = saldo;
                      saldo = saldo + tarif - dibayar;
                      rows.push({ periode, label: `${monthNames[m - 1]} ${y}`, tarif, dibayar, saldoSebelum, saldoSesudah: saldo, status: saldo <= 0 ? "LUNAS" : dibayar === 0 && saldoSebelum === 0 ? "BELUM BAYAR" : "MASIH ADA TAGIHAN", bayarBerikutnya: Math.max(0, saldo) });
                    }
                  }
                  const selectedRows = rows.filter((x) => x.periode.startsWith(`${iuranYear}-`));
                  const summary = years.map((year) => {
                    const yearRows = rows.filter((x) => x.periode.startsWith(`${year}-`));
                    return { year, tagihan: yearRows.reduce((s, x) => s + x.tarif, 0), dibayar: yearRows.reduce((s, x) => s + x.dibayar, 0), sisa: yearRows.length ? Math.max(0, yearRows[yearRows.length - 1].saldoSesudah) : 0 };
                  });
                  return (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {summary.map((x) => (
                          <button key={x.year} type="button" onClick={() => setIuranYear(x.year)} className={`rounded-xl border p-3 text-left ${iuranYear === x.year ? "border-black dark:border-white" : "border-gray-200 dark:border-gray-700"}`}>
                            <p className="font-semibold">{x.year}</p>
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Tagihan Rp {x.tagihan.toLocaleString("id-ID")} · Dibayar Rp {x.dibayar.toLocaleString("id-ID")}</p>
                            <p className="mt-1 text-sm font-semibold">Sisa Rp {x.sisa.toLocaleString("id-ID")}</p>
                          </button>
                        ))}
                      </div>

                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {years.map((year) => (
                          <button key={year} type="button" onClick={() => setIuranYear(year)} className={`shrink-0 rounded-lg px-3 py-2 text-sm font-semibold ${iuranYear === year ? "bg-black text-white dark:bg-white dark:text-black" : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200"}`}>{year}</button>
                        ))}
                      </div>

                      <div className="space-y-2">
                        {selectedRows.map((row) => (
                          <div key={row.periode} className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-semibold">{row.label}</p>
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Tagihan bulan: Rp {row.tarif.toLocaleString("id-ID")}</p>
                                {row.dibayar > 0 && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Pembayaran bulan ini: Rp {row.dibayar.toLocaleString("id-ID")}</p>}
                              </div>
                              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${row.status === "LUNAS" ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300" : row.status === "BELUM BAYAR" ? "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" : "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300"}`}>{row.status}</span>
                            </div>
                            {row.status !== "LUNAS" && (
                              <div className="mt-3">
                                {payingMonth === row.periode ? (
                                  <div className="flex gap-2">
                                    <input type="number" min="1" inputMode="numeric" value={paymentAmount || String(row.bayarBerikutnya)} onChange={(e) => setPaymentAmount(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-black dark:border-gray-700 dark:bg-gray-800" />
                                    <button type="button" disabled={savingIuranBayar} onClick={() => simpanPembayaranIuran(row.periode, Number(paymentAmount || row.bayarBerikutnya))} className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-black">{savingIuranBayar ? "..." : "Simpan"}</button>
                                    <button type="button" disabled={savingIuranBayar} onClick={() => { setPayingMonth(null); setPaymentAmount(""); }} className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700">Batal</button>
                                  </div>
                                ) : (
                                  <button type="button" onClick={() => { setPayingMonth(row.periode); setPaymentAmount(String(row.bayarBerikutnya)); }} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">BAYAR</button>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
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

              <button
                type="button"
                onClick={() => { setShowDeleteConfirm(false); setShowDetail(false); }}
                disabled={deletingKK}
                className="w-full rounded-lg border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                Tutup
              </button>


            {showDeleteConfirm && (
              <div className="absolute inset-0 z-40 flex items-center justify-center rounded-2xl bg-black/60 p-4 backdrop-blur-sm">
                <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-gray-700 dark:bg-gray-900">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-xl text-red-600 dark:bg-red-950/60 dark:text-red-400">
                    !
                  </div>

                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    Hapus data KK?
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
                    Data KK <span className="font-semibold">{selectedKK?.nama_kepala_keluarga}</span> dan semua anggota di dalamnya akan ikut terhapus.
                  </p>

                  <div className="mt-5 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={deletingKK}
                      className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={konfirmasiHapusKK}
                      disabled={deletingKK}
                      className="flex-1 rounded-lg bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      {deletingKK ? "Menghapus..." : "Hapus"}
                    </button>
                  </div>
                </div>
              </div>
            )}
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
      {showInfoModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setShowInfoModal(false)}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gray-900 px-6 py-7 text-white dark:bg-gray-800">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                Informasi Wilayah
              </p>
              <h2 className="mt-2 text-2xl font-bold">RUKUN KEMATIAN RT 27</h2>
              <p className="mt-2 text-sm leading-6 text-gray-300">
                Kel. Syamsuddin Noor<br />
                Kec. Landasan Ulin<br />
                Kota Banjarbaru
              </p>
            </div>

            <div className="space-y-3 p-6">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Nama RT
                </p>
                <p className="mt-1 text-lg font-semibold">MADUN</p>
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Ketua Rukun Kematian
                </p>
                <p className="mt-1 text-lg font-semibold">Zuriat</p>
              </div>

              <button
                type="button"
                onClick={() => setShowInfoModal(false)}
                className="mt-2 w-full rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        aria-hidden={!showFloatingSearch}
        className={`fixed left-4 right-4 top-3 z-50 transition-all duration-200 md:left-1/2 md:right-auto md:w-[420px] md:-translate-x-1/2 ${
          showFloatingSearch
            ? "translate-y-0 opacity-100 pointer-events-auto"
            : "-translate-y-6 opacity-0 pointer-events-none"
        }`}
      >
        <div className="relative rounded-xl border border-gray-200 bg-white/95 shadow-lg backdrop-blur-md dark:border-gray-700 dark:bg-gray-900/95">
          <input
            type="text"
            placeholder="Cari kepala keluarga..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoComplete="off"
            tabIndex={showFloatingSearch ? 0 : -1}
            className="w-full rounded-xl bg-transparent px-4 py-3 pr-12 text-sm text-gray-900 outline-none dark:text-white"
          />
          {search && (
            <button
              type="button"
              tabIndex={showFloatingSearch ? 0 : -1}
              onClick={() => setSearch("")}
              aria-label="Hapus pencarian"
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-lg leading-none text-gray-500 hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-gray-700 dark:hover:text-white"
            >
              ×
            </button>
          )}
        </div>
      </div>


      {showIuranSettings && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white text-gray-900 shadow-2xl dark:bg-gray-900 dark:text-white">
            <div className="flex items-center justify-between border-b border-gray-200 p-5 dark:border-gray-700">
              <div>
                <h2 className="text-lg font-bold">Pengaturan Iuran</h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Atur tarif iuran per KK dan mulai berlakunya.</p>
              </div>
              <button type="button" onClick={() => setShowIuranSettings(false)} className="flex h-9 w-9 items-center justify-center rounded-full text-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">×</button>
            </div>
            <div className="space-y-3 p-5">
              {iuranTarif.map((item, index) => (
                <div key={item.mulai_bulan} className="flex items-center gap-3">
                  <input type="month" value={item.mulai_bulan.slice(0, 7)} onChange={(e) => { const next = [...iuranTarif]; next[index] = { ...next[index], mulai_bulan: `${e.target.value}-01` }; setIuranTarif(next); }} className="w-36 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none dark:border-gray-700 dark:bg-gray-800" />
                  <div className="relative flex-1">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">Rp</span>
                    <input type="number" min="0" value={item.tarif_per_kk} onChange={(e) => { const next = [...iuranTarif]; next[index] = { ...next[index], tarif_per_kk: Number(e.target.value || 0) }; setIuranTarif(next); }} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 pl-9 outline-none focus:border-black dark:border-gray-700 dark:bg-gray-800" />
                  </div>
                </div>
              ))}
              <button type="button" onClick={() => setIuranTarif([...iuranTarif, { mulai_bulan: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-01`, tarif_per_kk: 144000 }])} className="w-full rounded-lg border border-dashed border-gray-300 px-4 py-2 text-sm font-semibold dark:border-gray-700">+ Tambah perubahan tarif</button>
              <div className="flex gap-2 pt-3">
                <button type="button" onClick={() => setShowIuranSettings(false)} disabled={savingIuranTarif} className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-800">Batal</button>
                <button type="button" onClick={simpanIuranTarif} disabled={savingIuranTarif} className="flex-1 rounded-lg bg-black px-4 py-3 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-gray-200">{savingIuranTarif ? "Menyimpan..." : "Simpan"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showUserSettings && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white text-gray-900 shadow-2xl dark:bg-gray-900 dark:text-white">
            <div className="flex items-center justify-between border-b border-gray-200 p-5 dark:border-gray-700">
              <div>
                <h2 className="text-lg font-bold">Pengaturan User</h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Ubah username atau password admin.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowUserSettings(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                ×
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div>
                <label className="mb-1 block text-sm font-medium">Username</label>
                <input
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  autoComplete="username"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:border-black dark:border-gray-700 dark:bg-gray-800"
                />
              </div>

              <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
                <p className="mb-3 text-sm font-semibold">Ganti Password</p>

                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium">Password Lama</label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      autoComplete="current-password"
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:border-black dark:border-gray-700 dark:bg-gray-800"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium">Password Baru</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      autoComplete="new-password"
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:border-black dark:border-gray-700 dark:bg-gray-800"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium">Konfirmasi Password Baru</label>
                    <input
                      type="password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      autoComplete="new-password"
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:border-black dark:border-gray-700 dark:bg-gray-800"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUserSettings(false)}
                  disabled={savingUser}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-800"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={simpanPengaturanUser}
                  disabled={savingUser}
                  className="flex-1 rounded-lg bg-black px-4 py-3 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-gray-200"
                >
                  {savingUser ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
