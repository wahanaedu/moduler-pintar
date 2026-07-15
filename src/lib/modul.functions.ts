import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText, Output, NoObjectGeneratedError } from "ai";
import { z } from "zod";
import { ModulFormSchema, ModulHasilSchema, type ModulHasil } from "./modul-schema";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

function buildPrompt(form: z.infer<typeof ModulFormSchema>) {
  return _buildPrompt(form);
}

function _buildPrompt(form: z.infer<typeof ModulFormSchema>) {
  return `Anda adalah ahli kurikulum Merdeka Belajar untuk sekolah ${form.tingkatSekolah} di Indonesia. Buat draf MODUL AJAR lengkap dalam Bahasa Indonesia formal, aktual, kontekstual, dan sesuai Kurikulum Merdeka (Deep Learning).

DATA MODUL:
- Mata Pelajaran: ${form.mapel}
- Materi Pokok: ${form.materi}
- ${form.kelas} (Fase ${form.fase})
- Alokasi waktu per pertemuan: ${form.alokasiWaktu}
- Jumlah pertemuan: TEPAT ${form.jumlahPertemuan} pertemuan
- Model Pembelajaran: ${form.modelPembelajaran}
- Dimensi Profil Lulusan Pancasila: ${form.profilLulusan.join(", ")}

ATURAN WAJIB:
1. \`pertemuanData\` HARUS berisi TEPAT ${form.jumlahPertemuan} objek, bernomor 1..${form.jumlahPertemuan}, tidak boleh kurang/lebih.
2. Setiap pertemuan: pembuka 5-10 menit, inti 45-60 menit (menggunakan sintaks ${form.modelPembelajaran}), penutup 5-10 menit.
3. \`lkpdData\`: 1 LKPD per pertemuan (total ${form.jumlahPertemuan}).
4. \`kuisData\`: minimal 5 pertanyaan sumatif dengan kunci jawaban.
5. \`rubrikData\`: minimal 4 kriteria penilaian, tiap kriteria memiliki 4 tingkat (Sangat Baik, Baik, Cukup, Perlu Bimbingan) yang deskriptif.
6. Tujuan pembelajaran menggunakan kata kerja operasional taksonomi Bloom.
7. Jangan gunakan placeholder seperti "..." atau "TBD". Semua kolom harus terisi konten nyata.
8. Gunakan format teks paragraf yang mudah dibaca, gunakan poin bernomor "1) 2) 3)" bila daftar.`;
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

      await context.supabase
        .from("moduls")
        .update({ hasil, status: "ready", error_message: null })
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
      .single();
    if (error) throw new Error(error.message);
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