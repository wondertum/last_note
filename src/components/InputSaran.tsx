import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { getDb } from '@/db/database';

type Props = {
  jenis: string;
  value: string;
  onChangeText: (teks: string) => void;
  onPilih: (nilai: string) => void;
  placeholder?: string;
  sembunyikan?: string[];
  onSubmitEditing?: () => void;
};

export default function InputSaran({
  jenis,
  value,
  onChangeText,
  onPilih,
  placeholder,
  sembunyikan = [],
  onSubmitEditing,
}: Props) {
  const [semua, setSemua] = useState<string[]>([]);
  const [fokus, setFokus] = useState(false);

  useEffect(() => {
    const muat = async () => {
      const db = await getDb();
      const baris = await db.getAllAsync<{ nilai: string }>(
        'SELECT nilai FROM saran_isian WHERE jenis = ? ORDER BY dipakai DESC, nilai ASC',
        jenis
      );
      setSemua(baris.map((b) => b.nilai));
    };
    muat();
  }, [jenis]);

  const kata = value.trim().toLowerCase();
  const saran = semua
    .filter((s) => !sembunyikan.includes(s))
    .filter((s) => s.toLowerCase() !== kata)
    .filter((s) => kata === '' || s.toLowerCase().includes(kata))
    .slice(0, 6);

  return (
    <View>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        onFocus={() => setFokus(true)}
        onBlur={() => setTimeout(() => setFokus(false), 150)}
        onSubmitEditing={onSubmitEditing}
      />
      {fokus && saran.length > 0 && (
        <View style={styles.baris}>
          {saran.map((s) => (
            <Pressable key={s} style={styles.chip} onPress={() => onPilih(s)}>
              <Text style={styles.chipTeks}>{s}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: '#cccccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    color: '#111111',
  },
  baris: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#dbeafe',
    borderRadius: 16,
  },
  chipTeks: { color: '#1e3a8a' },
});