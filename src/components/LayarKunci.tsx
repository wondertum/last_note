import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { aturUlangPinDenganKode, buatPin, cekPin } from '@/services/pin';

export type TahapKunci = 'memuat' | 'atur' | 'kode' | 'terkunci';

type Props = {
  tahap: TahapKunci;
  kodeBaru: string;
  onPinDibuat: (kode: string) => void;
  onKodeDicatat: () => void;
  onBuka: () => void;
};

const POLA_PIN = /^\d{4,6}$/;

export default function LayarKunci({
  tahap,
  kodeBaru,
  onPinDibuat,
  onKodeDicatat,
  onBuka,
}: Props) {
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');
  const [kode, setKode] = useState('');
  const [pemulihan, setPemulihan] = useState(false);
  const [galat, setGalat] = useState('');
  const [sibuk, setSibuk] = useState(false);

  const atur = async () => {
    if (!POLA_PIN.test(pin)) {
      setGalat('PIN harus 4 sampai 6 angka.');
      return;
    }
    if (pin !== pin2) {
      setGalat('PIN dan ulangannya tidak sama.');
      return;
    }
    setSibuk(true);
    try {
      const kodePemulihan = await buatPin(pin);
      onPinDibuat(kodePemulihan);
    } catch {
      setGalat('PIN gagal disimpan. Coba lagi.');
    }
    setSibuk(false);
  };

  const buka = async () => {
    setSibuk(true);
    const benar = await cekPin(pin);
    setSibuk(false);
    if (benar) {
      onBuka();
      return;
    }
    setPin('');
    setGalat('PIN salah.');
  };

  const aturUlang = async () => {
    if (!POLA_PIN.test(pin)) {
      setGalat('PIN baru harus 4 sampai 6 angka.');
      return;
    }
    setSibuk(true);
    const berhasil = await aturUlangPinDenganKode(kode, pin);
    setSibuk(false);
    if (berhasil) {
      onBuka();
      return;
    }
    setGalat('Kode pemulihan salah.');
  };

  if (tahap === 'memuat') return <View style={styles.layar} />;

  if (tahap === 'kode') {
    return (
      <View style={styles.layar}>
        <Text style={styles.judul}>Kode pemulihan</Text>
        <Text style={styles.teks}>
          Catat kode ini di tempat aman, misalnya di buku. Kode ini satu-satunya
          cara membuka aplikasi kalau kamu lupa PIN, dan tidak akan ditampilkan
          lagi.
        </Text>
        <Text style={styles.kode}>{kodeBaru}</Text>
        <Pressable style={styles.tombol} onPress={onKodeDicatat}>
          <Text style={styles.tombolTeks}>Saya sudah mencatat</Text>
        </Pressable>
      </View>
    );
  }

  if (tahap === 'atur') {
    return (
      <View style={styles.layar}>
        <Text style={styles.judul}>Buat PIN</Text>
        <Text style={styles.teks}>
          PIN dipakai untuk membuka aplikasi. Pakai 4 sampai 6 angka.
        </Text>
        <TextInput
          style={styles.input}
          value={pin}
          onChangeText={setPin}
          placeholder="PIN"
          keyboardType="number-pad"
          secureTextEntry
          maxLength={6}
          autoFocus
        />
        <TextInput
          style={styles.input}
          value={pin2}
          onChangeText={setPin2}
          placeholder="Ulangi PIN"
          keyboardType="number-pad"
          secureTextEntry
          maxLength={6}
          onSubmitEditing={atur}
        />
        {galat !== '' && <Text style={styles.galat}>{galat}</Text>}
        <Pressable style={styles.tombol} onPress={atur} disabled={sibuk}>
          <Text style={styles.tombolTeks}>Simpan PIN</Text>
        </Pressable>
      </View>
    );
  }

  if (pemulihan) {
    return (
      <View style={styles.layar}>
        <Text style={styles.judul}>Lupa PIN</Text>
        <Text style={styles.teks}>
          Masukkan kode pemulihan yang kamu catat saat membuat PIN, lalu buat PIN
          baru.
        </Text>
        <TextInput
          style={styles.input}
          value={kode}
          onChangeText={setKode}
          placeholder="Kode pemulihan"
          autoCapitalize="characters"
          autoCorrect={false}
          autoFocus
        />
        <TextInput
          style={styles.input}
          value={pin}
          onChangeText={setPin}
          placeholder="PIN baru"
          keyboardType="number-pad"
          secureTextEntry
          maxLength={6}
          onSubmitEditing={aturUlang}
        />
        {galat !== '' && <Text style={styles.galat}>{galat}</Text>}
        <Pressable style={styles.tombol} onPress={aturUlang} disabled={sibuk}>
          <Text style={styles.tombolTeks}>Atur ulang PIN</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            setPemulihan(false);
            setPin('');
            setGalat('');
          }}
        >
          <Text style={styles.tautan}>Kembali</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.layar}>
      <Text style={styles.judul}>Masukkan PIN</Text>
      <TextInput
        style={styles.input}
        value={pin}
        onChangeText={(t) => {
          setPin(t);
          setGalat('');
        }}
        placeholder="PIN"
        keyboardType="number-pad"
        secureTextEntry
        maxLength={6}
        autoFocus
        onSubmitEditing={buka}
      />
      {galat !== '' && <Text style={styles.galat}>{galat}</Text>}
      <Pressable style={styles.tombol} onPress={buka} disabled={sibuk}>
        <Text style={styles.tombolTeks}>Buka</Text>
      </Pressable>
      <Pressable
        onPress={() => {
          setPemulihan(true);
          setPin('');
          setGalat('');
        }}
      >
        <Text style={styles.tautan}>Lupa PIN?</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  layar: { flex: 1, backgroundColor: '#ffffff', padding: 24, paddingTop: 100 },
  judul: { fontSize: 26, fontWeight: 'bold', color: '#111111', marginBottom: 12 },
  teks: { color: '#444444', fontSize: 15, marginBottom: 16, lineHeight: 22 },
  kode: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111111',
    textAlign: 'center',
    marginVertical: 24,
    letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  input: {
    borderWidth: 1,
    borderColor: '#cccccc',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 18,
    color: '#111111',
    marginBottom: 12,
  },
  galat: { color: '#dc2626', marginBottom: 12 },
  tombol: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  tombolTeks: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  tautan: { color: '#2563eb', textAlign: 'center', marginTop: 20, fontSize: 15 },
});