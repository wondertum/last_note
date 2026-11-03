import { Directory, File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { getDb } from '@/db/database';
import { tundaKunciSekali } from '@/services/pin';

type Kegiatan = {
  id: number;
  op: string;
  tanggal: string;
  kode: string | null;
  judul: string;
  peserta: string | null;
  jumlah_peserta: number;
  pengisi: string | null;
  pendamping: string | null;
  budget: number | null;
  hasil: string | null;
  keterangan: string | null;
  dibuat: string;
};

type BarisDf = {
  kegiatan_id: number;
  urutan: number;
  jenis: string;
  isi: string;
};

const NAMA_HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

const CSS = `
  body { font-family: sans-serif; color: #111; font-size: 12px; }
  h1 { font-size: 20px; margin-bottom: 2px; }
  h2 { font-size: 15px; margin: 0 0 2px 0; }
  h3 { font-size: 12px; margin: 10px 0 4px 0; }
  .sub { color: #555; margin: 0 0 6px 0; }
  .kegiatan { border-top: 1px solid #bbb; padding: 10px 0; page-break-inside: avoid; }
  table { border-collapse: collapse; }
  table.info td { padding: 2px 8px 2px 0; vertical-align: top; }
  td.l { color: #555; width: 110px; }
  table.data { margin: 4px 0 8px 0; }
  table.data th, table.data td { border: 1px solid #999; padding: 3px 6px; text-align: left; }
  table.data th { background: #eee; }
  .file { color: #333; font-style: italic; }
`;

function hariDari(tanggal: string) {
  const [t, b, h] = tanggal.split('-').map(Number);
  return NAMA_HARI[new Date(t, b - 1, h).getDay()];
}

function esc(teks: string | null | undefined) {
  return (teks ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function urai<T>(teks: string | null | undefined, cadangan: T): T {
  try {
    return teks ? (JSON.parse(teks) as T) : cadangan;
  } catch {
    return cadangan;
  }
}

function rupiah(angka: number) {
  return 'Rp ' + String(angka).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function jalur(uri: string) {
  return decodeURIComponent(uri.replace(/^file:\/\//, ''));
}

function barisInfo(label: string, nilai: string | null | undefined) {
  if (!nilai) return '';
  return `<tr><td class="l">${esc(label)}</td><td>${esc(nilai)}</td></tr>`;
}

function htmlDf(d: BarisDf) {
  if (d.jenis === 'teks') {
    return `<p>${esc(d.isi).replace(/\n/g, '<br/>')}</p>`;
  }
  if (d.jenis === 'tabel') {
    const sel = urai<string[][]>(d.isi, []);
    if (sel.length === 0) return '';
    const [kepala, ...badan] = sel;
    const th = kepala.map((k) => `<th>${esc(k)}</th>`).join('');
    const tr = badan
      .map((b) => `<tr>${b.map((s) => `<td>${esc(s)}</td>`).join('')}</tr>`)
      .join('');
    return `<table class="data"><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table>`;
  }
  if (d.jenis === 'file') {
    const f = urai<{ nama?: string }>(d.isi, {});
    return `<p class="file">Lampiran: ${esc(f.nama)}</p>`;
  }
  return '';
}

function htmlKegiatan(k: Kegiatan, df: BarisDf[]) {
  const peserta = urai<string[]>(k.peserta, []);
  const baris = [
    barisInfo('Kode', k.kode),
    barisInfo(k.op === 'T' ? 'Pemateri' : 'Pengisi', k.pengisi),
    barisInfo('Pendamping', k.pendamping),
    barisInfo('Budget', k.budget != null ? rupiah(k.budget) : null),
    barisInfo(`Peserta (${k.jumlah_peserta})`, peserta.join(', ')),
    barisInfo('Hasil', k.hasil),
    barisInfo('Keterangan', k.keterangan),
  ].join('');
  const lanjutan =
    df.length > 0
      ? `<h3>Keterangan lanjutan (DF)</h3>${df.map(htmlDf).join('')}`
      : '';
  return `<div class="kegiatan"><h2>${esc(k.judul)}</h2><p class="sub">${esc(k.op)} • ${esc(hariDari(k.tanggal))}, ${esc(k.tanggal)}</p><table class="info">${baris}</table>${lanjutan}</div>`;
}

function bangunHtml(daftar: Kegiatan[], semuaDf: BarisDf[], dari: string, sampai: string) {
  const isi = daftar
    .map((k) => htmlKegiatan(k, semuaDf.filter((d) => d.kegiatan_id === k.id)))
    .join('');
  return `<!DOCTYPE html><html><head><meta charset="utf-8" /><style>${CSS}</style></head><body><h1>Laporan Kegiatan</h1><p class="sub">${esc(dari)} s.d. ${esc(sampai)} • ${daftar.length} kegiatan</p>${isi}</body></html>`;
}

export async function hitungKegiatan(dari: string, sampai: string) {
  const db = await getDb();
  const baris = await db.getFirstAsync<{ n: number }>(
    'SELECT COUNT(*) AS n FROM kegiatan WHERE tanggal >= ? AND tanggal <= ?',
    dari,
    sampai
  );
  return baris?.n ?? 0;
}

// Membuat zip ber-password. Mengembalikan alamat file zip.
export async function buatExport(dari: string, sampai: string, password: string) {
  const db = await getDb();
  const daftar = await db.getAllAsync<Kegiatan>(
    'SELECT * FROM kegiatan WHERE tanggal >= ? AND tanggal <= ? ORDER BY tanggal ASC, id ASC',
    dari,
    sampai
  );
  if (daftar.length === 0) {
    throw new Error('Tidak ada kegiatan pada rentang tanggal itu.');
  }

  const semuaDf: BarisDf[] = [];
  for (const k of daftar) {
    const df = await db.getAllAsync<BarisDf>(
      'SELECT kegiatan_id, urutan, jenis, isi FROM df_blok WHERE kegiatan_id = ? ORDER BY urutan',
      k.id
    );
    semuaDf.push(...df);
  }

  const staging = new Directory(Paths.cache, `export_${Date.now()}`);
  staging.create();

  // 1. PDF
  const pdf = await Print.printToFileAsync({
    html: bangunHtml(daftar, semuaDf, dari, sampai),
  });
  await new File(pdf.uri).copy(new File(staging, 'laporan.pdf'));

  // 2. JSON cadangan
  const data = {
    aplikasi: 'last_note',
    versi: 1,
    diekspor: new Date().toISOString(),
    rentang: { dari, sampai },
    kegiatan: daftar.map((k) => ({
      ...k,
      peserta: urai<string[]>(k.peserta, []),
      df: semuaDf
        .filter((d) => d.kegiatan_id === k.id)
        .map((d) => ({ urutan: d.urutan, jenis: d.jenis, isi: d.isi })),
    })),
  };
  const fileJson = new File(staging, 'data.json');
  fileJson.create();
  fileJson.write(JSON.stringify(data, null, 2));

  // 3. File lampiran
  const dipakai = new Set<string>();
  for (const d of semuaDf) {
    if (d.jenis !== 'file') continue;
    const f = urai<{ berkas?: string }>(d.isi, {});
    if (f.berkas) dipakai.add(f.berkas);
  }
  if (dipakai.size > 0) {
    const asal = new Directory(Paths.document, 'lampiran');
    const tujuan = new Directory(staging, 'lampiran');
    tujuan.create();
    for (const nama of dipakai) {
      const sumber = new File(asal, nama);
      if (sumber.exists) await sumber.copy(new File(tujuan, nama));
    }
  }

  // 4. Zip dengan password
  const zip = new File(Paths.cache, `kegiatan_${dari}_sd_${sampai}.zip`);
  if (zip.exists) zip.delete();
  try {
    const pustaka = await import('react-native-zip-archive');
    await pustaka.zipWithPassword(
      jalur(staging.uri),
      jalur(zip.uri),
      password,
      'AES-256'
    );
  } catch (e) {
    throw new Error(
      'Pembuatan zip gagal. Fitur ini hanya jalan di aplikasi development build, bukan Expo Go.\n\n' +
        String(e)
    );
  } finally {
    try {
      staging.delete();
    } catch {
      // abaikan
    }
  }

  return zip.uri;
}

export async function bagikanZip(uri: string) {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Menu bagikan tidak tersedia di perangkat ini.');
  }
  tundaKunciSekali();
  await Sharing.shareAsync(uri, {
    mimeType: 'application/zip',
    dialogTitle: 'Simpan file export',
  });
}