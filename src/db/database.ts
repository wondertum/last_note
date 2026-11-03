import * as SQLite from 'expo-sqlite';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb() {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync('catat-kegiatan.db');
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS kegiatan (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          op TEXT NOT NULL,
          tanggal TEXT NOT NULL,
          kode TEXT,
          judul TEXT NOT NULL,
          peserta TEXT,
          jumlah_peserta INTEGER DEFAULT 0,
          pengisi TEXT,
          pendamping TEXT,
          budget INTEGER,
          hasil TEXT,
          keterangan TEXT,
          dibuat TEXT DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS saran_isian (
          jenis TEXT NOT NULL,
          nilai TEXT NOT NULL COLLATE NOCASE,
          dipakai INTEGER NOT NULL DEFAULT 1,
          PRIMARY KEY (jenis, nilai)
        );
        CREATE TABLE IF NOT EXISTS df_blok (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          kegiatan_id INTEGER NOT NULL,
          urutan INTEGER NOT NULL,
          jenis TEXT NOT NULL,
          isi TEXT NOT NULL
        );
        CREATE TRIGGER IF NOT EXISTS hapus_df_saat_kegiatan_dihapus
        AFTER DELETE ON kegiatan
        BEGIN
          DELETE FROM df_blok WHERE kegiatan_id = OLD.id;
        END;
      `);
      return db;
    })();
  }
  return dbPromise;
}

export async function simpanSaran(jenis: string, daftar: string[]) {
  const db = await getDb();
  for (const nilai of daftar) {
    const bersih = nilai.trim();
    if (!bersih) continue;
    await db.runAsync(
      `INSERT INTO saran_isian (jenis, nilai, dipakai) VALUES (?, ?, 1)
       ON CONFLICT(jenis, nilai) DO UPDATE SET dipakai = dipakai + 1`,
      jenis,
      bersih
    );
  }
}