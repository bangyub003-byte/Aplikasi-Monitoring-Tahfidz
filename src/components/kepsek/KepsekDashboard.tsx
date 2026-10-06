import React, { useState } from 'react';
import { User, Siswa, Kelas, Setoran, CatatanPerkembangan, TargetTahfidz } from '../../types';
import {
  BarChart3,
  GraduationCap,
  Users,
  ClipboardList,
  ShieldCheck,
  TrendingUp,
  Award,
  Eye,
  Search,
  Printer,
  Sparkles,
} from 'lucide-react';

interface KepsekDashboardProps {
  user: User;
  siswa: Siswa[];
  setoran: Setoran[];
  catatan: CatatanPerkembangan[];
  kelas: Kelas[];
  users: User[];
  target: TargetTahfidz[];
  activeTab: string;
}

export const KepsekDashboard: React.FC<KepsekDashboardProps> = ({
  user,
  siswa,
  setoran,
  catatan,
  kelas,
  users,
  target,
  activeTab,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHalaqah, setSelectedHalaqah] = useState<string>('All');

  const teachers = users.filter((u) => u.Role === 'ustadz');

  const totalMumtaz = setoran.filter((s) => s.Predikat === 'Mumtaz').length;
  const totalZiyadah = setoran.filter((s) => s.JenisSetoran === 'Ziyadah').length;
  const totalMurojaah = setoran.filter((s) => s.JenisSetoran === 'Murojaah').length;

  const getClassName = (kelasId: string) => {
    const k = kelas.find((item) => item.ID === kelasId);
    return k ? k.NamaKelas : kelasId;
  };

  const filteredSiswa = siswa.filter((s) => {
    const matchSearch =
      s.NamaSiswa.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.NISN.includes(searchQuery);
    const matchGuru = selectedHalaqah === 'All' || s.GuruID === selectedHalaqah;
    return matchSearch && matchGuru;
  });

  return (
    <div className="space-y-4 pb-12">
      {/* Read Only Notice Badge */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 flex items-center justify-between text-xs text-blue-900 shadow-xs">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-blue-600 shrink-0" />
          <span className="font-semibold">Mode Pemantauan Eksekutif (Read-Only)</span>
        </div>
        <span className="text-[10px] bg-blue-200/80 text-blue-900 font-bold px-2 py-0.5 rounded-full">
          Kepala Sekolah
        </span>
      </div>

      {/* TAB 1: MONITORING RINGKASAN SEKOLAH */}
      {activeTab === 'ringkasan' && (
        <div className="space-y-4">
          {/* Executive Stats Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-white p-4 rounded-2xl border border-stone-200/90 shadow-xs">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                Total Santri SDQU
              </span>
              <div className="text-2xl font-extrabold text-stone-900 font-mono mt-1">
                {siswa.length}
              </div>
              <span className="text-[10px] text-emerald-700 font-medium">100% Terdaftar</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-stone-200/90 shadow-xs">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                Halaqah Aktif
              </span>
              <div className="text-2xl font-extrabold text-emerald-800 font-mono mt-1">
                {teachers.length}
              </div>
              <span className="text-[10px] text-stone-500">Ustadz Pengampu</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-stone-200/90 shadow-xs">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                Akumulasi Setoran
              </span>
              <div className="text-2xl font-extrabold text-amber-600 font-mono mt-1">
                {setoran.length}
              </div>
              <span className="text-[10px] text-stone-500">
                {totalZiyadah} Ziyadah · {totalMurojaah} Murojaah
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-stone-200/90 shadow-xs">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                Predikat Mumtaz
              </span>
              <div className="text-2xl font-extrabold text-purple-700 font-mono mt-1">
                {totalMumtaz}
              </div>
              <span className="text-[10px] text-emerald-700 font-medium">Kualitas Terjaga</span>
            </div>
          </div>

          {/* Halaqah Performance Matrix */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-stone-200/90 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-stone-800 uppercase tracking-wider">
              Aktivitas Halaqah Per Ustadz
            </h3>

            <div className="space-y-2.5">
              {teachers.map((t) => {
                const countSiswa = siswa.filter((s) => s.GuruID === t.GuruID).length;
                const setoranHalaqah = setoran.filter((st) => st.GuruID === t.GuruID).length;

                return (
                  <div key={t.ID} className="p-3 rounded-2xl bg-stone-50 border border-stone-200/90 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-stone-900">{t.Nama}</span>
                        <span className="text-[10px] font-mono text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded ml-1.5 font-bold">
                          {t.GuruID}
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-amber-700">{setoranHalaqah} Setoran</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-stone-500 pt-1 border-t border-stone-200/50">
                      <span>Binaan: {countSiswa} Santri</span>
                      <span>Rata-rata: {(setoranHalaqah / Math.max(1, countSiswa)).toFixed(1)}x / santri</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: KINERJA HALAQAH */}
      {activeTab === 'halaqah' && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-stone-800 uppercase tracking-wider px-1">
            Daftar Pembimbing Halaqah
          </h3>

          <div className="space-y-2.5">
            {teachers.map((t) => {
              const myStudents = siswa.filter((s) => s.GuruID === t.GuruID);
              const mySetoran = setoran.filter((s) => s.GuruID === t.GuruID);

              return (
                <div key={t.ID} className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-stone-900">{t.Nama}</h4>
                      <div className="text-[11px] text-stone-500">
                        Kode: <span className="font-mono font-semibold">{t.GuruID}</span> · Kontak: {t.NoHP || '-'}
                      </div>
                    </div>
                    <span className="text-[10px] font-bold bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                      {myStudents.length} Santri Binaan
                    </span>
                  </div>

                  <div className="text-[11px] text-stone-600 bg-stone-50 p-2.5 rounded-xl border border-stone-100">
                    <span className="font-semibold block text-stone-800 text-[10px] uppercase tracking-wider mb-1">
                      Santri Dalam Halaqah Ini:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {myStudents.map((s) => (
                        <span key={s.ID} className="bg-white px-2 py-0.5 rounded-md border border-stone-200 text-[10px] font-medium">
                          {s.NamaSiswa}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: DATA SANTRI SELURUH SEKOLAH */}
      {activeTab === 'santri' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold text-stone-800 uppercase tracking-wider">
              Monitoring Santri ({filteredSiswa.length})
            </h3>
          </div>

          <div className="space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari santri atau NISN..."
                className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-stone-200 bg-white focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
              <span className="text-stone-400 text-[10px] shrink-0">Halaqah:</span>
              <button
                onClick={() => setSelectedHalaqah('All')}
                className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap ${
                  selectedHalaqah === 'All' ? 'bg-emerald-800 text-white' : 'bg-stone-100 text-stone-600'
                }`}
              >
                Semua
              </button>
              {teachers.map((t) => (
                <button
                  key={t.ID}
                  onClick={() => setSelectedHalaqah(t.GuruID || '')}
                  className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap ${
                    selectedHalaqah === t.GuruID ? 'bg-emerald-800 text-white' : 'bg-stone-100 text-stone-600'
                  }`}
                >
                  {t.GuruID}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            {filteredSiswa.map((s) => {
              const studentSetoran = setoran.filter((st) => st.SiswaID === s.ID);
              const last = studentSetoran[0];

              return (
                <div key={s.ID} className="bg-white rounded-2xl p-3.5 border border-stone-200 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-stone-900">{s.NamaSiswa}</h4>
                      <div className="text-[10px] text-stone-500">
                        NISN: {s.NISN} · {getClassName(s.KelasID)}
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-bold bg-amber-50 text-amber-900 px-2 py-0.5 rounded border border-amber-200">
                      Halaqah {s.GuruID}
                    </span>
                  </div>

                  <div className="mt-2 pt-2 border-t border-stone-100 flex items-center justify-between text-[10px] text-stone-600">
                    <span>Target: <strong>{s.TargetJuz} Juz</strong> ({studentSetoran.length}x setor)</span>
                    <span>Setoran terakhir: <strong>{last ? last.Surat : 'Belum ada'}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: EVALUASI & REKAP */}
      {activeTab === 'rekap' && (
        <div className="space-y-3">
          <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-xs text-center space-y-3">
            <Sparkles className="w-10 h-10 text-amber-500 mx-auto" />
            <h3 className="text-sm font-bold text-stone-900">Rekap Laporan Tahfidz Bulanan</h3>
            <p className="text-xs text-stone-600 max-w-sm mx-auto leading-relaxed">
              Cetak atau ekspor rekap seluruh perkembangan hafalan santri SDQU Al I'tisham untuk rapat pimpinan atau arsip evaluasi akademik.
            </p>

            <button
              onClick={() => window.print()}
              className="px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold inline-flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <Printer className="w-4 h-4 text-amber-300" />
              Cetak / Simpan Rekap PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
