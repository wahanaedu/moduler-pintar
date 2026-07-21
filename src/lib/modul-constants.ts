// Konstanta domain untuk generator modul ajar.

export const PILIHAN_MAPEL = [
  "Bahasa Indonesia",
  "Bahasa Inggris",
  "Ilmu Pengetahuan Alam (IPA)",
  "Ilmu Pengetahuan Sosial (IPS)",
  "IPAS",
  "Informatika",
  "Kimia",
  "Matematika",
  "Pendidikan Pancasila",
  "Seni Rupa",
  "PJOK (Pendidikan Jasmani, Olahraga, dan Kesehatan)",
  "Seni Musik",
  "Seni Tari",
  "Seni Teater/Drama",
] as const;

export const PILIHAN_KELAS = [
  "Kelas 1", "Kelas 2", "Kelas 3", "Kelas 4", "Kelas 5", "Kelas 6",
  "Kelas 7", "Kelas 8", "Kelas 9",
] as const;

export const PILIHAN_MODEL_PEMBELAJARAN = [
  "Problem Based Learning (PBL)",
  "Project Based Learning (PjBL)",
  "Discovery Learning",
  "Inquiry Learning",
  "Cooperative Learning",
  "Problem Solving",
  "STEM Learning",
  "Blended Learning",
  "Demonstration Method",
  "Contextual Teaching and Learning (CTL)",
] as const;

export const PILIHAN_PROFIL_LULUSAN = [
  "Keimanan dan Ketakwaan",
  "Kewargaan",
  "Penalaran Kritis",
  "Kreativitas",
  "Kolaborasi",
  "Kemandirian",
  "Kesehatan",
  "Komunikasi",
] as const;

export const PROFIL_MATERI_DEFAULT: Record<string, { materi: string; fase: string }> = {
  "Bahasa Indonesia": { materi: "Menggunakan Kata Sifat dalam Karangan Deskripsi", fase: "B" },
  "Bahasa Inggris": { materi: "Telling Time and Simple Routines", fase: "B" },
  "Ilmu Pengetahuan Alam (IPA)": { materi: "Sistem Organisasi Kehidupan Seluler", fase: "D" },
  "Ilmu Pengetahuan Sosial (IPS)": { materi: "Interaksi Sosial dan Sosialisasi dalam Masyarakat", fase: "D" },
  "IPAS": { materi: "Pengaruh Gaya Magnet Terhadap Benda", fase: "B" },
  "Informatika": { materi: "Berpikir Komputasional dan Logika Algoritma", fase: "D" },
  "Kimia": { materi: "Metode Pemisahan Campuran Sederhana", fase: "D" },
  "Matematika": { materi: "Membandingkan dan Mengurutkan Pecahan", fase: "C" },
  "Pendidikan Pancasila": { materi: "Menghargai Keberagaman Suku dan Budaya Nusantara", fase: "B" },
  "Seni Rupa": { materi: "Membuat Pola Dekoratif Seni Tradisional", fase: "B" },
  "PJOK (Pendidikan Jasmani, Olahraga, dan Kesehatan)": { materi: "Kombinasi Gerak Dasar Lokomotor dan Non-Lokomotor", fase: "B" },
  "Seni Musik": { materi: "Mengenal Bunyi dan Irama Musik Tradisional", fase: "B" },
  "Seni Tari": { materi: "Eksplorasi Gerak Tari Bertema Hewan Nusantara", fase: "B" },
  "Seni Teater/Drama": { materi: "Bermain Peran Menggunakan Pantomim Sederhana", fase: "B" },
};

export function formatKopDinas(kabupaten: string): string {
  if (!kabupaten) return "DINAS PENDIDIKAN";
  const clean = kabupaten.trim().toUpperCase();
  if (clean.includes("KOTA")) return `DINAS PENDIDIKAN ${clean}`;
  if (clean.startsWith("KAB")) return `DINAS PENDIDIKAN ${clean}`;
  return `DINAS PENDIDIKAN KABUPATEN ${clean}`;
}

// Baris paling atas kop: "PEMERINTAH KABUPATEN X" atau "PEMERINTAH KOTA X"
// sesuai isian pengguna. Kalau pengguna sudah menuliskan "Kabupaten"/"Kota"
// di depan nama daerah, gunakan apa adanya; kalau tidak, tambahkan "KABUPATEN".
export function formatPemerintahHeader(kabupaten: string): string {
  if (!kabupaten) return "PEMERINTAH REPUBLIK INDONESIA";
  const clean = kabupaten.trim().toUpperCase();
  if (clean.startsWith("PEMERINTAH")) return clean;
  if (clean.includes("KOTA")) return `PEMERINTAH ${clean}`;
  if (clean.startsWith("KAB")) return `PEMERINTAH ${clean}`;
  return `PEMERINTAH KABUPATEN ${clean}`;
}