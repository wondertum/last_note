import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

type Props = {
  sel: string[][];
  onChange: (sel: string[][]) => void;
};

export default function TabelEditor({ sel, onChange }: Props) {
  const jumlahKolom = sel[0]?.length ?? 0;

  const ubahSel = (b: number, k: number, nilai: string) => {
    onChange(
      sel.map((baris, i) =>
        i === b ? baris.map((s, j) => (j === k ? nilai : s)) : baris
      )
    );
  };

  const tambahBaris = () => onChange([...sel, new Array<string>(jumlahKolom).fill('')]);
  const kurangiBaris = () => {
    if (sel.length > 1) onChange(sel.slice(0, -1));
  };
  const tambahKolom = () => onChange(sel.map((baris) => [...baris, '']));
  const kurangiKolom = () => {
    if (jumlahKolom > 1) onChange(sel.map((baris) => baris.slice(0, -1)));
  };

  return (
    <View>
      <ScrollView horizontal keyboardShouldPersistTaps="handled">
        <View>
          {sel.map((baris, b) => (
            <View key={b} style={styles.baris}>
              {baris.map((nilai, k) => (
                <TextInput
                  key={k}
                  style={[styles.sel, b === 0 && styles.kepala]}
                  value={nilai}
                  onChangeText={(t) => ubahSel(b, k, t)}
                  multiline
                />
              ))}
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.kontrol}>
        <Pressable style={styles.tombol} onPress={tambahBaris}>
          <Text style={styles.tombolTeks}>+ Baris</Text>
        </Pressable>
        <Pressable style={styles.tombol} onPress={kurangiBaris}>
          <Text style={styles.tombolTeks}>- Baris</Text>
        </Pressable>
        <Pressable style={styles.tombol} onPress={tambahKolom}>
          <Text style={styles.tombolTeks}>+ Kolom</Text>
        </Pressable>
        <Pressable style={styles.tombol} onPress={kurangiKolom}>
          <Text style={styles.tombolTeks}>- Kolom</Text>
        </Pressable>
      </View>
      <Text style={styles.info}>Baris pertama dipakai sebagai judul kolom.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  baris: { flexDirection: 'row' },
  sel: {
    width: 110,
    minHeight: 44,
    borderWidth: 1,
    borderColor: '#cccccc',
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 15,
    color: '#111111',
    textAlignVertical: 'top',
  },
  kepala: { backgroundColor: '#e5e7eb', fontWeight: '700' },
  kontrol: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  tombol: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#2563eb',
    borderRadius: 8,
  },
  tombolTeks: { color: '#2563eb' },
  info: { marginTop: 8, color: '#666666', fontSize: 12 },
});