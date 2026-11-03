import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getDb } from '@/db/database';

type Detail = {
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
  
};

const NAMA_HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

function hariDariTanggal(tanggal: string) {
  const [t, b, h] = tanggal.split('-').map(Number);
  return NAMA_HARI[new Date(t, b - 1, h).getDay()];
}

function rupiah(angka: number) {
  return 'Rp ' + String(angka).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function Baris({ label, nilai }: { label: string; nilai?: string | null }) {
  if (!nilai) return null;
  return (
    <View style={styles.baris}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.nilai}>{nilai}</Text>
    </View>
  );
}

export default function DetailKegiatan() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<Detail | null>(null);
  const [tidakAda, setTidakAda] = useState(false);

  useEffect(() => {
    const muat = async () => {
      const db = await getDb();
      const baris = await db.getFirstAsync<Detail>(
        'SELECT * FROM kegiatan WHERE id = ?',
        Number(id)
      );
      if (baris) setData(baris);
      else setTidakAda(true);
    };
    muat();
  }, [id]);

  const hapus = () => {
    Alert.alert('Hapus kegiatan?', 'Data yang dihapus tidak bisa dikembalikan.', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          const db = await getDb();
          await db.runAsync('DELETE FROM kegiatan WHERE id = ?', Number(id));
          router.back();
        },
      },
    ]);
  };

  if (tidakAda) {
    return <Text style={styles.pesan}>Kegiatan tidak ditemukan.</Text>;
  }
  if (!data) return null;

  let peserta: string[] = [];
  try {
    peserta = JSON.parse(data.peserta ?? '[]');
  } catch {
    peserta = [];
  }

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.isi}>
      <Text style={styles.judul}>{data.judul}</Text>
      <Text style={styles.sub}>
        {data.op} • {hariDariTanggal(data.tanggal)}, {data.tanggal}
      </Text>

      <Baris label="Kode" nilai={data.kode} />
      <Baris label={data.op === 'T' ? 'Pemateri' : 'Pengisi'} nilai={data.pengisi} />
      <Baris label="Pendamping" nilai={data.pendamping} />
      <Baris
        label="Budget"
        nilai={data.budget != null ? rupiah(data.budget) : null}
      />
      <Baris
        label={`Peserta (${data.jumlah_peserta})`}
        nilai={peserta.join(', ')}
      />
      <Baris label="Hasil" nilai={data.hasil} />
      <Baris label="Keterangan" nilai={data.keterangan} />
            <Pressable
        style={{
          marginTop: 24,
          backgroundColor: '#2563eb',
          paddingVertical: 12,
          borderRadius: 8,
          alignItems: 'center',
        }}
        onPress={() => router.push(`/df/${data.id}` as any)}
      >
        <Text style={{ color: '#ffffff', fontWeight: '600' }}>
          Buka DF (keterangan lanjutan)
        </Text>
      </Pressable>

      <Pressable style={styles.hapus} onPress={hapus}>
        <Text style={styles.hapusTeks}>Hapus kegiatan</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#ffffff' },
  isi: { padding: 16, paddingBottom: 60 },
  pesan: { padding: 16, color: '#111111' },
  judul: { fontSize: 22, fontWeight: 'bold', color: '#111111' },
  sub: { marginTop: 4, color: '#555555' },
  baris: { marginTop: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#666666' },
  nilai: { marginTop: 2, fontSize: 16, color: '#111111' },
  hapus: {
    marginTop: 32,
    borderWidth: 1,
    borderColor: '#dc2626',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  hapusTeks: { color: '#dc2626', fontWeight: '600' },
});