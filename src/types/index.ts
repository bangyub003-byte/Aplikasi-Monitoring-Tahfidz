export type Role = 'admin' | 'ustadz' | 'wali' | 'kepsek';

export interface User {
  ID: string;
  Nama: string;
  Username: string;
  Password?: string;
  Role: Role;
  GuruID?: string; // G001, G002, etc. (for ustadz)
  ChildID?: string; // S001, S002, etc. (for wali)
  NoHP: string;
  Status: 'Aktif' | 'Nonaktif';
}

export interface Siswa {
  ID: string;
  NISN: string;
  NamaSiswa: string;
  JenisKelamin: 'L' | 'P';
  KelasID: string;
  NamaOrangTua: string;
  NoHPOrangTua: string;
  TargetJuz: number; // e.g., 2, 3, 5
  Status: 'Aktif' | 'Nonaktif';
  Catatan: string;
  GuruID: string; // Key mapping to ustadz
}

export interface Kelas {
  ID: string;
  NamaKelas: string;
  Tingkat: number;
  WaliKelas: string;
  TargetJuz: number;
  TahunAjaran: string;
}

export type JenisSetoran = 'Ziyadah' | 'Murojaah' | 'Tasmi' | 'Ujian Tahfidz';
export type Kelancaran = 'Lancar Sekali' | 'Lancar' | 'Cukup' | 'Kurang';
export type Tajwid = 'Mumtaz (A)' | 'Jayyid Jiddan (B+)' | 'Jayyid (B)' | 'Maqbul (C)';
export type Makhraj = 'Fasih' | 'Cukup Fasih' | 'Perlu Bimbingan';
export type Predikat = 'Mumtaz' | 'Jayyid Jiddan' | 'Jayyid' | 'Maqbul';

export interface Setoran {
  ID: string;
  SiswaID: string;
  Tanggal: string; // YYYY-MM-DD
  JenisSetoran: JenisSetoran;
  Surat: string;
  AyatAwal: number;
  AyatAkhir: number;
  Juz: number;
  Kelancaran: Kelancaran;
  Tajwid: Tajwid;
  Makhraj: Makhraj;
  Predikat: Predikat;
  Catatan?: string;
  GuruID: string;
}

export interface CatatanPerkembangan {
  ID: string;
  SiswaID: string;
  Tanggal: string;
  Kategori: 'Adab & Disiplin' | 'Tajwid & Makhraj' | 'Motivasi' | 'Evaluasi Umum';
  Catatan: string;
  GuruID: string;
}

export interface TargetTahfidz {
  ID: string;
  Kelas: string;
  Semester: 'Ganjil' | 'Genap';
  TargetJuz: number;
  TargetSurat: string;
}

export interface Pengumuman {
  ID: string;
  GuruID: string;
  Judul: string;
  Isi: string;
  Tanggal: string;
  NamaUstadz?: string;
}

export interface SurahItem {
  number: number;
  name: string;
  latin: string;
  translation: string;
  numberOfVerses: number;
  defaultJuz: number;
}
