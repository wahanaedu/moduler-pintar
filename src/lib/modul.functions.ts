import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText, Output, NoObjectGeneratedError } from "ai";
import { z } from "zod";
import { ModulFormSchema, ModulHasilSchema, type ModulHasil } from "./modul-schema";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

function buildPrompt(form: z.infer<typeof ModulFormSchema>) {
  return `Anda adalah ahli kurikulum Merdeka Belajar (Deep Learning) untuk sekolah ${form.tingkatSekolah} di Indonesia. Susun MODUL AJAR yang LENGKAP, KONTEKSTUAL, dan SIAP PAKAI dalam Bahasa Indonesia formal. Semua isi HARUS relevan dan konsisten dengan Materi Pokok dan Tujuan Pembelajaran; bukan sekadar template kosong.

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
3. dimensiProfilLulusan: jabarkan tiap dimensi yang dipilih (${form.profilLulusan.join(", ")}) dan JELASKAN indikator perilaku siswa yang akan diamati dalam pembelajaran "${form.materi}".
4. tujuanPembelajaran: 3–5 tujuan operasional (audience-behavior-condition-degree), pakai KKO Bloom yang bervariasi (C2–C5), semuanya membahas "${form.materi}". Nomori 1) 2) 3).
5. pemahamanBermakna: 2–3 kalimat berisi big idea/konsep esensial dari "${form.materi}" yang relevan dengan kehidupan siswa.
6. pertanyaanPemantik: 3 pertanyaan pemantik terbuka yang provokatif dan spesifik terhadap "${form.materi}". Nomori 1) 2) 3).
7. pertemuanData: TEPAT ${form.jumlahPertemuan} objek berurutan 1..${form.jumlahPertemuan}. Setiap pertemuan HARUS berbeda topik/sub-materi dan bertahap (scaffolded) menuju penguasaan "${form.materi}".
   - topik: sub-materi konkret pada pertemuan itu.
   - tujuan: 1–2 tujuan khusus pertemuan itu, KKO operasional, TURUNAN dari tujuanPembelajaran.
   - pembuka (5–10 menit): salam, doa, apersepsi terkait sub-materi, penyampaian tujuan, pemantik singkat. Tulis sebagai langkah bernomor 1) 2) 3).
   - inti (45–60 menit): TULIS SINTAKS "${form.modelPembelajaran}" secara eksplisit sebagai tahap bernomor (contoh untuk PBL: 1) Orientasi masalah, 2) Mengorganisasi belajar, dst.). Untuk tiap tahap sebutkan aktivitas guru & siswa yang spesifik dengan sub-materi pertemuan itu.
   - penutup (5–10 menit): refleksi, kesimpulan bersama, penugasan / info pertemuan berikutnya. Langkah bernomor.
8. asesmenFormatif: teknik + instrumen (mis. observasi diskusi, exit ticket, presentasi LKPD) beserta contoh indikator penilaian selama proses pembelajaran "${form.materi}".
9. asesmenSumatif: bentuk asesmen akhir (tes tulis / proyek / produk), cakupan indikator, dan cara penskoran ringkas.
10. refleksiGuru: 4–5 pertanyaan refleksi untuk guru sesudah mengajar "${form.materi}" (efektivitas strategi, kendala, tindak lanjut). Nomori.
11. refleksiSiswa: 4–5 pertanyaan refleksi bahasa siswa tentang pengalaman belajar "${form.materi}". Nomori.
12. lkpdData: TEPAT ${form.jumlahPertemuan} LKPD (1 per pertemuan, sesuai sub-materi pertemuan itu).
    - judul: menyebut sub-materi pertemuan.
    - petunjuk: langkah bernomor yang jelas untuk siswa.
    - aktivitas: soal / tugas / instruksi kerja spesifik (bukan "kerjakan soal berikut"). Sertakan minimal 3 butir aktivitas/pertanyaan konkret terkait sub-materi.
13. kuisData: MINIMAL 5 pertanyaan sumatif konkret tentang "${form.materi}" (variasi tingkat kognitif C2–C5), tiap item punya kunci JAWABAN LENGKAP (bukan hanya A/B/C), bernomor mulai 1.
14. rubrikData: MINIMAL 4 kriteria penilaian yang RELEVAN dengan tujuan pembelajaran "${form.materi}" (mis. Ketepatan Konsep, Kolaborasi, Komunikasi, Produk). Tiap kriteria WAJIB memiliki 4 deskriptor tingkat yang berbeda dan spesifik: sangatBaik, baik, cukup, perluBimbingan (masing-masing 1–2 kalimat deskriptif, bukan "sangat baik" saja).

ATURAN UMUM:
- Semua field wajib terisi. Tidak boleh string kosong, "-", "…", atau "akan ditentukan".
- Konsistenkan seluruh isi dengan Materi "${form.materi}"; jangan menyimpang ke topik lain.
- Gunakan format paragraf padat; jika berupa daftar gunakan penanda "1) 2) 3)" di dalam string.
- Tulis dalam Bahasa Indonesia baku sesuai jenjang ${form.tingkatSekolah} ${form.kelas}.`;
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

function normalizeHasil(partial: Partial<ModulHasil>, jumlahPertemuan: number): ModulHasil {
  const pertemuanData = (partial.pertemuanData ?? []).map((p, i) => ({
    pertemuan: p?.pertemuan ?? i + 1,
    topik: p?.topik ?? "",
    tujuan: p?.tujuan ?? "",
    pembuka: p?.pembuka ?? "",
    inti: p?.inti ?? "",
    penutup: p?.penutup ?? "",
  }));
  while (pertemuanData.length < jumlahPertemuan) {
    const i = pertemuanData.length;
    pertemuanData.push({ pertemuan: i + 1, topik: "", tujuan: "", pembuka: "", inti: "", penutup: "" });
  }
  return {
    judulModul: partial.judulModul ?? "",
    asesmenAwal: partial.asesmenAwal ?? "",
    dimensiProfilLulusan: partial.dimensiProfilLulusan ?? "",
    tujuanPembelajaran: partial.tujuanPembelajaran ?? "",
    pemahamanBermakna: partial.pemahamanBermakna ?? "",
    pertanyaanPemantik: partial.pertanyaanPemantik ?? "",
    pertemuanData,
    asesmenFormatif: partial.asesmenFormatif ?? "",
    asesmenSumatif: partial.asesmenSumatif ?? "",
    refleksiGuru: partial.refleksiGuru ?? "",
    refleksiSiswa: partial.refleksiSiswa ?? "",
    lkpdData: partial.lkpdData ?? [],
    kuisData: partial.kuisData ?? [],
    rubrikData: partial.rubrikData ?? [],
  };
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
  if (tooShort(h.pemahamanBermakna, 30)) missing.push("pemahamanBermakna");
  if (tooShort(h.pertanyaanPemantik, 30)) missing.push("pertanyaanPemantik");
  if (tooShort(h.asesmenFormatif, 40)) missing.push("asesmenFormatif");
  if (tooShort(h.asesmenSumatif, 40)) missing.push("asesmenSumatif");
  if (tooShort(h.refleksiGuru, 30)) missing.push("refleksiGuru");
  if (tooShort(h.refleksiSiswa, 30)) missing.push("refleksiSiswa");
  h.pertemuanData.forEach((p, i) => {
    if (tooShort(p.topik, 4) || tooShort(p.tujuan, 15) || tooShort(p.pembuka, 30) || tooShort(p.inti, 60) || tooShort(p.penutup, 30)) {
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
        hasil = output as ModulHasil;
      } catch (structuredErr) {
        // Gemini kadang menghasilkan JSON yang tidak persis sesuai schema (mis. field kosong,
        // urutan berbeda). Ambil teks mentah lalu parse manual + validasi longgar.
        if (!NoObjectGeneratedError.isInstance(structuredErr)) throw structuredErr;
        const raw = (structuredErr as { text?: string }).text ?? "";
        const jsonText = extractJson(raw);
        if (!jsonText) throw structuredErr;
        const parsed = JSON.parse(jsonText);
        hasil = ModulHasilSchema.partial().parse(parsed) as ModulHasil;
        // Isi default untuk field wajib yang kosong agar UI tidak crash.
        hasil = normalizeHasil(hasil, data.jumlahPertemuan);
      }

      // Validasi jumlah pertemuan
      if (hasil.pertemuanData.length !== data.jumlahPertemuan) {
        if (hasil.pertemuanData.length > data.jumlahPertemuan) {
          hasil = { ...hasil, pertemuanData: hasil.pertemuanData.slice(0, data.jumlahPertemuan) };
        }
      }

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
          const refined = output as ModulHasil;
          if (refined.pertemuanData.length > data.jumlahPertemuan) {
            refined.pertemuanData = refined.pertemuanData.slice(0, data.jumlahPertemuan);
          }
          const stillMissing = findMissingFields(refined, data.jumlahPertemuan);
          if (stillMissing.length < missing.length) hasil = refined;
        } catch {
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
    if (!row) {
      throw new Error(
        "Modul tidak ditemukan atau Anda tidak memiliki akses. Coba muat ulang halaman atau login ulang.",
      );
    }
    return row;
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