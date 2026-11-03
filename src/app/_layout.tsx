import { Stack } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';

import LayarKunci from '@/components/LayarKunci';
import type { TahapKunci } from '@/components/LayarKunci';
import { adaPin, akhiriTunda, kunciSedangDitunda } from '@/services/pin';

type Tahap = TahapKunci | 'terbuka';

export default function RootLayout() {
  const [tahap, setTahap] = useState<Tahap>('memuat');
  const [kodeBaru, setKodeBaru] = useState('');
  const bebas = useRef(false);

  useEffect(() => {
    const mulai = async () => {
      const ada = await adaPin();
      setTahap(ada ? 'terkunci' : 'atur');
    };
    mulai();
  }, []);

  useEffect(() => {
    const langganan = AppState.addEventListener('change', (status) => {
      if (status === 'background') {
        if (kunciSedangDitunda()) {
          bebas.current = true;
        } else {
          setTahap((t) => (t === 'terbuka' ? 'terkunci' : t));
        }
      } else if (status === 'active') {
        if (bebas.current && !kunciSedangDitunda()) {
          setTahap((t) => (t === 'terbuka' ? 'terkunci' : t));
        }
        bebas.current = false;
        akhiriTunda();
      }
    });
    return () => langganan.remove();
  }, []);

  return (
    <View style={styles.flex}>
      <Stack>
        <Stack.Screen name="index" options={{ title: 'Kegiatan' }} />
        <Stack.Screen name="tambah" options={{ title: 'Tambah Kegiatan' }} />
        <Stack.Screen name="kegiatan/[id]" options={{ title: 'Detail Kegiatan' }} />
        <Stack.Screen name="df/[id]" options={{ title: 'DF' }} />
                <Stack.Screen name="export" options={{ title: 'Export' }} />
      </Stack>

      {tahap !== 'terbuka' && (
        <View style={styles.tutup}>
          <LayarKunci
            tahap={tahap}
            kodeBaru={kodeBaru}
            onPinDibuat={(kode) => {
              setKodeBaru(kode);
              setTahap('kode');
            }}
            onKodeDicatat={() => {
              setKodeBaru('');
              setTahap('terbuka');
            }}
            onBuka={() => setTahap('terbuka')}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  tutup: {
        position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
    elevation: 100,
    backgroundColor: '#ffffff',
  },
});