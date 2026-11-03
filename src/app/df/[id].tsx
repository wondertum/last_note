import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

import TabelEditor from '@/components/TabelEditor';
import { getDb } from '@/db/database';
import type { Lampiran } from '@/services/lampiran';
import {
    bukaFile,
    hapusFile,
    pilihDanSimpanFile,
    ukuranTeks,
} from '@/services/lampiran';

type Blok =
  | { kunci: number; jenis: 'teks'; teks: string }
  | { kunci: number; jenis: 'tabel'; sel: string[][] }
  | { kunci: number; jenis: 'file'; file: Lampiran };

const NAMA_JENIS = { teks: 'Teks', tabel: 'Tabel', file: 'File' };

export default function DF() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const kegiatanId = Number(id);
  const [judul, setJudul] = useState('');
  const [blok, setBlok] = useState<Blok[]>([]);
  const penghitung = useRef(0);
  const hapusNanti = useRef<string[]>([]);

  const kunciBaru = () => {
    penghitung.current += 1;
    return penghitung.current;
  };

  useEffect(() => {
    const muat = async () => {
      const db = await getDb();
      const kegiatan = await db.getFirstAsync<{ judul: string }>(
        'SELECT judul FROM kegiatan WHERE id = ?',
        kegiatanId
      );
      setJudul(kegiatan?.judul ?? '');
      const baris = await db.getAllAsync<{ jenis: string; isi: string }>(
        'SELECT jenis, isi FROM df_blok WHERE kegiatan_id = ? ORDER BY urutan',
        kegiatanId
      );
      const hasil: Blok[] = [];
      for (const b of baris) {
        try {
          if (b.jenis === 'tabel') {
            hasil.push({ kunci: kunciBaru(), jenis: 'tabel', sel: JSON.parse(b.isi) });
          } else if (b.jenis === 'file') {
            hasil.push({ kunci: kunciBaru(), jenis: 'file', file: JSON.parse(b.isi) });
          } else {
            hasil.push({ kunci: kunciBaru(), jenis: 'teks', teks: b.isi });
          }
        } catch {
          // lewati bagian yang rusak
        }
      }
      setBlok(hasil);
    };
    muat();
  }, [kegiatanId]);

  const ubahTeks = (kunci: number, teks: string) =>
    setBlok((lama) =>
      lama.map((b) => (b.kunci === kunci && b.jenis === 'teks' ? { ...b, teks } : b))
    );

  const ubahTabel = (kunci: number, sel: string[][]) =>
    setBlok((lama) =>
      lama.map((b) => (b.kunci === kunci && b.jenis === 'tabel' ? { ...b, sel } : b))
    );

  const tambahTeks = () =>
    setBlok([...blok, { kunci: kunciBaru(), jenis: 'teks', teks: '' }]);

  const tambahTabel = () =>
    setBlok([
      ...blok,
      {
        kunci: kunciBaru(),
        jenis: 'tabel',
        sel: [
          ['', '', ''],
          ['', '', ''],
          ['', '', ''],
        ],
      },
    ]);

  const tambahFile = async () => {
    try {
      const file = await pilihDanSimpanFile();
      if (file) {
        setBlok((lama) => [...lama, { kunci: kunciBaru(), jenis: 'file', file }]);
      }
        } catch (e) {
      Alert.alert('Gagal menambah file', String(e));
    }
  };

  const buka = async (berkas: string) => {
    try {
      await bukaFile(berkas);
        } catch (e) {
      Alert.alert('Tidak bisa membuka', String(e));
    }
  };

  const geser = (index: number, arah: -1 | 1) => {
    const tujuan = index + arah;
    if (tujuan < 0 || tujuan >= blok.length) return;
    const salinan = [...blok];
    [salinan[index], salinan[tujuan]] = [salinan[tujuan], salinan[index]];
    setBlok(salinan);
  };

  const hapus = (kunci: number) => {
    Alert.alert('Hapus bagian ini?', undefined, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: () => {
          const target = blok.find((b) => b.kunci === kunci);
          if (target && target.jenis === 'file') {
            hapusNanti.current.push(target.file.berkas);
          }
          setBlok((lama) => lama.filter((b) => b.kunci !== kunci));
        },
      },
    ]);
  };

  const simpan = async () => {
    const db = await getDb();
    const terisi = blok.filter((b) => b.jenis !== 'teks' || b.teks.trim() !== '');
    await db.withTransactionAsync(async () => {
      await db.runAsync('DELETE FROM df_blok WHERE kegiatan_id = ?', kegiatanId);
      for (let i = 0; i < terisi.length; i++) {
        const b = terisi[i];
        let isi = '';
        if (b.jenis === 'teks') isi = b.teks;
        else if (b.jenis === 'tabel') isi = JSON.stringify(b.sel);
        else isi = JSON.stringify(b.file);
        await db.runAsync(
          'INSERT INTO df_blok (kegiatan_id, urutan, jenis, isi) VALUES (?, ?, ?, ?)',
          kegiatanId,
          i,
          b.jenis,
          isi
        );
      }
    });
    for (const berkas of hapusNanti.current) hapusFile(berkas);
    hapusNanti.current = [];
    setBlok(terisi);
    Alert.alert('Tersimpan', 'DF berhasil disimpan.');
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.isi} keyboardShouldPersistTaps="handled">
        <Text style={styles.judul}>{judul}</Text>
        <Text style={styles.sub}>Keterangan lanjutan (DF)</Text>

        {blok.length === 0 && (
          <Text style={styles.kosong}>
            Belum ada isi. Tambahkan teks, tabel, atau file di bawah.
          </Text>
        )}

        {blok.map((b, i) => (
          <View key={b.kunci} style={styles.kotak}>
            <View style={styles.kepala}>
              <Text style={styles.jenis}>{NAMA_JENIS[b.jenis]}</Text>
              <View style={styles.aksi}>
                <Pressable hitSlop={10} onPress={() => geser(i, -1)}>
                  <Text style={styles.aksiTeks}>↑</Text>
                </Pressable>
                <Pressable hitSlop={10} onPress={() => geser(i, 1)}>
                  <Text style={styles.aksiTeks}>↓</Text>
                </Pressable>
                <Pressable hitSlop={10} onPress={() => hapus(b.kunci)}>
                  <Text style={styles.hapusTeks}>Hapus</Text>
                </Pressable>
              </View>
            </View>

            {b.jenis === 'teks' && (
              <TextInput
                style={styles.input}
                value={b.teks}
                onChangeText={(t) => ubahTeks(b.kunci, t)}
                multiline
                placeholder="Tulis keterangan di sini"
              />
            )}

            {b.jenis === 'tabel' && (
              <TabelEditor sel={b.sel} onChange={(s) => ubahTabel(b.kunci, s)} />
            )}

            {b.jenis === 'file' && (
              <View>
                <Text style={styles.namaFile}>{b.file.nama}</Text>
                <Text style={styles.ukuranFile}>{ukuranTeks(b.file.ukuran)}</Text>
                <Pressable style={styles.tombolBuka} onPress={() => buka(b.file.berkas)}>
                  <Text style={styles.tombolBukaTeks}>Buka / bagikan</Text>
                </Pressable>
              </View>
            )}
          </View>
        ))}

        <View style={styles.baris}>
          <Pressable style={styles.tambah} onPress={tambahTeks}>
            <Text style={styles.tambahTeks}>+ Teks</Text>
          </Pressable>
          <Pressable style={styles.tambah} onPress={tambahTabel}>
            <Text style={styles.tambahTeks}>+ Tabel</Text>
          </Pressable>
          <Pressable style={styles.tambah} onPress={tambahFile}>
            <Text style={styles.tambahTeks}>+ File</Text>
          </Pressable>
        </View>

        <Pressable style={styles.simpan} onPress={simpan}>
          <Text style={styles.simpanTeks}>Simpan</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#ffffff' },
  isi: { padding: 16, paddingBottom: 120 },
  judul: { fontSize: 20, fontWeight: 'bold', color: '#111111' },
  sub: { marginTop: 2, color: '#555555' },
  kosong: { marginTop: 24, textAlign: 'center', color: '#666666' },
  kotak: {
    marginTop: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#dddddd',
    borderRadius: 8,
  },
  kepala: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  jenis: { fontWeight: '600', color: '#333333' },
  aksi: { flexDirection: 'row', gap: 16 },
  aksiTeks: { fontSize: 18, color: '#2563eb' },
  hapusTeks: { fontSize: 16, color: '#dc2626' },
  input: {
    borderWidth: 1,
    borderColor: '#cccccc',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    color: '#111111',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  namaFile: { fontSize: 16, fontWeight: '600', color: '#111111' },
  ukuranFile: { marginTop: 2, color: '#666666' },
  tombolBuka: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#2563eb',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  tombolBukaTeks: { color: '#2563eb', fontWeight: '600' },
  baris: { flexDirection: 'row', gap: 12, marginTop: 20 },
  tambah: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#2563eb',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  tambahTeks: { color: '#2563eb', fontWeight: '600' },
  simpan: {
    marginTop: 24,
    backgroundColor: '#16a34a',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  simpanTeks: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
});