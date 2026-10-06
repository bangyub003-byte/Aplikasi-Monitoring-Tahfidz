export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * SISTEM MONITORING HAFALAN AL-QUR'AN SDQU AL I'TISHAM
 * BACKEND GOOGLE APPS SCRIPT (Code.gs)
 * 
 * CARA MEMASANG:
 * 1. Buat Google Spreadsheet baru di Google Drive Anda.
 * 2. Beri nama file: "DB_HAFALAN_SDQU_AL_ITISHAM"
 * 3. Klik menu "Ekstensi" > "Apps Script".
 * 4. Hapus semua kode default dan tempelkan (paste) seluruh kode ini.
 * 5. Jalankan fungsi "initDatabase()" sekali untuk membuat semua tabel otomatis.
 * 6. Klik tombol "Deploy" (Terapkan) > "New deployment" (Deployment baru).
 * 7. Pilih tipe "Web app" (Aplikasi web).
 * 8. Konfigurasi:
 *    - Execute as: "Me" (Saya)
 *    - Who has access: "Anyone" (Siapa saja)
 * 9. Klik "Deploy", izinkan akses Google, lalu salin "Web app URL".
 * 10. Masukkan URL tersebut ke aplikasi web pada menu Pengaturan > Integrasi Google Sheet!
 */

var SPREADSHEET = SpreadsheetApp.getActiveSpreadsheet();

// Nama-nama sheet yang sesuai dengan spesifikasi
var TABLES = {
  USERS: 'TB_User',
  SISWA: 'TB_Siswa',
  KELAS: 'TB_Kelas',
  SETORAN: 'TB_Setoran',
  CATATAN: 'TB_Catatan',
  TARGET: 'TB_Target',
  PENGUMUMAN: 'TB_Pengumuman'
};

/**
 * Inisialisasi Database: Membuat semua sheet dan header kolom otomatis
 */
function initDatabase() {
  var schema = [
    { name: TABLES.USERS, headers: ['ID', 'Nama', 'Username', 'Password', 'Role', 'GuruID', 'ChildID', 'NoHP', 'Status'] },
    { name: TABLES.SISWA, headers: ['ID', 'NISN', 'Nama Siswa', 'Jenis Kelamin', 'KelasID', 'Nama Orang Tua', 'No HP Orang Tua', 'Target Juz', 'Status', 'Catatan', 'GuruID'] },
    { name: TABLES.KELAS, headers: ['ID', 'Nama Kelas', 'Tingkat', 'Wali Kelas', 'Target Juz', 'Tahun Ajaran'] },
    { name: TABLES.SETORAN, headers: ['ID', 'SiswaID', 'Tanggal', 'Jenis Setoran', 'Surat', 'Ayat Awal', 'Ayat Akhir', 'Juz', 'Kelancaran', 'Tajwid', 'Makhraj', 'Predikat', 'Catatan', 'GuruID'] },
    { name: TABLES.CATATAN, headers: ['ID', 'SiswaID', 'Tanggal', 'Kategori', 'Catatan', 'GuruID'] },
    { name: TABLES.TARGET, headers: ['ID', 'Kelas', 'Semester', 'Target Juz', 'Target Surat'] },
    { name: TABLES.PENGUMUMAN, headers: ['ID', 'GuruID', 'Judul', 'Isi', 'Tanggal'] }
  ];

  schema.forEach(function(item) {
    var sheet = SPREADSHEET.getSheetByName(item.name);
    if (!sheet) {
      sheet = SPREADSHEET.insertSheet(item.name);
      sheet.appendRow(item.headers);
      sheet.setFrozenRows(1);
      sheet.getRange(1, 1, 1, item.headers.length).setFontWeight('bold').setBackground('#065f46').setFontColor('#ffffff');
    }
  });

  Logger.log('Semua tabel database berhasil dibuat!');
}

/**
 * Handle GET Requests (Health check / Read operations)
 */
function doGet(e) {
  var action = e && e.parameter ? e.parameter.action : 'ping';
  
  if (action === 'ping') {
    return createJsonResponse({
      success: true,
      message: 'API Sistem Monitoring Hafalan SDQU Al I\\'tisham Aktif!',
      timestamp: new Date().toISOString()
    });
  }

  return doPost(e);
}

/**
 * Handle POST Requests (Login, Fetch with Security, Mutasi Data)
 */
function doPost(e) {
  try {
    var requestData = {};
    if (e && e.postData && e.postData.contents) {
      requestData = JSON.parse(e.postData.contents);
    } else if (e && e.parameter) {
      requestData = e.parameter;
    }

    var action = requestData.action;
    var userSession = requestData.userSession || {};

    switch (action) {
      case 'ping':
        return createJsonResponse({ success: true, message: 'Koneksi Berhasil' });

      case 'login':
        return handleLogin(requestData.username, requestData.password);

      case 'getData':
        // STRICT SECURITY: Backend filter berdasarkan role
        return handleGetProtectedData(userSession);

      case 'addSetoran':
        return handleAddSetoran(requestData.data, userSession);

      case 'deleteSetoran':
        return handleDeleteSetoran(requestData.id, userSession);

      case 'addCatatan':
        return handleAddCatatan(requestData.data, userSession);

      case 'addPengumuman':
        return handleAddPengumuman(requestData.data, userSession);

      case 'saveSiswa':
        return handleSaveSiswa(requestData.data, userSession);

      case 'deleteSiswa':
        return handleDeleteSiswa(requestData.id, userSession);

      case 'saveUser':
        return handleSaveUser(requestData.data, userSession);

      default:
        return createJsonResponse({ success: false, message: 'Action tidak dikenal: ' + action });
    }
  } catch (error) {
    return createJsonResponse({ success: false, error: error.toString() });
  }
}

/**
 * Format Response JSON dengan CORS Header aman
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Autentikasi Pengguna
 */
function handleLogin(username, password) {
  var users = readSheetRows(TABLES.USERS);
  var found = null;

  for (var i = 0; i < users.length; i++) {
    var u = users[i];
    if (String(u.Username).toLowerCase() === String(username).toLowerCase() && String(u.Password) === String(password)) {
      found = u;
      break;
    }
  }

  if (!found) {
    return createJsonResponse({ success: false, message: 'Username atau Password salah' });
  }

  // Sembunyikan password saat kirim ke client
  var safeUser = Object.assign({}, found);
  delete safeUser.Password;

  return createJsonResponse({
    success: true,
    user: safeUser,
    message: 'Login berhasil sebagai ' + safeUser.Role
  });
}

/**
 * STRICT SECURITY: Mengambil data yang HANYA diizinkan untuk session pengguna
 */
function handleGetProtectedData(session) {
  if (!session || !session.Role) {
    return createJsonResponse({ success: false, message: 'Akses ditolak: Sesi tidak valid' });
  }

  var role = session.Role;
  var allSiswa = readSheetRows(TABLES.SISWA);
  var allSetoran = readSheetRows(TABLES.SETORAN);
  var allCatatan = readSheetRows(TABLES.CATATAN);
  var allPengumuman = readSheetRows(TABLES.PENGUMUMAN);
  var allKelas = readSheetRows(TABLES.KELAS);
  var allUsers = role === 'admin' || role === 'kepsek' ? readSheetRows(TABLES.USERS) : [];
  var allTarget = readSheetRows(TABLES.TARGET);

  var filteredSiswa = [];
  var filteredSetoran = [];
  var filteredCatatan = [];
  var filteredPengumuman = [];

  if (role === 'admin' || role === 'kepsek') {
    // Admin dan Kepsek dapat melihat semua data siswa & setoran sekolah
    filteredSiswa = allSiswa;
    filteredSetoran = allSetoran;
    filteredCatatan = allCatatan;
    filteredPengumuman = allPengumuman;
  } 
  else if (role === 'ustadz') {
    // KEAMANAN USTADZ: HANYA santri dengan GuruID miliknya
    var myGuruId = session.GuruID;
    filteredSiswa = allSiswa.filter(function(s) { return String(s.GuruID) === String(myGuruId); });
    
    var mySiswaIds = filteredSiswa.map(function(s) { return String(s.ID); });
    filteredSetoran = allSetoran.filter(function(st) { return mySiswaIds.indexOf(String(st.SiswaID)) !== -1; });
    filteredCatatan = allCatatan.filter(function(c) { return mySiswaIds.indexOf(String(c.SiswaID)) !== -1; });
    
    // Pengumuman yang dibuat oleh ustadz ini
    filteredPengumuman = allPengumuman.filter(function(p) { return String(p.GuruID) === String(myGuruId); });
  } 
  else if (role === 'wali') {
    // KEAMANAN WALI: HANYA 1 anak miliknya (ChildID / NISN)
    var myChildId = session.ChildID;
    var myUsername = session.Username; // NISN

    filteredSiswa = allSiswa.filter(function(s) {
      return String(s.ID) === String(myChildId) || String(s.NISN) === String(myUsername);
    });

    if (filteredSiswa.length > 0) {
      var child = filteredSiswa[0];
      filteredSetoran = allSetoran.filter(function(st) { return String(st.SiswaID) === String(child.ID); });
      filteredCatatan = allCatatan.filter(function(c) { return String(c.SiswaID) === String(child.ID); });
      // Pengumuman HANYA dari ustadz pengampu anaknya
      filteredPengumuman = allPengumuman.filter(function(p) { return String(p.GuruID) === String(child.GuruID); });
    }
  }

  // Sembunyikan password jika ada user list
  var safeUsers = allUsers.map(function(u) {
    var copy = Object.assign({}, u);
    delete copy.Password;
    return copy;
  });

  return createJsonResponse({
    success: true,
    data: {
      siswa: filteredSiswa,
      setoran: filteredSetoran,
      catatan: filteredCatatan,
      pengumuman: filteredPengumuman,
      kelas: allKelas,
      target: allTarget,
      users: safeUsers
    }
  });
}

function handleAddSetoran(data, session) {
  if (session.Role !== 'ustadz' && session.Role !== 'admin') {
    return createJsonResponse({ success: false, message: 'Hanya ustadz atau admin yang dapat mencatat setoran' });
  }
  var sheet = SPREADSHEET.getSheetByName(TABLES.SETORAN);
  var id = 'STR-' + new Date().getTime();
  sheet.appendRow([
    id,
    data.SiswaID,
    data.Tanggal || Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd'),
    data.JenisSetoran,
    data.Surat,
    data.AyatAwal,
    data.AyatAkhir,
    data.Juz,
    data.Kelancaran,
    data.Tajwid,
    data.Makhraj,
    data.Predikat,
    data.Catatan || '',
    session.GuruID || data.GuruID || ''
  ]);
  return createJsonResponse({ success: true, message: 'Setoran berhasil dicatat', id: id });
}

function handleAddCatatan(data, session) {
  var sheet = SPREADSHEET.getSheetByName(TABLES.CATATAN);
  var id = 'CAT-' + new Date().getTime();
  sheet.appendRow([
    id,
    data.SiswaID,
    data.Tanggal || Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd'),
    data.Kategori,
    data.Catatan,
    session.GuruID || data.GuruID || ''
  ]);
  return createJsonResponse({ success: true, message: 'Catatan perkembangan tersimpan', id: id });
}

function handleAddPengumuman(data, session) {
  var sheet = SPREADSHEET.getSheetByName(TABLES.PENGUMUMAN);
  var id = 'PGM-' + new Date().getTime();
  sheet.appendRow([
    id,
    session.GuruID || 'G001',
    data.Judul,
    data.Isi,
    data.Tanggal || Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd')
  ]);
  return createJsonResponse({ success: true, message: 'Pengumuman halaqah berhasil dipublikasikan', id: id });
}

function handleSaveSiswa(data, session) {
  if (session.Role !== 'admin') {
    return createJsonResponse({ success: false, message: 'Hanya admin yang dapat mengelola data santri' });
  }
  var sheet = SPREADSHEET.getSheetByName(TABLES.SISWA);
  var id = data.ID || ('S' + ('000' + (sheet.getLastRow())).slice(-3));
  sheet.appendRow([
    id,
    data.NISN,
    data.NamaSiswa,
    data.JenisKelamin,
    data.KelasID,
    data.NamaOrangTua,
    data.NoHPOrangTua,
    data.TargetJuz,
    data.Status || 'Aktif',
    data.Catatan || '',
    data.GuruID
  ]);
  return createJsonResponse({ success: true, message: 'Data santri berhasil disimpan' });
}

function handleDeleteSetoran(id, session) {
  var sheet = SPREADSHEET.getSheetByName(TABLES.SETORAN);
  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);
      return createJsonResponse({ success: true, message: 'Setoran berhasil dihapus' });
    }
  }
  return createJsonResponse({ success: false, message: 'Data setoran tidak ditemukan' });
}

function handleDeleteSiswa(id, session) {
  if (session.Role !== 'admin') {
    return createJsonResponse({ success: false, message: 'Hanya admin yang dapat menghapus santri' });
  }
  var sheet = SPREADSHEET.getSheetByName(TABLES.SISWA);
  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);
      return createJsonResponse({ success: true, message: 'Santri berhasil dihapus' });
    }
  }
  return createJsonResponse({ success: false, message: 'Santri tidak ditemukan' });
}

function handleSaveUser(data, session) {
  if (session.Role !== 'admin') {
    return createJsonResponse({ success: false, message: 'Hanya admin yang dapat mengelola pengguna' });
  }
  var sheet = SPREADSHEET.getSheetByName(TABLES.USERS);
  sheet.appendRow([
    data.ID,
    data.Nama,
    data.Username,
    data.Password || '123',
    data.Role,
    data.GuruID || '',
    data.ChildID || '',
    data.NoHP || '',
    data.Status || 'Aktif'
  ]);
  return createJsonResponse({ success: true, message: 'Pengguna berhasil disimpan' });
}

/**
 * Utility Membaca Baris Sheet Menjadi Array of Object
 */
function readSheetRows(sheetName) {
  var sheet = SPREADSHEET.getSheetByName(sheetName);
  if (!sheet) return [];
  var values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];

  var headers = values[0];
  var results = [];

  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    var obj = {};
    for (var c = 0; c < headers.length; c++) {
      var headerKey = String(headers[c]).replace(/\\s+/g, '');
      obj[headerKey] = row[c];
    }
    results.push(obj);
  }
  return results;
}
`;
