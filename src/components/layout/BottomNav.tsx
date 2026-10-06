import React from 'react';
import { Role } from '../../types';
import {
  Users,
  BookOpen,
  ClipboardList,
  MessageSquare,
  BarChart3,
  GraduationCap,
  PlusCircle,
  History,
  FileText,
  Layers,
  Sparkles,
} from 'lucide-react';

interface BottomNavProps {
  role: Role;
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ role, activeTab, onTabChange }) => {
  const getTabs = () => {
    switch (role) {
      case 'admin':
        return [
          { id: 'ringkasan', label: 'Dashboard', icon: BarChart3 },
          { id: 'santri', label: 'Santri & Halaqah', icon: Users },
          { id: 'ustadz', label: 'Ustadz', icon: GraduationCap },
          { id: 'kelas', label: 'Kelas & Target', icon: Layers },
        ];
      case 'ustadz':
        return [
          { id: 'santri', label: 'Binaan Saya', icon: Users },
          { id: 'input', label: 'Input Setoran', icon: PlusCircle, highlight: true },
          { id: 'riwayat', label: 'Riwayat', icon: History },
          { id: 'catatan', label: 'Catatan', icon: FileText },
          { id: 'pengumuman', label: 'Pengumuman', icon: MessageSquare },
        ];
      case 'wali':
        return [
          { id: 'hafalan', label: 'Hafalan Anak', icon: BookOpen },
          { id: 'riwayat', label: 'Riwayat Setoran', icon: History },
          { id: 'catatan', label: 'Catatan Ustadz', icon: FileText },
          { id: 'pengumuman', label: 'Kabar Halaqah', icon: MessageSquare },
        ];
      case 'kepsek':
        return [
          { id: 'ringkasan', label: 'Monitoring', icon: BarChart3 },
          { id: 'halaqah', label: 'Kinerja Halaqah', icon: GraduationCap },
          { id: 'santri', label: 'Data Santri', icon: Users },
          { id: 'rekap', label: 'Evaluasi', icon: ClipboardList },
        ];
      default:
        return [];
    }
  };

  const tabs = getTabs();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200/90 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] pb-safe">
      <div className="max-w-md md:max-w-xl mx-auto flex items-center justify-around h-16 px-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          if (tab.highlight) {
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className="flex flex-col items-center justify-center flex-1 min-h-[48px] py-1 -mt-3.5 group transition-transform active:scale-95"
                aria-label={tab.label}
              >
                <div
                  className={`w-11 h-11 rounded-full flex items-center justify-center shadow-md transition-all ${
                    isActive
                      ? 'bg-emerald-600 text-white ring-4 ring-emerald-100'
                      : 'bg-emerald-700 hover:bg-emerald-800 text-amber-200'
                  }`}
                >
                  <Icon className="w-5 h-5 stroke-[2.2]" />
                </div>
                <span
                  className={`text-[10px] font-semibold mt-1 tracking-tight truncate max-w-[68px] ${
                    isActive ? 'text-emerald-700' : 'text-stone-600'
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="flex flex-col items-center justify-center flex-1 min-h-[48px] py-1 text-center transition-all active:scale-95"
              aria-label={tab.label}
            >
              <div
                className={`p-1 rounded-xl transition-all ${
                  isActive ? 'text-emerald-700 bg-emerald-50' : 'text-stone-400 hover:text-stone-600'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.2]' : 'stroke-[1.8]'}`} />
              </div>
              <span
                className={`text-[10px] font-medium leading-none mt-0.5 tracking-tight truncate max-w-[72px] ${
                  isActive ? 'text-emerald-800 font-bold' : 'text-stone-500'
                }`}
              >
                {tab.label}
              </span>
              {isActive && (
                <span className="w-1 h-1 rounded-full bg-emerald-600 mt-1" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
