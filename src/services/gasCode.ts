export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * =========================================================================
 * SISTEM MONITORING HAFALAN AL-QUR'AN SDQU AL I'TISHAM
 * BACKEND GOOGLE APPS SCRIPT (Code.gs) - PRODUCTION SECURITY HARDENED
 * =========================================================================
 * 
 * FITUR KEAMANAN & INTEGRITAS TERBARU:
 * 1. Token Sesi Terenkripsi (6 Jam TTL via CacheService & PropertiesService)
 * 2. Proteksi Pemalsuan Parameter: Role, GuruID, ChildID HANYA dibaca dari Token
 * 3. Validasi Duplikasi: NISN Siswa Unik & Username Akun Unik (code: DUPLICATE)
 * 4. Peniadaan Default 'G001': Validasi ketat GuruID wajib diisi
 * 5. Hash Password SHA-256 + Salt Konsisten (Variabel salt tunggal, bebas plaintext)
 * 6. Password Wajib untuk Akun Baru (Tanpa fallback '123')
 * 7. Soft Delete Santri jika Memiliki Riwayat Setoran (Status diubah 'Nonaktif')
 * 8. CRUD Kelas (saveKelas, deleteKelas dengan validasi santri aktif) & saveTarget
 * 9. Action Logout & Pembersihan Token Otomatis (cleanupExpiredTokens & setupTrigger)
 * 10. Concurrency Safety: LockService.getScriptLock() pada setiap operasi tulis
 * 11. Normalisasi Header: replace(/\\s+/g, '') & Kolom Password tidak dikembalikan
 */

var SPREADSHEET = SpreadsheetApp.getActiveSpreadsheet();
var TOKEN_TTL_SECONDS = 21600; // 6 Jam (6 * 3600 detik)

var TABLES = {
  USERS: 'TB_User',
  SISWA: 'TB_Siswa',
  KELAS: 'TB_Kelas',
  SETORAN: 'TB_Setoran',
  CATATAN: 'TB_Catatan',
  TARGET: 'TB_Target',
  PENGUMUMAN: 'TB_Pengumuman'
};

// =========================================================================
// 1. ENTRY POINT (doGet & doPost)
// =========================================================================

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? String(e.parameter.action).trim() : 'test';
  return routeAction(action, e ? e.parameter : {});
}

function doPost(e) {
  var data = {};
  if (e && e.postData && e.postData.contents) {
    try {
      data = JSON.parse(e.postData.contents);
    } catch (err) {
      data = e.parameter || {};
    }
  } else if (e && e.parameter) {
    data = e.parameter;
  }

  var action = data.action || (e && e.parameter ? e.parameter.action : 'test');
  return routeAction(String(action).trim(), data);
}

// =========================================================================
// 2. ROUTER & MIDDLEWARE AUTORISASI
// =========================================================================

function routeAction(action, data) {
  try {
    // Action Publik (Tanpa Token)
    if (action === 'test' || action === 'ping') {
      return createJsonResponse({
        status: 'success',
        code: 'OK',
        message: 'Database connected',
        sheet: SPREADSHEET.getName(),
        timestamp: Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd HH:mm:ss')
      });
    }

    if (action === 'login') {
      return handleLogin(data.username, data.password);
    }

    // Action Logout (Menghapus Token Sesi)
    if (action === 'logout') {
      return handleLogout(data.token);
    }

    // Seluruh action lain WAJIB memiliki token sesi yang valid
    var token = String(data.token || '').trim();
    var session = validateToken(token);

    if (!session) {
      return createJsonResponse({
        status: 'error',
        code: 'UNAUTHORIZED',
        message: 'Akses ditolak: Token sesi tidak valid atau telah kedaluwarsa. Silakan login kembali.'
      });
    }

    var role = session.role;

    switch (action) {
      // Pembacaan Data Terproteksi
      case 'getData':
        return handleGetProtectedData(session);

      case 'getStudents':
        return handleGetStudents(session);

      case 'getStudentById':
        return handleGetStudentById(data.id || data.siswaId, session);

      case 'getUsers':
        if (role !== 'admin' && role !== 'kepsek') {
          return createForbiddenResponse('Hanya Administrator dan Kepala Sekolah yang dapat melihat daftar pengguna.');
        }
        return handleGetUsers();

      case 'getPengumuman':
        return handleGetPengumuman(session);

      // Mutasi Setoran (Hanya Ustadz & Admin)
      case 'saveSetoran':
      case 'addSetoran':
        if (role !== 'ustadz' && role !== 'admin') {
          return createForbiddenResponse('Hanya Ustadz pembimbing halaqah atau Admin yang dapat mencatat setoran.');
        }
        return handleSaveSetoran(data.data || data, session);

      case 'deleteSetoran':
        if (role !== 'ustadz' && role !== 'admin') {
          return createForbiddenResponse('Hanya Ustadz pembimbing atau Admin yang dapat menghapus setoran.');
        }
        return handleDeleteSetoran(data.id, session);

      // Catatan Perkembangan (Hanya Ustadz & Admin)
      case 'saveCatatan':
      case 'addCatatan':
        if (role !== 'ustadz' && role !== 'admin') {
          return createForbiddenResponse('Hanya Ustadz atau Admin yang dapat menambah catatan santri.');
        }
        return handleSaveCatatan(data.data || data, session);

      // Pengumuman Halaqah (Hanya Ustadz & Admin)
      case 'addPengumuman':
        if (role !== 'ustadz' && role !== 'admin') {
          return createForbiddenResponse('Hanya Ustadz pembimbing yang dapat mempublikasikan pengumuman halaqah.');
        }
        return handleAddPengumuman(data.data || data, session);

      // Ganti Password Pribadi
      case 'changePassword':
        return handleChangePassword(data.oldPassword, data.newPassword, session);

      // Khusus Administrator Saja
      case 'map_guru':
        if (role !== 'admin') {
          return createForbiddenResponse('Hanya Administrator yang memiliki wewenang memetakan santri ke ustadz.');
        }
        return handleMapGuru(data.siswaId, data.guruId);

      case 'saveSiswa':
        if (role !== 'admin') {
          return createForbiddenResponse('Hanya Administrator yang dapat menambah atau mengubah data santri.');
        }
        return handleSaveSiswa(data.data || data);

      case 'deleteSiswa':
        if (role !== 'admin') {
          return createForbiddenResponse('Hanya Administrator yang dapat menghapus data santri.');
        }
        return handleDeleteSiswa(data.id);

      case 'saveUser':
        if (role !== 'admin') {
          return createForbiddenResponse('Hanya Administrator yang dapat mengelola data pengguna.');
        }
        return handleSaveUser(data.data || data);

      case 'deleteUser':
        if (role !== 'admin') {
          return createForbiddenResponse('Hanya Administrator yang dapat menghapus akun pengguna.');
        }
        return handleDeleteUser(data.id);

      case 'saveKelas':
        if (role !== 'admin') {
          return createForbiddenResponse('Hanya Administrator yang dapat mengelola data kelas.');
        }
        return handleSaveKelas(data.data || data);

      case 'deleteKelas':
        if (role !== 'admin') {
          return createForbiddenResponse('Hanya Administrator yang dapat menghapus kelas.');
        }
        return handleDeleteKelas(data.id);

      case 'saveTarget':
        if (role !== 'admin') {
          return createForbiddenResponse('Hanya Administrator yang dapat mengatur target tahfidz.');
        }
        return handleSaveTarget(data.data || data);

      case 'setupTrigger':
        if (role !== 'admin') {
          return createForbiddenResponse('Hanya Administrator yang dapat mengonfigurasi trigger pembersihan sistem.');
        }
        return setupTrigger();

      case 'seedDatabase':
        if (role !== 'admin') {
          return createForbiddenResponse('Hanya Administrator yang dapat menjalankan seed data awal.');
        }
        return handleSeedDatabase();

      default:
        return createJsonResponse({
          status: 'error',
          code: 'BAD_REQUEST',
          message: 'Action tidak dikenal: ' + action
        });
    }
  } catch (error) {
    return createJsonResponse({
      status: 'error',
      code: 'SERVER_ERROR',
      message: 'Kesalahan internal server: ' + error.toString()
    });
  }
}

// =========================================================================
// 3. MANAJEMEN TOKEN SESI (CacheService & PropertiesService)
// =========================================================================

function createSessionToken(userRecord) {
  var token = Utilities.getUuid();
  var sessionData = {
    userId: String(userRecord.ID || '').trim(),
    username: String(userRecord.Username || '').trim(),
    role: String(userRecord.Role || '').trim().toLowerCase(),
    guruId: String(userRecord.GuruID || '').trim(),
    childId: String(userRecord.ChildID || '').trim(),
    nama: String(userRecord.Nama || '').trim(),
    createdAt: Date.now()
  };

  var cache = CacheService.getScriptCache();
  cache.put('sess_' + token, JSON.stringify(sessionData), TOKEN_TTL_SECONDS);

  var props = PropertiesService.getScriptProperties();
  props.setProperty('tok_' + token, JSON.stringify({
    data: sessionData,
    exp: Date.now() + (TOKEN_TTL_SECONDS * 1000)
  }));

  return token;
}

function validateToken(token) {
  if (!token) return null;
  var cleanToken = String(token).trim();

  var cache = CacheService.getScriptCache();
  var cached = cache.get('sess_' + cleanToken);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {}
  }

  var props = PropertiesService.getScriptProperties();
  var propRaw = props.getProperty('tok_' + cleanToken);
  if (propRaw) {
    try {
      var item = JSON.parse(propRaw);
      if (item && item.exp > Date.now()) {
        cache.put('sess_' + cleanToken, JSON.stringify(item.data), TOKEN_TTL_SECONDS);
        return item.data;
      } else {
        props.deleteProperty('tok_' + cleanToken);
      }
    } catch (e) {}
  }

  return null;
}

function handleLogout(token) {
  if (token) {
    var cleanToken = String(token).trim();
    var cache = CacheService.getScriptCache();
    cache.remove('sess_' + cleanToken);

    var props = PropertiesService.getScriptProperties();
    props.deleteProperty('tok_' + cleanToken);
  }

  return createJsonResponse({
    status: 'success',
    code: 'OK',
    message: 'Logout berhasil, sesi telah dihapus.'
  });
}

function cleanupExpiredTokens() {
  var props = PropertiesService.getScriptProperties();
  var allProps = props.getProperties();
  var now = Date.now();
  var deletedCount = 0;

  for (var key in allProps) {
    if (key.indexOf('tok_') === 0) {
      try {
        var item = JSON.parse(allProps[key]);
        if (item && item.exp && item.exp < now) {
          props.deleteProperty(key);
          deletedCount++;
        }
      } catch (e) {
        props.deleteProperty(key);
        deletedCount++;
      }
    }
  }

  Logger.log('cleanupExpiredTokens: Berhasil menghapus ' + deletedCount + ' token kedaluwarsa.');
  return deletedCount;
}

function setupTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'cleanupExpiredTokens') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  ScriptApp.newTrigger('cleanupExpiredTokens')
    .timeBased()
    .everyDays(1)
    .atHour(2)
    .create();

  Logger.log('Trigger harian cleanupExpiredTokens dipasang setiap jam 02:00.');
  return createJsonResponse({
    status: 'success',
    code: 'OK',
    message: 'Trigger harian cleanupExpiredTokens berhasil dipasang pada pukul 02:00.'
  });
}

// =========================================================================
// 4. HASHING PASSWORD (SHA-256 + Salt Acak)
// =========================================================================

function hashPassword(password, salt) {
  var rawBytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    salt + ':' + password,
    Utilities.Charset.UTF_8
  );
  var hex = '';
  for (var i = 0; i < rawBytes.length; i++) {
    var b = rawBytes[i];
    if (b < 0) b += 256;
    var str = b.toString(16);
    if (str.length === 1) str = '0' + str;
    hex += str;
  }
  return hex;
}

function verifyPassword(inputPassword, storedPasswordHash, rowNumber) {
  if (!storedPasswordHash) return false;
  var stored = String(storedPasswordHash).trim();

  // Format Standar: SALT$HASH
  if (stored.indexOf('$') !== -1) {
    var parts = stored.split('$');
    var salt = parts[0];
    var hash = parts[1];
    var computed = hashPassword(inputPassword, salt);
    return computed === hash;
  }

  // Auto-Migration: Jika data lama masih Plaintext
  if (stored === String(inputPassword).trim()) {
    try {
      var newSalt = Utilities.getUuid().substring(0, 8);
      var newHash = hashPassword(inputPassword, newSalt);
      var secureVal = newSalt + '$' + newHash;
      var sheet = SPREADSHEET.getSheetByName(TABLES.USERS);
      if (sheet && rowNumber) {
        sheet.getRange(rowNumber, 4).setValue(secureVal);
      }
    } catch (migErr) {
      Logger.log('Auto-migration error: ' + migErr);
    }
    return true;
  }

  return false;
}

// =========================================================================
// 5. AUTENTIKASI PENGGUNA (LOGIN & CHANGE PASSWORD)
// =========================================================================

function handleLogin(username, password) {
  if (!username || !password) {
    return createJsonResponse({
      status: 'error',
      code: 'BAD_REQUEST',
      message: 'Username dan password wajib diisi.'
    });
  }

  var usersSheet = SPREADSHEET.getSheetByName(TABLES.USERS);
  if (!usersSheet) {
    return createJsonResponse({ status: 'error', code: 'SERVER_ERROR', message: 'Tabel TB_User belum dibuat.' });
  }

  var values = usersSheet.getDataRange().getValues();
  if (values.length <= 1) {
    return createJsonResponse({ status: 'error', code: 'UNAUTHORIZED', message: 'Belum ada pengguna terdaftar di sistem.' });
  }

  var cleanUsername = String(username).trim().toLowerCase();
  var cleanPassword = String(password).trim();
  var foundUser = null;

  for (var i = 1; i < values.length; i++) {
    var rowUser = String(values[i][2] || '').trim().toLowerCase();
    if (rowUser === cleanUsername) {
      var storedPass = values[i][3];
      if (verifyPassword(cleanPassword, storedPass, i + 1)) {
        foundUser = {
          ID: String(values[i][0]).trim(),
          Nama: String(values[i][1]).trim(),
          Username: String(values[i][2]).trim(),
          Role: String(values[i][4]).trim().toLowerCase(),
          GuruID: String(values[i][5] || '').trim(),
          ChildID: String(values[i][6] || '').trim(),
          NoHP: String(values[i][7] || '').trim(),
          Status: String(values[i][8] || 'Aktif').trim()
        };
        break;
      }
    }
  }

  if (!foundUser) {
    return createJsonResponse({
      status: 'error',
      code: 'UNAUTHORIZED',
      message: 'Username atau Password salah. Periksa kembali NISN atau Username Anda.'
    });
  }

  if (foundUser.Status === 'Nonaktif') {
    return createJsonResponse({
      status: 'error',
      code: 'FORBIDDEN',
      message: 'Akun Anda sedang dinonaktifkan oleh Administrator.'
    });
  }

  var token = createSessionToken(foundUser);

  return createJsonResponse({
    status: 'success',
    code: 'OK',
    token: token,
    user: foundUser,
    message: 'Login berhasil sebagai ' + foundUser.Role
  });
}

function handleChangePassword(oldPassword, newPassword, session) {
  if (!oldPassword || !newPassword) {
    return createJsonResponse({ status: 'error', code: 'BAD_REQUEST', message: 'Password lama dan baru wajib diisi.' });
  }
  if (String(newPassword).length < 4) {
    return createJsonResponse({ status: 'error', code: 'BAD_REQUEST', message: 'Password baru minimal 4 karakter.' });
  }

  var sheet = SPREADSHEET.getSheetByName(TABLES.USERS);
  var values = sheet.getDataRange().getValues();
  var rowIdx = -1;
  var currentStoredPass = '';

  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0]).trim() === session.userId) {
      rowIdx = i + 1;
      currentStoredPass = values[i][3];
      break;
    }
  }

  if (rowIdx === -1) {
    return createJsonResponse({ status: 'error', code: 'NOT_FOUND', message: 'Data pengguna tidak ditemukan.' });
  }

  if (!verifyPassword(oldPassword, currentStoredPass, null)) {
    return createJsonResponse({ status: 'error', code: 'UNAUTHORIZED', message: 'Password lama Anda tidak cocok.' });
  }

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var newSalt = Utilities.getUuid().substring(0, 8);
    var newHash = hashPassword(newPassword, newSalt);
    sheet.getRange(rowIdx, 4).setValue(newSalt + '$' + newHash);

    return createJsonResponse({
      status: 'success',
      code: 'OK',
      message: 'Password berhasil diperbarui dengan enkripsi SHA-256.'
    });
  } finally {
    lock.releaseLock();
  }
}

// =========================================================================
// 6. ISOLASI DATA SERVER-SIDE & RBAC LENGKAP
// =========================================================================

function handleGetProtectedData(session) {
  var role = session.role;
  var allSiswa = readSheetRows(TABLES.SISWA);
  var allSetoran = readSheetRows(TABLES.SETORAN);
  var allCatatan = readSheetRows(TABLES.CATATAN);
  var allPengumuman = readSheetRows(TABLES.PENGUMUMAN);
  var allKelas = readSheetRows(TABLES.KELAS);
  var allTarget = readSheetRows(TABLES.TARGET);
  var allUsers = (role === 'admin' || role === 'kepsek') ? readSheetRows(TABLES.USERS) : [];

  var filteredSiswa = [];
  var filteredSetoran = [];
  var filteredCatatan = [];
  var filteredPengumuman = [];

  if (role === 'admin' || role === 'kepsek') {
    filteredSiswa = allSiswa;
    filteredSetoran = allSetoran;
    filteredCatatan = allCatatan;
    filteredPengumuman = allPengumuman;
  }
  else if (role === 'ustadz') {
    var myGuruId = session.guruId;
    filteredSiswa = allSiswa.filter(function(s) {
      return String(s.GuruID).trim() === myGuruId;
    });

    var mySiswaIds = filteredSiswa.map(function(s) { return String(s.ID).trim(); });
    filteredSetoran = allSetoran.filter(function(st) {
      return mySiswaIds.indexOf(String(st.SiswaID).trim()) !== -1;
    });
    filteredCatatan = allCatatan.filter(function(c) {
      return mySiswaIds.indexOf(String(c.SiswaID).trim()) !== -1;
    });
    filteredPengumuman = allPengumuman.filter(function(p) {
      return String(p.GuruID).trim() === myGuruId;
    });
  }
  else if (role === 'wali') {
    var myChildId = session.childId;
    var myUsername = session.username;

    filteredSiswa = allSiswa.filter(function(s) {
      return (myChildId && String(s.ID).trim() === myChildId) ||
             (myUsername && String(s.NISN).trim() === myUsername);
    });

    if (filteredSiswa.length > 0) {
      var child = filteredSiswa[0];
      var childIdStr = String(child.ID).trim();
      var childGuruId = String(child.GuruID).trim();

      filteredSetoran = allSetoran.filter(function(st) {
        return String(st.SiswaID).trim() === childIdStr;
      });
      filteredCatatan = allCatatan.filter(function(c) {
        return String(c.SiswaID).trim() === childIdStr;
      });
      filteredPengumuman = allPengumuman.filter(function(p) {
        return String(p.GuruID).trim() === childGuruId;
      });
    }
  }

  var safeUsers = allUsers.map(function(u) {
    var copy = Object.assign({}, u);
    delete copy.Password;
    return copy;
  });

  return createJsonResponse({
    status: 'success',
    code: 'OK',
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

function handleGetStudents(session) {
  var allSiswa = readSheetRows(TABLES.SISWA);
  var role = session.role;

  if (role === 'admin' || role === 'kepsek') {
    return createJsonResponse({ status: 'success', code: 'OK', data: allSiswa });
  } else if (role === 'ustadz') {
    var ustadzSiswa = allSiswa.filter(function(s) {
      return String(s.GuruID).trim() === session.guruId;
    });
    return createJsonResponse({ status: 'success', code: 'OK', data: ustadzSiswa });
  } else if (role === 'wali') {
    var child = allSiswa.filter(function(s) {
      return (session.childId && String(s.ID).trim() === session.childId) ||
             (session.username && String(s.NISN).trim() === session.username);
    });
    return createJsonResponse({ status: 'success', code: 'OK', data: child });
  }

  return createJsonResponse({ status: 'success', code: 'OK', data: [] });
}

function handleGetStudentById(id, session) {
  var cleanId = String(id || '').trim();
  var allSiswa = readSheetRows(TABLES.SISWA);
  var found = null;

  for (var i = 0; i < allSiswa.length; i++) {
    if (String(allSiswa[i].ID).trim() === cleanId || String(allSiswa[i].NISN).trim() === cleanId) {
      found = allSiswa[i];
      break;
    }
  }

  if (!found) {
    return createJsonResponse({ status: 'error', code: 'NOT_FOUND', message: 'Santri tidak ditemukan.' });
  }

  if (session.role === 'ustadz' && String(found.GuruID).trim() !== session.guruId) {
    return createForbiddenResponse('Santri ini bukan merupakan binaan halaqah Anda.');
  }
  if (session.role === 'wali' && String(found.ID).trim() !== session.childId && String(found.NISN).trim() !== session.username) {
    return createForbiddenResponse('Anda hanya berhak melihat data anak Anda sendiri.');
  }

  return createJsonResponse({ status: 'success', code: 'OK', data: found });
}

function handleGetPengumuman(session) {
  var list = readSheetRows(TABLES.PENGUMUMAN);
  var role = session.role;

  if (role === 'admin' || role === 'kepsek') {
    return createJsonResponse({ status: 'success', code: 'OK', data: list });
  } else if (role === 'ustadz') {
    var uList = list.filter(function(p) { return String(p.GuruID).trim() === session.guruId; });
    return createJsonResponse({ status: 'success', code: 'OK', data: uList });
  } else if (role === 'wali') {
    var allSiswa = readSheetRows(TABLES.SISWA);
    var child = allSiswa.find(function(s) {
      return (session.childId && String(s.ID).trim() === session.childId) ||
             (session.username && String(s.NISN).trim() === session.username);
    });
    if (child) {
      var gId = String(child.GuruID).trim();
      var wList = list.filter(function(p) { return String(p.GuruID).trim() === gId; });
      return createJsonResponse({ status: 'success', code: 'OK', data: wList });
    }
    return createJsonResponse({ status: 'success', code: 'OK', data: [] });
  }

  return createJsonResponse({ status: 'success', code: 'OK', data: [] });
}

function handleGetUsers() {
  var users = readSheetRows(TABLES.USERS).map(function(u) {
    var copy = Object.assign({}, u);
    delete copy.Password;
    return copy;
  });
  return createJsonResponse({ status: 'success', code: 'OK', data: users });
}

// =========================================================================
// 7. OPERASI TULIS (VALIDASI RELASI, DUPLIKASI & SOFT DELETE)
// =========================================================================

function handleSaveSetoran(data, session) {
  var cleanSiswaId = String(data.SiswaID || '').trim();
  if (!cleanSiswaId) {
    return createJsonResponse({ status: 'error', code: 'BAD_REQUEST', message: 'SiswaID wajib diisi.' });
  }

  var sheetSiswa = SPREADSHEET.getSheetByName(TABLES.SISWA);
  var allSiswaRows = sheetSiswa.getDataRange().getValues();
  var isStudentBelongsToGuru = false;
  var studentGuruId = '';

  for (var i = 1; i < allSiswaRows.length; i++) {
    if (String(allSiswaRows[i][0]).trim() === cleanSiswaId) {
      studentGuruId = String(allSiswaRows[i][10] || '').trim();
      if (session.role === 'admin' || studentGuruId === session.guruId) {
        isStudentBelongsToGuru = true;
      }
      break;
    }
  }

  if (!isStudentBelongsToGuru) {
    return createForbiddenResponse('Akses ditolak: Santri (' + cleanSiswaId + ') bukan binaan dari Ustadz ' + session.guruId + '. Anda tidak berhak mencatat setoran ini.');
  }

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    var sheet = SPREADSHEET.getSheetByName(TABLES.SETORAN);
    var id = data.ID ? String(data.ID).trim() : ('STR-' + Date.now());
    var tanggal = data.Tanggal ? String(data.Tanggal).trim() : Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd');
    var assignedGuruId = session.role === 'ustadz' ? session.guruId : studentGuruId;

    sheet.appendRow([
      id,
      cleanSiswaId,
      tanggal,
      String(data.JenisSetoran || 'Ziyadah').trim(),
      String(data.Surat || '').trim(),
      Number(data.AyatAwal || 1),
      Number(data.AyatAkhir || 1),
      Number(data.Juz || 30),
      String(data.Kelancaran || 'Lancar').trim(),
      String(data.Tajwid || 'Mumtaz (A)').trim(),
      String(data.Makhraj || 'Fasih').trim(),
      String(data.Predikat || 'Mumtaz').trim(),
      String(data.Catatan || '').trim(),
      assignedGuruId
    ]);

    return createJsonResponse({
      status: 'success',
      code: 'OK',
      message: 'Setoran berhasil dicatat dengan verifikasi integritas halaqah.',
      id: id
    });
  } finally {
    lock.releaseLock();
  }
}

function handleDeleteSetoran(id, session) {
  var cleanId = String(id || '').trim();
  var sheet = SPREADSHEET.getSheetByName(TABLES.SETORAN);
  var rows = sheet.getDataRange().getValues();

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][0]).trim() === cleanId) {
        var setoranGuruId = String(rows[i][13] || '').trim();

        if (session.role === 'ustadz' && setoranGuruId !== session.guruId) {
          return createForbiddenResponse('Anda tidak berhak menghapus setoran halaqah lain.');
        }

        sheet.deleteRow(i + 1);
        return createJsonResponse({ status: 'success', code: 'OK', message: 'Setoran berhasil dihapus.' });
      }
    }
    return createJsonResponse({ status: 'error', code: 'NOT_FOUND', message: 'Data setoran tidak ditemukan.' });
  } finally {
    lock.releaseLock();
  }
}

function handleSaveCatatan(data, session) {
  var cleanSiswaId = String(data.SiswaID || '').trim();
  var guruId = session.role === 'ustadz' ? session.guruId : String(data.GuruID || '').trim();

  // Poin 4: Tolak jika GuruID kosong
  if (!guruId) {
    return createJsonResponse({ status: 'error', code: 'BAD_REQUEST', message: 'GuruID wajib diisi.' });
  }

  var sheetSiswa = SPREADSHEET.getSheetByName(TABLES.SISWA);
  var sRows = sheetSiswa.getDataRange().getValues();
  var valid = false;

  for (var i = 1; i < sRows.length; i++) {
    if (String(sRows[i][0]).trim() === cleanSiswaId) {
      if (session.role === 'admin' || String(sRows[i][10]).trim() === session.guruId) {
        valid = true;
      }
      break;
    }
  }

  if (!valid) {
    return createForbiddenResponse('Santri ini bukan binaan halaqah Anda.');
  }

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var sheet = SPREADSHEET.getSheetByName(TABLES.CATATAN);
    var id = data.ID ? String(data.ID).trim() : ('CAT-' + Date.now());
    var tanggal = data.Tanggal ? String(data.Tanggal).trim() : Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd');

    sheet.appendRow([
      id,
      cleanSiswaId,
      tanggal,
      String(data.Kategori || 'Evaluasi Umum').trim(),
      String(data.Catatan || '').trim(),
      guruId
    ]);

    return createJsonResponse({ status: 'success', code: 'OK', message: 'Catatan perkembangan berhasil disimpan.' });
  } finally {
    lock.releaseLock();
  }
}

function handleAddPengumuman(data, session) {
  var guruId = session.role === 'ustadz' ? session.guruId : String(data.GuruID || '').trim();

  // Poin 4: Tolak jika GuruID kosong
  if (!guruId) {
    return createJsonResponse({ status: 'error', code: 'BAD_REQUEST', message: 'GuruID wajib diisi untuk pengumuman halaqah.' });
  }

  var judul = String(data.Judul || '').trim();
  var isi = String(data.Isi || '').trim();

  if (!judul || !isi) {
    return createJsonResponse({ status: 'error', code: 'BAD_REQUEST', message: 'Judul dan isi pengumuman wajib diisi.' });
  }

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var sheet = SPREADSHEET.getSheetByName(TABLES.PENGUMUMAN);
    var id = 'PGM-' + Date.now();
    var tanggal = data.Tanggal ? String(data.Tanggal).trim() : Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd');

    sheet.appendRow([
      id,
      guruId,
      judul,
      isi,
      tanggal
    ]);

    return createJsonResponse({ status: 'success', code: 'OK', message: 'Pengumuman halaqah berhasil dipublikasikan.' });
  } finally {
    lock.releaseLock();
  }
}

function handleMapGuru(siswaId, guruId) {
  var cleanSiswaId = String(siswaId || '').trim();
  var cleanGuruId = String(guruId || '').trim();

  if (!cleanGuruId) {
    return createJsonResponse({ status: 'error', code: 'BAD_REQUEST', message: 'GuruID tujuan wajib ditentukan.' });
  }

  var sheet = SPREADSHEET.getSheetByName(TABLES.SISWA);
  var rows = sheet.getDataRange().getValues();

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][0]).trim() === cleanSiswaId) {
        sheet.getRange(i + 1, 11).setValue(cleanGuruId);
        return createJsonResponse({
          status: 'success',
          code: 'OK',
          message: 'Santri ' + rows[i][2] + ' berhasil dipetakan ke Ustadz ' + cleanGuruId
        });
      }
    }
    return createJsonResponse({ status: 'error', code: 'NOT_FOUND', message: 'Santri tidak ditemukan.' });
  } finally {
    lock.releaseLock();
  }
}

function handleSaveSiswa(data) {
  var sheet = SPREADSHEET.getSheetByName(TABLES.SISWA);
  var id = data.ID ? String(data.ID).trim() : ('S' + ('000' + sheet.getLastRow()).slice(-3));
  var cleanNisn = String(data.NISN || '').trim();
  var cleanGuruId = String(data.GuruID || '').trim();

  // Poin 4: Tolak jika GuruID kosong
  if (!cleanGuruId) {
    return createJsonResponse({ status: 'error', code: 'BAD_REQUEST', message: 'GuruID ustadz pengampu wajib dipilih.' });
  }

  if (!cleanNisn) {
    return createJsonResponse({ status: 'error', code: 'BAD_REQUEST', message: 'NISN wajib diisi.' });
  }

  var rows = sheet.getDataRange().getValues();

  // Poin 3: Validasi Duplikat NISN
  for (var i = 1; i < rows.length; i++) {
    var existingId = String(rows[i][0]).trim();
    var existingNisn = String(rows[i][1]).trim();
    if (existingNisn === cleanNisn && existingId !== id) {
      return createJsonResponse({
        status: 'error',
        code: 'DUPLICATE',
        message: 'NISN ' + cleanNisn + ' sudah terdaftar untuk santri lain (' + rows[i][2] + ').'
      });
    }
  }

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][0]).trim() === id) {
        sheet.getRange(i + 1, 1, 1, 11).setValues([[
          id,
          cleanNisn,
          String(data.NamaSiswa || '').trim(),
          String(data.JenisKelamin || 'L').trim(),
          String(data.KelasID || '').trim(),
          String(data.NamaOrangTua || '').trim(),
          String(data.NoHPOrangTua || '').trim(),
          Number(data.TargetJuz || 2),
          String(data.Status || 'Aktif').trim(),
          String(data.Catatan || '').trim(),
          cleanGuruId
        ]]);
        return createJsonResponse({ status: 'success', code: 'OK', message: 'Data santri berhasil diperbarui.' });
      }
    }

    sheet.appendRow([
      id,
      cleanNisn,
      String(data.NamaSiswa || '').trim(),
      String(data.JenisKelamin || 'L').trim(),
      String(data.KelasID || '').trim(),
      String(data.NamaOrangTua || '').trim(),
      String(data.NoHPOrangTua || '').trim(),
      Number(data.TargetJuz || 2),
      String(data.Status || 'Aktif').trim(),
      String(data.Catatan || '').trim(),
      cleanGuruId
    ]);

    return createJsonResponse({ status: 'success', code: 'OK', message: 'Santri berhasil ditambahkan.', id: id });
  } finally {
    lock.releaseLock();
  }
}

// Poin 8: Soft Delete jika santri memiliki setoran terkait
function handleDeleteSiswa(id) {
  var cleanId = String(id || '').trim();
  var sheetSiswa = SPREADSHEET.getSheetByName(TABLES.SISWA);
  var siswaRows = sheetSiswa.getDataRange().getValues();

  var rowIndex = -1;
  for (var i = 1; i < siswaRows.length; i++) {
    if (String(siswaRows[i][0]).trim() === cleanId) {
      rowIndex = i + 1;
      break;
    }
  }

  if (rowIndex === -1) {
    return createJsonResponse({ status: 'error', code: 'NOT_FOUND', message: 'Santri tidak ditemukan.' });
  }

  // Cek apakah ada setoran terkait di TB_Setoran
  var sheetSetoran = SPREADSHEET.getSheetByName(TABLES.SETORAN);
  var setoranRows = sheetSetoran ? sheetSetoran.getDataRange().getValues() : [];
  var hasSetoran = false;

  for (var j = 1; j < setoranRows.length; j++) {
    if (String(setoranRows[j][1]).trim() === cleanId) {
      hasSetoran = true;
      break;
    }
  }

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    if (hasSetoran) {
      // Soft Delete: Ubah Status menjadi 'Nonaktif' (Kolom 9)
      sheetSiswa.getRange(rowIndex, 9).setValue('Nonaktif');
      return createJsonResponse({
        status: 'success',
        code: 'OK',
        message: 'Santri memiliki riwayat setoran hafalan. Status santri diubah menjadi Nonaktif (soft delete).'
      });
    } else {
      // Hard Delete jika belum ada setoran
      sheetSiswa.deleteRow(rowIndex);
      return createJsonResponse({
        status: 'success',
        code: 'OK',
        message: 'Data santri berhasil dihapus permanen.'
      });
    }
  } finally {
    lock.releaseLock();
  }
}

function handleSaveUser(data) {
  var sheet = SPREADSHEET.getSheetByName(TABLES.USERS);
  var id = data.ID ? String(data.ID).trim() : ('U' + ('000' + sheet.getLastRow()).slice(-3));
  var cleanUsername = String(data.Username || '').trim().toLowerCase();
  var rawPass = data.Password ? String(data.Password).trim() : '';

  if (!cleanUsername) {
    return createJsonResponse({ status: 'error', code: 'BAD_REQUEST', message: 'Username wajib diisi.' });
  }

  var rows = sheet.getDataRange().getValues();

  // Poin 3: Validasi Duplikat Username
  for (var i = 1; i < rows.length; i++) {
    var existingId = String(rows[i][0]).trim();
    var existingUser = String(rows[i][2]).trim().toLowerCase();
    if (existingUser === cleanUsername && existingId !== id) {
      return createJsonResponse({
        status: 'error',
        code: 'DUPLICATE',
        message: 'Username ' + cleanUsername + ' sudah digunakan oleh akun lain.'
      });
    }
  }

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    // Mode Edit
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][0]).trim() === id) {
        // Poin 2: Simpan salt ke variabel tunggal, jangan panggil getUuid() dua kali
        var finalPass = rows[i][3];
        if (rawPass) {
          var editSalt = Utilities.getUuid().substring(0, 8);
          finalPass = editSalt + '$' + hashPassword(rawPass, editSalt);
        }

        sheet.getRange(i + 1, 1, 1, 9).setValues([[
          id,
          String(data.Nama || '').trim(),
          String(data.Username || '').trim(),
          finalPass,
          String(data.Role || 'ustadz').trim().toLowerCase(),
          String(data.GuruID || '').trim(),
          String(data.ChildID || '').trim(),
          String(data.NoHP || '').trim(),
          String(data.Status || 'Aktif').trim()
        ]]);
        return createJsonResponse({ status: 'success', code: 'OK', message: 'Data akun berhasil diperbarui.' });
      }
    }

    // Poin 9: Mode Tambah Baru - Wajib ada password dari admin (Hapus fallback '123')
    if (!rawPass) {
      return createJsonResponse({
        status: 'error',
        code: 'BAD_REQUEST',
        message: 'Password wajib diisi saat membuat akun baru.'
      });
    }

    var newSalt = Utilities.getUuid().substring(0, 8);
    var passHash = newSalt + '$' + hashPassword(rawPass, newSalt);

    sheet.appendRow([
      id,
      String(data.Nama || '').trim(),
      String(data.Username || '').trim(),
      passHash,
      String(data.Role || 'ustadz').trim().toLowerCase(),
      String(data.GuruID || '').trim(),
      String(data.ChildID || '').trim(),
      String(data.NoHP || '').trim(),
      String(data.Status || 'Aktif').trim()
    ]);

    return createJsonResponse({ status: 'success', code: 'OK', message: 'Akun baru berhasil didaftarkan.', id: id });
  } finally {
    lock.releaseLock();
  }
}

function handleDeleteUser(id) {
  return deleteRowByColumn(TABLES.USERS, 0, id, 'Pengguna');
}

// Poin 7: CRUD Kelas & Target
function handleSaveKelas(data) {
  var sheet = SPREADSHEET.getSheetByName(TABLES.KELAS);
  if (!sheet) return createJsonResponse({ status: 'error', code: 'SERVER_ERROR', message: 'Tabel TB_Kelas tidak ditemukan.' });

  var id = data.ID ? String(data.ID).trim() : ('K-' + Date.now());
  var namaKelas = String(data.NamaKelas || '').trim();
  var tingkat = Number(data.Tingkat || 1);
  var tahunAjaran = String(data.TahunAjaran || '').trim();

  if (!namaKelas || !tahunAjaran) {
    return createJsonResponse({ status: 'error', code: 'BAD_REQUEST', message: 'Nama Kelas dan Tahun Ajaran wajib diisi.' });
  }

  var rows = sheet.getDataRange().getValues();
  var lock = LockService.getScriptLock();

  try {
    lock.waitLock(10000);

    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][0]).trim() === id) {
        sheet.getRange(i + 1, 1, 1, 6).setValues([[
          id,
          namaKelas,
          tingkat,
          String(data.WaliKelas || '').trim(),
          Number(data.TargetJuz || 2),
          tahunAjaran
        ]]);
        return createJsonResponse({ status: 'success', code: 'OK', message: 'Data kelas berhasil diperbarui.' });
      }
    }

    sheet.appendRow([
      id,
      namaKelas,
      tingkat,
      String(data.WaliKelas || '').trim(),
      Number(data.TargetJuz || 2),
      tahunAjaran
    ]);

    return createJsonResponse({ status: 'success', code: 'OK', message: 'Kelas baru berhasil ditambahkan.', id: id });
  } finally {
    lock.releaseLock();
  }
}

function handleDeleteKelas(id) {
  var cleanId = String(id || '').trim();
  var sheetSiswa = SPREADSHEET.getSheetByName(TABLES.SISWA);
  var sRows = sheetSiswa ? sheetSiswa.getDataRange().getValues() : [];

  for (var i = 1; i < sRows.length; i++) {
    if (String(sRows[i][4]).trim() === cleanId && String(sRows[i][8]).trim() === 'Aktif') {
      return createJsonResponse({
        status: 'error',
        code: 'IN_USE',
        message: 'Kelas tidak dapat dihapus karena masih digunakan oleh santri aktif (' + sRows[i][2] + '). Pindahkan santri terlebih dahulu.'
      });
    }
  }

  return deleteRowByColumn(TABLES.KELAS, 0, cleanId, 'Kelas');
}

function handleSaveTarget(data) {
  var sheet = SPREADSHEET.getSheetByName(TABLES.TARGET);
  if (!sheet) return createJsonResponse({ status: 'error', code: 'SERVER_ERROR', message: 'Tabel TB_Target tidak ditemukan.' });

  var id = data.ID ? String(data.ID).trim() : ('TGT-' + Date.now());
  var kelas = String(data.Kelas || '').trim();
  var semester = String(data.Semester || 'Ganjil').trim();
  var targetJuz = Number(data.TargetJuz || 1);
  var targetSurat = String(data.TargetSurat || '').trim();

  var rows = sheet.getDataRange().getValues();
  var lock = LockService.getScriptLock();

  try {
    lock.waitLock(10000);

    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][0]).trim() === id) {
        sheet.getRange(i + 1, 1, 1, 5).setValues([[
          id,
          kelas,
          semester,
          targetJuz,
          targetSurat
        ]]);
        return createJsonResponse({ status: 'success', code: 'OK', message: 'Target tahfidz berhasil diperbarui.' });
      }
    }

    sheet.appendRow([
      id,
      kelas,
      semester,
      targetJuz,
      targetSurat
    ]);

    return createJsonResponse({ status: 'success', code: 'OK', message: 'Target tahfidz berhasil disimpan.', id: id });
  } finally {
    lock.releaseLock();
  }
}

// =========================================================================
// 8. FUNGSI UTILITAS UMUM
// =========================================================================

function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function createForbiddenResponse(reason) {
  return createJsonResponse({
    status: 'error',
    code: 'FORBIDDEN',
    message: reason || 'Akses ditolak.'
  });
}

function deleteRowByColumn(tableName, colIndex, targetValue, label) {
  var cleanVal = String(targetValue || '').trim();
  var sheet = SPREADSHEET.getSheetByName(tableName);
  if (!sheet) return createJsonResponse({ status: 'error', code: 'NOT_FOUND', message: 'Tabel ' + tableName + ' tidak ada.' });

  var rows = sheet.getDataRange().getValues();
  var lock = LockService.getScriptLock();

  try {
    lock.waitLock(10000);
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][colIndex]).trim() === cleanVal) {
        sheet.deleteRow(i + 1);
        return createJsonResponse({ status: 'success', code: 'OK', message: label + ' berhasil dihapus.' });
      }
    }
    return createJsonResponse({ status: 'error', code: 'NOT_FOUND', message: label + ' tidak ditemukan.' });
  } finally {
    lock.releaseLock();
  }
}

// Poin 1: Normalisasi header dengan replace(/\\s+/g, '')
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
      var headerKey = String(headers[c] || '').replace(/\\s+/g, '');
      if (!headerKey) continue;

      var cellVal = row[c];

      if (cellVal instanceof Date) {
        cellVal = Utilities.formatDate(cellVal, 'GMT+7', 'yyyy-MM-dd');
      } else if (typeof cellVal === 'string') {
        cellVal = cellVal.trim();
      }

      obj[headerKey] = cellVal;
    }

    delete obj.Password;
    results.push(obj);
  }
  return results;
}

// =========================================================================
// 9. INISIALISASI & SEED DATABASE AWAL (DENGAN PASSWORD HASH SHA-256)
// =========================================================================

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

  handleSeedDatabase();
  setupTrigger();
  Logger.log('Inisialisasi tabel, trigger, dan seed data awal selesai!');
}

function handleSeedDatabase() {
  var userSheet = SPREADSHEET.getSheetByName(TABLES.USERS);
  if (userSheet && userSheet.getLastRow() <= 1) {
    var s1 = 'a1b2c3d4';
    var p123 = s1 + '$' + hashPassword('123', s1);
    var pWali = s1 + '$' + hashPassword('sdqutercinta', s1);

    userSheet.appendRow(['U001', 'Administrator Tahfidz', 'admin', p123, 'admin', '', '', '081234567890', 'Aktif']);
    userSheet.appendRow(['U002', 'Ustadz Ahmad Fauzi, S.Pd.I', 'ahmad', p123, 'ustadz', 'G001', '', '081298765431', 'Aktif']);
    userSheet.appendRow(['U003', 'Ustadz Budi Santoso, Lc', 'budi', p123, 'ustadz', 'G002', '', '081298765432', 'Aktif']);
    userSheet.appendRow(['U004', 'Ustadzah Siti Maryam, S.Ag', 'siti', p123, 'ustadz', 'G003', '', '081298765433', 'Aktif']);
    userSheet.appendRow(['U005', 'Bpk. Ridwan (Wali Ahmad)', '12345', pWali, 'wali', '', 'S001', '081311112222', 'Aktif']);
    userSheet.appendRow(['U006', 'Ibu Zahra (Wali Fatimah)', '22222', pWali, 'wali', '', 'S002', '081333334444', 'Aktif']);
    userSheet.appendRow(['U007', 'Bpk. Yusuf (Wali Ali)', '33333', pWali, 'wali', '', 'S003', '081355556666', 'Aktif']);
    userSheet.appendRow(['U008', 'H. Abdullah Zaini, M.Pd', 'kepsek', p123, 'kepsek', '', '', '081199887766', 'Aktif']);
  }

  var siswaSheet = SPREADSHEET.getSheetByName(TABLES.SISWA);
  if (siswaSheet && siswaSheet.getLastRow() <= 1) {
    siswaSheet.appendRow(['S001', '12345', 'Ahmad Muzakki', 'L', 'K-2A', 'Bpk. Ridwan & Ibu Anisa', '081311112222', 3, 'Aktif', 'Kelancaran juz 30 sangat baik', 'G001']);
    siswaSheet.appendRow(['S002', '22222', 'Fatimah Az-Zahra', 'P', 'K-2A', 'Ibu Zahra Al-Munawwarah', '081333334444', 3, 'Aktif', 'Suara tartil dan tajwid konsisten', 'G001']);
    siswaSheet.appendRow(['S003', '33333', 'Ali Ibnu Sina', 'L', 'K-3A', 'Bpk. Yusuf Habibi', '081355556666', 4, 'Aktif', 'Semangat murojaah tinggi', 'G002']);
    siswaSheet.appendRow(['S004', '44444', 'Zaid bin Tsabit', 'L', 'K-3A', 'Bpk. Hamdan Tsani', '081377778888', 4, 'Aktif', 'Persiapan tasmi akbar juz 29 & 30', 'G002']);
    siswaSheet.appendRow(['S005', '55555', 'Aisyah Humaira', 'P', 'K-1A', 'Ibu Maryam Salim', '081399990000', 2, 'Aktif', 'Sedang menyelesaikan juz 30', 'G003']);
    siswaSheet.appendRow(['S006', '66666', 'Umar Al-Faruq', 'L', 'K-1A', 'Bpk. Salman Al-Farisi', '081322223333', 2, 'Aktif', 'Kelancaran stabil di surah An-Naba', 'G001']);
  }

  var kelasSheet = SPREADSHEET.getSheetByName(TABLES.KELAS);
  if (kelasSheet && kelasSheet.getLastRow() <= 1) {
    kelasSheet.appendRow(['K-1A', '1A - Abu Bakar Ash-Shiddiq', 1, 'Ustadzah Siti Maryam, S.Ag', 2, '2026/2027']);
    kelasSheet.appendRow(['K-2A', '2A - Umar bin Khattab', 2, 'Ustadz Ahmad Fauzi, S.Pd.I', 3, '2026/2027']);
    kelasSheet.appendRow(['K-3A', '3A - Utsman bin Affan', 3, 'Ustadz Budi Santoso, Lc', 4, '2026/2027']);
  }

  var targetSheet = SPREADSHEET.getSheetByName(TABLES.TARGET);
  if (targetSheet && targetSheet.getLastRow() <= 1) {
    targetSheet.appendRow(['TGT-01', 'Kelas 1', 'Ganjil', 1, 'An-Nas s.d Ad-Duha (Juz 30 Bagian 1)']);
    targetSheet.appendRow(['TGT-02', 'Kelas 2', 'Ganjil', 2, 'Al-Lail s.d An-Naba (Tuntas Juz 30)']);
    targetSheet.appendRow(['TGT-03', 'Kelas 3', 'Ganjil', 3, 'Al-Mulk s.d Al-Mursalat (Juz 29)']);
  }

  var pgmSheet = SPREADSHEET.getSheetByName(TABLES.PENGUMUMAN);
  if (pgmSheet && pgmSheet.getLastRow() <= 1) {
    pgmSheet.appendRow(['PGM-301', 'G001', 'Jadwal Tasmi Mandiri Halaqah Ustadz Ahmad', 'Assalamu’alaikum Ayah & Bunda. Tasmi hafalan santri halaqah Ustadz Ahmad diadakan hari Sabtu pagi pukul 08.00 WIB.', '2026-10-04']);
    pgmSheet.appendRow(['PGM-302', 'G002', 'Persiapan Masuk Surat Al-Insan Halaqah Ustadz Budi', 'Pekan depan santri mulai memasuki surat Al-Insan juz 29. Mohon audio murattal diputar di rumah.', '2026-10-03']);
  }

  return createJsonResponse({
    status: 'success',
    code: 'OK',
    message: 'Data awal SDQU berhasil dimasukkan ke Google Spreadsheet dengan enkripsi password!'
  });
}
`;
