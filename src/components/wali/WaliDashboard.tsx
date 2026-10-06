import React, { useState } from 'react';
import { User, Siswa, Setoran, CatatanPerkembangan, Pengumuman, Kelas } from '../../types';
import {
  BookOpen,
  Calendar,
  History,
  FileText,
  MessageSquare,
  Award,
  CheckCircle2,
  TrendingUp,
  Printer,
  Sparkles,
  Download,
  Share2,
  ChevronRight,
  UserCheck,
} from 'lucide-react';

interface WaliDashboardProps {
  user: User;
  siswa: Siswa[]; // strictly only 1 child
  setoran: Setoran[]; // strictly only child's setoran
  catatan: CatatanPerkembangan[]; // strictly child's notes
  pengumuman: Pengumuman[]; // strictly announcements from child's ustadz
  kelas: Kelas[];
  activeTab: string;
  onNavigateTab: (tabId: string) => void;
}

export const WaliDashboard: React.FC<WaliDashboardProps> = ({
  user,
  siswa,
  setoran,
  catatan,
  pengumuman,
  kelas,
  activeTab,
  onNavigateTab,
}) => {
  const [filterType, setFilterType] = useState<'All' | 'Ziyadah' | 'Murojaah'>('All');
  const [showRaportModal, setShowRaportModal] = useState(false);

  // Wali strictly has 1 child
  const child = siswa[0];

  const getClassName = (kelasId: string) => {
    const k = kelas.find((item) => item.ID === kelasId);
    return k ? k.NamaKelas : kelasId;
  };

  if (!child) {
    return (
      <div className="bg-white rounded-3xl p-6 text-center border border-stone-200 shadow-sm mt-4">
        <BookOpen className="w-12 h-12 text-stone-300 mx-auto mb-3" />
        <h3 className="text-sm font-bold text-stone-800">Data Santri Tidak Ditemukan</h3>
        <p className="text-xs text-stone-500 mt-1">
          Hubungi admin SDQU Al I'tisham untuk memverifikasi NISN ananda.
        </p>
      </div>
    );
  }

  // Filtered setoran
  const filteredSetoran = setoran.filter((st) => {
    if (filterType === 'All') return true;
    return st.JenisSetoran === filterType;
  });

  // Calculation metrics
  const totalZiyadah = setoran.filter((s) => s.JenisSetoran === 'Ziyadah').length;
  const totalMurojaah = setoran.filter((s) => s.JenisSetoran === 'Murojaah').length;
  const totalMumtaz = setoran.filter((s) => s.Predikat === 'Mumtaz').length;
  const lastSetoran = setoran[0];

  // Estimated completed Juz calculation
  const distinctJuz = Array.from(new Set(setoran.map((s) => s.Juz)));
  const progressPercent = Math.min(100, Math.round(((distinctJuz.length * 0.5) / (child.TargetJuz || 2)) * 100));

  return (
    <div className="space-y-4 pb-12">
      {/* 1. Header Profile Anak */}
      <div className="bg-gradient-to-br from-emerald-800 via-emerald-900 to-stone-900 text-white rounded-3xl p-5 shadow-lg relative overflow-hidden border border-emerald-700/60">
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-wider text-amber-300 uppercase px-2 py-0.5 rounded-full bg-emerald-950/60 border border-amber-400/30">
              Laporan Santri
            </span>
            <button
              onClick={() => setShowRaportModal(true)}
              className="text-[10px] bg-white/10 hover:bg-white/20 text-white font-medium px-2.5 py-1 rounded-xl transition-colors flex items-center gap-1 border border-white/20"
            >
              <Printer className="w-3 h-3 text-amber-300" />
              Cetak Raport
            </button>
          </div>

          <div className="mt-3">
            <h2 className="text-lg font-bold text-white tracking-tight">{child.NamaSiswa}</h2>
            <div className="text-xs text-emerald-200 mt-0.5">
              NISN: <span className="font-mono font-medium">{child.NISN}</span> · {getClassName(child.KelasID)}
            </div>
          </div>

          {/* Ustadz Pengampu Banner */}
          <div className="mt-3.5 bg-emerald-950/60 rounded-2xl p-2.5 border border-emerald-700/50 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-800 flex items-center justify-center text-amber-300 font-bold text-xs">
                Ust
              </div>
              <div>
                <span className="text-[10px] text-stone-300 block">Ustadz Pembimbing Halaqah:</span>
                <span className="font-semibold text-white">
                  {pengumuman[0]?.NamaUstadz || `Ustadz Pengampu (${child.GuruID})`}
                </span>
              </div>
            </div>
            <span className="text-[10px] font-mono bg-emerald-800/80 text-amber-200 px-2 py-0.5 rounded-lg border border-emerald-600/40">
              {child.GuruID}
            </span>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-emerald-800/60 text-center">
            <div className="bg-white/5 rounded-xl p-1.5">
              <span className="text-[10px] text-stone-300 block">Target</span>
              <span className="font-bold text-amber-300 text-xs">{child.TargetJuz} Juz</span>
            </div>
            <div className="bg-white/5 rounded-xl p-1.5">
              <span className="text-[10px] text-stone-300 block">Ziyadah</span>
              <span className="font-bold text-white text-xs">{totalZiyadah}x</span>
            </div>
            <div className="bg-white/5 rounded-xl p-1.5">
              <span className="text-[10px] text-stone-300 block">Predikat Mumtaz</span>
              <span className="font-bold text-emerald-300 text-xs">{totalMumtaz}x</span>
            </div>
          </div>
        </div>
      </div>

      {/* TAB 1: PERKEMBANGAN & GRAFIK HAFALAN */}
      {activeTab === 'hafalan' && (
        <div className="space-y-4">
          {/* Progress Card */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-stone-200/90 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                Capaian Target Hafalan
              </h3>
              <span className="text-xs font-bold text-emerald-700">{progressPercent}%</span>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-stone-100 rounded-full h-3 overflow-hidden p-0.5 border border-stone-200">
              <div
                className="bg-gradient-to-r from-emerald-600 to-amber-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.max(8, progressPercent)}%` }}
              />
            </div>

            <div className="text-[11px] text-stone-500 flex justify-between">
              <span>Juz Terjangkau: {distinctJuz.length ? `Juz ${distinctJuz.join(', ')}` : 'Memulai'}</span>
              <span>Target: {child.TargetJuz} Juz Tahfidz</span>
            </div>
          </div>

          {/* Setoran Terakhir Highlight */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-stone-200/90 shadow-xs">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-2">
              Setoran Terakhir Ananda
            </span>

            {lastSetoran ? (
              <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3.5 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-semibold text-emerald-900 block">
                      Surat {lastSetoran.Surat}
                    </span>
                    <span className="text-[11px] text-emerald-700">
                      Ayat {lastSetoran.AyatAwal} - {lastSetoran.AyatAkhir} (Juz {lastSetoran.Juz})
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-600 text-white shadow-xs">
                    {lastSetoran.Predikat}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 text-[10px] text-stone-600 pt-1 border-t border-emerald-200/60">
                  <span>Kelancaran: <strong>{lastSetoran.Kelancaran}</strong></span>
                  <span>·</span>
                  <span>Tajwid: <strong>{lastSetoran.Tajwid}</strong></span>
                  <span>·</span>
                  <span>Makhraj: <strong>{lastSetoran.Makhraj}</strong></span>
                </div>

                {lastSetoran.Catatan && (
                  <p className="text-[11px] text-stone-700 italic bg-white/80 p-2 rounded-xl border border-emerald-100">
                    "{lastSetoran.Catatan}"
                  </p>
                )}
                <div className="text-[10px] text-emerald-800/70 text-right">
                  Disetor pada: {lastSetoran.Tanggal}
                </div>
              </div>
            ) : (
              <p className="text-xs text-stone-500 italic text-center py-4">
                Belum ada setoran tercatat dari halaqah.
              </p>
            )}
          </div>

          {/* Tips Murojaah di Rumah */}
          <div className="bg-stone-50 border border-stone-200 rounded-3xl p-4 space-y-1.5">
            <h4 className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Saran Pendampingan Orang Tua
            </h4>
            <p className="text-[11px] text-stone-600 leading-relaxed">
              Dampingi ananda murojaah 15–20 menit setiap ba’da Maghrib atau Subuh. Putar murottal surat yang sedang dihafal saat istirahat untuk memperkuat rekaman memori hafalan ananda.
            </p>
          </div>
        </div>
      )}

      {/* TAB 2: RIWAYAT SETORAN LENGKAP */}
      {activeTab === 'riwayat' && (
        <div className="space-y-3">
          {/* Filter Bar */}
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold text-stone-800 uppercase tracking-wider">
              Riwayat Setoran ({filteredSetoran.length})
            </h3>

            <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl">
              {(['All', 'Ziyadah', 'Murojaah'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setFilterType(mode)}
                  className={`text-[10px] font-semibold px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                    filterType === mode
                      ? 'bg-white text-emerald-800 shadow-xs'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  {mode === 'All' ? 'Semua' : mode}
                </button>
              ))}
            </div>
          </div>

          {filteredSetoran.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center border border-stone-200">
              <History className="w-8 h-8 text-stone-300 mx-auto mb-2" />
              <p className="text-xs text-stone-500 italic">Tidak ada catatan setoran sesuai filter.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredSetoran.map((st) => (
                <div
                  key={st.ID}
                  className="bg-white rounded-2xl p-3.5 border border-stone-200 shadow-xs"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                            st.JenisSetoran === 'Ziyadah'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {st.JenisSetoran}
                        </span>
                        <span className="text-[10px] text-stone-400">{st.Tanggal}</span>
                      </div>
                      <h4 className="text-xs font-bold text-stone-900 mt-1">
                        Surat {st.Surat} : Ayat {st.AyatAwal} - {st.AyatAkhir}
                      </h4>
                      <div className="text-[10px] text-stone-500">Juz {st.Juz}</div>
                    </div>

                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                      {st.Predikat}
                    </span>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-stone-100 flex flex-wrap gap-2 text-[10px] text-stone-600">
                    <span>Kelancaran: <strong>{st.Kelancaran}</strong></span>
                    <span>·</span>
                    <span>Tajwid: <strong>{st.Tajwid}</strong></span>
                    <span>·</span>
                    <span>Makhraj: <strong>{st.Makhraj}</strong></span>
                  </div>

                  {st.Catatan && (
                    <p className="mt-2 text-[11px] text-stone-600 bg-stone-50 p-2 rounded-lg italic border border-stone-100">
                      "{st.Catatan}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: CATATAN DARI USTADZ */}
      {activeTab === 'catatan' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold text-stone-800 uppercase tracking-wider">
              Catatan Perkembangan dari Ustadz ({catatan.length})
            </h3>
            <span className="text-[10px] text-stone-400">Adab & Evaluasi</span>
          </div>

          {catatan.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center border border-stone-200">
              <FileText className="w-8 h-8 text-stone-300 mx-auto mb-2" />
              <p className="text-xs text-stone-500 italic">Belum ada catatan khusus dari Ustadz pembimbing.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {catatan.map((c) => (
                <div key={c.ID} className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md">
                      {c.Kategori}
                    </span>
                    <span className="text-[10px] text-stone-400">{c.Tanggal}</span>
                  </div>
                  <p className="text-xs text-stone-700 leading-relaxed font-normal">{c.Catatan}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: PENGUMUMAN HALAQAH */}
      {activeTab === 'pengumuman' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold text-stone-800 uppercase tracking-wider">
              Kabar Halaqah Ustadz ({pengumuman.length})
            </h3>
            <span className="text-[10px] text-emerald-700 font-semibold">Khusus Halaqah {child.GuruID}</span>
          </div>

          {pengumuman.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center border border-stone-200">
              <MessageSquare className="w-8 h-8 text-stone-300 mx-auto mb-2" />
              <p className="text-xs text-stone-500 italic">Belum ada pengumuman terbaru dari Ustadz pembimbing.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {pengumuman.map((p) => (
                <div key={p.ID} className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-xs font-bold text-emerald-950">{p.Judul}</h4>
                    <span className="text-[10px] text-stone-400 shrink-0">{p.Tanggal}</span>
                  </div>
                  <p className="text-xs text-stone-700 leading-relaxed">{p.Isi}</p>
                  <div className="text-[10px] text-stone-400 pt-1 border-t border-stone-100 flex items-center justify-between">
                    <span>Dari: {p.NamaUstadz || 'Ustadz Pembimbing'}</span>
                    <span className="font-mono text-[9px] bg-stone-100 px-1.5 py-0.2 rounded text-stone-500">
                      Halaqah {p.GuruID}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* RAPORT TAHFIDZ MODAL */}
      {showRaportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-stone-300 max-h-[92vh] flex flex-col">
            {/* Header print card */}
            <div className="bg-emerald-900 text-white p-4 text-center">
              <h3 className="text-xs font-bold tracking-wider text-amber-300 uppercase">
                SDQU AL I'TISHAM
              </h3>
              <h4 className="text-sm font-bold mt-0.5">LEMBAR PERKEMBANGAN TAHFIDZ</h4>
              <p className="text-[10px] text-emerald-200">Tahun Ajaran 2026/2027</p>
            </div>

            <div className="p-4 overflow-y-auto space-y-3.5 text-xs text-stone-800">
              {/* Santri metadata */}
              <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200 grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-stone-400 block text-[10px]">Nama Santri</span>
                  <span className="font-bold text-stone-900">{child.NamaSiswa}</span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[10px]">NISN / Kelas</span>
                  <span className="font-medium">{child.NISN} / {getClassName(child.KelasID)}</span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[10px]">Pembimbing Halaqah</span>
                  <span className="font-medium">{child.GuruID}</span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[10px]">Target Capaian</span>
                  <span className="font-bold text-emerald-700">{child.TargetJuz} Juz</span>
                </div>
              </div>

              {/* Setoran list */}
              <div>
                <h5 className="font-bold text-stone-800 text-[11px] mb-1.5 uppercase tracking-wider">
                  Riwayat Setoran Terbaru
                </h5>
                <div className="space-y-1.5">
                  {setoran.slice(0, 5).map((s, idx) => (
                    <div key={s.ID} className="p-2 rounded-xl border border-stone-200 flex items-center justify-between text-[11px]">
                      <div>
                        <span className="font-semibold text-stone-900">
                          {idx + 1}. Surat {s.Surat} ({s.AyatAwal}-{s.AyatAkhir})
                        </span>
                        <span className="text-[10px] text-stone-500 block">
                          {s.JenisSetoran} · {s.Tanggal}
                        </span>
                      </div>
                      <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10px]">
                        {s.Predikat}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Catatan Ustadz */}
              {catatan[0] && (
                <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-2.5">
                  <span className="text-[10px] font-bold text-amber-800 uppercase block mb-0.5">
                    Catatan Pembimbing:
                  </span>
                  <p className="text-[11px] text-stone-700 italic">"{catatan[0].Catatan}"</p>
                </div>
              )}
            </div>

            <div className="p-3 bg-stone-50 border-t border-stone-200 flex gap-2 justify-end">
              <button
                onClick={() => setShowRaportModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 bg-white border border-stone-300"
              >
                Tutup
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" /> Cetak / Print
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
