import { User, Siswa, Kelas, Setoran, CatatanPerkembangan, TargetTahfidz, Pengumuman } from '../types';
import {
  INITIAL_USERS,
  INITIAL_SISWA,
  INITIAL_KELAS,
  INITIAL_SETORAN,
  INITIAL_CATATAN,
  INITIAL_TARGET,
  INITIAL_PENGUMUMAN,
} from '../data/initialData';

const KEYS = {
  USERS: 'sdqu_users',
  SISWA: 'sdqu_siswa',
  KELAS: 'sdqu_kelas',
  SETORAN: 'sdqu_setoran',
  CATATAN: 'sdqu_catatan',
  TARGET: 'sdqu_target',
  PENGUMUMAN: 'sdqu_pengumuman',
  SESSION: 'sdqu_session',
  TOKEN: 'sdqu_token',
  GAS_URL: 'sdqu_gas_url',
  USE_LIVE_GAS: 'sdqu_use_live_gas',
};

export const storage = {
  getToken(): string {
    return localStorage.getItem(KEYS.TOKEN) || '';
  },

  setToken(token: string | null) {
    if (token) {
      localStorage.setItem(KEYS.TOKEN, token);
    } else {
      localStorage.removeItem(KEYS.TOKEN);
    }
  },

  getUsers(): User[] {
    const raw = localStorage.getItem(KEYS.USERS);
    if (!raw) {
      localStorage.setItem(KEYS.USERS, JSON.stringify(INITIAL_USERS));
      return INITIAL_USERS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_USERS;
    }
  },

  setUsers(users: User[]) {
    localStorage.setItem(KEYS.USERS, JSON.stringify(users));
  },

  getSiswa(): Siswa[] {
    const raw = localStorage.getItem(KEYS.SISWA);
    if (!raw) {
      localStorage.setItem(KEYS.SISWA, JSON.stringify(INITIAL_SISWA));
      return INITIAL_SISWA;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_SISWA;
    }
  },

  setSiswa(siswa: Siswa[]) {
    localStorage.setItem(KEYS.SISWA, JSON.stringify(siswa));
  },

  getKelas(): Kelas[] {
    const raw = localStorage.getItem(KEYS.KELAS);
    if (!raw) {
      localStorage.setItem(KEYS.KELAS, JSON.stringify(INITIAL_KELAS));
      return INITIAL_KELAS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_KELAS;
    }
  },

  setKelas(kelas: Kelas[]) {
    localStorage.setItem(KEYS.KELAS, JSON.stringify(kelas));
  },

  getSetoran(): Setoran[] {
    const raw = localStorage.getItem(KEYS.SETORAN);
    if (!raw) {
      localStorage.setItem(KEYS.SETORAN, JSON.stringify(INITIAL_SETORAN));
      return INITIAL_SETORAN;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_SETORAN;
    }
  },

  setSetoran(setoran: Setoran[]) {
    localStorage.setItem(KEYS.SETORAN, JSON.stringify(setoran));
  },

  getCatatan(): CatatanPerkembangan[] {
    const raw = localStorage.getItem(KEYS.CATATAN);
    if (!raw) {
      localStorage.setItem(KEYS.CATATAN, JSON.stringify(INITIAL_CATATAN));
      return INITIAL_CATATAN;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_CATATAN;
    }
  },

  setCatatan(catatan: CatatanPerkembangan[]) {
    localStorage.setItem(KEYS.CATATAN, JSON.stringify(catatan));
  },

  getTarget(): TargetTahfidz[] {
    const raw = localStorage.getItem(KEYS.TARGET);
    if (!raw) {
      localStorage.setItem(KEYS.TARGET, JSON.stringify(INITIAL_TARGET));
      return INITIAL_TARGET;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_TARGET;
    }
  },

  setTarget(targets: TargetTahfidz[]) {
    localStorage.setItem(KEYS.TARGET, JSON.stringify(targets));
  },

  getPengumuman(): Pengumuman[] {
    const raw = localStorage.getItem(KEYS.PENGUMUMAN);
    if (!raw) {
      localStorage.setItem(KEYS.PENGUMUMAN, JSON.stringify(INITIAL_PENGUMUMAN));
      return INITIAL_PENGUMUMAN;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_PENGUMUMAN;
    }
  },

  setPengumuman(p: Pengumuman[]) {
    localStorage.setItem(KEYS.PENGUMUMAN, JSON.stringify(p));
  },

  getSession(): User | null {
    const raw = localStorage.getItem(KEYS.SESSION);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  setSession(user: User | null) {
    if (user) {
      localStorage.setItem(KEYS.SESSION, JSON.stringify(user));
      if (user.Token) {
        localStorage.setItem(KEYS.TOKEN, user.Token);
      }
    } else {
      localStorage.removeItem(KEYS.SESSION);
      localStorage.removeItem(KEYS.TOKEN);
    }
  },

  getGasUrl(): string {
    return localStorage.getItem(KEYS.GAS_URL) || '';
  },

  setGasUrl(url: string) {
    localStorage.setItem(KEYS.GAS_URL, url);
  },

  isUseLiveGas(): boolean {
    return localStorage.getItem(KEYS.USE_LIVE_GAS) === 'true';
  },

  setUseLiveGas(enabled: boolean) {
    localStorage.setItem(KEYS.USE_LIVE_GAS, enabled ? 'true' : 'false');
  },

  resetToDefault() {
    localStorage.setItem(KEYS.USERS, JSON.stringify(INITIAL_USERS));
    localStorage.setItem(KEYS.SISWA, JSON.stringify(INITIAL_SISWA));
    localStorage.setItem(KEYS.KELAS, JSON.stringify(INITIAL_KELAS));
    localStorage.setItem(KEYS.SETORAN, JSON.stringify(INITIAL_SETORAN));
    localStorage.setItem(KEYS.CATATAN, JSON.stringify(INITIAL_CATATAN));
    localStorage.setItem(KEYS.TARGET, JSON.stringify(INITIAL_TARGET));
    localStorage.setItem(KEYS.PENGUMUMAN, JSON.stringify(INITIAL_PENGUMUMAN));
  },
};
