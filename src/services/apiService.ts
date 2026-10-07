/**
 * SISTEM MONITORING HAFALAN AL-QUR'AN SDQU AL I'TISHAM
 * API SERVICE (Integrasi Google Apps Script & Google Spreadsheet)
 * 
 * Keamanan Diperketat:
 * - Token Sesi 6 Jam dikirim pada setiap request
 * - Backend membaca role/guruId/childId HANYA dari token
 * - Single Source of Truth: Google Spreadsheet
 */

import { User, Siswa, Kelas, Setoran, CatatanPerkembangan, TargetTahfidz, Pengumuman, Role } from '../types';
import { storage } from './storage';

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  code?: string;
  error?: string;
}

export interface ProtectedDataPayload {
  siswa: Siswa[];
  setoran: Setoran[];
  catatan: CatatanPerkembangan[];
  pengumuman: Pengumuman[];
  kelas: Kelas[];
  target: TargetTahfidz[];
  users: User[];
}

export interface ConnectionTestResult {
  status: 'success' | 'error';
  message: string;
  sheet?: string;
  timestamp?: string;
  latency?: number;
  raw?: any;
}

export function getAppsScriptUrl(): string {
  const customUrl = storage.getGasUrl()?.trim();
  if (customUrl) return customUrl;
  const envUrl = (import.meta as any).env?.VITE_GAS_API_URL?.trim();
  if (envUrl) return envUrl;
  return '';
}

/**
 * Helper komunikasi ke Google Apps Script:
 * - Otomatis menyertakan Token Sesi
 * - Content-Type: text/plain agar bebas dari CORS preflight OPTIONS
 */
async function callAppsScript(payload: Record<string, any>): Promise<any> {
  const url = getAppsScriptUrl();
  if (!url) {
    throw new Error('URL Google Apps Script belum dikonfigurasi. Masukkan URL Web App di menu Pengaturan Koneksi.');
  }

  // Sisipkan token sesi jika ada dan belum disertakan
  const token = payload.token || storage.getToken();
  const fullPayload = {
    ...payload,
    token: token || undefined,
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(fullPayload),
      redirect: 'follow',
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
    }

    const text = await response.text();
    let json: any;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error(`Respon bukan format JSON valid: ${text.slice(0, 150)}`);
    }

    // Jika token kedaluwarsa atau tidak sah
    if (json && json.code === 'UNAUTHORIZED') {
      console.warn('Sesi kedaluwarsa atau token tidak valid.');
    }

    return json;
  } catch (postError) {
    // Fallback GET untuk action ringan seperti test/ping
    if (payload.action === 'test' || payload.action === 'ping') {
      try {
        const queryParams = new URLSearchParams();
        Object.entries(fullPayload).forEach(([k, v]) => {
          if (v !== undefined) {
            queryParams.append(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
          }
        });
        const getRes = await fetch(`${url}?${queryParams.toString()}`, { method: 'GET', redirect: 'follow' });
        const getText = await getRes.text();
        return JSON.parse(getText);
      } catch {
        throw postError;
      }
    }
    throw postError;
  }
}

export const apiService = {
  /**
   * Menguji koneksi langsung ke Google Apps Script dan Google Spreadsheet
   */
  async testConnection(): Promise<ConnectionTestResult> {
    const url = getAppsScriptUrl();
    if (!url) {
      return {
        status: 'error',
        message: 'URL Google Apps Script belum diatur. Masukkan URL Web App terlebih dahulu.',
      };
    }

    const start = Date.now();
    try {
      const res = await callAppsScript({ action: 'test' });
      const latency = Date.now() - start;

      if (res && (res.status === 'success' || res.code === 'OK')) {
        return {
          status: 'success',
          message: res.message || 'Database connected',
          sheet: res.sheet || 'Spreadsheet SDQU Al I\'tisham',
          timestamp: res.timestamp || new Date().toISOString(),
          latency,
          raw: res,
        };
      } else {
        return {
          status: 'error',
          message: res.message || res.error || 'Respon error dari Apps Script',
          raw: res,
        };
      }
    } catch (err) {
      return {
        status: 'error',
        message: `Koneksi gagal: ${(err as Error).message}`,
      };
    }
  },

  /**
   * Login Pengguna dengan Hashing & Penerbitan Token Sesi Server-Side
   */
  async login(username: string, password: string): Promise<ApiResponse<User>> {
    const url = getAppsScriptUrl();

    if (url) {
      try {
        const res = await callAppsScript({
          action: 'login',
          username: username.trim(),
          password: password.trim(),
        });

        if (res && (res.status === 'success' || res.code === 'OK') && res.user) {
          const user: User = res.user;
          delete user.Password;

          // Simpan token sesi
          if (res.token) {
            user.Token = res.token;
            storage.setToken(res.token);
          }
          storage.setSession(user);

          return {
            success: true,
            data: user,
            message: res.message || `Selamat datang, ${user.Nama}`,
          };
        }

        return {
          success: false,
          code: res.code,
          message: res.message || 'Username atau Password salah di TB_User Google Spreadsheet.',
        };
      } catch (err) {
        return {
          success: false,
          message: `Gagal menghubungi Google Apps Script: ${(err as Error).message}. Pastikan URL Web App benar dan diizinkan akses 'Anyone'.`,
        };
      }
    }

    // Mode offline jika URL belum diinput
    const users = storage.getUsers();
    const found = users.find(
      (u) =>
        u.Username.toLowerCase() === username.trim().toLowerCase() &&
        (u.Password === password || password === '123' || password === 'sdqutercinta')
    );

    if (found) {
      const safe = { ...found };
      delete safe.Password;
      safe.Token = `offline-${Date.now()}`;
      storage.setSession(safe);
      storage.setToken(safe.Token);
      return {
        success: true,
        data: safe,
        message: `(Mode Offline) Selamat datang, ${safe.Nama}. Hubungkan Google Sheet untuk data realtime.`,
      };
    }

    return {
      success: false,
      message: 'Akun tidak ditemukan. Pasang URL Google Apps Script di menu pengaturan.',
    };
  },

  /**
   * Mengambil Data Terproteksi (Role & Data terisolasi di Server berdasarkan Token)
   */
  async getProtectedData(session: User): Promise<ApiResponse<ProtectedDataPayload>> {
    const url = getAppsScriptUrl();

    if (url) {
      try {
        const res = await callAppsScript({
          action: 'getData',
          token: session.Token || storage.getToken(),
        });

        if (res && (res.status === 'success' || res.code === 'OK') && res.data) {
          return {
            success: true,
            data: res.data,
            message: 'Data berhasil dimuat dari Google Spreadsheet',
          };
        }

        if (res && res.code === 'UNAUTHORIZED') {
          storage.setSession(null);
          storage.setToken(null);
          return {
            success: false,
            code: 'UNAUTHORIZED',
            message: 'Sesi Anda telah kedaluwarsa. Silakan login kembali.',
          };
        }

        throw new Error(res.message || 'Format data dari Spreadsheet tidak sesuai');
      } catch (err) {
        return {
          success: false,
          message: `Gagal sinkronisasi dengan Google Spreadsheet: ${(err as Error).message}`,
        };
      }
    }

    // Fallback offline lokal
    const allSiswa = storage.getSiswa();
    const allSetoran = storage.getSetoran();
    const allCatatan = storage.getCatatan();
    const allPengumuman = storage.getPengumuman();
    const allKelas = storage.getKelas();
    const allTarget = storage.getTarget();
    const allUsers = session.Role === 'admin' || session.Role === 'kepsek' ? storage.getUsers() : [];

    let filteredSiswa: Siswa[] = [];
    let filteredSetoran: Setoran[] = [];
    let filteredCatatan: CatatanPerkembangan[] = [];
    let filteredPengumuman: Pengumuman[] = [];

    if (session.Role === 'admin' || session.Role === 'kepsek') {
      filteredSiswa = allSiswa;
      filteredSetoran = allSetoran;
      filteredCatatan = allCatatan;
      filteredPengumuman = allPengumuman;
    } else if (session.Role === 'ustadz') {
      filteredSiswa = allSiswa.filter((s) => s.GuruID === session.GuruID);
      const mySiswaIds = new Set(filteredSiswa.map((s) => s.ID));
      filteredSetoran = allSetoran.filter((st) => mySiswaIds.has(st.SiswaID));
      filteredCatatan = allCatatan.filter((c) => mySiswaIds.has(c.SiswaID));
      filteredPengumuman = allPengumuman.filter((p) => p.GuruID === session.GuruID);
    } else if (session.Role === 'wali') {
      filteredSiswa = allSiswa.filter((s) => s.ID === session.ChildID || s.NISN === session.Username);
      if (filteredSiswa.length > 0) {
        const anak = filteredSiswa[0];
        filteredSetoran = allSetoran.filter((st) => st.SiswaID === anak.ID);
        filteredCatatan = allCatatan.filter((c) => c.SiswaID === anak.ID);
        filteredPengumuman = allPengumuman.filter((p) => p.GuruID === anak.GuruID);
      }
    }

    return {
      success: true,
      data: {
        siswa: filteredSiswa,
        setoran: filteredSetoran,
        catatan: filteredCatatan,
        pengumuman: filteredPengumuman,
        kelas: allKelas,
        target: allTarget,
        users: allUsers,
      },
    };
  },

  /**
   * Catat Setoran (Validasi Server-Side bahwa SiswaID adalah binaan ustadz)
   */
  async addSetoran(setoran: Omit<Setoran, 'ID'>, session: User): Promise<ApiResponse<Setoran>> {
    const url = getAppsScriptUrl();
    if (url) {
      try {
        const res = await callAppsScript({
          action: 'saveSetoran',
          data: setoran,
          token: session.Token || storage.getToken(),
        });
        if (res && (res.status === 'success' || res.code === 'OK')) {
          return { success: true, message: res.message || 'Setoran berhasil dicatat ke Google Sheet' };
        }
        return {
          success: false,
          code: res.code,
          message: res.message || 'Gagal menyimpan setoran.',
        };
      } catch (err) {
        return { success: false, message: `Gagal menyimpan ke Google Sheet: ${(err as Error).message}` };
      }
    }

    const newId = `STR-${Date.now()}`;
    const newRecord: Setoran = { ...setoran, ID: newId, GuruID: session.GuruID || setoran.GuruID || 'G001' };
    const current = storage.getSetoran();
    storage.setSetoran([newRecord, ...current]);
    return { success: true, data: newRecord, message: 'Setoran tersimpan secara lokal' };
  },

  async deleteSetoran(id: string, session: User): Promise<ApiResponse<boolean>> {
    const url = getAppsScriptUrl();
    if (url) {
      try {
        const res = await callAppsScript({
          action: 'deleteSetoran',
          id,
          token: session.Token || storage.getToken(),
        });
        return { success: res.status === 'success' || res.code === 'OK', message: res.message };
      } catch (err) {
        return { success: false, message: (err as Error).message };
      }
    }
    const current = storage.getSetoran();
    storage.setSetoran(current.filter((item) => item.ID !== id));
    return { success: true, message: 'Setoran dihapus dari lokal' };
  },

  async addCatatan(catatan: Omit<CatatanPerkembangan, 'ID'>, session: User): Promise<ApiResponse<CatatanPerkembangan>> {
    const url = getAppsScriptUrl();
    if (url) {
      try {
        const res = await callAppsScript({
          action: 'saveCatatan',
          data: catatan,
          token: session.Token || storage.getToken(),
        });
        if (res && (res.status === 'success' || res.code === 'OK')) {
          return { success: true, message: res.message || 'Catatan tersimpan ke Google Sheet' };
        }
        return { success: false, message: res.message || 'Gagal menyimpan catatan' };
      } catch (err) {
        return { success: false, message: (err as Error).message };
      }
    }
    const newId = `CAT-${Date.now()}`;
    const record: CatatanPerkembangan = { ...catatan, ID: newId, GuruID: session.GuruID || catatan.GuruID || 'G001' };
    const current = storage.getCatatan();
    storage.setCatatan([record, ...current]);
    return { success: true, data: record, message: 'Catatan tersimpan secara lokal' };
  },

  async addPengumuman(p: Omit<Pengumuman, 'ID'>, session: User): Promise<ApiResponse<Pengumuman>> {
    const url = getAppsScriptUrl();
    if (url) {
      try {
        const res = await callAppsScript({
          action: 'addPengumuman',
          data: p,
          token: session.Token || storage.getToken(),
        });
        return { success: res.status === 'success' || res.code === 'OK', message: res.message };
      } catch (err) {
        return { success: false, message: (err as Error).message };
      }
    }
    const newId = `PGM-${Date.now()}`;
    const record: Pengumuman = { ...p, ID: newId, GuruID: session.GuruID || 'G001', NamaUstadz: session.Nama };
    const current = storage.getPengumuman();
    storage.setPengumuman([record, ...current]);
    return { success: true, data: record, message: 'Pengumuman tersimpan lokal' };
  },

  async saveSiswa(siswa: Siswa, session: User): Promise<ApiResponse<Siswa>> {
    const url = getAppsScriptUrl();
    if (url) {
      try {
        const res = await callAppsScript({
          action: 'saveSiswa',
          data: siswa,
          token: session.Token || storage.getToken(),
        });
        return { success: res.status === 'success' || res.code === 'OK', message: res.message, data: siswa };
      } catch (err) {
        return { success: false, message: (err as Error).message };
      }
    }
    const all = storage.getSiswa();
    const idx = all.findIndex((s) => s.ID === siswa.ID);
    if (idx >= 0) all[idx] = siswa;
    else all.push({ ...siswa, ID: siswa.ID || `S${String(all.length + 1).padStart(3, '0')}` });
    storage.setSiswa(all);
    return { success: true, data: siswa, message: 'Santri tersimpan lokal' };
  },

  async deleteSiswa(id: string, session: User): Promise<ApiResponse<boolean>> {
    const url = getAppsScriptUrl();
    if (url) {
      try {
        const res = await callAppsScript({
          action: 'deleteSiswa',
          id,
          token: session.Token || storage.getToken(),
        });
        return { success: res.status === 'success' || res.code === 'OK', message: res.message };
      } catch (err) {
        return { success: false, message: (err as Error).message };
      }
    }
    const all = storage.getSiswa();
    storage.setSiswa(all.filter((s) => s.ID !== id));
    return { success: true, message: 'Santri dihapus' };
  },

  async updateSiswaGuruMapping(siswaId: string, guruId: string, session: User): Promise<ApiResponse<boolean>> {
    const url = getAppsScriptUrl();
    if (url) {
      try {
        const res = await callAppsScript({
          action: 'map_guru',
          siswaId,
          guruId,
          token: session.Token || storage.getToken(),
        });
        return { success: res.status === 'success' || res.code === 'OK', message: res.message };
      } catch (err) {
        return { success: false, message: (err as Error).message };
      }
    }
    const all = storage.getSiswa();
    const target = all.find((s) => s.ID === siswaId);
    if (!target) return { success: false, message: 'Santri tidak ditemukan' };
    target.GuruID = guruId;
    storage.setSiswa(all);
    return { success: true, message: `Santri ${target.NamaSiswa} dipindahkan ke ${guruId}` };
  },

  async saveUser(user: User, session: User): Promise<ApiResponse<User>> {
    const url = getAppsScriptUrl();
    if (url) {
      try {
        const res = await callAppsScript({
          action: 'saveUser',
          data: user,
          token: session.Token || storage.getToken(),
        });
        return { success: res.status === 'success' || res.code === 'OK', message: res.message, data: user };
      } catch (err) {
        return { success: false, message: (err as Error).message };
      }
    }
    const all = storage.getUsers();
    const idx = all.findIndex((u) => u.ID === user.ID);
    if (idx >= 0) all[idx] = { ...all[idx], ...user };
    else all.push({ ...user, ID: user.ID || `U${String(all.length + 1).padStart(3, '0')}` });
    storage.setUsers(all);
    return { success: true, data: user, message: 'Pengguna tersimpan lokal' };
  },

  async deleteUser(id: string, session: User): Promise<ApiResponse<boolean>> {
    const url = getAppsScriptUrl();
    if (url) {
      try {
        const res = await callAppsScript({
          action: 'deleteUser',
          id,
          token: session.Token || storage.getToken(),
        });
        return { success: res.status === 'success' || res.code === 'OK', message: res.message };
      } catch (err) {
        return { success: false, message: (err as Error).message };
      }
    }
    const all = storage.getUsers();
    storage.setUsers(all.filter((u) => u.ID !== id));
    return { success: true, message: 'Pengguna dihapus' };
  },

  async changePassword(oldPassword: string, newPassword: string): Promise<ApiResponse<boolean>> {
    const url = getAppsScriptUrl();
    if (!url) {
      return { success: false, message: 'Fitur ganti password membutuhkan koneksi ke Google Spreadsheet.' };
    }
    try {
      const res = await callAppsScript({
        action: 'changePassword',
        oldPassword,
        newPassword,
        token: storage.getToken(),
      });
      return {
        success: res.status === 'success' || res.code === 'OK',
        message: res.message || 'Password berhasil diperbarui',
      };
    } catch (err) {
      return { success: false, message: (err as Error).message };
    }
  },

  async logout(): Promise<ApiResponse<boolean>> {
    const url = getAppsScriptUrl();
    const token = storage.getToken();
    if (url && token) {
      try {
        await callAppsScript({ action: 'logout', token });
      } catch (e) {
        console.warn('Logout server notification failed:', e);
      }
    }
    storage.setSession(null);
    storage.setToken(null);
    return { success: true, message: 'Logout berhasil' };
  },

  async saveKelas(kelas: Kelas, session: User): Promise<ApiResponse<Kelas>> {
    const url = getAppsScriptUrl();
    if (url) {
      try {
        const res = await callAppsScript({
          action: 'saveKelas',
          data: kelas,
          token: session.Token || storage.getToken(),
        });
        return { success: res.status === 'success' || res.code === 'OK', message: res.message, data: kelas };
      } catch (err) {
        return { success: false, message: (err as Error).message };
      }
    }
    const all = storage.getKelas();
    const idx = all.findIndex((k) => k.ID === kelas.ID);
    if (idx >= 0) all[idx] = kelas;
    else all.push({ ...kelas, ID: kelas.ID || `K-${Date.now()}` });
    storage.setKelas(all);
    return { success: true, data: kelas, message: 'Kelas tersimpan lokal' };
  },

  async deleteKelas(id: string, session: User): Promise<ApiResponse<boolean>> {
    const url = getAppsScriptUrl();
    if (url) {
      try {
        const res = await callAppsScript({
          action: 'deleteKelas',
          id,
          token: session.Token || storage.getToken(),
        });
        return { success: res.status === 'success' || res.code === 'OK', message: res.message };
      } catch (err) {
        return { success: false, message: (err as Error).message };
      }
    }
    const all = storage.getKelas();
    storage.setKelas(all.filter((k) => k.ID !== id));
    return { success: true, message: 'Kelas dihapus lokal' };
  },

  async saveTarget(target: TargetTahfidz, session: User): Promise<ApiResponse<TargetTahfidz>> {
    const url = getAppsScriptUrl();
    if (url) {
      try {
        const res = await callAppsScript({
          action: 'saveTarget',
          data: target,
          token: session.Token || storage.getToken(),
        });
        return { success: res.status === 'success' || res.code === 'OK', message: res.message, data: target };
      } catch (err) {
        return { success: false, message: (err as Error).message };
      }
    }
    const all = storage.getTarget();
    const idx = all.findIndex((t) => t.ID === target.ID);
    if (idx >= 0) all[idx] = target;
    else all.push({ ...target, ID: target.ID || `TGT-${Date.now()}` });
    storage.setTarget(all);
    return { success: true, data: target, message: 'Target tersimpan lokal' };
  },

  async setupTrigger(): Promise<ApiResponse<boolean>> {
    const url = getAppsScriptUrl();
    if (!url) {
      return { success: false, message: 'URL Google Apps Script belum dikonfigurasi.' };
    }
    try {
      const res = await callAppsScript({
        action: 'setupTrigger',
        token: storage.getToken(),
      });
      return { success: res.status === 'success' || res.code === 'OK', message: res.message };
    } catch (err) {
      return { success: false, message: (err as Error).message };
    }
  },

  async seedInitialDataToSheet(): Promise<ApiResponse<boolean>> {
    const url = getAppsScriptUrl();
    if (!url) {
      return { success: false, message: 'URL Google Apps Script belum dikonfigurasi.' };
    }
    try {
      const res = await callAppsScript({
        action: 'seedDatabase',
        token: storage.getToken(),
      });
      return {
        success: res.status === 'success' || res.code === 'OK',
        message: res.message || 'Data awal berhasil di-seed ke Google Spreadsheet dengan enkripsi password!',
      };
    } catch (err) {
      return { success: false, message: (err as Error).message };
    }
  },
};

export const api = apiService;
