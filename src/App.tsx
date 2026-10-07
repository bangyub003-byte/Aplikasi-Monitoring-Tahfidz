/**
 * SISTEM MONITORING HAFALAN AL-QUR'AN SDQU AL I'TISHAM
 * Mobile-First Tahfidz Monitoring System
 */

import React, { useState, useEffect, useCallback } from 'react';
import { User, Role } from './types';
import { storage } from './services/storage';
import { api, ProtectedDataPayload } from './services/api';
import { TopHeader } from './components/layout/TopHeader';
import { BottomNav } from './components/layout/BottomNav';
import { LoginView } from './components/auth/LoginView';
import { UstadzDashboard } from './components/ustadz/UstadzDashboard';
import { WaliDashboard } from './components/wali/WaliDashboard';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { KepsekDashboard } from './components/kepsek/KepsekDashboard';
import { GasConfigModal } from './components/common/GasConfigModal';
import { RefreshCw, ShieldCheck, Database, Smartphone, BookOpen } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => storage.getSession());
  const [data, setData] = useState<ProtectedDataPayload | null>(null);
  const [activeTab, setActiveTab] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mobile preview mode for desktop users (defaults to true for authentic mobile test experience)
  const [mobileFrameMode, setMobileFrameMode] = useState<boolean>(true);
  const [gasModalOpen, setGasModalOpen] = useState(false);
  const [isLiveGas, setIsLiveGas] = useState(() => storage.isUseLiveGas());

  // Default initial tab per role
  const getDefaultTabForRole = useCallback((role: Role) => {
    switch (role) {
      case 'admin':
        return 'ringkasan';
      case 'ustadz':
        return 'santri';
      case 'wali':
        return 'hafalan';
      case 'kepsek':
        return 'ringkasan';
      default:
        return 'dashboard';
    }
  }, []);

  // Fetch role-isolated protected data from Backend
  const loadData = useCallback(async (user: User) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getProtectedData(user);
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setError(res.message || 'Gagal memuat data halaqah.');
      }
    } catch (err) {
      setError('Kesalahan koneksi: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  // When current user changes
  useEffect(() => {
    if (currentUser) {
      setActiveTab(getDefaultTabForRole(currentUser.Role));
      loadData(currentUser);
    } else {
      setData(null);
    }
    setIsLiveGas(storage.isUseLiveGas());
  }, [currentUser, getDefaultTabForRole, loadData]);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch {
      // Ignored
    }
    setCurrentUser(null);
    setData(null);
  };

  const handleConfigUpdated = () => {
    setIsLiveGas(storage.isUseLiveGas());
    if (currentUser) {
      loadData(currentUser);
    }
  };

  // 1. If not logged in, render Mobile Login
  if (!currentUser) {
    return (
      <>
        <LoginView
          onLoginSuccess={handleLoginSuccess}
          onOpenGasModal={() => setGasModalOpen(true)}
          isLiveGas={isLiveGas}
        />
        <GasConfigModal
          isOpen={gasModalOpen}
          onClose={() => setGasModalOpen(false)}
          onConfigUpdated={handleConfigUpdated}
        />
      </>
    );
  }

  // 2. Main Authenticated Application
  return (
    <div className={`min-h-screen bg-stone-100 flex flex-col items-center ${mobileFrameMode ? 'md:py-4 md:px-2' : ''}`}>
      {/* Outer Mobile Frame Container for authentic smartphone experience */}
      <div
        className={`w-full bg-[#fafaf9] flex flex-col min-h-screen ${
          mobileFrameMode
            ? 'max-w-[430px] md:shadow-2xl md:rounded-[36px] md:border md:border-stone-300 md:min-h-[844px] md:max-h-[92vh] overflow-y-auto relative'
            : 'max-w-2xl shadow-none rounded-none'
        }`}
      >
        {/* Top Header */}
        <TopHeader
          user={currentUser}
          onLogout={handleLogout}
          onOpenGasModal={() => setGasModalOpen(true)}
          isLiveGas={isLiveGas}
          mobileFrameMode={mobileFrameMode}
          onToggleMobileFrame={() => setMobileFrameMode((prev) => !prev)}
        />

        {/* Main Content Area */}
        <main className="flex-1 p-3 sm:p-4 overflow-y-auto pb-24">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-10 h-10 border-3 border-emerald-700/20 border-t-emerald-700 rounded-full animate-spin" />
              <div className="text-xs font-semibold text-emerald-900">
                Memuat Data Hafalan...
              </div>
              <p className="text-[11px] text-stone-500 max-w-xs">
                Menerapkan isolasi data keamanan backend untuk {currentUser.Nama}
              </p>
            </div>
          ) : error ? (
            <div className="p-6 bg-white rounded-3xl border border-rose-200 text-center space-y-3 shadow-xs">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                !
              </div>
              <h3 className="text-sm font-bold text-rose-900">Gagal Memuat Data</h3>
              <p className="text-xs text-stone-600">{error}</p>
              <button
                onClick={() => currentUser && loadData(currentUser)}
                className="px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Coba Lagi
              </button>
            </div>
          ) : data ? (
            <>
              {/* Role-Specific Dashboards */}
              {currentUser.Role === 'ustadz' && (
                <UstadzDashboard
                  user={currentUser}
                  siswa={data.siswa}
                  setoran={data.setoran}
                  catatan={data.catatan}
                  pengumuman={data.pengumuman}
                  kelas={data.kelas}
                  activeTab={activeTab}
                  onRefresh={() => loadData(currentUser)}
                  onNavigateTab={(tab) => setActiveTab(tab)}
                />
              )}

              {currentUser.Role === 'wali' && (
                <WaliDashboard
                  user={currentUser}
                  siswa={data.siswa}
                  setoran={data.setoran}
                  catatan={data.catatan}
                  pengumuman={data.pengumuman}
                  kelas={data.kelas}
                  activeTab={activeTab}
                  onNavigateTab={(tab) => setActiveTab(tab)}
                />
              )}

              {currentUser.Role === 'admin' && (
                <AdminDashboard
                  user={currentUser}
                  siswa={data.siswa}
                  setoran={data.setoran}
                  catatan={data.catatan}
                  pengumuman={data.pengumuman}
                  kelas={data.kelas}
                  users={data.users}
                  activeTab={activeTab}
                  onRefresh={() => loadData(currentUser)}
                  onOpenGasModal={() => setGasModalOpen(true)}
                />
              )}

              {currentUser.Role === 'kepsek' && (
                <KepsekDashboard
                  user={currentUser}
                  siswa={data.siswa}
                  setoran={data.setoran}
                  catatan={data.catatan}
                  kelas={data.kelas}
                  users={data.users}
                  target={data.target}
                  activeTab={activeTab}
                />
              )}
            </>
          ) : null}
        </main>

        {/* Bottom Tab Navigation */}
        <BottomNav
          role={currentUser.Role}
          activeTab={activeTab}
          onTabChange={(tabId) => setActiveTab(tabId)}
        />
      </div>

      {/* Google Apps Script Modal */}
      <GasConfigModal
        isOpen={gasModalOpen}
        onClose={() => setGasModalOpen(false)}
        onConfigUpdated={handleConfigUpdated}
      />
    </div>
  );
}
