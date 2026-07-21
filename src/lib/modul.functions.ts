import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText, Output, NoObjectGeneratedError } from "ai";
import { z } from "zod";
import { ModulFormSchema, ModulHasilSchema, type ModulHasil } from "./modul-schema";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

type ModulFormInput = z.infer<typeof ModulFormSchema>;

function buildPrompt(form: ModulFormInput) {
  const jenjang = form.tingkatSekolah || (parseInt(form.kelas.replace(/\D/g, ""), 10) <= 6 ? "SD" : "SMP");
  const opsiTambahan = [
    form.tambahGambar ? "TAMBAHAN GAMBAR/MEDIA: Isi field saranMedia dengan daftar bernomor saran gambar/foto/ilustrasi/video/audio yang cocok untuk tiap pertemuan beserta deskripsi singkat dan alasan pemakaiannya. Selain itu, pada setiap kegiatan inti, sebutkan media visual/audio yang digunakan." : "TANPA GAMBAR/MEDIA: kosongkan field saranMedia (\"\").",
    form.tambahLK ? "SERTAKAN LKPD lengkap pada lkpdData sesuai jumlah pertemuan." : "TANPA LKPD: kembalikan lkpdData sebagai array kosong []. Jangan menulis LKPD sama sekali.",
    form.tambahTabel ? "SERTAKAN TABEL yang diperlukan (mis. tabel diferensiasi/kelompok, tabel rincian aktivitas, tabel skoring) di dalam field yang relevan (asesmenFormatif / asesmenSumatif / rubrikData / pertemuan inti) menggunakan format tabel pipa Markdown, contoh:\n| Kolom 1 | Kolom 2 |\n| --- | --- |\n| isi | isi |" : "Tanpa tabel tambahan di luar rubrikData; cukup gunakan paragraf & daftar bernomor.",
  ].join("\n- ");
  return `Anda adalah ahli kurikulum Merdeka Belajar yang menerapkan PENDEKATAN PEMBELAJARAN MENDALAM (Deep Learning) untuk sekolah ${jenjang} di Indonesia. Susun MODUL AJAR yang LENGKAP, KONTEKSTUAL, dan SIAP PAKAI dalam Bahasa Indonesia formal. Semua isi HARUS relevan dan konsisten dengan Materi Pokok dan Tujuan Pembelajaran; bukan sekadar template kosong.

OPSI TAMBAHAN KONTEN (WAJIB dipatuhi):
- ${opsiTambahan}

PENDEKATAN PEMBELAJARAN MENDALAM (WAJIB dijadikan ruh seluruh modul):
- 3 PRINSIP: (a) BERKESADARAN — siswa sadar tujuan, proses, dan makna belajar (metakognisi); (b) BERMAKNA — belajar terhubung dengan kehidupan nyata, pengalaman, dan nilai siswa; (c) MENGGEMBIRAKAN — suasana aman, kolaboratif, dan memicu rasa ingin tahu. Sisipkan indikator ketiga prinsip ini pada asesmen awal, dimensi profil lulusan, kegiatan inti tiap pertemuan, refleksi guru, dan refleksi siswa.
- 3 PENGALAMAN BELAJAR yang harus MUNCUL BERURUTAN di dalam kegiatan inti setiap pertemuan dan dinyatakan EKSPLISIT sebagai penanda tahap:
  1) MEMAHAMI — mengeksplorasi konsep, membangun pengertian, mengaitkan pengetahuan awal dengan informasi baru tentang "${form.materi}".
  2) MENGAPLIKASI — menggunakan konsep untuk memecahkan masalah / mengerjakan tugas / menghasilkan produk kontekstual.
  3) MEREFLEKSI — menilai kembali proses & hasil belajar, menyadari kekuatan/kelemahan, merencanakan perbaikan.
  Padukan ketiga pengalaman ini dengan SINTAKS "${form.modelPembelajaran}" (jangan hilangkan sintaks model; sebutkan bahwa tahap X model = pengalaman MEMAHAMI/MENGAPLIKASI/MEREFLEKSI).

DATA MODUL:
- Mata Pelajaran: ${form.mapel}
- Materi Pokok (WAJIB jadi rujukan utama tiap field): ${form.materi}
- ${form.kelas} (Fase ${form.fase})
- Alokasi waktu per pertemuan: ${form.alokasiWaktu}
- Jumlah pertemuan: TEPAT ${form.jumlahPertemuan}
- Model Pembelajaran: ${form.modelPembelajaran}
- Dimensi Profil Lulusan Pancasila: ${form.profilLulusan.join(", ")}

INSTRUKSI ISI TIAP FIELD (semua wajib terisi konten nyata, minimal 2–4 kalimat kecuali disebut lain; DILARANG placeholder "...", "TBD", "sesuai kebutuhan", atau kalimat generik yang bisa dipakai untuk materi apa pun):

1. judulModul: judul menarik yang menyebut materi "${form.materi}" secara eksplisit.
2. asesmenAwal: uraikan teknik diagnostik konkret (contoh pertanyaan lisan / kuis pemetaan / observasi) beserta 3–5 CONTOH PERTANYAAN diagnostik spesifik tentang "${form.materi}" untuk memetakan pengetahuan awal peserta didik.
3. dimensiProfilLulusan: jabarkan tiap dimensi yang dipilih (${form.profilLulusan.join(", ")}) dan JELASKAN indikator perilaku siswa yang akan diamati dalam pembelajaran "${form.materi}". Kaitkan tiap dimensi dengan prinsip pembelajaran mendalam (berkesadaran / bermakna / menggembirakan).
4. tujuanPembelajaran: 3–5 tujuan operasional (audience-behavior-condition-degree), pakai KKO Bloom yang bervariasi (C2–C5), semuanya membahas "${form.materi}". Nomori 1) 2) 3).
5. praktikPedagogis: jelaskan MODEL PEMBELAJARAN "${form.modelPembelajaran}" yang dipakai beserta TAHAPAN/SINTAKS singkatnya (nomori 1) 2) 3) …). Ringkas namun konkret (3–6 kalimat).
   Format WAJIB: kalimat pertama menyebut nama model ("Model pembelajaran yang digunakan adalah ${form.modelPembelajaran}."), lalu baris berikutnya berupa DAFTAR BERNOMOR 1) 2) 3) … untuk tahapan/sintaks model tersebut, masing-masing dijelaskan singkat 1–2 kalimat kontekstual dengan materi "${form.materi}".
6. lingkunganPembelajaran: ringkas suasana & pengaturan lingkungan belajar yang dipakai — di dalam kelas (tata ruang, kelompok, sumber belajar) MAUPUN di luar kelas (halaman, perpustakaan, lingkungan sekitar) bila relevan dengan "${form.materi}". 2–4 kalimat.
7. kemitraanPembelajaran: sebutkan mitra pembelajaran yang mendukung (mis. orang tua/wali, komite, guru sejawat, narasumber, komunitas). Sifatnya OPSIONAL — jika tidak diperlukan tulis "Tidak ada mitra khusus untuk pembelajaran ini." 1–3 kalimat.
8. pemanfaatanDigital: jelaskan penggunaan alat digital dalam pembelajaran "${form.materi}" — mis. papan interaktif digital, laptop, proyektor, video, audio, aplikasi/perangkat lunak — dan bagaimana alat itu dipakai. 2–4 kalimat.
9. pertanyaanPemantik: 3 pertanyaan pemantik terbuka yang provokatif dan spesifik terhadap "${form.materi}". Nomori 1) 2) 3).
10. pertemuanData: TEPAT ${form.jumlahPertemuan} objek berurutan 1..${form.jumlahPertemuan}. Setiap objek WAJIB punya field pertemuan berupa angka (1, 2, 3, dst.). Setiap pertemuan HARUS berbeda topik/sub-materi dan bertahap (scaffolded) menuju penguasaan "${form.materi}".
   - pertemuan: angka urut pertemuan, bukan teks.
   - topik: sub-materi konkret pada pertemuan itu.
   - pembuka (5–10 menit): salam, doa, apersepsi terkait sub-materi, penyampaian tujuan, pemantik singkat, serta membangun suasana MENGGEMBIRAKAN dan BERKESADARAN (siswa menyadari apa & mengapa belajar). Tulis sebagai langkah bernomor 1) 2) 3).
   - inti (45–60 menit): TULIS SINTAKS "${form.modelPembelajaran}" secara eksplisit sebagai tahap bernomor, dan pada setiap tahap TANDAI pengalaman belajar mendalam yang dominan: [MEMAHAMI], [MENGAPLIKASI], atau [MEREFLEKSI]. Contoh format: "1) Orientasi masalah [MEMAHAMI] — ...". Sebutkan aktivitas guru & siswa yang spesifik dengan sub-materi pertemuan itu, dan bagaimana prinsip bermakna/menggembirakan diwujudkan.
   - penutup (5–10 menit): siswa MEREFLEKSI proses & hasil belajar (metakognisi), kesimpulan bersama, penugasan / info pertemuan berikutnya. Langkah bernomor.
11. asesmenFormatif: teknik + instrumen (mis. observasi diskusi, exit ticket, presentasi LKPD) beserta contoh indikator penilaian selama proses pembelajaran "${form.materi}".
12. asesmenSumatif: bentuk asesmen akhir (tes tulis / proyek / produk), cakupan indikator, dan cara penskoran ringkas.
13. refleksiGuru: 4–5 pertanyaan refleksi untuk guru sesudah mengajar "${form.materi}". Nomori.
14. refleksiSiswa: 4–5 pertanyaan refleksi bahasa siswa tentang pengalaman belajar "${form.materi}". Nomori.
15. lkpdData: TEPAT ${form.jumlahPertemuan} LKPD (1 per pertemuan, sesuai sub-materi pertemuan itu). Setiap objek WAJIB punya field pertemuan berupa angka.
    - pertemuan: angka urut pertemuan, bukan teks.
    - judul: menyebut sub-materi pertemuan.
    - petunjuk: langkah bernomor yang jelas untuk siswa, memuat isyarat MEMAHAMI → MENGAPLIKASI → MEREFLEKSI.
    - aktivitas: LKPD SIAP PAKAI berupa lembar kerja yang bisa langsung diisi siswa. WAJIB berisi MINIMAL 4 butir soal/tugas bernomor 1) 2) 3) 4). Setiap butir HARUS menyertakan RUANG JAWABAN kosong yang siap diisi dengan menulis "Jawaban: ____________________________________________" (garis bawah panjang) tepat setelah pertanyaan, atau tabel isian dengan sel-sel kosong bila cocok. Butir konkret dan spesifik terkait sub-materi (bukan "kerjakan soal berikut"), variatif (isian singkat, uraian, mencocokkan/tabel, refleksi), dan salah satunya mengajak siswa MEREFLEKSI apa yang dipelajari.
16. kuisData: MINIMAL 5 pertanyaan sumatif konkret tentang "${form.materi}" (variasi tingkat kognitif C2–C5), tiap item WAJIB punya field nomor berupa angka dan kunci JAWABAN LENGKAP (bukan hanya A/B/C), bernomor mulai 1.
17. rubrikData: MINIMAL 4 kriteria penilaian yang RELEVAN dengan tujuan pembelajaran "${form.materi}" (mis. Ketepatan Konsep, Kolaborasi, Komunikasi, Produk). Tiap kriteria WAJIB memiliki 4 deskriptor tingkat yang berbeda dan spesifik: sangatBaik, baik, cukup, perluBimbingan (masing-masing 1–2 kalimat deskriptif, bukan "sangat baik" saja).

ATURAN UMUM:
- Semua field wajib terisi. Tidak boleh string kosong, "-", "…", atau "akan ditentukan".
- Konsistenkan seluruh isi dengan Materi "${form.materi}"; jangan menyimpang ke topik lain.
- Gunakan format paragraf padat; jika berupa daftar gunakan penanda "1) 2) 3)" di dalam string.
- Tulis dalam Bahasa Indonesia baku sesuai jenjang ${jenjang} ${form.kelas}.
- Kembalikan hanya satu objek JSON yang valid sesuai nama field yang diminta, tanpa markdown dan tanpa penjelasan tambahan.`;
}

function extractJson(raw: string): string | null {
  if (!raw) return null;
  const fenced = raw.match(/```json\s*([\s\S]*?)```/i) ?? raw.match(/```\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : raw;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  return candidate.slice(start, end + 1);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function textValue(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(textValue).filter(Boolean).join("\n").trim();
  return "";
}

function pickText(fallback: string, ...values: unknown[]): string {
  for (const value of values) {
    const text = textValue(value);
    if (text) return text;
  }
  return fallback;
}

function pickNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string") {
    const parsed = Number.parseInt(value.replace(/\D/g, ""), 10);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function createFallbackHasil(form: ModulFormInput): ModulHasil {
  const pertemuanData = Array.from({ length: form.jumlahPertemuan }, (_, i) => {
    const pertemuan = i + 1;
    return {
      pertemuan,
      topik: `${form.materi} — tahap ${pertemuan}`,
      tujuan: `Peserta didik mampu menjelaskan dan menerapkan konsep ${form.materi} pada latihan kontekstual sesuai jenjang ${form.kelas}.`,
      pembuka: `1) Guru membuka pembelajaran dengan salam dan doa. 2) Guru mengaitkan pengalaman sehari-hari siswa dengan ${form.materi}. 3) Guru menyampaikan tujuan dan pertanyaan pemantik untuk pertemuan ${pertemuan}.`,
      inti: `1) Orientasi masalah: guru menyajikan contoh kasus tentang ${form.materi}. 2) Mengorganisasi belajar: siswa bekerja berpasangan/kelompok untuk mengidentifikasi informasi penting. 3) Membimbing penyelidikan: siswa mengerjakan latihan bertahap dan guru memberi umpan balik. 4) Mengembangkan hasil: siswa menyusun jawaban/produk sederhana. 5) Menganalisis proses: kelas membahas strategi yang tepat dan memperbaiki miskonsepsi.`,
      penutup: `1) Siswa dan guru menyimpulkan konsep penting ${form.materi}. 2) Siswa menulis refleksi singkat tentang hal yang sudah dipahami. 3) Guru memberi tindak lanjut berupa latihan rumah atau persiapan pertemuan berikutnya.`,
    };
  });

  const lkpdData = pertemuanData.map((p) => ({
    pertemuan: p.pertemuan,
    judul: `LKPD ${p.topik}`,
    petunjuk: `1) Bacalah instruksi dengan teliti. 2) Diskusikan contoh ${form.materi} bersama kelompok. 3) Tuliskan jawaban lengkap dan alasanmu.`,
    aktivitas: `1) Amati contoh/kasus tentang ${form.materi}. 2) Identifikasi informasi penting dan konsep yang digunakan. 3) Selesaikan tugas latihan, lalu jelaskan langkah atau alasan jawabanmu.`,
  }));

  return {
    judulModul: `Modul Ajar ${form.materi}`,
    asesmenAwal: `Guru melakukan asesmen diagnostik awal melalui tanya jawab dan kuis singkat tentang ${form.materi}. Contoh pertanyaan: 1) Apa yang sudah kamu ketahui tentang ${form.materi}? 2) Bagian mana yang menurutmu paling mudah? 3) Bagian mana yang masih membingungkan? 4) Berikan contoh penerapan ${form.materi} dalam kehidupan sehari-hari. Hasil asesmen dipakai untuk mengelompokkan kebutuhan belajar siswa.`,
    dimensiProfilLulusan: `Dimensi ${form.profilLulusan.join(", ")} dikembangkan melalui aktivitas memahami, mendiskusikan, dan menyajikan pemecahan masalah terkait ${form.materi}. Guru mengamati kemampuan siswa bertanya, memberi alasan, bekerja sama, dan menyelesaikan tugas secara bertanggung jawab.`,
    tujuanPembelajaran: `1) Peserta didik mampu menjelaskan konsep utama ${form.materi} dengan bahasa sendiri. 2) Peserta didik mampu menerapkan konsep ${form.materi} pada contoh soal atau situasi kontekstual. 3) Peserta didik mampu menganalisis kesalahan umum dan memperbaiki strategi penyelesaian terkait ${form.materi}.`,
    pemahamanBermakna: `${form.materi} membantu peserta didik memahami konsep yang berguna dalam kegiatan belajar dan kehidupan sehari-hari. Dengan menguasai materi ini, siswa dapat berpikir lebih runtut, teliti, dan mampu menjelaskan alasan dari setiap jawaban atau keputusan.`,
    praktikPedagogis: `Model pembelajaran yang digunakan adalah ${form.modelPembelajaran}. Tahapan ringkas: 1) Orientasi/penyajian masalah kontekstual tentang ${form.materi}. 2) Pengorganisasian belajar dalam kelompok kecil. 3) Bimbingan penyelidikan/latihan terstruktur. 4) Penyajian hasil karya siswa. 5) Analisis, evaluasi, dan refleksi bersama.`,
    lingkunganPembelajaran: `Pembelajaran dilaksanakan di dalam kelas yang tertata untuk diskusi kelompok, serta memanfaatkan ruang luar kelas (halaman/perpustakaan/lingkungan sekitar) bila memungkinkan. Lingkungan dijaga aman, inklusif, dan mendukung interaksi positif antarsiswa selama mempelajari ${form.materi}.`,
    kemitraanPembelajaran: `Opsional: orang tua/wali dilibatkan sebagai pendamping belajar di rumah; guru sejawat sebagai mitra kolaborasi; serta narasumber lokal (bila relevan dengan ${form.materi}) untuk memperkaya pengalaman belajar peserta didik.`,
    pemanfaatanDigital: `Pembelajaran memanfaatkan alat digital sesuai ketersediaan, antara lain: laptop/komputer guru, proyektor/LCD, papan tulis interaktif (bila tersedia), tayangan video pembelajaran, audio penjelasan, serta gambar/animasi pendukung materi ${form.materi}. Alat digital digunakan untuk memperjelas konsep, memantik diskusi, dan memperluas sumber belajar.`,
    pertanyaanPemantik: `1) Kapan kamu pernah menemukan contoh ${form.materi} dalam kehidupan sehari-hari? 2) Mengapa memahami ${form.materi} penting untuk menyelesaikan masalah? 3) Strategi apa yang dapat digunakan agar tidak keliru saat mempelajari ${form.materi}?`,
    saranMedia: form.tambahGambar
      ? `1) Gambar/foto kontekstual tentang ${form.materi} untuk membangun apersepsi. 2) Video pendek (3–5 menit) yang menjelaskan konsep utama ${form.materi}. 3) Ilustrasi/diagram sederhana untuk memperjelas hubungan antar-konsep. 4) Audio narasi atau lagu sederhana (bila relevan) untuk memperkuat ingatan.`
      : "",
    pertemuanData,
    asesmenFormatif: `Asesmen formatif dilakukan melalui observasi diskusi, pemeriksaan LKPD, dan exit ticket tentang ${form.materi}. Indikator yang diamati meliputi ketepatan konsep, kejelasan alasan, keaktifan bertanya/menjawab, dan kemampuan memperbaiki kesalahan setelah mendapat umpan balik.`,
    asesmenSumatif: `Asesmen sumatif berupa tes tertulis atau produk sederhana yang mengukur pemahaman ${form.materi}. Penskoran memperhatikan ketepatan konsep, kelengkapan langkah, kejelasan penjelasan, dan kemampuan menerapkan konsep pada konteks baru.`,
    refleksiGuru: `1) Apakah tujuan pembelajaran ${form.materi} tercapai? 2) Bagian mana yang paling sulit dipahami siswa? 3) Strategi apa yang paling efektif membantu siswa? 4) Siswa mana yang memerlukan pengayaan atau pendampingan? 5) Perbaikan apa yang perlu dilakukan pada pertemuan berikutnya?`,
    refleksiSiswa: `1) Apa hal baru yang saya pahami tentang ${form.materi}? 2) Bagian mana yang masih membingungkan? 3) Strategi belajar apa yang membantu saya hari ini? 4) Bagaimana saya dapat menggunakan materi ini di kehidupan sehari-hari?`,
    lkpdData,
    kuisData: Array.from({ length: 5 }, (_, i) => ({
      nomor: i + 1,
      pertanyaan: `Pertanyaan ${i + 1}: Jelaskan atau selesaikan contoh masalah yang berkaitan dengan ${form.materi}.`,
      jawaban: `Jawaban dinilai benar jika memuat konsep ${form.materi}, langkah yang runtut, dan alasan yang sesuai dengan konteks soal.`,
    })),
    rubrikData: [
      ["Ketepatan Konsep", "Menjelaskan konsep dengan tepat, lengkap, dan mampu memberi contoh relevan.", "Menjelaskan konsep dengan tepat meskipun contoh masih terbatas.", "Menjelaskan sebagian konsep namun masih terdapat kekeliruan kecil.", "Masih memerlukan bimbingan untuk memahami konsep dasar."],
      ["Proses Penyelesaian", "Langkah kerja sangat runtut, logis, dan mandiri.", "Langkah kerja runtut dengan sedikit arahan.", "Langkah kerja sebagian benar tetapi belum konsisten.", "Langkah kerja belum runtut dan membutuhkan pendampingan intensif."],
      ["Komunikasi", "Menyampaikan ide secara jelas, lengkap, dan menggunakan istilah yang sesuai.", "Menyampaikan ide dengan cukup jelas dan mudah dipahami.", "Menyampaikan ide secara singkat namun belum lengkap.", "Masih kesulitan menyampaikan ide atau alasan jawaban."],
      ["Kolaborasi dan Sikap", "Aktif membantu kelompok, menghargai pendapat, dan bertanggung jawab.", "Bekerja sama dengan baik dan menyelesaikan tugas.", "Bekerja sama tetapi masih perlu diingatkan untuk fokus.", "Masih memerlukan bimbingan untuk berpartisipasi dalam kelompok."],
    ].map(([kriteria, sangatBaik, baik, cukup, perluBimbingan]) => ({ kriteria, sangatBaik, baik, cukup, perluBimbingan })),
  };
}

function normalizeHasil(partial: unknown, form: ModulFormInput): ModulHasil {
  const source = asRecord(partial);
  const fallback = createFallbackHasil(form);
  const rawPertemuan = asArray(source.pertemuanData);
  const pertemuanData = Array.from({ length: form.jumlahPertemuan }, (_, i) => {
    const row = asRecord(rawPertemuan[i]);
    const base = fallback.pertemuanData[i];
    return {
      pertemuan: pickNumber(row.pertemuan, i + 1),
      topik: pickText(base.topik, row.topik, row.subMateri, row.materi),
      tujuan: pickText(base.tujuan, row.tujuan, row.tujuanPembelajaran),
      pembuka: pickText(base.pembuka, row.pembuka, row.kegiatanPembuka),
      inti: pickText(base.inti, row.inti, row.kegiatanInti),
      penutup: pickText(base.penutup, row.penutup, row.kegiatanPenutup),
    };
  });

  const rawLkpd = asArray(source.lkpdData);
  const lkpdData = form.tambahLK === false
    ? []
    : Array.from({ length: form.jumlahPertemuan }, (_, i) => {
    const row = asRecord(rawLkpd[i]);
    const base = fallback.lkpdData[i];
    return {
      pertemuan: pickNumber(row.pertemuan, i + 1),
      judul: pickText(base.judul, row.judul, row.title),
      petunjuk: pickText(base.petunjuk, row.petunjuk, row.instruksi),
      aktivitas: pickText(base.aktivitas, row.aktivitas, row.tugas, row.pertanyaan),
    };
  });

  const kuisData = asArray(source.kuisData)
    .map((item, i) => {
      const row = asRecord(item);
      return {
        nomor: pickNumber(row.nomor, i + 1),
        pertanyaan: pickText("", row.pertanyaan, row.soal, row.question),
        jawaban: pickText("", row.jawaban, row.kunciJawaban, row.answer),
      };
    })
    .filter((item) => item.pertanyaan || item.jawaban);
  while (kuisData.length < 5) kuisData.push(fallback.kuisData[kuisData.length]);

  const rubrikData = asArray(source.rubrikData)
    .map((item, i) => {
      const row = asRecord(item);
      const base = fallback.rubrikData[i % fallback.rubrikData.length];
      return {
        kriteria: pickText(base.kriteria, row.kriteria, row.aspek),
        sangatBaik: pickText(base.sangatBaik, row.sangatBaik, row["sangat baik"], row.level4),
        baik: pickText(base.baik, row.baik, row.level3),
        cukup: pickText(base.cukup, row.cukup, row.level2),
        perluBimbingan: pickText(base.perluBimbingan, row.perluBimbingan, row["perlu bimbingan"], row.level1),
      };
    })
    .filter((item) => item.kriteria);
  while (rubrikData.length < 4) rubrikData.push(fallback.rubrikData[rubrikData.length]);

  const normalized: ModulHasil = {
    judulModul: pickText(fallback.judulModul, source.judulModul, source.judul),
    asesmenAwal: pickText(fallback.asesmenAwal, source.asesmenAwal, source.asesmenDiagnostik),
    dimensiProfilLulusan: pickText(fallback.dimensiProfilLulusan, source.dimensiProfilLulusan, source.profilLulusan),
    tujuanPembelajaran: pickText(fallback.tujuanPembelajaran, source.tujuanPembelajaran, source.tujuan),
    pemahamanBermakna: pickText(fallback.pemahamanBermakna, source.pemahamanBermakna),
    praktikPedagogis: pickText(fallback.praktikPedagogis, source.praktikPedagogis, source.praktik, source.modelPembelajaranDetail),
    lingkunganPembelajaran: pickText(fallback.lingkunganPembelajaran, source.lingkunganPembelajaran, source.lingkungan),
    kemitraanPembelajaran: pickText(fallback.kemitraanPembelajaran, source.kemitraanPembelajaran, source.kemitraan),
    pemanfaatanDigital: pickText(fallback.pemanfaatanDigital, source.pemanfaatanDigital, source.digital, source.alatDigital),
    pertanyaanPemantik: pickText(fallback.pertanyaanPemantik, source.pertanyaanPemantik),
    saranMedia: form.tambahGambar
      ? pickText(fallback.saranMedia, source.saranMedia, source.mediaSaran, source.media)
      : "",
    pertemuanData,
    asesmenFormatif: pickText(fallback.asesmenFormatif, source.asesmenFormatif),
    asesmenSumatif: pickText(fallback.asesmenSumatif, source.asesmenSumatif),
    refleksiGuru: pickText(fallback.refleksiGuru, source.refleksiGuru),
    refleksiSiswa: pickText(fallback.refleksiSiswa, source.refleksiSiswa),
    lkpdData,
    kuisData,
    rubrikData,
  };

  return ModulHasilSchema.parse(normalized);
}

function parseRawHasil(raw: string, form: ModulFormInput): ModulHasil | null {
  const jsonText = extractJson(raw);
  if (!jsonText) return null;
  try {
    return normalizeHasil(JSON.parse(jsonText), form);
  } catch {
    return null;
  }
}

function tooShort(s: string | undefined, min = 20): boolean {
  return !s || s.trim().length < min;
}

function findMissingFields(h: ModulHasil, jumlahPertemuan: number): string[] {
  const missing: string[] = [];
  if (tooShort(h.judulModul, 8)) missing.push("judulModul");
  if (tooShort(h.asesmenAwal, 40)) missing.push("asesmenAwal");
  if (tooShort(h.dimensiProfilLulusan, 40)) missing.push("dimensiProfilLulusan");
  if (tooShort(h.tujuanPembelajaran, 40)) missing.push("tujuanPembelajaran");
  if (tooShort(h.praktikPedagogis, 30)) missing.push("praktikPedagogis");
  if (tooShort(h.lingkunganPembelajaran, 30)) missing.push("lingkunganPembelajaran");
  if (tooShort(h.pemanfaatanDigital, 30)) missing.push("pemanfaatanDigital");
  if (tooShort(h.pertanyaanPemantik, 30)) missing.push("pertanyaanPemantik");
  if (tooShort(h.asesmenFormatif, 40)) missing.push("asesmenFormatif");
  if (tooShort(h.asesmenSumatif, 40)) missing.push("asesmenSumatif");
  if (tooShort(h.refleksiGuru, 30)) missing.push("refleksiGuru");
  if (tooShort(h.refleksiSiswa, 30)) missing.push("refleksiSiswa");
  h.pertemuanData.forEach((p, i) => {
    if (tooShort(p.topik, 4) || tooShort(p.pembuka, 30) || tooShort(p.inti, 60) || tooShort(p.penutup, 30)) {
      missing.push(`pertemuanData[${i + 1}]`);
    }
  });
  if (h.lkpdData.length < jumlahPertemuan) missing.push("lkpdData(jumlah)");
  h.lkpdData.forEach((l, i) => {
    if (tooShort(l.judul, 4) || tooShort(l.petunjuk, 20) || tooShort(l.aktivitas, 40)) missing.push(`lkpdData[${i + 1}]`);
  });
  if (h.kuisData.length < 5) missing.push("kuisData(<5)");
  if (h.rubrikData.length < 4) missing.push("rubrikData(<4)");
  h.rubrikData.forEach((r, i) => {
    if (tooShort(r.sangatBaik, 10) || tooShort(r.baik, 10) || tooShort(r.cukup, 10) || tooShort(r.perluBimbingan, 10)) missing.push(`rubrikData[${i + 1}]`);
  });
  return missing;
}

export const generateModul = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ModulFormSchema.parse(input))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      throw new Error("LOVABLE_API_KEY belum dikonfigurasi. Hubungi admin.");
    }

    const gateway = createLovableAiGatewayProvider(apiKey);
    const model = gateway("google/gemini-3-flash-preview");

    // Simpan record draft dulu supaya kelihatan di riwayat meski AI gagal
    const { data: draft, error: draftErr } = await context.supabase
      .from("moduls")
      .insert({
        user_id: context.userId,
        mapel: data.mapel,
        materi: data.materi,
        kelas: data.kelas,
        fase: data.fase,
        jumlah_pertemuan: data.jumlahPertemuan,
        model_pembelajaran: data.modelPembelajaran,
        profil_lulusan: data.profilLulusan,
        form_input: data,
        status: "generating",
      })
      .select("id")
      .single();
    if (draftErr || !draft) throw new Error(`Gagal menyimpan draf: ${draftErr?.message ?? "unknown"}`);

    try {
      let hasil: ModulHasil;
      try {
        const { output } = await generateText({
          model,
          output: Output.object({ schema: ModulHasilSchema }),
          prompt: buildPrompt(data),
        });
        hasil = normalizeHasil(output, data);
      } catch (structuredErr) {
        // Gemini kadang menghasilkan JSON yang tidak persis sesuai schema (mis. field kosong,
        // urutan berbeda). Ambil teks mentah lalu parse manual + validasi longgar.
        if (!NoObjectGeneratedError.isInstance(structuredErr)) throw structuredErr;
        const raw = (structuredErr as { text?: string }).text ?? "";
        const repaired = parseRawHasil(raw, data);
        if (!repaired) throw structuredErr;
        hasil = repaired;
      }

      hasil = normalizeHasil(hasil, data);

      // Completeness check: jika ada field wajib yang masih kosong/terlalu pendek,
      // minta AI melengkapi sekali lagi dengan konteks hasil saat ini.
      const missing = findMissingFields(hasil, data.jumlahPertemuan);
      if (missing.length > 0) {
        try {
          const fixPrompt = `${buildPrompt(data)}

DRAF SAAT INI MASIH KURANG LENGKAP. Field / bagian berikut MASIH KOSONG atau terlalu pendek dan WAJIB DIISI ULANG SECARA PENUH, kontekstual, dan konsisten dengan Materi "${data.materi}":
${missing.map((m) => `- ${m}`).join("\n")}

Kembalikan SELURUH objek modul ajar (bukan hanya field yang kurang) dengan semua field terisi utuh sesuai instruksi di atas. Draf sebelumnya (jangan diulang mentah, perbaiki & lengkapi):
${JSON.stringify(hasil).slice(0, 6000)}`;
          const { output } = await generateText({
            model,
            output: Output.object({ schema: ModulHasilSchema }),
            prompt: fixPrompt,
          });
          const refined = normalizeHasil(output, data);
          const stillMissing = findMissingFields(refined, data.jumlahPertemuan);
          if (stillMissing.length < missing.length) hasil = refined;
        } catch (refineErr) {
          if (NoObjectGeneratedError.isInstance(refineErr)) {
            const repaired = parseRawHasil((refineErr as { text?: string }).text ?? "", data);
            if (repaired && findMissingFields(repaired, data.jumlahPertemuan).length < missing.length) hasil = repaired;
          }
          // Diamkan; tetap simpan hasil awal agar user tidak kehilangan draf.
        }
      }

      await context.supabase
        .from("moduls")
        .update({
          hasil,
          status: "ready",
          error_message: findMissingFields(hasil, data.jumlahPertemuan).length
            ? `Beberapa bagian mungkin belum lengkap: ${findMissingFields(hasil, data.jumlahPertemuan).slice(0, 5).join(", ")}`
            : null,
        })
        .eq("id", draft.id);

      return { id: draft.id, hasil };
    } catch (err) {
      let message = "Terjadi kesalahan tak terduga saat generate modul.";
      if (err instanceof Error) {
        const raw = err.message || "";
        if (raw.includes("429")) message = "Terlalu banyak permintaan ke AI. Silakan tunggu sebentar dan coba lagi.";
        else if (raw.includes("402")) message = "Kredit AI telah habis. Silakan tambah kredit di pengaturan workspace.";
        else if (raw.includes("400")) message = "Permintaan ditolak AI. Coba sederhanakan materi atau kurangi jumlah pertemuan.";
        else if (NoObjectGeneratedError.isInstance(err)) message = "AI tidak menghasilkan struktur JSON yang valid. Silakan coba lagi.";
        else message = `Koneksi ke AI gagal: ${raw.slice(0, 200)}`;
      }
      await context.supabase
        .from("moduls")
        .update({ status: "failed", error_message: message })
        .eq("id", draft.id);
      throw new Error(message);
    }
  });

export const listModuls = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("moduls")
      .select("id, mapel, materi, kelas, status, error_message, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getModul = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("moduls")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row; // may be null when not found or blocked by RLS; UI handles it
  });

export const getProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("*")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      full_name: z.string().optional(),
      nip: z.string().optional(),
      sekolah: z.string().optional(),
      kabupaten: z.string().optional(),
      provinsi: z.string().optional(),
      tingkat_sekolah: z.string().optional(),
      jabatan: z.enum(["guru_kelas", "guru_mapel"]).optional(),
      kepala_sekolah: z.string().optional(),
      nip_kepala_sekolah: z.string().optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update(data)
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getKelasLock = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("kelas_terkunci, kelas_changes_remaining")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return {
      kelas: (data?.kelas_terkunci as string | null) ?? null,
      changesRemaining: (data?.kelas_changes_remaining as number | null) ?? 1,
    };
  });

export const setKelasLock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ kelas: z.string().trim().min(1) }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: current, error: readErr } = await context.supabase
      .from("profiles")
      .select("kelas_terkunci, kelas_changes_remaining")
      .eq("id", context.userId)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);

    const currentKelas = (current?.kelas_terkunci as string | null) ?? null;
    const remaining = (current?.kelas_changes_remaining as number | null) ?? 1;

    if (currentKelas === data.kelas) return { ok: true, kelas: data.kelas, changesRemaining: remaining };

    // First selection (no decrement) vs a real change (decrement).
    let nextRemaining = remaining;
    if (currentKelas !== null) {
      if (remaining <= 0) throw new Error("Kelas terkunci sudah diubah sebelumnya dan tidak dapat diubah lagi.");
      nextRemaining = remaining - 1;
    }

    const { error: updErr } = await context.supabase
      .from("profiles")
      .update({ kelas_terkunci: data.kelas, kelas_changes_remaining: nextRemaining })
      .eq("id", context.userId);
    if (updErr) throw new Error(updErr.message);
    return { ok: true, kelas: data.kelas, changesRemaining: nextRemaining };
  });