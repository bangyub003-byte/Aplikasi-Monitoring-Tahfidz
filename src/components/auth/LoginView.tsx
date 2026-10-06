import React, { useState } from 'react';
import { User, Role } from '../../types';
import { api } from '../../services/api';
import { Lock, User as UserIcon, BookOpen, ShieldCheck, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';
import logoImg from '../../assets/images/sdqu_logo_1791284589989.jpg';

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
  onOpenGasModal: () => void;
  isLiveGas: boolean;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onLoginSuccess,
  onOpenGasModal,
  isLiveGas,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMessage('Silakan isi username dan password Anda');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const res = await api.login(username, password);
      if (res.success && res.data) {
        onLoginSuccess(res.data);
      } else {
        setErrorMessage(res.message || 'Login gagal. Periksa kembali akun Anda.');
      }
    } catch (err) {
      setErrorMessage('Terjadi kesalahan koneksi: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setLoading(true);
    setErrorMessage('');
    try {
      const res = await api.login(u, p);
      if (res.success && res.data) {
        onLoginSuccess(res.data);
      } else {
        setErrorMessage(res.message || 'Login gagal.');
      }
    } catch (err) {
      setErrorMessage('Gagal login: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col justify-center items-center px-4 py-8 bg-islamic-pattern">
      {/* Mobile Card Container */}
      <div className="w-full max-w-[420px] bg-white rounded-3xl shadow-xl border border-stone-200/90 overflow-hidden">
        {/* Top Header Card */}
        <div className="bg-emerald-900 text-white pt-8 pb-7 px-6 text-center relative overflow-hidden">
          {/* Subtle Islamic Arc background overlay */}
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fbbf24_1px,transparent_1px)] [background-size:16px_16px]" />

          <div className="relative z-10 flex flex-col items-center">
            {/* School Emblem */}
            <div className="w-16 h-16 rounded-2xl bg-white/10 ring-2 ring-amber-400/40 p-1 mb-3 shadow-lg flex items-center justify-center">
              <img
                src={logoImg}
                alt="SDQU Al I'tisham"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover rounded-xl"
              />
            </div>

            <span className="text-[11px] font-semibold tracking-wider text-amber-300 uppercase">
              Tahfidzul Qur'an
            </span>

            <h1 className="text-base font-bold text-white mt-1 leading-snug tracking-tight">
              SISTEM MONITORING HAFALAN AL-QUR'AN
            </h1>

            <div className="text-xs font-semibold text-emerald-200 mt-0.5">
              SDQU AL I'TISHAM
            </div>

            <p className="text-[11px] text-emerald-100/80 mt-1 max-w-[260px] leading-relaxed">
              Membentuk Generasi Qur'ani yang Berakhlak Mulia & Berprestasi
            </p>
          </div>
        </div>

        {/* Login Form Body */}
        <div className="p-6 space-y-5">
          {errorMessage && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                Username / NISN
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Contoh: ahmad / 12345 (NISN)"
                  autoCapitalize="none"
                  autoComplete="username"
                  className="w-full text-xs pl-10 pr-3 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition-all bg-stone-50/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5 flex items-center justify-between">
                <span>Password</span>
                <span className="text-[10px] text-stone-600 font-normal">
                  (Default Wali: sdqutercinta)
                </span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  autoComplete="current-password"
                  className="w-full text-xs pl-10 pr-3 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition-all bg-stone-50/50"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[48px] py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-900/10 active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Memverifikasi Akun...</span>
                </div>
              ) : (
                <>
                  <span>Masuk ke Sistem</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Switcher for fast testing of all roles & backend security */}
          <div className="pt-2 border-t border-stone-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-stone-600 uppercase tracking-wider">
                Akses Cepat (Demo Akun)
              </span>
              <span className="text-[10px] text-emerald-700 font-medium">1-Tap Login</span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 text-left">
              <button
                type="button"
                onClick={() => handleQuickLogin('ahmad', '123')}
                className="p-2 rounded-xl border border-emerald-100 bg-emerald-50/60 hover:bg-emerald-100/60 text-stone-700 transition-colors text-left flex flex-col"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-900 truncate">Ust. Ahmad</span>
                  <span className="text-[9px] bg-emerald-200/80 text-emerald-800 px-1 rounded font-mono">G001</span>
                </div>
                <span className="text-[10px] text-stone-500">Ustadz Halaqah</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('budi', '123')}
                className="p-2 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700 transition-colors text-left flex flex-col"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-stone-900 truncate">Ust. Budi</span>
                  <span className="text-[9px] bg-stone-200 text-stone-700 px-1 rounded font-mono">G002</span>
                </div>
                <span className="text-[10px] text-stone-500">Ustadz Halaqah</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('12345', 'sdqutercinta')}
                className="p-2 rounded-xl border border-amber-100 bg-amber-50/60 hover:bg-amber-100/60 text-stone-700 transition-colors text-left flex flex-col"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-amber-950 truncate">Wali Ahmad</span>
                  <span className="text-[9px] bg-amber-200 text-amber-900 px-1 rounded font-mono">NISN:12345</span>
                </div>
                <span className="text-[10px] text-stone-500">Wali Santri</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('admin', '123')}
                className="p-2 rounded-xl border border-purple-100 bg-purple-50/60 hover:bg-purple-100/60 text-stone-700 transition-colors text-left flex flex-col"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-purple-950 truncate">Admin Sekolah</span>
                  <span className="text-[9px] bg-purple-200 text-purple-900 px-1 rounded">Full</span>
                </div>
                <span className="text-[10px] text-stone-500">Administrator</span>
              </button>
            </div>

            <div className="mt-2 text-center">
              <button
                type="button"
                onClick={() => handleQuickLogin('kepsek', '123')}
                className="text-[11px] text-blue-700 hover:text-blue-900 font-semibold hover:underline inline-flex items-center gap-1"
              >
                <span>Masuk sebagai Kepala Sekolah (Monitoring Read-Only) &rarr;</span>
              </button>
            </div>
          </div>

          {/* Database Info & Google Sheet button */}
          <div className="pt-2 border-t border-stone-100 text-center">
            <button
              type="button"
              onClick={onOpenGasModal}
              className="text-[11px] text-stone-500 hover:text-emerald-700 font-medium inline-flex items-center gap-1.5 transition-colors"
            >
              <span className={`w-2 h-2 rounded-full ${isLiveGas ? 'bg-emerald-500' : 'bg-amber-400'}`} />
              <span>Status Backend: {isLiveGas ? 'Google Sheet Live' : 'Database Standalone'}</span>
              <span className="text-stone-400 underline">(Konfigurasi)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-4 text-center text-xs text-stone-500 max-w-sm">
        <p className="font-medium">SDQU AL I'TISHAM &copy; {new Date().getFullYear()}</p>
        <p className="text-[11px] text-stone-400 mt-0.5">
          Sistem Digital Pemantauan Tahfidz Berbasis Mobile
        </p>
      </div>
    </div>
  );
};
