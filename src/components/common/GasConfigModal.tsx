import React, { useState } from 'react';
import { X, Copy, Check, ExternalLink, RefreshCw, Database, Server, Info, ShieldCheck, CheckCircle2, AlertTriangle, Play } from 'lucide-react';
import { storage } from '../../services/storage';
import { apiService, ConnectionTestResult } from '../../services/apiService';
import { GOOGLE_APPS_SCRIPT_CODE } from '../../services/gasCode';

interface GasConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigUpdated: () => void;
}

export const GasConfigModal: React.FC<GasConfigModalProps> = ({
  isOpen,
  onClose,
  onConfigUpdated,
}) => {
  const [gasUrl, setGasUrl] = useState(storage.getGasUrl());
  const [copied, setCopied] = useState(false);
  const [testing, setTesting] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);
  const [seedResult, setSeedResult] = useState<{ success: boolean; message: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'status' | 'code' | 'schema'>('status');

  if (!isOpen) return null;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleSaveConfig = () => {
    storage.setGasUrl(gasUrl.trim());
    storage.setUseLiveGas(Boolean(gasUrl.trim()));
    onConfigUpdated();
  };

  // TUGAS AUDIT 5: Test Database Connection
  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    setSeedResult(null);

    // Pastikan URL tersimpan dulu
    storage.setGasUrl(gasUrl.trim());
    storage.setUseLiveGas(Boolean(gasUrl.trim()));

    try {
      const res = await apiService.testConnection();
      setTestResult(res);
      onConfigUpdated();
    } catch (err) {
      setTestResult({
        status: 'error',
        message: 'Koneksi gagal: ' + (err as Error).message,
      });
    } finally {
      setTesting(false);
    }
  };

  // TUGAS AUDIT 6: Seed Database to Google Sheet
  const handleSeedToSheet = async () => {
    if (!gasUrl.trim()) {
      alert('Masukkan dan simpan URL Google Apps Script terlebih dahulu!');
      return;
    }

    if (window.confirm('Kirim data awal (User, Santri, Kelas, Pengumuman) langsung ke Google Spreadsheet Anda? Data sheet kosong akan terisi otomatis.')) {
      setSeeding(true);
      setSeedResult(null);
      try {
        const res = await apiService.seedInitialDataToSheet();
        setSeedResult({
          success: res.success,
          message: res.message || 'Selesai sinkronisasi',
        });
        onConfigUpdated();
      } catch (err) {
        setSeedResult({
          success: false,
          message: 'Gagal seeding: ' + (err as Error).message,
        });
      } finally {
        setSeeding(false);
      }
    }
  };

  const handleResetLocal = () => {
    if (window.confirm('Reset data lokal offline ke bawaan awal?')) {
      storage.resetToDefault();
      onConfigUpdated();
      alert('Data lokal berhasil di-reset.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in">
      <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-stone-200">
        {/* Header */}
        <div className="bg-emerald-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-800 flex items-center justify-center text-amber-300">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold">Koneksi Database & Google Sheet</h2>
              <p className="text-[11px] text-emerald-200">SDQU Al I'tisham · Single Source of Truth</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-stone-200 px-4 pt-2 bg-stone-50 text-xs font-medium">
          <button
            onClick={() => setActiveTab('status')}
            className={`py-2 px-3 border-b-2 transition-colors ${
              activeTab === 'status'
                ? 'border-emerald-600 text-emerald-800 font-semibold'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            Koneksi & Tes Realtime
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`py-2 px-3 border-b-2 transition-colors ${
              activeTab === 'code'
                ? 'border-emerald-600 text-emerald-800 font-semibold'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            Salin Kode Code.gs
          </button>
          <button
            onClick={() => setActiveTab('schema')}
            className={`py-2 px-3 border-b-2 transition-colors ${
              activeTab === 'schema'
                ? 'border-emerald-600 text-emerald-800 font-semibold'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            Struktur Tabel Sheet
          </button>
        </div>

        {/* Body content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs text-stone-700">
          {activeTab === 'status' && (
            <>
              {/* URL Input Box */}
              <div className="border border-stone-200 rounded-2xl p-4 space-y-3 bg-stone-50/70">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-stone-800 block text-xs">
                    Google Apps Script Web App URL
                  </label>
                  <span className="text-[10px] text-emerald-700 font-semibold">
                    {gasUrl ? 'URL Terpasang' : 'Belum Diisi'}
                  </span>
                </div>

                <input
                  type="url"
                  value={gasUrl}
                  onChange={(e) => setGasUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                  className="w-full text-xs px-3 py-2.5 bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 font-mono"
                />

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-stone-500">
                    Deployment type: <strong>Web App</strong> (Access: <strong>Anyone</strong>)
                  </span>
                  <button
                    onClick={handleSaveConfig}
                    className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs flex items-center gap-1 shadow-xs"
                  >
                    <Check className="w-3.5 h-3.5" /> Simpan URL
                  </button>
                </div>
              </div>

              {/* TUGAS AUDIT 5: TEST DATABASE CONNECTION BUTTON */}
              <div className="space-y-2">
                <button
                  onClick={handleTestConnection}
                  disabled={testing}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${testing ? 'animate-spin' : ''}`} />
                  {testing ? 'Menguji Koneksi ke Code.gs...' : 'Test Database Connection'}
                </button>
                <p className="text-[10px] text-stone-400 text-center">
                  Mengirim action=test ke Google Apps Script dan memverifikasi akses spreadsheet.
                </p>
              </div>

              {/* HASIL TEST KONEKSI */}
              {testResult && (
                <div
                  className={`p-4 rounded-2xl border text-xs space-y-2 animate-fade-in ${
                    testResult.status === 'success'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : 'bg-rose-50 border-rose-300 text-rose-900'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-sm">
                      {testResult.status === 'success' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                      )}
                      <span>
                        {testResult.status === 'success' ? 'Database Connected!' : 'Koneksi Gagal'}
                      </span>
                    </div>
                    {testResult.latency && (
                      <span className="text-[10px] font-mono bg-emerald-200/70 text-emerald-900 px-2 py-0.5 rounded-full font-bold">
                        {testResult.latency}ms
                      </span>
                    )}
                  </div>

                  {testResult.status === 'success' ? (
                    <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-200 space-y-1 font-mono text-[11px]">
                      <div><strong>status:</strong> "{testResult.status}"</div>
                      <div><strong>message:</strong> "{testResult.message}"</div>
                      <div><strong>sheet:</strong> "{testResult.sheet}"</div>
                      <div><strong>timestamp:</strong> "{testResult.timestamp}"</div>
                    </div>
                  ) : (
                    <div className="text-[11px] leading-relaxed bg-white/80 p-2.5 rounded-xl border border-rose-200">
                      <p className="font-semibold text-rose-800">Detail Kesalahan:</p>
                      <p className="mt-0.5">{testResult.message}</p>
                      <p className="mt-1.5 text-[10px] text-stone-500">
                        Pastikan Anda telah melakukan <strong>Deploy &gt; New deployment &gt; Web app</strong> dengan setting: <strong>Who has access: Anyone</strong>.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* SEED DATA KE GOOGLE SHEET */}
              <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-amber-950 text-xs">
                      Isi Data Awal ke Google Sheet
                    </h4>
                    <p className="text-[10px] text-stone-600">
                      Mengisi sheet TB_User, TB_Siswa, TB_Kelas yang masih kosong di Spreadsheet Anda.
                    </p>
                  </div>
                  <button
                    onClick={handleSeedToSheet}
                    disabled={seeding || !gasUrl}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 disabled:opacity-50"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    {seeding ? 'Mengisi...' : 'Kirim Data Awal'}
                  </button>
                </div>

                {seedResult && (
                  <div className={`p-2 rounded-lg text-[11px] font-medium ${seedResult.success ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                    {seedResult.message}
                  </div>
                )}
              </div>

              {/* Reset database section */}
              <div className="pt-2 border-t border-stone-200 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-stone-800 text-xs">Reset Database Lokal (Offline)</div>
                  <div className="text-[10px] text-stone-500">Hanya berpengaruh saat offline</div>
                </div>
                <button
                  onClick={handleResetLocal}
                  className="text-xs text-rose-600 hover:text-rose-700 font-medium px-2.5 py-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 transition-colors"
                >
                  Reset Lokal
                </button>
              </div>
            </>
          )}

          {activeTab === 'code' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-stone-800">
                  Script Google Apps Script (Code.gs)
                </span>
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1 text-xs px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-medium transition-colors shadow-xs"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Tersalin ke Clipboard!' : 'Salin Seluruh Kode'}
                </button>
              </div>

              <div className="bg-stone-900 text-stone-200 p-3 rounded-xl font-mono text-[11px] max-h-64 overflow-y-auto leading-relaxed border border-stone-800">
                <pre>{GOOGLE_APPS_SCRIPT_CODE}</pre>
              </div>

              <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-amber-900 text-[11px] space-y-1">
                <div className="font-semibold text-amber-800 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5" /> Langkah Memasang:
                </div>
                <ol className="list-decimal pl-4 space-y-0.5 text-stone-700 text-[11px]">
                  <li>Buka Spreadsheet Google Drive Anda &gt; Menu <strong>Ekstensi</strong> &gt; <strong>Apps Script</strong>.</li>
                  <li>Paste seluruh kode di atas &gt; Klik Simpan.</li>
                  <li>Pilih fungsi <strong>initDatabase</strong> pada menu drop-down di atas lalu klik <strong>Run</strong> (Jalankan).</li>
                  <li>Klik tombol <strong>Deploy &gt; New Deployment &gt; Web App</strong>.</li>
                  <li>Pastikan <strong>Who has access: Anyone</strong> lalu klik Deploy dan salin Web App URL ke aplikasi!</li>
                </ol>
              </div>
            </div>
          )}

          {activeTab === 'schema' && (
            <div className="space-y-3">
              <p className="text-[11px] text-stone-600">
                Struktur tabel di Google Spreadsheet:
              </p>
              <div className="space-y-2">
                {[
                  { name: 'TB_User', cols: 'ID, Nama, Username, Password, Role, GuruID, ChildID, NoHP, Status', desc: 'Menyimpan akun login seluruh role' },
                  { name: 'TB_Siswa', cols: 'ID, NISN, Nama Siswa, Jenis Kelamin, KelasID, Nama Orang Tua, No HP Orang Tua, Target Juz, Status, Catatan, GuruID', desc: 'Menyimpan profil santri & relasi GuruID' },
                  { name: 'TB_Kelas', cols: 'ID, Nama Kelas, Tingkat, Wali Kelas, Target Juz, Tahun Ajaran', desc: 'Rombongan belajar & target tahunan' },
                  { name: 'TB_Setoran', cols: 'ID, SiswaID, Tanggal, Jenis Setoran, Surat, Ayat Awal, Ayat Akhir, Juz, Kelancaran, Tajwid, Makhraj, Predikat, Catatan, GuruID', desc: 'Riwayat hafalan sabaq & murojaah' },
                  { name: 'TB_Catatan', cols: 'ID, SiswaID, Tanggal, Kategori, Catatan, GuruID', desc: 'Catatan perkembangan & adab santri' },
                  { name: 'TB_Target', cols: 'ID, Kelas, Semester, Target Juz, Target Surat', desc: 'Standar target kurikulum tahfidz' },
                  { name: 'TB_Pengumuman', cols: 'ID, GuruID, Judul, Isi, Tanggal', desc: 'Pesan siaran ustadz ke wali halaqah' },
                ].map((tbl) => (
                  <div key={tbl.name} className="border border-stone-200 rounded-xl p-2.5 bg-stone-50">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-800 text-xs">{tbl.name}</span>
                      <span className="text-[10px] text-stone-400">{tbl.desc}</span>
                    </div>
                    <div className="text-[10px] text-stone-600 font-mono mt-1 break-words">
                      {tbl.cols}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-stone-50 border-t border-stone-200 px-5 py-3 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-stone-700 bg-white hover:bg-stone-100 border border-stone-300 rounded-lg transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

