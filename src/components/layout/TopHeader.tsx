import React from 'react';
import { User } from '../../types';
import { LogOut, Database, Smartphone, Monitor, ShieldCheck, Sparkles } from 'lucide-react';
import logoImg from '../../assets/images/sdqu_logo_1791284589989.jpg';

interface TopHeaderProps {
  user: User;
  onLogout: () => void;
  onOpenGasModal: () => void;
  isLiveGas: boolean;
  mobileFrameMode: boolean;
  onToggleMobileFrame: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  user,
  onLogout,
  onOpenGasModal,
  isLiveGas,
  mobileFrameMode,
  onToggleMobileFrame,
}) => {
  const getRoleLabel = () => {
    switch (user.Role) {
      case 'admin':
        return 'Admin Sekolah';
      case 'ustadz':
        return `Ustadz Pengampu (${user.GuruID || 'Halaqah'})`;
      case 'wali':
        return 'Wali Santri';
      case 'kepsek':
        return 'Kepala Sekolah (Monitoring)';
      default:
        return user.Role;
    }
  };

  const getRoleBadgeColor = () => {
    switch (user.Role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'ustadz':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'wali':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'kepsek':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-stone-100 text-stone-800 border-stone-200';
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-emerald-900 text-white shadow-md border-b border-emerald-800/80">
      <div className="max-w-md md:max-w-4xl mx-auto px-3 py-2.5 flex items-center justify-between gap-2">
        {/* Brand & Emblem */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative shrink-0 w-9 h-9 rounded-xl overflow-hidden bg-white/10 ring-1 ring-white/20 p-0.5 shadow-sm">
            <img
              src={logoImg}
              alt="SDQU Al I'tisham"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover rounded-lg"
              onError={(e) => {
                // Fallback SVG if image is blocked
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>

          <div className="min-w-0 flex flex-col">
            <div className="flex items-center gap-1.5">
              <h1 className="text-xs md:text-sm font-bold tracking-tight text-emerald-50 truncate">
                SDQU AL I'TISHAM
              </h1>
              <span className="hidden sm:inline-block text-[10px] bg-emerald-800 text-emerald-200 px-1.5 py-0.2 rounded font-medium">
                Tahfidz
              </span>
            </div>
            <p className="text-[10px] text-emerald-200/90 truncate font-medium">
              Monitoring Hafalan Al-Qur'an
            </p>
          </div>
        </div>

        {/* Action buttons & Profile */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Mobile frame toggle for desktop */}
          <button
            onClick={onToggleMobileFrame}
            title={mobileFrameMode ? 'Beralih ke tampilan responsif lebar' : 'Beralih ke simulasi layar HP'}
            className="hidden md:flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg bg-emerald-800/80 hover:bg-emerald-700 text-emerald-100 transition-colors border border-emerald-700/60"
          >
            {mobileFrameMode ? (
              <>
                <Monitor className="w-3.5 h-3.5 text-amber-300" />
                <span className="text-[10px]">Layar Lebar</span>
              </>
            ) : (
              <>
                <Smartphone className="w-3.5 h-3.5 text-amber-300" />
                <span className="text-[10px]">Mode HP (390px)</span>
              </>
            )}
          </button>

          {/* Google Sheet status button */}
          <button
            onClick={onOpenGasModal}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium border transition-colors ${
              isLiveGas
                ? 'bg-emerald-800/90 text-emerald-100 border-emerald-500/50'
                : 'bg-emerald-800/50 text-emerald-200 hover:bg-emerald-800 border-emerald-700/50'
            }`}
            title="Pengaturan Google Apps Script & Spreadsheet"
          >
            <Database className="w-3 h-3 text-amber-300" />
            <span className="hidden sm:inline">{isLiveGas ? 'Sheet Live' : 'Database'}</span>
            <span className={`w-1.5 h-1.5 rounded-full ${isLiveGas ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
          </button>

          {/* User badge */}
          <div className="flex items-center gap-1.5 pl-1 border-l border-emerald-800/80">
            <div className="text-right hidden xs:block">
              <div className="text-[11px] font-semibold text-white leading-tight max-w-[110px] truncate">
                {user.Nama}
              </div>
              <div className="text-[9px] text-amber-300 leading-none font-medium">
                {getRoleLabel()}
              </div>
            </div>

            <button
              onClick={onLogout}
              title="Keluar / Logout"
              className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-emerald-800 transition-colors flex items-center justify-center min-w-[34px] min-h-[34px]"
              aria-label="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
