import React, { useState } from 'react';
import { User, Siswa, Kelas, Setoran, CatatanPerkembangan, TargetTahfidz, Pengumuman } from '../../types';
import { api } from '../../services/api';
import {
  Users,
  GraduationCap,
  Layers,
  BarChart3,
  UserPlus,
  PlusCircle,
  Edit,
  Trash2,
  CheckCircle2,
  Search,
  ArrowRightLeft,
  ShieldAlert,
  Save,
  X,
  FileSpreadsheet,
} from 'lucide-react';

interface AdminDashboardProps {
  user: User;
  siswa: Siswa[];
  setoran: Setoran[];
  catatan: CatatanPerkembangan[];
  pengumuman: Pengumuman[];
  kelas: Kelas[];
  users: User[];
  activeTab: string;
  onRefresh: () => void;
  onOpenGasModal: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  user,
  siswa,
  setoran,
  catatan,
  pengumuman,
  kelas,
  users,
  activeTab,
  onRefresh,
  onOpenGasModal,
}) => {
  const [searchSiswa, setSearchSiswa] = useState('');
  const [selectedGuruFilter, setSelectedGuruFilter] = useState<string>('All');

  // Modal State for Tambah/Edit Santri
  const [siswaModalOpen, setSiswaModalOpen] = useState(false);
  const [editingSiswa, setEditingSiswa] = useState<Siswa | null>(null);
  const [formDataSiswa, setFormDataSiswa] = useState<Partial<Siswa>>({
    NISN: '',
    NamaSiswa: '',
    JenisKelamin: 'L',
    KelasID: kelas[0]?.ID || 'K-1A',
    NamaOrangTua: '',
    NoHPOrangTua: '',
    TargetJuz: 2,
    Status: 'Aktif',
    Catatan: '',
    GuruID: 'G001',
  });

  // Modal State for Tambah/Edit Ustadz
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formDataUser, setFormDataUser] = useState<Partial<User>>({
    Nama: '',
    Username: '',
    Password: '123',
    Role: 'ustadz',
    GuruID: 'G001',
    NoHP: '',
    Status: 'Aktif',
  });

  // Mapping Halaqah Helper State
  const [mappingSuccess, setMappingSuccess] = useState<string | null>(null);

  // Filtered teachers list
  const teachers = users.filter((u) => u.Role === 'ustadz');

  // Handle Mapping Santri -> Ustadz
  const handleUpdateMapping = async (siswaId: string, newGuruId: string) => {
    try {
      const res = await api.updateSiswaGuruMapping(siswaId, newGuruId, user);
      if (res.success) {
        setMappingSuccess(`Berhasil memindahkan santri ke ${newGuruId}`);
        onRefresh();
        setTimeout(() => setMappingSuccess(null), 3000);
      }
    } catch (err) {
      alert('Gagal mengubah mapping: ' + (err as Error).message);
    }
  };

  // Save Santri Handler
  const handleSaveSiswa = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: Siswa = {
        ID: editingSiswa ? editingSiswa.ID : `S${String(Date.now()).slice(-4)}`,
        NISN: formDataSiswa.NISN || '',
        NamaSiswa: formDataSiswa.NamaSiswa || '',
        JenisKelamin: formDataSiswa.JenisKelamin || 'L',
        KelasID: formDataSiswa.KelasID || 'K-1A',
        NamaOrangTua: formDataSiswa.NamaOrangTua || '',
        NoHPOrangTua: formDataSiswa.NoHPOrangTua || '',
        TargetJuz: Number(formDataSiswa.TargetJuz) || 2,
        Status: (formDataSiswa.Status as 'Aktif' | 'Nonaktif') || 'Aktif',
        Catatan: formDataSiswa.Catatan || '',
        GuruID: formDataSiswa.GuruID || 'G001',
      };

      await api.saveSiswa(payload, user);
      setSiswaModalOpen(false);
      setEditingSiswa(null);
      onRefresh();
    } catch (err) {
      alert('Gagal menyimpan santri: ' + (err as Error).message);
    }
  };

  // Delete Santri Handler
  const handleDeleteSiswa = async (id: string) => {
    if (window.confirm('Yakin ingin menghapus data santri ini?')) {
      await api.deleteSiswa(id, user);
      onRefresh();
    }
  };

  // Save User Handler
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: User = {
        ID: editingUser ? editingUser.ID : `U${String(Date.now()).slice(-4)}`,
        Nama: formDataUser.Nama || '',
        Username: formDataUser.Username || '',
        Password: formDataUser.Password || '123',
        Role: formDataUser.Role || 'ustadz',
        GuruID: formDataUser.Role === 'ustadz' ? formDataUser.GuruID : undefined,
        NoHP: formDataUser.NoHP || '',
        Status: (formDataUser.Status as 'Aktif' | 'Nonaktif') || 'Aktif',
      };

      await api.saveUser(payload, user);
      setUserModalOpen(false);
      setEditingUser(null);
      onRefresh();
    } catch (err) {
      alert('Gagal menyimpan user: ' + (err as Error).message);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (window.confirm('Hapus akun pengguna ini?')) {
      await api.deleteUser(id, user);
      onRefresh();
    }
  };

  const getGuruName = (guruId: string) => {
    const t = teachers.find((g) => g.GuruID === guruId);
    return t ? t.Nama : guruId;
  };

  const getClassName = (kelasId: string) => {
    const k = kelas.find((item) => item.ID === kelasId);
    return k ? k.NamaKelas : kelasId;
  };

  const filteredSiswa = siswa.filter((s) => {
    const matchSearch =
      s.NamaSiswa.toLowerCase().includes(searchSiswa.toLowerCase()) ||
      s.NISN.includes(searchSiswa);
    const matchGuru = selectedGuruFilter === 'All' || s.GuruID === selectedGuruFilter;
    return matchSearch && matchGuru;
  });

  return (
    <div className="space-y-4 pb-12">
      {/* Mapping Feedback Toast */}
      {mappingSuccess && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-2.5 rounded-2xl flex items-center gap-2 text-xs shadow-xs animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{mappingSuccess}</span>
        </div>
      )}

      {/* TAB 1: RINGKASAN & OVERVIEW ADMIN */}
      {activeTab === 'ringkasan' && (
        <div className="space-y-4">
          {/* Top Admin Summary Cards */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-white p-4 rounded-2xl border border-stone-200/90 shadow-xs">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                Total Santri
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-extrabold text-stone-900 font-mono">
                  {siswa.length}
                </span>
                <span className="text-[10px] text-emerald-700 font-semibold">Aktif</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-stone-200/90 shadow-xs">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                Ustadz Halaqah
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-extrabold text-emerald-800 font-mono">
                  {teachers.length}
                </span>
                <span className="text-[10px] text-stone-500">Pengampu</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-stone-200/90 shadow-xs">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                Total Setoran
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-extrabold text-amber-600 font-mono">
                  {setoran.length}
                </span>
                <span className="text-[10px] text-stone-500">Tercatat</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-stone-200/90 shadow-xs">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                Total Kelas
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-extrabold text-purple-700 font-mono">
                  {kelas.length}
                </span>
                <span className="text-[10px] text-stone-500">Rombel</span>
              </div>
            </div>
          </div>

          {/* Halaqah Distribution Card */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-stone-200/90 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                Distribusi Santri Per Ustadz
              </h3>
              <button
                onClick={onOpenGasModal}
                className="text-[10px] text-emerald-700 hover:underline flex items-center gap-1 font-semibold"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" /> Google Sheet
              </button>
            </div>

            <div className="space-y-2">
              {teachers.map((t) => {
                const count = siswa.filter((s) => s.GuruID === t.GuruID).length;
                const percent = Math.round((count / Math.max(1, siswa.length)) * 100);

                return (
                  <div key={t.ID} className="p-2.5 rounded-xl bg-stone-50 border border-stone-200 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-stone-900">{t.Nama}</span>
                        <span className="text-[10px] text-stone-400 font-mono ml-1.5">
                          ({t.GuruID})
                        </span>
                      </div>
                      <span className="font-bold text-emerald-800">{count} Santri</span>
                    </div>

                    <div className="w-full bg-stone-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-emerald-600 h-full rounded-full"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: KELOLA SANTRI & MAPPING HALAQAH */}
      {activeTab === 'santri' && (
        <div className="space-y-3">
          {/* Header & Add Button */}
          <div className="flex items-center justify-between px-1">
            <div>
              <h3 className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                Data Santri & Mapping Halaqah
              </h3>
              <p className="text-[11px] text-stone-500">Tentukan Ustadz Pengampu tiap santri</p>
            </div>

            <button
              onClick={() => {
                setEditingSiswa(null);
                setFormDataSiswa({
                  NISN: '',
                  NamaSiswa: '',
                  JenisKelamin: 'L',
                  KelasID: kelas[0]?.ID || 'K-1A',
                  NamaOrangTua: '',
                  NoHPOrangTua: '',
                  TargetJuz: 2,
                  Status: 'Aktif',
                  Catatan: '',
                  GuruID: 'G001',
                });
                setSiswaModalOpen(true);
              }}
              className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs flex items-center gap-1 shadow-xs cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Tambah Santri
            </button>
          </div>

          {/* Search & Filter Bar */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchSiswa}
                onChange={(e) => setSearchSiswa(e.target.value)}
                placeholder="Cari santri berdasarkan nama / NISN..."
                className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
              <span className="text-stone-400 shrink-0 text-[10px]">Filter Halaqah:</span>
              <button
                onClick={() => setSelectedGuruFilter('All')}
                className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  selectedGuruFilter === 'All'
                    ? 'bg-emerald-800 text-white'
                    : 'bg-stone-100 text-stone-600'
                }`}
              >
                Semua Ustadz
              </button>
              {teachers.map((t) => (
                <button
                  key={t.ID}
                  onClick={() => setSelectedGuruFilter(t.GuruID || '')}
                  className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors ${
                    selectedGuruFilter === t.GuruID
                      ? 'bg-emerald-800 text-white'
                      : 'bg-stone-100 text-stone-600'
                  }`}
                >
                  {t.GuruID} ({t.Nama.split(' ')[1] || t.Nama})
                </button>
              ))}
            </div>
          </div>

          {/* Santri Cards */}
          <div className="space-y-2.5">
            {filteredSiswa.map((s) => (
              <div
                key={s.ID}
                className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs hover:border-emerald-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-stone-900">{s.NamaSiswa}</h4>
                      <span className="text-[9px] font-mono bg-stone-100 text-stone-600 px-1 rounded">
                        NISN: {s.NISN}
                      </span>
                    </div>
                    <div className="text-[10px] text-stone-500 mt-0.5">
                      Kelas: {getClassName(s.KelasID)} · Target: {s.TargetJuz} Juz
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingSiswa(s);
                        setFormDataSiswa(s);
                        setSiswaModalOpen(true);
                      }}
                      className="p-1.5 text-stone-500 hover:text-emerald-700 rounded-lg hover:bg-stone-100"
                      title="Edit Santri"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteSiswa(s.ID)}
                      className="p-1.5 text-stone-500 hover:text-rose-600 rounded-lg hover:bg-stone-100"
                      title="Hapus Santri"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* INTERACTIVE MAPPING SANTRI -> USTADZ */}
                <div className="mt-3 pt-2.5 border-t border-stone-100 flex items-center justify-between gap-2 bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100/60">
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    <span className="text-stone-700 font-medium">Ustadz Pengampu:</span>
                  </div>

                  <select
                    value={s.GuruID}
                    onChange={(e) => handleUpdateMapping(s.ID, e.target.value)}
                    className="text-xs font-bold bg-white text-emerald-900 border border-emerald-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-xs cursor-pointer"
                  >
                    {teachers.map((t) => (
                      <option key={t.ID} value={t.GuruID}>
                        {t.GuruID} - {t.Nama}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: KELOLA USTADZ & AKUN */}
      {activeTab === 'ustadz' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div>
              <h3 className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                Kelola Ustadz & Akun Pengguna
              </h3>
              <p className="text-[11px] text-stone-500">Daftar akun pengampu halaqah</p>
            </div>

            <button
              onClick={() => {
                setEditingUser(null);
                setFormDataUser({
                  Nama: '',
                  Username: '',
                  Password: '123',
                  Role: 'ustadz',
                  GuruID: `G00${teachers.length + 1}`,
                  NoHP: '',
                  Status: 'Aktif',
                });
                setUserModalOpen(true);
              }}
              className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs flex items-center gap-1 shadow-xs cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Tambah Ustadz
            </button>
          </div>

          <div className="space-y-2.5">
            {users.map((u) => (
              <div
                key={u.ID}
                className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-stone-900">{u.Nama}</h4>
                    <span className="text-[9px] font-mono bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-bold">
                      {u.Role}
                    </span>
                  </div>
                  <div className="text-[10px] text-stone-500 mt-0.5">
                    Username: <span className="font-mono">{u.Username}</span> · {u.GuruID ? `GuruID: ${u.GuruID}` : ''} · No HP: {u.NoHP || '-'}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setEditingUser(u);
                      setFormDataUser(u);
                      setUserModalOpen(true);
                    }}
                    className="p-1.5 text-stone-500 hover:text-emerald-700 rounded-lg hover:bg-stone-100"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  {u.Role !== 'admin' && (
                    <button
                      onClick={() => handleDeleteUser(u.ID)}
                      className="p-1.5 text-stone-500 hover:text-rose-600 rounded-lg hover:bg-stone-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: KELAS & TARGET */}
      {activeTab === 'kelas' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold text-stone-800 uppercase tracking-wider">
              Daftar Kelas & Target Hafalan
            </h3>
          </div>

          <div className="space-y-2.5">
            {kelas.map((k) => (
              <div key={k.ID} className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-stone-900">{k.NamaKelas}</h4>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Target: {k.TargetJuz} Juz
                  </span>
                </div>
                <div className="text-[11px] text-stone-600">
                  Wali Kelas: <strong>{k.WaliKelas}</strong>
                </div>
                <div className="text-[10px] text-stone-400">
                  Tahun Ajaran: {k.TahunAjaran} · Tingkat: Kelas {k.Tingkat}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL TAMBAH/EDIT SANTRI */}
      {siswaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-stone-200 max-h-[92vh] flex flex-col">
            <div className="bg-emerald-900 text-white p-4 flex items-center justify-between">
              <h3 className="text-xs font-bold">
                {editingSiswa ? 'Edit Data Santri' : 'Tambah Santri Baru'}
              </h3>
              <button
                onClick={() => setSiswaModalOpen(false)}
                className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSiswa} className="p-4 overflow-y-auto space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-medium text-stone-700 mb-1">
                  NISN (Digunakan Wali untuk Login) *
                </label>
                <input
                  type="text"
                  value={formDataSiswa.NISN}
                  onChange={(e) => setFormDataSiswa({ ...formDataSiswa, NISN: e.target.value })}
                  required
                  placeholder="Contoh: 12345"
                  className="w-full text-xs px-3 py-2 border rounded-xl"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-stone-700 mb-1">
                  Nama Lengkap Santri *
                </label>
                <input
                  type="text"
                  value={formDataSiswa.NamaSiswa}
                  onChange={(e) => setFormDataSiswa({ ...formDataSiswa, NamaSiswa: e.target.value })}
                  required
                  placeholder="Nama Santri"
                  className="w-full text-xs px-3 py-2 border rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-stone-700 mb-1">
                    Jenis Kelamin
                  </label>
                  <select
                    value={formDataSiswa.JenisKelamin}
                    onChange={(e) =>
                      setFormDataSiswa({ ...formDataSiswa, JenisKelamin: e.target.value as 'L' | 'P' })
                    }
                    className="w-full text-xs px-3 py-2 border rounded-xl"
                  >
                    <option value="L">Laki-Laki (Ikhwan)</option>
                    <option value="P">Perempuan (Akhwat)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-stone-700 mb-1">
                    Kelas
                  </label>
                  <select
                    value={formDataSiswa.KelasID}
                    onChange={(e) => setFormDataSiswa({ ...formDataSiswa, KelasID: e.target.value })}
                    className="w-full text-xs px-3 py-2 border rounded-xl"
                  >
                    {kelas.map((k) => (
                      <option key={k.ID} value={k.ID}>
                        {k.NamaKelas}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* MAPPING USTADZ PENGAMPU */}
              <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                <label className="block text-[11px] font-bold text-emerald-900 mb-1">
                  Ustadz Pengampu Halaqah (GuruID) *
                </label>
                <select
                  value={formDataSiswa.GuruID}
                  onChange={(e) => setFormDataSiswa({ ...formDataSiswa, GuruID: e.target.value })}
                  className="w-full text-xs px-3 py-2 border rounded-xl bg-white font-semibold text-emerald-900"
                >
                  {teachers.map((t) => (
                    <option key={t.ID} value={t.GuruID}>
                      {t.Nama} ({t.GuruID})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-stone-700 mb-1">
                    Target Juz
                  </label>
                  <input
                    type="number"
                    value={formDataSiswa.TargetJuz}
                    onChange={(e) => setFormDataSiswa({ ...formDataSiswa, TargetJuz: Number(e.target.value) })}
                    className="w-full text-xs px-3 py-2 border rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-stone-700 mb-1">
                    No HP Wali Santri
                  </label>
                  <input
                    type="text"
                    value={formDataSiswa.NoHPOrangTua}
                    onChange={(e) => setFormDataSiswa({ ...formDataSiswa, NoHPOrangTua: e.target.value })}
                    placeholder="0812..."
                    className="w-full text-xs px-3 py-2 border rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-stone-700 mb-1">
                  Catatan Awal Santri
                </label>
                <textarea
                  value={formDataSiswa.Catatan}
                  onChange={(e) => setFormDataSiswa({ ...formDataSiswa, Catatan: e.target.value })}
                  rows={2}
                  placeholder="Karakter hafalan..."
                  className="w-full text-xs p-2 border rounded-xl"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t">
                <button
                  type="button"
                  onClick={() => setSiswaModalOpen(false)}
                  className="px-4 py-2 border rounded-xl font-medium text-stone-600"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 text-white rounded-xl font-bold"
                >
                  Simpan Santri
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH/EDIT USTADZ */}
      {userModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-stone-200 flex flex-col">
            <div className="bg-emerald-900 text-white p-4 flex items-center justify-between">
              <h3 className="text-xs font-bold">
                {editingUser ? 'Edit Akun Ustadz' : 'Tambah Akun Ustadz'}
              </h3>
              <button
                onClick={() => setUserModalOpen(false)}
                className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-4 space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-medium text-stone-700 mb-1">
                  Nama Lengkap Ustadz/Ustadzah *
                </label>
                <input
                  type="text"
                  value={formDataUser.Nama}
                  onChange={(e) => setFormDataUser({ ...formDataUser, Nama: e.target.value })}
                  required
                  placeholder="Ustadz Ahmad Fauzi, S.Pd.I"
                  className="w-full text-xs px-3 py-2 border rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-stone-700 mb-1">
                    Username Login *
                  </label>
                  <input
                    type="text"
                    value={formDataUser.Username}
                    onChange={(e) => setFormDataUser({ ...formDataUser, Username: e.target.value })}
                    required
                    placeholder="ahmad"
                    className="w-full text-xs px-3 py-2 border rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-stone-700 mb-1">
                    Kode GuruID *
                  </label>
                  <input
                    type="text"
                    value={formDataUser.GuruID}
                    onChange={(e) => setFormDataUser({ ...formDataUser, GuruID: e.target.value })}
                    required
                    placeholder="G001"
                    className="w-full text-xs px-3 py-2 border rounded-xl font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-stone-700 mb-1">
                  Password Akun
                </label>
                <input
                  type="text"
                  value={formDataUser.Password}
                  onChange={(e) => setFormDataUser({ ...formDataUser, Password: e.target.value })}
                  placeholder="123"
                  className="w-full text-xs px-3 py-2 border rounded-xl font-mono"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t">
                <button
                  type="button"
                  onClick={() => setUserModalOpen(false)}
                  className="px-4 py-2 border rounded-xl font-medium text-stone-600"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 text-white rounded-xl font-bold"
                >
                  Simpan Akun
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
