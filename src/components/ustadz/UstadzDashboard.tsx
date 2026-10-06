import React, { useState } from 'react';
import { User, Siswa, Setoran, CatatanPerkembangan, Pengumuman, Kelas, JenisSetoran, Kelancaran, Tajwid, Makhraj, Predikat } from '../../types';
import { SURAH_LIST } from '../../data/quranData';
import { api } from '../../services/api';
import confetti from 'canvas-confetti';
import {
  Users,
  PlusCircle,
  History,
  FileText,
  MessageSquare,
  Award,
  Sparkles,
  BookOpen,
  Calendar,
  CheckCircle2,
  Trash2,
  Send,
  AlertCircle,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';

interface UstadzDashboardProps {
  user: User;
  siswa: Siswa[];
  setoran: Setoran[];
  catatan: CatatanPerkembangan[];
  pengumuman: Pengumuman[];
  kelas: Kelas[];
  activeTab: string;
  onRefresh: () => void;
  onNavigateTab: (tabId: string) => void;
}

export const UstadzDashboard: React.FC<UstadzDashboardProps> = ({
  user,
  siswa,
  setoran,
  catatan,
  pengumuman,
  kelas,
  activeTab,
  onRefresh,
  onNavigateTab,
}) => {
  // Input Setoran Form State
  const [selectedSiswaId, setSelectedSiswaId] = useState<string>(siswa[0]?.ID || '');
  const [jenisSetoran, setJenisSetoran] = useState<JenisSetoran>('Ziyadah');
  const [selectedSuratNumber, setSelectedSuratNumber] = useState<number>(78); // Default An-Naba
  const [ayatAwal, setAyatAwal] = useState<number>(1);
  const [ayatAkhir, setAyatAkhir] = useState<number>(10);
  const [juz, setJuz] = useState<number>(30);
  const [kelancaran, setKelancaran] = useState<Kelancaran>('Lancar Sekali');
  const [tajwid, setTajwid] = useState<Tajwid>('Mumtaz (A)');
  const [makhraj, setMakhraj] = useState<Makhraj>('Fasih');
  const [predikat, setPredikat] = useState<Predikat>('Mumtaz');
  const [catatanSetoran, setCatatanSetoran] = useState<string>('');
  const [submittingSetoran, setSubmittingSetoran] = useState(false);
  const [successFeedback, setSuccessFeedback] = useState<string | null>(null);

  // Catatan Perkembangan Form State
  const [catatanSiswaId, setCatatanSiswaId] = useState<string>(siswa[0]?.ID || '');
  const [kategoriCatatan, setKategoriCatatan] = useState<CatatanPerkembangan['Kategori']>('Adab & Disiplin');
  const [isiCatatan, setIsiCatatan] = useState('');
  const [submittingCatatan, setSubmittingCatatan] = useState(false);

  // Pengumuman Form State
  const [judulPengumuman, setJudulPengumuman] = useState('');
  const [isiPengumuman, setIsiPengumuman] = useState('');
  const [submittingPengumuman, setSubmittingPengumuman] = useState(false);

  // Selected Surah helper
  const selectedSurah = SURAH_LIST.find((s) => s.number === selectedSuratNumber) || SURAH_LIST[0];

  const handleSurahChange = (surahNum: number) => {
    setSelectedSuratNumber(surahNum);
    const surah = SURAH_LIST.find((s) => s.number === surahNum);
    if (surah) {
      setJuz(surah.defaultJuz);
      setAyatAwal(1);
      setAyatAkhir(Math.min(10, surah.numberOfVerses));
    }
  };

  const handleSubmitSetoran = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSiswaId) return;

    setSubmittingSetoran(true);
    setSuccessFeedback(null);

    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await api.addSetoran(
        {
          SiswaID: selectedSiswaId,
          Tanggal: today,
          JenisSetoran: jenisSetoran,
          Surat: selectedSurah.latin,
          AyatAwal: Number(ayatAwal),
          AyatAkhir: Number(ayatAkhir),
          Juz: Number(juz),
          Kelancaran: kelancaran,
          Tajwid: tajwid,
          Makhraj: makhraj,
          Predikat: predikat,
          Catatan: catatanSetoran.trim() || undefined,
          GuruID: user.GuruID || 'G001',
        },
        user
      );

      if (res.success) {
        if (predikat === 'Mumtaz') {
          confetti({ particleCount: 60, spread: 60, origin: { y: 0.7 } });
        }
        setSuccessFeedback(`Setoran ${selectedSurah.latin} (${ayatAwal}-${ayatAkhir}) berhasil disimpan!`);
        setCatatanSetoran('');
        onRefresh();
        setTimeout(() => setSuccessFeedback(null), 4000);
      }
    } catch (err) {
      alert('Gagal menyimpan setoran: ' + (err as Error).message);
    } finally {
      setSubmittingSetoran(false);
    }
  };

  const handleSubmitCatatan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catatanSiswaId || !isiCatatan.trim()) return;

    setSubmittingCatatan(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await api.addCatatan(
        {
          SiswaID: catatanSiswaId,
          Tanggal: today,
          Kategori: kategoriCatatan,
          Catatan: isiCatatan.trim(),
          GuruID: user.GuruID || 'G001',
        },
        user
      );

      if (res.success) {
        setIsiCatatan('');
        onRefresh();
        alert('Catatan perkembangan santri berhasil disimpan.');
      }
    } catch (err) {
      alert('Gagal menyimpan catatan: ' + (err as Error).message);
    } finally {
      setSubmittingCatatan(false);
    }
  };

  const handleSubmitPengumuman = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!judulPengumuman.trim() || !isiPengumuman.trim()) return;

    setSubmittingPengumuman(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await api.addPengumuman(
        {
          GuruID: user.GuruID || 'G001',
          Judul: judulPengumuman.trim(),
          Isi: isiPengumuman.trim(),
          Tanggal: today,
        },
        user
      );

      if (res.success) {
        setJudulPengumuman('');
        setIsiPengumuman('');
        onRefresh();
        alert('Pengumuman halaqah berhasil dipublikasikan khusus untuk wali santri binaan Anda!');
      }
    } catch (err) {
      alert('Gagal mempublikasikan pengumuman: ' + (err as Error).message);
    } finally {
      setSubmittingPengumuman(false);
    }
  };

  const handleDeleteSetoran = async (id: string) => {
    if (window.confirm('Hapus riwayat setoran ini?')) {
      await api.deleteSetoran(id, user);
      onRefresh();
    }
  };

  const getSiswaName = (id: string) => {
    const s = siswa.find((item) => item.ID === id);
    return s ? s.NamaSiswa : 'Santri';
  };

  const getKelasName = (kelasId: string) => {
    const k = kelas.find((item) => item.ID === kelasId);
    return k ? k.NamaKelas : kelasId;
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Halaqah Header Card */}
      <div className="bg-gradient-to-r from-emerald-800 to-emerald-950 text-white rounded-2xl p-4 shadow-md border border-emerald-700/60 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold tracking-wider text-amber-300 uppercase">
              Halaqah Tahfidz
            </span>
            <span className="text-[10px] bg-emerald-700/80 text-emerald-100 font-mono px-2 py-0.5 rounded-full border border-emerald-600/50">
              GuruID: {user.GuruID || 'G001'}
            </span>
          </div>

          <h2 className="text-base font-bold text-white mt-1">{user.Nama}</h2>

          <div className="flex items-center gap-4 mt-2 text-xs text-emerald-100">
            <div>
              <span className="text-stone-300">Total Binaan: </span>
              <span className="font-bold text-white">{siswa.length} Santri</span>
            </div>
            <div className="text-emerald-400">·</div>
            <div>
              <span className="text-stone-300">Setoran Tercatat: </span>
              <span className="font-bold text-white">{setoran.length} Riwayat</span>
            </div>
          </div>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successFeedback && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-3 rounded-2xl flex items-center gap-2.5 text-xs shadow-xs animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="font-medium">{successFeedback}</span>
        </div>
      )}

      {/* TAB 1: SANTRI BINAAN SAYA */}
      {activeTab === 'santri' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold text-stone-800 uppercase tracking-wider">
              Santri Binaan Saya ({siswa.length})
            </h3>
            <span className="text-[11px] text-stone-500">Isolasi GuruID Aktif</span>
          </div>

          {siswa.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center border border-stone-200">
              <Users className="w-10 h-10 text-stone-300 mx-auto mb-2" />
              <p className="text-xs text-stone-600 font-medium">Belum ada santri di halaqah ini</p>
              <p className="text-[11px] text-stone-400 mt-0.5">
                Admin sekolah dapat memetakan santri ke Ustadz ini melalui menu Admin.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {siswa.map((item) => {
                const studentSetoran = setoran.filter((st) => st.SiswaID === item.ID);
                const lastSetoran = studentSetoran[0];

                return (
                  <div
                    key={item.ID}
                    className="bg-white rounded-2xl p-4 border border-stone-200/90 shadow-xs hover:border-emerald-300 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-stone-900">{item.NamaSiswa}</h4>
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded font-medium ${
                              item.JenisKelamin === 'L'
                                ? 'bg-blue-50 text-blue-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {item.JenisKelamin === 'L' ? 'Ikhwan' : 'Akhwat'}
                          </span>
                        </div>
                        <div className="text-[11px] text-stone-500 mt-0.5">
                          NISN: {item.NISN} · Kelas: {getKelasName(item.KelasID)}
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedSiswaId(item.ID);
                          onNavigateTab('input');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-semibold border border-emerald-200/80 transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
                      >
                        <PlusCircle className="w-3.5 h-3.5 text-emerald-700" />
                        Setoran
                      </button>
                    </div>

                    {/* Target & Last Setoran Status */}
                    <div className="mt-3 pt-3 border-t border-stone-100 grid grid-cols-2 gap-2 text-[11px]">
                      <div className="bg-stone-50 rounded-xl p-2 border border-stone-100">
                        <span className="text-[10px] text-stone-400 block">Target Tahfidz</span>
                        <span className="font-bold text-emerald-800">{item.TargetJuz} Juz</span>
                        <span className="text-[10px] text-stone-500 ml-1">({studentSetoran.length}x setor)</span>
                      </div>

                      <div className="bg-stone-50 rounded-xl p-2 border border-stone-100">
                        <span className="text-[10px] text-stone-400 block">Setoran Terakhir</span>
                        {lastSetoran ? (
                          <span className="font-semibold text-stone-800 truncate block">
                            {lastSetoran.Surat} ({lastSetoran.AyatAwal}-{lastSetoran.AyatAkhir})
                          </span>
                        ) : (
                          <span className="text-stone-400 italic">Belum ada</span>
                        )}
                      </div>
                    </div>

                    {item.Catatan && (
                      <p className="mt-2 text-[11px] text-stone-600 bg-emerald-50/40 p-2 rounded-lg border border-emerald-100/50">
                        <strong className="text-emerald-900">Catatan Khusus:</strong> {item.Catatan}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: INPUT SETORAN HAFALAN */}
      {activeTab === 'input' && (
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200/90 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <div>
              <h3 className="text-sm font-bold text-stone-900">Form Catat Setoran Hafalan</h3>
              <p className="text-[11px] text-stone-500">Khusus santri dalam binaan Ustadz</p>
            </div>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full">
              Halaqah {user.GuruID}
            </span>
          </div>

          <form onSubmit={handleSubmitSetoran} className="space-y-3.5">
            {/* 1. Pilih Santri Binaan */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Pilih Santri Binaan <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedSiswaId}
                onChange={(e) => setSelectedSiswaId(e.target.value)}
                required
                className="w-full text-xs px-3 py-2.5 rounded-xl border border-stone-300 bg-stone-50 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              >
                {siswa.map((s) => (
                  <option key={s.ID} value={s.ID}>
                    {s.NamaSiswa} ({s.NISN} - {getKelasName(s.KelasID)})
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Jenis Setoran */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                Jenis Setoran
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {(['Ziyadah', 'Murojaah', 'Tasmi', 'Ujian Tahfidz'] as JenisSetoran[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setJenisSetoran(type)}
                    className={`py-2 text-[11px] font-semibold rounded-xl border transition-all text-center ${
                      jenisSetoran === type
                        ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                        : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Surat Al-Qur'an (Autocomplete / Picker) */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Surat Al-Qur'an <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedSuratNumber}
                onChange={(e) => handleSurahChange(Number(e.target.value))}
                className="w-full text-xs px-3 py-2.5 rounded-xl border border-stone-300 bg-stone-50 focus:ring-2 focus:ring-emerald-600 focus:outline-none font-medium"
              >
                {SURAH_LIST.map((surah) => (
                  <option key={surah.number} value={surah.number}>
                    {surah.number}. {surah.latin} ({surah.name}) - {surah.numberOfVerses} Ayat (Juz {surah.defaultJuz})
                  </option>
                ))}
              </select>
            </div>

            {/* 4. Ayat Awal, Ayat Akhir, Juz */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-stone-700 mb-1">
                  Ayat Awal
                </label>
                <input
                  type="number"
                  min="1"
                  max={selectedSurah.numberOfVerses}
                  value={ayatAwal}
                  onChange={(e) => setAyatAwal(Number(e.target.value))}
                  required
                  className="w-full text-xs px-3 py-2 rounded-xl border border-stone-300 bg-stone-50 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-stone-700 mb-1">
                  Ayat Akhir
                </label>
                <input
                  type="number"
                  min="1"
                  max={selectedSurah.numberOfVerses}
                  value={ayatAkhir}
                  onChange={(e) => setAyatAkhir(Number(e.target.value))}
                  required
                  className="w-full text-xs px-3 py-2 rounded-xl border border-stone-300 bg-stone-50 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-stone-700 mb-1">
                  Juz
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={juz}
                  onChange={(e) => setJuz(Number(e.target.value))}
                  required
                  className="w-full text-xs px-3 py-2 rounded-xl border border-stone-300 bg-stone-50 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>
            </div>

            {/* 5. Penilaian: Kelancaran */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Kelancaran
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {(['Lancar Sekali', 'Lancar', 'Cukup', 'Kurang'] as Kelancaran[]).map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setKelancaran(val)}
                    className={`py-1.5 px-1 text-[10px] font-medium rounded-lg border text-center transition-colors ${
                      kelancaran === val
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-stone-50 hover:bg-stone-100 text-stone-600 border-stone-200'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            {/* 6. Penilaian: Tajwid & Makhraj */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-stone-700 mb-1">
                  Tajwid
                </label>
                <select
                  value={tajwid}
                  onChange={(e) => setTajwid(e.target.value as Tajwid)}
                  className="w-full text-xs px-2.5 py-2 rounded-xl border border-stone-300 bg-stone-50 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                >
                  <option value="Mumtaz (A)">Mumtaz (A)</option>
                  <option value="Jayyid Jiddan (B+)">Jayyid Jiddan (B+)</option>
                  <option value="Jayyid (B)">Jayyid (B)</option>
                  <option value="Maqbul (C)">Maqbul (C)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-stone-700 mb-1">
                  Makhraj
                </label>
                <select
                  value={makhraj}
                  onChange={(e) => setMakhraj(e.target.value as Makhraj)}
                  className="w-full text-xs px-2.5 py-2 rounded-xl border border-stone-300 bg-stone-50 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                >
                  <option value="Fasih">Fasih</option>
                  <option value="Cukup Fasih">Cukup Fasih</option>
                  <option value="Perlu Bimbingan">Perlu Bimbingan</option>
                </select>
              </div>
            </div>

            {/* 7. Predikat Keseluruhan */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Predikat Keseluruhan
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {(['Mumtaz', 'Jayyid Jiddan', 'Jayyid', 'Maqbul'] as Predikat[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPredikat(p)}
                    className={`py-1.5 text-[10px] font-semibold rounded-lg border text-center transition-colors ${
                      predikat === p
                        ? 'bg-amber-500 text-white border-amber-600'
                        : 'bg-stone-50 text-stone-700 border-stone-200'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* 8. Catatan Khusus Ustadz */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Catatan Ustadz untuk Santri & Wali (Opsional)
              </label>
              <textarea
                value={catatanSetoran}
                onChange={(e) => setCatatanSetoran(e.target.value)}
                rows={2}
                placeholder="Contoh: Sangat lancar, hati-hati mad wajib di ayat 15..."
                className="w-full text-xs p-2.5 rounded-xl border border-stone-300 bg-stone-50 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={submittingSetoran}
              className="w-full min-h-[48px] py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-900/10 active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              {submittingSetoran ? 'Menyimpan ke Database...' : 'Simpan Setoran Hafalan'}
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: RIWAYAT SETORAN */}
      {activeTab === 'riwayat' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold text-stone-800 uppercase tracking-wider">
              Riwayat Setoran Halaqah ({setoran.length})
            </h3>
            <span className="text-[11px] text-stone-500">Tersaring GuruID {user.GuruID}</span>
          </div>

          {setoran.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center border border-stone-200">
              <History className="w-10 h-10 text-stone-300 mx-auto mb-2" />
              <p className="text-xs text-stone-600 font-medium">Belum ada riwayat setoran</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {setoran.map((st) => (
                <div
                  key={st.ID}
                  className="bg-white rounded-2xl p-3.5 border border-stone-200 shadow-xs hover:border-emerald-200 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-stone-900">
                          {getSiswaName(st.SiswaID)}
                        </span>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                            st.JenisSetoran === 'Ziyadah'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {st.JenisSetoran}
                        </span>
                      </div>
                      <div className="text-[11px] font-semibold text-emerald-800 mt-1">
                        Surat {st.Surat} : Ayat {st.AyatAwal} - {st.AyatAkhir} (Juz {st.Juz})
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                        {st.Predikat}
                      </span>
                      <div className="text-[10px] text-stone-400 mt-1">{st.Tanggal}</div>
                    </div>
                  </div>

                  <div className="mt-2 pt-2 border-t border-stone-100 flex flex-wrap gap-2 text-[10px] text-stone-600">
                    <span>Kelancaran: <strong>{st.Kelancaran}</strong></span>
                    <span>·</span>
                    <span>Tajwid: <strong>{st.Tajwid}</strong></span>
                    <span>·</span>
                    <span>Makhraj: <strong>{st.Makhraj}</strong></span>
                  </div>

                  {st.Catatan && (
                    <div className="mt-2 text-[11px] text-stone-600 bg-stone-50 p-2 rounded-lg italic border border-stone-100">
                      "{st.Catatan}"
                    </div>
                  )}

                  <div className="mt-2 flex justify-end">
                    <button
                      onClick={() => handleDeleteSetoran(st.ID)}
                      className="text-[10px] text-rose-500 hover:text-rose-700 flex items-center gap-1 font-medium p-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" /> Hapus
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: CATATAN PERKEMBANGAN SANTRI */}
      {activeTab === 'catatan' && (
        <div className="space-y-4">
          {/* Form Tambah Catatan */}
          <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
              Tambah Catatan Perkembangan
            </h3>

            <form onSubmit={handleSubmitCatatan} className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-stone-700 mb-1">
                  Santri Binaan
                </label>
                <select
                  value={catatanSiswaId}
                  onChange={(e) => setCatatanSiswaId(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-stone-300 bg-stone-50 focus:outline-none"
                >
                  {siswa.map((s) => (
                    <option key={s.ID} value={s.ID}>
                      {s.NamaSiswa}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-stone-700 mb-1">
                  Kategori
                </label>
                <select
                  value={kategoriCatatan}
                  onChange={(e) => setKategoriCatatan(e.target.value as CatatanPerkembangan['Kategori'])}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-stone-300 bg-stone-50 focus:outline-none"
                >
                  <option value="Adab & Disiplin">Adab & Disiplin</option>
                  <option value="Tajwid & Makhraj">Tajwid & Makhraj</option>
                  <option value="Motivasi">Motivasi</option>
                  <option value="Evaluasi Umum">Evaluasi Umum</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-stone-700 mb-1">
                  Isi Catatan untuk Santri & Wali
                </label>
                <textarea
                  value={isiCatatan}
                  onChange={(e) => setIsiCatatan(e.target.value)}
                  rows={2}
                  required
                  placeholder="Tuliskan evaluasi sikap, kedisiplinan, atau pesan untuk orang tua..."
                  className="w-full text-xs p-2.5 rounded-xl border border-stone-300 bg-stone-50 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={submittingCatatan}
                className="w-full py-2.5 rounded-xl bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                {submittingCatatan ? 'Menyimpan...' : 'Simpan Catatan'}
              </button>
            </form>
          </div>

          {/* List Catatan */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider px-1">
              Daftar Catatan Perkembangan ({catatan.length})
            </h4>
            {catatan.length === 0 ? (
              <p className="text-xs text-stone-500 italic p-3 bg-white rounded-xl border border-stone-200 text-center">
                Belum ada catatan perkembangan tersimpan.
              </p>
            ) : (
              catatan.map((c) => (
                <div key={c.ID} className="bg-white rounded-2xl p-3.5 border border-stone-200 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-900">{getSiswaName(c.SiswaID)}</span>
                    <span className="text-[10px] text-stone-400">{c.Tanggal}</span>
                  </div>
                  <span className="inline-block text-[9px] bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.2 rounded font-medium mt-1">
                    {c.Kategori}
                  </span>
                  <p className="text-xs text-stone-700 mt-2 leading-relaxed">{c.Catatan}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 5: PENGUMUMAN HALAQAH */}
      {activeTab === 'pengumuman' && (
        <div className="space-y-4">
          {/* Security Notice */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 text-amber-900 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-amber-800 text-xs">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              Siaran Khusus Wali Santri Halaqah Ini
            </div>
            <p className="text-[11px] mt-1 text-stone-600">
              Pengumuman yang Anda buat hanya akan tampil di dashboard wali santri yang anaknya berada dalam halaqah <strong>{user.GuruID}</strong>.
            </p>
          </div>

          {/* Form Buat Pengumuman */}
          <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
              Buat Pengumuman Halaqah Baru
            </h3>

            <form onSubmit={handleSubmitPengumuman} className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-stone-700 mb-1">
                  Judul Pengumuman
                </label>
                <input
                  type="text"
                  value={judulPengumuman}
                  onChange={(e) => setJudulPengumuman(e.target.value)}
                  required
                  placeholder="Contoh: Jadwal Tasmi Mandiri Pekan Ini"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-stone-300 bg-stone-50 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-stone-700 mb-1">
                  Isi Pesan Pengumuman
                </label>
                <textarea
                  value={isiPengumuman}
                  onChange={(e) => setIsiPengumuman(e.target.value)}
                  rows={3}
                  required
                  placeholder="Tuliskan info untuk orang tua halaqah..."
                  className="w-full text-xs p-2.5 rounded-xl border border-stone-300 bg-stone-50 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={submittingPengumuman}
                className="w-full py-2.5 rounded-xl bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                {submittingPengumuman ? 'Mempublikasikan...' : 'Siarkan Pengumuman'}
              </button>
            </form>
          </div>

          {/* List Pengumuman yang aktif */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider px-1">
              Pengumuman Halaqah Anda ({pengumuman.length})
            </h4>

            {pengumuman.length === 0 ? (
              <p className="text-xs text-stone-500 italic p-4 bg-white rounded-2xl border border-stone-200 text-center">
                Belum ada pengumuman halaqah dibuat.
              </p>
            ) : (
              pengumuman.map((p) => (
                <div key={p.ID} className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-emerald-900">{p.Judul}</h5>
                    <span className="text-[10px] text-stone-400">{p.Tanggal}</span>
                  </div>
                  <p className="text-xs text-stone-700 mt-2 leading-relaxed">{p.Isi}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
