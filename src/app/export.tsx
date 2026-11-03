import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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

import { bagikanZip, buatExport, hitungKegiatan } from '@/services/export';

const dua = (n: number) => String(n).padStart(2, '0');
const format = (d: Date) =>
  `${d.getFullYear()}-${dua(d.getMonth() + 1)}-${dua(d.getDate())}`;

function tanggalValid(t: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return false;
  const [y, m, d] = t.split('-').map(Number);
  const tgl = new Date(y, m - 1, d);
  return tgl.getFullYear() === y && tgl.getMonth() === m - 1 && tgl.getDate() === d;
}

function Pintasan({ teks, onPress }: { teks: string; onPress: () => void }) {
  return (
    <Pressable style={styles.chip} onPress={onPress}>
      <Text style={styles.chipTeks}>{teks}</Text>
    </Pressable>
  );
}

export default function Export() {
  const [dari, setDari] = useState(() => {
    const n = new Date();
    return format(new Date(n.getFullYear(), n.getMonth(), 1));
  });
  const [sampai, setSampai] = useState(() => format(new Date()));
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [jumlah, setJumlah] = useState<number | null>(null);
  const [sibuk, setSibuk] = useState(false);

  const rentangValid = tanggalValid(dari) && tanggalValid(sampai) && dari <= sampai;

  useEffect(() => {
    if (!rentangValid) {
      setJumlah(null);
      return;
    }
    let batal = false;
    hitungKegiatan(dari, sampai).then((n) => {
      if (!batal) setJumlah(n);
    });
    return () => {
      batal = true;
    };
  }, [dari, sampai, rentangValid]);

  const bulanIni = () => {
    const n = new Date();
    setDari(format(new Date(n.getFullYear(), n.getMonth(), 1)));
    setSampai(format(new Date(n.getFullYear(), n.getMonth() + 1, 0)));
  };

  const tahunIni = () => {
    const n = new Date();
    setDari(`${n.getFullYear()}-01-01`);
    setSampai(`${n.getFullYear()}-12-31`);
  };

  const semua = () => {
    setDari('2000-01-01');
    setSampai('2099-12-31');
  };

  const mulai = async () => {
    if (!rentangValid) {
      Alert.alert(
        'Tanggal belum benar',
        'Tulis tanggal dengan format TTTT-BB-HH, dan pastikan tanggal awal tidak melewati tanggal akhir.'
      );
      return;
    }
    if (jumlah === 0) {
      Alert.alert('Tidak ada kegiatan', 'Tidak ada kegiatan pada rentang tanggal itu.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Password terlalu pendek', 'Pakai minimal 6 karakter.');
      return;
    }
    if (password !== password2) {
      Alert.alert('Password tidak sama', 'Password dan ulangannya harus sama.');
      return;
    }

    setSibuk(true);
    try {
      const uri = await buatExport(dari, sampai, password);
      await bagikanZip(uri);
    } catch (e) {
      Alert.alert('Export gagal', String(e));
    }
    setSibuk(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.isi} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Rentang tanggal</Text>
        <View style={styles.baris}>
          <Pintasan teks="Bulan ini" onPress={bulanIni} />
          <Pintasan teks="Tahun ini" onPress={tahunIni} />
          <Pintasan teks="Semua" onPress={semua} />
        </View>

        <Text style={styles.label}>Dari (TTTT-BB-HH)</Text>
        <TextInput
          style={styles.input}
          value={dari}
          onChangeText={setDari}
          keyboardType="numbers-and-punctuation"
        />

        <Text style={styles.label}>Sampai (TTTT-BB-HH)</Text>
        <TextInput
          style={styles.input}
          value={sampai}
          onChangeText={setSampai}
          keyboardType="numbers-and-punctuation"
        />

        <Text style={styles.info}>
          {jumlah === null
            ? 'Periksa format tanggalnya.'
            : `${jumlah} kegiatan akan diekspor.`}
        </Text>

        <Text style={styles.label}>Password zip</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Minimal 6 karakter"
        />
        <TextInput
          style={[styles.input, styles.jarak]}
          value={password2}
          onChangeText={setPassword2}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Ulangi password"
        />
        <Text style={styles.peringatan}>
          Password tidak disimpan di mana pun. Kalau lupa, isi zip tidak bisa dibuka
          lagi. Catat di tempat aman.
        </Text>

        <Pressable style={styles.tombol} onPress={mulai} disabled={sibuk}>
          {sibuk ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.tombolTeks}>Buat export</Text>
          )}
        </Pressable>
        {sibuk && <Text style={styles.info}>Sedang membuat file, mohon tunggu...</Text>}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#ffffff' },
  isi: { padding: 16, paddingBottom: 120 },
  label: { fontSize: 14, fontWeight: '600', color: '#333333', marginTop: 16, marginBottom: 6 },
  baris: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#2563eb',
    borderRadius: 20,
  },
  chipTeks: { color: '#2563eb' },
  input: {
    borderWidth: 1,
    borderColor: '#cccccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111111',
  },
  jarak: { marginTop: 10 },
  info: { marginTop: 10, color: '#555555' },
  peringatan: { marginTop: 10, color: '#b45309', lineHeight: 20 },
  tombol: {
    marginTop: 24,
    backgroundColor: '#16a34a',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  tombolTeks: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
});