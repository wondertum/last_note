import { useRouter } from 'expo-router';
import { useState } from 'react';
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

import InputSaran from '@/components/InputSaran';
import { getDb, simpanSaran } from '@/db/database';

type Op = 'M' | 'T' | 'STR';

const DAFTAR_OP: Op[] = ['M', 'T', 'STR'];
const DAFTAR_KODE: Record<Op, string[]> = {
  M: ['M/S', 'S', 'P', 'N'],
  T: ['M/T', 'T'],
  STR: [],
};
const NAMA_HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

function hariIni() {
  const d = new Date();
  const dua = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${dua(d.getMonth() + 1)}-${dua(d.getDate())}`;
}

function hariDariTanggal(tanggal: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) return null;
  const [t, b, h] = tanggal.split('-').map(Number);
  const d = new Date(t, b - 1, h);
  if (d.getFullYear() !== t || d.getMonth() !== b - 1 || d.getDate() !== h) {
    return null;
  }
  return NAMA_HARI[d.getDay()];
}

function Pilihan({
  teks,
  aktif,
  onPress,
}: {
  teks: string;
  aktif: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, aktif && styles.chipAktif]}>
      <Text style={[styles.chipTeks, aktif && styles.chipTeksAktif]}>{teks}</Text>
    </Pressable>
  );
}

export default function Tambah() {
  const router = useRouter();
  const [op, setOp] = useState<Op>('M');
  const [tanggal, setTanggal] = useState(hariIni());
  const [kode, setKode] = useState('');
  const [judul, setJudul] = useState('');
  const [namaBaru, setNamaBaru] = useState('');
  const [peserta, setPeserta] = useState<string[]>([]);
  const [pengisi, setPengisi] = useState('');
  const [pendamping, setPendamping] = useState('');
  const [budget, setBudget] = useState('');
  const [hasil, setHasil] = useState('');
  const [keterangan, setKeterangan] = useState('');

  const hari = hariDariTanggal(tanggal);
  const labelJudul = op === 'T' ? 'Materi' : 'Kegiatan';
  const labelPengisi = op === 'T' ? 'Pemateri' : 'Pengisi';
  const jenisJudul = op === 'T' ? 'materi' : 'kegiatan';

  const gantiOp = (baru: Op) => {
    setOp(baru);
    setKode('');
  };

  const tambahPesertaDari = (nama: string) => {
    const bersih = nama.trim();
    if (!bersih) return;
    const sudahAda = peserta.some((p) => p.toLowerCase() === bersih.toLowerCase());
    if (!sudahAda) setPeserta([...peserta, bersih]);
    setNamaBaru('');
  };

  const tambahDariKetikan = () => tambahPesertaDari(namaBaru);

  const hapusPeserta = (index: number) => {
    setPeserta(peserta.filter((_, i) => i !== index));
  };

  const simpan = async () => {
    if (!hari) {
      Alert.alert(
        'Tanggal belum benar',
        'Tulis tanggal dengan format TTTT-BB-HH, contoh 2026-10-28.'
      );
      return;
    }
    if (!judul.trim()) {
      Alert.alert('Belum lengkap', `${labelJudul} harus diisi.`);
      return;
    }
    const angkaBudget = budget.replace(/\D/g, '');
    const db = await getDb();
    await db.runAsync(
      `INSERT INTO kegiatan
        (op, tanggal, kode, judul, peserta, jumlah_peserta, pengisi, pendamping, budget, hasil, keterangan)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        op,
        tanggal,
        kode || null,
        judul.trim(),
        JSON.stringify(peserta),
        peserta.length,
        op === 'STR' ? null : pengisi.trim() || null,
        op === 'STR' ? null : pendamping.trim() || null,
        op === 'STR' || !angkaBudget ? null : parseInt(angkaBudget, 10),
        op === 'STR' ? hasil.trim() || null : null,
        op === 'STR' ? null : keterangan.trim() || null,
      ]
    );

    await simpanSaran(jenisJudul, [judul]);
    await simpanSaran('peserta', peserta);
    if (op !== 'STR') {
      await simpanSaran('pengisi', [pengisi]);
      await simpanSaran('pendamping', [pendamping]);
    }

    router.back();
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.isi}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>Jenis (OP)</Text>
        <View style={styles.baris}>
          {DAFTAR_OP.map((o) => (
            <Pilihan key={o} teks={o} aktif={op === o} onPress={() => gantiOp(o)} />
          ))}
        </View>

        <Text style={styles.label}>
          Tanggal (TTTT-BB-HH){hari ? ` - ${hari}` : ''}
        </Text>
        <TextInput
          style={styles.input}
          value={tanggal}
          onChangeText={setTanggal}
          placeholder="2026-10-28"
          keyboardType="numbers-and-punctuation"
        />

        {DAFTAR_KODE[op].length > 0 && (
          <>
            <Text style={styles.label}>Kode</Text>
            <View style={styles.baris}>
              {DAFTAR_KODE[op].map((k) => (
                <Pilihan
                  key={k}
                  teks={k}
                  aktif={kode === k}
                  onPress={() => setKode(kode === k ? '' : k)}
                />
              ))}
            </View>
          </>
        )}

        <Text style={styles.label}>{labelJudul}</Text>
        <InputSaran
          jenis={jenisJudul}
          value={judul}
          onChangeText={setJudul}
          onPilih={setJudul}
        />

        <Text style={styles.label}>Peserta</Text>
        <View style={styles.barisInput}>
          <View style={styles.flex}>
            <InputSaran
              jenis="peserta"
              value={namaBaru}
              onChangeText={setNamaBaru}
              onPilih={tambahPesertaDari}
              onSubmitEditing={tambahDariKetikan}
              placeholder="Nama peserta"
              sembunyikan={peserta}
            />
          </View>
          <Pressable style={styles.tombolKecil} onPress={tambahDariKetikan}>
            <Text style={styles.tombolKecilTeks}>Tambah</Text>
          </Pressable>
        </View>
        <View style={[styles.baris, styles.jarakAtas]}>
          {peserta.map((nama, i) => (
            <Pressable key={i} style={styles.tag} onPress={() => hapusPeserta(i)}>
              <Text style={styles.tagTeks}>{nama} ✕</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.info}>
          Jumlah peserta: {peserta.length} (ketuk nama untuk menghapus)
        </Text>

        {op !== 'STR' && (
          <>
            <Text style={styles.label}>{labelPengisi}</Text>
            <InputSaran
              jenis="pengisi"
              value={pengisi}
              onChangeText={setPengisi}
              onPilih={setPengisi}
            />

            <Text style={styles.label}>Pendamping</Text>
            <InputSaran
              jenis="pendamping"
              value={pendamping}
              onChangeText={setPendamping}
              onPilih={setPendamping}
            />

            <Text style={styles.label}>Budget (Rp)</Text>
            <TextInput
              style={styles.input}
              value={budget}
              onChangeText={setBudget}
              keyboardType="numeric"
            />

            <Text style={styles.label}>Keterangan</Text>
            <TextInput
              style={[styles.input, styles.besar]}
              value={keterangan}
              onChangeText={setKeterangan}
              multiline
            />
          </>
        )}

        {op === 'STR' && (
          <>
            <Text style={styles.label}>Hasil</Text>
            <TextInput
              style={[styles.input, styles.besar]}
              value={hasil}
              onChangeText={setHasil}
              multiline
            />
          </>
        )}

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
  label: { fontSize: 14, fontWeight: '600', color: '#333333', marginTop: 16, marginBottom: 6 },
  baris: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  barisInput: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  jarakAtas: { marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#cccccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    color: '#111111',
  },
  besar: { minHeight: 100, textAlignVertical: 'top' },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#cccccc',
    borderRadius: 20,
  },
  chipAktif: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  chipTeks: { color: '#333333' },
  chipTeksAktif: { color: '#ffffff', fontWeight: '600' },
  tombolKecil: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 8,
  },
  tombolKecilTeks: { color: '#ffffff', fontWeight: '600' },
  tag: { backgroundColor: '#e5e7eb', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  tagTeks: { color: '#111111' },
  info: { marginTop: 8, color: '#555555' },
  simpan: {
    marginTop: 28,
    backgroundColor: '#16a34a',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  simpanTeks: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
});