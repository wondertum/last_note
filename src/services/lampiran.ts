import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import * as LegacyFileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { tundaKunciSekali } from '@/services/pin';

export type Lampiran = {
  nama: string; // nama asli file, untuk ditampilkan
  berkas: string; // nama file di penyimpanan aplikasi
  ukuran: number; // dalam byte
};

function folderLampiran() {
  const folder = new Directory(Paths.document, 'lampiran');
  if (!folder.exists) folder.create();
  return folder;
}

export async function pilihDanSimpanFile(): Promise<Lampiran | null> {
  tundaKunciSekali();
  const hasil = await DocumentPicker.getDocumentAsync({
    copyToCacheDirectory: false,
    multiple: false,
  });
  if (hasil.canceled || hasil.assets.length === 0) return null;

  const asset = hasil.assets[0];
  const aman = asset.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const berkas = `${Date.now()}-${aman}`;
  const tujuan = new File(folderLampiran(), berkas);

  try {
    await LegacyFileSystem.copyAsync({ from: asset.uri, to: tujuan.uri });
  } catch (e1) {
    try {
      await new File(asset.uri).copy(tujuan);
    } catch (e2) {
      throw new Error(`Cara 1: ${String(e1)}\n\nCara 2: ${String(e2)}`);
    }
  }

  if (!tujuan.exists) {
    throw new Error('File gagal disalin ke penyimpanan aplikasi');
  }

  return { nama: asset.name, berkas, ukuran: asset.size ?? tujuan.size };
}

export async function bukaFile(berkas: string) {
  const file = new File(folderLampiran(), berkas);
  if (!file.exists) throw new Error('File tidak ditemukan');
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Berbagi file tidak tersedia');
  }
  tundaKunciSekali();
  await Sharing.shareAsync(file.uri);
}

export function hapusFile(berkas: string) {
  const file = new File(folderLampiran(), berkas);
  if (file.exists) file.delete();
}

export function ukuranTeks(byte: number) {
  if (byte < 1024) return `${byte} B`;
  if (byte < 1024 * 1024) return `${(byte / 1024).toFixed(1)} KB`;
  return `${(byte / (1024 * 1024)).toFixed(1)} MB`;
}