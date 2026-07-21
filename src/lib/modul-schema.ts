import { z } from "zod";

export const ModulFormSchema = z.object({
  // Identitas
  namaGuru: z.string().trim().min(1, "Nama guru wajib diisi"),
  nip: z.string().trim().optional().default(""),
  sekolah: z.string().trim().min(1, "Nama sekolah wajib diisi"),
  kabupaten: z.string().trim().min(1, "Kabupaten/Kota wajib diisi"),
  provinsi: z.string().trim().optional().default(""),
  tingkatSekolah: z.enum(["SD", "SMP"]).optional().default("SD"),
  jabatan: z.enum(["guru_kelas", "guru_mapel"]),
  kepalaSekolah: z.string().trim().optional().default(""),
  nipKepalaSekolah: z.string().trim().optional().default(""),
  tanggalPembuatan: z.string().trim().min(1),
  // Modul
  mapel: z.string().trim().min(1, "Mata pelajaran wajib dipilih"),
  materi: z.string().trim().min(3, "Materi wajib diisi"),
  kelas: z.string().trim().min(1),
  fase: z.string().trim().min(1),
  jumlahPertemuan: z.number().int().min(1).max(12),
  alokasiWaktu: z.string().trim().default("2 x 35 menit"),
  modelPembelajaran: z.string().trim().min(1),
  profilLulusan: z.array(z.string()).min(1, "Pilih minimal 1 dimensi profil lulusan"),
  // Opsi tambahan konten
  tambahGambar: z.boolean().optional().default(false),
  tambahLK: z.boolean().optional().default(true),
  tambahTabel: z.boolean().optional().default(false),
});

export type ModulForm = z.infer<typeof ModulFormSchema>;

// Schema output AI (structured JSON dari Gemini).
export const PertemuanSchema = z.object({
  pertemuan: z.number().int(),
  topik: z.string(),
  tujuan: z.string().optional().default(""),
  pembuka: z.string(),
  inti: z.string(),
  penutup: z.string(),
});

export const LkpdSchema = z.object({
  pertemuan: z.number().int(),
  judul: z.string(),
  petunjuk: z.string(),
  aktivitas: z.string(),
});

export const KuisSchema = z.object({
  nomor: z.number().int(),
  pertanyaan: z.string(),
  jawaban: z.string(),
});

export const RubrikSchema = z.object({
  kriteria: z.string(),
  sangatBaik: z.string(),
  baik: z.string(),
  cukup: z.string(),
  perluBimbingan: z.string(),
});

export const ModulHasilSchema = z.object({
  judulModul: z.string(),
  asesmenAwal: z.string(),
  dimensiProfilLulusan: z.string(),
  tujuanPembelajaran: z.string(),
  pemahamanBermakna: z.string().optional().default(""),
  praktikPedagogis: z.string().optional().default(""),
  lingkunganPembelajaran: z.string().optional().default(""),
  kemitraanPembelajaran: z.string().optional().default(""),
  pemanfaatanDigital: z.string().optional().default(""),
  pertanyaanPemantik: z.string(),
  saranMedia: z.string().optional().default(""),
  pertemuanData: z.array(PertemuanSchema),
  asesmenFormatif: z.string(),
  asesmenSumatif: z.string(),
  refleksiGuru: z.string(),
  refleksiSiswa: z.string(),
  lkpdData: z.array(LkpdSchema),
  kuisData: z.array(KuisSchema),
  rubrikData: z.array(RubrikSchema),
});

export type ModulHasil = z.infer<typeof ModulHasilSchema>;