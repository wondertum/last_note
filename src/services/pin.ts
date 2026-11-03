import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

const K_GARAM = 'pin_garam';
const K_PIN = 'pin_hash';
const K_PEMULIHAN = 'pemulihan_hash';

function acakHex(jumlahByte: number) {
  const bytes = Crypto.getRandomBytes(jumlahByte);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function buatKodePemulihan() {
  const huruf = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = Crypto.getRandomBytes(12);
  let kode = '';
  for (let i = 0; i < 12; i++) {
    kode += huruf[bytes[i] % huruf.length];
    if (i % 4 === 3 && i < 11) kode += '-';
  }
  return kode;
}

function rapikanKode(kode: string) {
  return kode.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function hash(garam: string, nilai: string) {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${garam}:${nilai}`
  );
}

export async function adaPin() {
  return (await SecureStore.getItemAsync(K_PIN)) !== null;
}

// Membuat PIN baru. Mengembalikan kode pemulihan (ditampilkan sekali).
export async function buatPin(pin: string) {
  const garam = acakHex(16);
  const kode = buatKodePemulihan();
  await SecureStore.setItemAsync(K_GARAM, garam);
  await SecureStore.setItemAsync(K_PIN, await hash(garam, pin));
  await SecureStore.setItemAsync(K_PEMULIHAN, await hash(garam, rapikanKode(kode)));
  return kode;
}

export async function cekPin(pin: string) {
  const garam = await SecureStore.getItemAsync(K_GARAM);
  const tersimpan = await SecureStore.getItemAsync(K_PIN);
  if (!garam || !tersimpan) return false;
  return (await hash(garam, pin)) === tersimpan;
}

export async function aturUlangPinDenganKode(kode: string, pinBaru: string) {
  const garam = await SecureStore.getItemAsync(K_GARAM);
  const tersimpan = await SecureStore.getItemAsync(K_PEMULIHAN);
  if (!garam || !tersimpan) return false;
  if ((await hash(garam, rapikanKode(kode))) !== tersimpan) return false;
  await SecureStore.setItemAsync(K_PIN, await hash(garam, pinBaru));
  return true;
}

// Saat membuka pemilih file atau menu bagikan, aplikasi sebentar "keluar".
// Fungsi ini mencegah kunci muncul pada saat itu.
let tundaSampai = 0;

export function tundaKunciSekali() {
  tundaSampai = Date.now() + 2 * 60 * 1000;
}

export function kunciSedangDitunda() {
  return Date.now() < tundaSampai;
}

export function akhiriTunda() {
  tundaSampai = 0;
}