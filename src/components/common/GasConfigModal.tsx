import React, { useState } from 'react';
import { X, Copy, Check, ExternalLink, RefreshCw, Database, Server, Info, ShieldCheck } from 'lucide-react';
import { storage } from '../../services/storage';
import { api } from '../../services/api';
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
  const [useLiveGas, setUseLiveGas] = useState(storage.isUseLiveGas());
  const [copied, setCopied] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
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
    storage.setUseLiveGas(useLiveGas);
    onConfigUpdated();
    onClose();
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      // Temporarily store to test
      storage.setGasUrl(gasUrl.trim());
      storage.setUseLiveGas(useLiveGas);
      const res = await api.ping();
      setTestResult({
        success: res.success,
        message: res.message + (res.latency ? ` (${res.latency}ms)` : ''),
      });
    } catch (err) {
      setTestResult({
        success: false,
        message: 'Koneksi gagal: ' + (err as Error).message,
      });
    } finally {
      setTesting(false);
    }
  };

  const handleResetData = () => {
    if (window.confirm('Kembalikan data ke awal (default demo)? Semua setoran baru di database lokal akan di-reset.')) {
      storage.resetToDefault();
      onConfigUpdated();
      setTestResult({ success: true, message: 'Database lokal berhasil di-reset ke data bawaan sekolah.' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in">
      <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-stone-200">
        {/* Header */}
        <div className="bg-emerald-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-800 flex items-center justify-center text-amber-300">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold">Koneksi Database & Google Sheet</h2>
              <p className="text-[11px] text-emerald-200">SDQU Al I'tisham Tahfidz API</p>
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
            Pengaturan & URL
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`py-2 px-3 border-b-2 transition-colors ${
              activeTab === 'code'
                ? 'border-emerald-600 text-emerald-800 font-semibold'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            Salin Kode Apps Script
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
              {/* Info banner */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-emerald-900 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-emerald-800 text-[12px]">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Keamanan Backend Otomatis Aktif
                </div>
                <p className="text-[11px] leading-relaxed">
                  Sistem telah dilengkapi isolasi data tingkat backend: Ustadz hanya dapat melihat santri binaan halaqahnya, Wali santri hanya dapat melihat 1 anaknya sendiri, dan pengumuman halaqah terisolasi sesuai pengampu.
                </p>
              </div>

              {/* Mode Selector */}
              <div className="border border-stone-200 rounded-xl p-3 space-y-3 bg-white">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-semibold text-stone-800 block text-xs">
                      Gunakan Google Spreadsheet Live
                    </label>
                    <span className="text-[11px] text-stone-500">
                      Sambungkan langsung ke Google Sheet via Google Apps Script Web App
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={useLiveGas}
                    onChange={(e) => setUseLiveGas(e.target.checked)}
                    className="w-5 h-5 accent-emerald-600 rounded cursor-pointer"
                  />
                </div>

                {useLiveGas && (
                  <div className="space-y-1.5 pt-2 border-t border-stone-100">
                    <label className="text-[11px] font-medium text-stone-700 block">
                      Google Apps Script Web App URL
                    </label>
                    <input
                      type="url"
                      value={gasUrl}
                      onChange={(e) => setGasUrl(e.target.value)}
                      placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                      className="w-full text-xs px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <p className="text-[10px] text-stone-400">
                      Dapatkan URL ini setelah menerapkan (deploy) sebagai Web App di Google Apps Script Spreadsheet Anda.
                    </p>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <button
                  onClick={handleTestConnection}
                  disabled={testing}
                  className="flex-1 py-2.5 px-3 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 font-medium flex items-center justify-center gap-1.5 transition-colors border border-stone-300 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
                  {testing ? 'Menguji Koneksi...' : 'Uji Koneksi (Test Ping)'}
                </button>
                <button
                  onClick={handleSaveConfig}
                  className="flex-1 py-2.5 px-3 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-medium flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                >
                  <Check className="w-3.5 h-3.5" />
                  Simpan Konfigurasi
                </button>
              </div>

              {testResult && (
                <div
                  className={`p-3 rounded-lg border text-xs ${
                    testResult.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  <p className="font-semibold">{testResult.success ? '✓ Berhasil' : '⚠ Perhatian'}</p>
                  <p className="text-[11px] mt-0.5">{testResult.message}</p>
                </div>
              )}

              {/* Reset database section */}
              <div className="pt-3 border-t border-stone-200 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-stone-800 text-xs">Reset Database Lokal</div>
                  <div className="text-[10px] text-stone-500">Muat ulang data demo santri & ustadz bawaan</div>
                </div>
                <button
                  onClick={handleResetData}
                  className="text-xs text-rose-600 hover:text-rose-700 font-medium px-2.5 py-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 transition-colors"
                >
                  Reset Data Demo
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
                  {copied ? 'Tersalin ke Clipboard!' : 'Salin Kode'}
                </button>
              </div>

              <div className="bg-stone-900 text-stone-200 p-3 rounded-xl font-mono text-[11px] max-h-64 overflow-y-auto leading-relaxed border border-stone-800">
                <pre>{GOOGLE_APPS_SCRIPT_CODE}</pre>
              </div>

              <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-amber-900 text-[11px] space-y-1">
                <div className="font-semibold text-amber-800 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5" /> Panduan Singkat 4 Langkah:
                </div>
                <ol className="list-decimal pl-4 space-y-0.5 text-stone-700 text-[11px]">
                  <li>Buka Spreadsheet Google Drive baru &gt; Menu <strong>Ekstensi</strong> &gt; <strong>Apps Script</strong>.</li>
                  <li>Paste kode di atas &gt; Klik Simpan &gt; Jalankan fungsi <strong>initDatabase()</strong> sekali untuk otomatis generate sheet.</li>
                  <li>Klik tombol <strong>Deploy &gt; New Deployment &gt; Web App</strong>.</li>
                  <li>Set <strong>Execute as: Me</strong> dan <strong>Who has access: Anyone</strong>. Salin Web app URL ke aplikasi ini!</li>
                </ol>
              </div>
            </div>
          )}

          {activeTab === 'schema' && (
            <div className="space-y-3">
              <p className="text-[11px] text-stone-600">
                Struktur sheet dan kolom sesuai standar sistem monitoring tahfidz SDQU Al I'tisham:
              </p>
              <div className="space-y-2">
                {[
                  { name: 'TB_User', cols: 'ID, Nama, Username, Password, Role, GuruID, ChildID, NoHP, Status' },
                  { name: 'TB_Siswa', cols: 'ID, NISN, Nama Siswa, Jenis Kelamin, KelasID, Nama Orang Tua, No HP Orang Tua, Target Juz, Status, Catatan, GuruID' },
                  { name: 'TB_Kelas', cols: 'ID, Nama Kelas, Tingkat, Wali Kelas, Target Juz, Tahun Ajaran' },
                  { name: 'TB_Setoran', cols: 'ID, SiswaID, Tanggal, Jenis Setoran, Surat, Ayat Awal, Ayat Akhir, Juz, Kelancaran, Tajwid, Makhraj, Predikat, GuruID' },
                  { name: 'TB_Catatan', cols: 'ID, SiswaID, Tanggal, Kategori, Catatan, GuruID' },
                  { name: 'TB_Target', cols: 'ID, Kelas, Semester, Target Juz, Target Surat' },
                  { name: 'TB_Pengumuman', cols: 'ID, GuruID, Judul, Isi, Tanggal' },
                ].map((tbl) => (
                  <div key={tbl.name} className="border border-stone-200 rounded-lg p-2.5 bg-stone-50">
                    <div className="font-semibold text-emerald-800 text-xs">{tbl.name}</div>
                    <div className="text-[10px] text-stone-600 font-mono mt-0.5 break-words">
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
            className="px-4 py-2 text-xs font-semibold text-stone-700 bg-white hover:bg-stone-100 border border-stone-300 rounded-lg transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
