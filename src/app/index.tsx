import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Button, FlatList, Pressable, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getDb } from '@/db/database';

type Kegiatan = {
  id: number;
  op: string;
  tanggal: string;
  judul: string;
};

export default function Beranda() {
  const router = useRouter();
  const [daftar, setDaftar] = useState<Kegiatan[]>([]);

  const muatData = useCallback(async () => {
    const db = await getDb();
    const hasil = await db.getAllAsync<Kegiatan>(
      'SELECT id, op, tanggal, judul FROM kegiatan ORDER BY tanggal DESC, id DESC'
    );
    setDaftar(hasil);
  }, []);

  useFocusEffect(
    useCallback(() => {
      muatData();
    }, [muatData])
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Button title="+ Tambah kegiatan" onPress={() => router.push('/tambah' as any)} />
      <Button title="Export (zip ber-password)" onPress={() => router.push('/export' as any)} /> 
      <FlatList
        data={daftar}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={
          <Text style={styles.kosong}>Belum ada kegiatan.</Text>
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.kartu}
            onPress={() => router.push(`/kegiatan/${item.id}` as any)}
          >
            <Text style={styles.kartuJudul}>{item.judul}</Text>
            <Text style={styles.kartuInfo}>
              {item.op} • {item.tanggal}
            </Text>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#ffffff' },
  kosong: { marginTop: 24, textAlign: 'center', color: '#666666' },
  kartu: {
    marginTop: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#dddddd',
    borderRadius: 8,
  },
  kartuJudul: { fontSize: 16, fontWeight: '600', color: '#111111' },
  kartuInfo: { color: '#555555', marginTop: 4 },
});