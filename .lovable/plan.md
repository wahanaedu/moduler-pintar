# Migrasi Generator Modul Ajar ke Lovable

## Diagnosis error 403

Di HTML lama, generate modul memanggil `APPS_SCRIPT_URL` (Google Apps Script) yang meneruskan ke Gemini API. Status **403** artinya deployment Apps Script itu sudah tidak accessible (bisa karena kuota, deployment dinonaktifkan, atau akses "Anyone" dicabut). Pesan "koneksi AI daring gagal setelah percobaan" berasal dari blok retry di frontend yang menyerah setelah 3 percobaan.

Perbaikan: hilangkan Apps Script sepenuhnya. Panggil Gemini langsung lewat **Lovable AI Gateway** dari server function (aman, tidak butuh key user, tidak bocor di frontend).

## Yang akan dibangun

**Backend (Lovable Cloud + AI Gateway)**
- Enable Lovable Cloud (untuk auth guru + simpan riwayat modul).
- Tabel: `profiles`, `user_roles` (admin/user), `moduls` (menyimpan hasil generate), `activations` (bukti pembayaran).
- RLS: user hanya lihat modul & profil sendiri; admin lihat semua via `has_role`.
- Storage bucket `payment-proofs` untuk bukti transfer.
- Server function `generateModul` — panggil `google/gemini-3-flash-preview` via AI Gateway dengan **structured output** (schema JSON untuk tujuan pembelajaran, pertemuan, LKPD, rubrik, dst) — jauh lebih andal daripada parsing JSON string mentah.
- Error handling eksplisit: 429 (rate limit), 402 (kredit habis), 400 (input invalid) — pesan Bahasa Indonesia ke UI.

**Frontend (TanStack Start + React + Tailwind + shadcn)**
Route:
- `/` — landing (hero, fitur, CTA login)
- `/auth` — login & register (Lovable Cloud auth, email/password)
- `/dashboard` — form input modul + tombol Generate
- `/dashboard/preview/$id` — preview modul + tombol export PDF/DOCX + cetak
- `/dashboard/riwayat` — daftar modul tersimpan
- `/admin` — panel admin (aktivasi user, verifikasi bukti bayar)

Fitur form (dipertahankan dari HTML lama):
- Identitas guru & sekolah, kop dinas otomatis (Kota/Kabupaten).
- Pilih mapel, kelas, fase, jml pertemuan, model pembelajaran, dimensi profil lulusan.
- Auto-fill materi default per mapel.
- Guru Kelas / Guru Mapel switch (mempengaruhi tanda tangan).

Output modul (rendered dari JSON terstruktur):
- Kop dinas + identitas
- A. Asesmen Diagnostik  B. Dimensi Profil Lulusan  C. Tujuan Pembelajaran
- D. Pemahaman Bermakna & Pertanyaan Pemantik
- E. Skenario Pembelajaran per pertemuan (Pembuka/Inti/Penutup, tepat jumlah pertemuan)
- F. Asesmen Formatif & Sumatif  G. Refleksi Guru & Siswa
- Lampiran: LKPD, Kuis, Rubrik 4 tingkat, Rekap Nilai
- Tanda tangan Kepala Sekolah & Guru

Export:
- **PDF** via `jspdf` + `jspdf-autotable` (client-side, A4, page-break otomatis) — lebih andal daripada PDF generator manual di HTML lama.
- **DOCX** via `docx` package.
- **Print** via `window.print()` + CSS `@media print`.

## Perbaikan reliability spesifik terhadap bug HTML lama

1. **Ganti Apps Script → AI Gateway** (fix 403 utama).
2. **Structured output (JSON Schema)** dikirim ke model → hilangkan parsing regex/JSON-repair yang rapuh.
3. **Retry hanya untuk 429/5xx** dengan exponential backoff; 4xx lain langsung tampil pesan jelas — tidak diam-diam loop.
4. **Validasi input Zod** sebelum panggil AI (mapel, kelas, jumlah pertemuan 1–20, dsb).
5. **Prompt terkunci** meminta tepat N pertemuan, memvalidasi jumlah di server sebelum simpan.
6. **Progress bar realistis** (server function async → polling status), bukan setTimeout palsu.
7. **Simpan hasil di DB** sehingga user tidak kehilangan modul saat refresh.
8. **Dark mode & mobile responsive** dipertahankan.

## Design system

- Nuansa akademik profesional: primary indigo/biru tua, aksen amber (bukan default purple template).
- Font: Inter (sans) + Playfair Display (serif untuk judul modul).
- Semua warna via token oklch di `src/styles.css`. Variant tombol khusus (`hero`, `academic`).

## Teknis (untuk developer)

- Stack: TanStack Start + React 19 + Tailwind v4 + shadcn + TanStack Query.
- `createServerFn` untuk generate modul (bukan edge function Supabase).
- `@ai-sdk/openai-compatible` + helper `createLovableAiGatewayProvider` di `src/lib/ai-gateway.server.ts`.
- Model: `google/gemini-3-flash-preview`.
- Auth: Supabase Auth via Lovable Cloud, middleware `requireSupabaseAuth`.
- Roles: enum `app_role` + tabel `user_roles` + security-definer `has_role()`.

## Ruang lingkup awal (turn ini)

Karena scope besar, saya akan kerjakan **fase 1** sekarang:
1. Enable Lovable Cloud.
2. Migration DB (profiles, user_roles, moduls, activations, storage bucket).
3. Design system + landing page + auth pages.
4. Dashboard form + server function `generateModul` (AI Gateway, structured output).
5. Preview modul + export PDF.

**Fase 2** (turn berikut, kalau fase 1 sudah oke): admin panel, upload bukti bayar, export DOCX, riwayat, rubrik/rekap nilai lampiran, tanda tangan.

Setuju lanjut fase 1?