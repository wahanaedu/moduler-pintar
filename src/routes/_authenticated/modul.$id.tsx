import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getModul } from "@/lib/modul.functions";
import type { ModulHasil, ModulForm } from "@/lib/modul-schema";
import { formatKopDinas, formatPemerintahHeader } from "@/lib/modul-constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Printer, Download, Loader2, AlertTriangle } from "lucide-react";
import jsPDF from "jspdf";
import { RichText, parseRichText, countOrderedItems } from "@/lib/rich-text";
import { exportModulDocx } from "@/lib/docx-export";

export const Route = createFileRoute("/_authenticated/modul/$id")({
  component: ModulPage,
  head: () => ({ meta: [{ title: "Pratinjau Modul — ModulAjar" }] }),
});

function ModulPage() {
  const { id } = Route.useParams();
  const fetchOne = useServerFn(getModul);
  const { data, isLoading, error } = useQuery({
    queryKey: ["modul", id],
    queryFn: () => fetchOne({ data: { id } }),
    retry: false,
  });

  if (isLoading) return <div className="flex items-center justify-center py-24 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" />Memuat…</div>;
  if (error || !data) {
    return (
      <Card className="border-destructive/40 max-w-lg mx-auto">
        <CardContent className="p-8 text-center space-y-4">
          <AlertTriangle className="h-10 w-10 text-destructive mx-auto" />
          <h2 className="font-serif text-2xl font-bold">Modul Tidak Dapat Diakses</h2>
          <p className="text-muted-foreground">
            Modul ini tidak ditemukan atau dibuat oleh akun lain. Setiap modul hanya bisa dibuka
            oleh akun yang membuatnya.
          </p>
          <Link to="/dashboard"><Button variant="outline"><ArrowLeft className="h-4 w-4 mr-1.5" />Kembali ke Dasbor</Button></Link>
        </CardContent>
      </Card>
    );
  }

  if (data.status === "failed") {
    return (
      <Card className="border-destructive/40">
        <CardContent className="p-8 text-center space-y-4">
          <AlertTriangle className="h-10 w-10 text-destructive mx-auto" />
          <h2 className="font-serif text-2xl font-bold">Gagal Membuat Modul</h2>
          <p className="text-muted-foreground max-w-lg mx-auto">{data.error_message || "Terjadi kesalahan tak terduga."}</p>
          <Link to="/generate"><Button>Coba Lagi</Button></Link>
        </CardContent>
      </Card>
    );
  }

  if (data.status !== "ready" || !data.hasil) {
    return <div className="text-center py-24"><Loader2 className="h-5 w-5 animate-spin inline mr-2" />Modul masih diproses…</div>;
  }

  const hasil = data.hasil as ModulHasil;
  const form = data.form_input as ModulForm;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap no-print">
        <Link to="/dashboard"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1.5" />Kembali</Button></Link>
        <div className="flex gap-2">
          <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">Siap</Badge>
          <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="h-4 w-4 mr-1.5" />Cetak</Button>
          <Button variant="outline" size="sm" onClick={() => exportModulDocx(hasil, form)}><Download className="h-4 w-4 mr-1.5" />Word (.docx)</Button>
          <Button size="sm" onClick={() => exportPDF(hasil, form)}><Download className="h-4 w-4 mr-1.5" />Unduh PDF</Button>
        </div>
      </div>

      <Card className="print-area shadow-lg">
        <CardContent className="p-8 md:p-12 modul-content" style={{ width: "210mm", maxWidth: "100%", minHeight: "297mm", margin: "0 auto", background: "white" }}>
          {/* Kop */}
          <div className="text-center border-b-4 border-double border-foreground pb-4 mb-6">
            <p className="text-xs font-semibold">{formatPemerintahHeader(form.kabupaten)}</p>
            <p className="text-sm font-bold">{formatKopDinas(form.kabupaten)}</p>
            <p className="text-lg font-bold font-serif">{form.sekolah.toUpperCase()}</p>
            {form.alamatSekolah ? (
              <p className="text-xs italic">Alamat: {form.alamatSekolah}</p>
            ) : null}
          </div>

          <h1 className="text-center font-serif text-2xl font-bold mb-1">MODUL AJAR / RENCANA PEMBELAJARAN</h1>
          <h2 className="text-center font-serif text-xl mb-6">{hasil.judulModul}</h2>

          <table>
            <tbody>
              <Row label="Guru" value={form.namaGuru} />
              <Row label="NIP" value={form.nip || "-"} />
              <Row label="Mata Pelajaran" value={form.mapel} />
              <Row label="Kelas / Fase" value={`${form.kelas} / Fase ${form.fase}`} />
              <Row label="Alokasi Waktu" value={`${form.jumlahPertemuan} pertemuan × ${form.alokasiWaktu}`} />
              <Row label="Model Pembelajaran" value={form.modelPembelajaran} />
              <Row label="Dimensi Profil Lulusan" value={form.profilLulusan.join(", ")} />
            </tbody>
          </table>

          <Blok title="A. Asesmen Awal" body={hasil.asesmenAwal} />
          <Blok title="B. Dimensi Profil Lulusan" body={hasil.dimensiProfilLulusan} />
          <Blok title="C. Tujuan Pembelajaran" body={hasil.tujuanPembelajaran} />
          <Blok title="D. Praktik Pedagogis" body={hasil.praktikPedagogis} />
          <Blok title="E. Lingkungan Pembelajaran" body={hasil.lingkunganPembelajaran} />
          {hasil.kemitraanPembelajaran?.trim() ? (
            <Blok title="F. Kemitraan Pembelajaran (Opsional)" body={hasil.kemitraanPembelajaran} />
          ) : null}
          <Blok title={`${hasil.kemitraanPembelajaran?.trim() ? "G" : "F"}. Pemanfaatan Digital`} body={hasil.pemanfaatanDigital} />
          <Blok title={`${hasil.kemitraanPembelajaran?.trim() ? "H" : "G"}. Pertanyaan Pemantik`} body={hasil.pertanyaanPemantik} />

          <h2>{hasil.kemitraanPembelajaran?.trim() ? "I" : "H"}. Kegiatan Pembelajaran</h2>
          {hasil.pertemuanData.map((p) => {
            let n = 1;
            const pembukaStart = n; n += countOrderedItems(p.pembuka);
            const intiStart = n; n += countOrderedItems(p.inti);
            const penutupStart = n;
            return (
              <div key={p.pertemuan} className="mb-4">
                <h3>Pertemuan {p.pertemuan} — {p.topik}</h3>
                <p><strong>Kegiatan Pembuka:</strong></p>
                <RichText text={p.pembuka} startNumber={pembukaStart} />
                <p><strong>Kegiatan Inti:</strong></p>
                <RichText text={p.inti} startNumber={intiStart} />
                <p><strong>Kegiatan Penutup:</strong></p>
                <RichText text={p.penutup} startNumber={penutupStart} />
              </div>
            );
          })}

          {(() => {
            const base = hasil.kemitraanPembelajaran?.trim() ? 9 : 8; // I or H
            const L = (offset: number) => String.fromCharCode(65 + base + offset); // next letters
            return (
              <>
                <Blok title={`${L(0)}. Asesmen Formatif`} body={hasil.asesmenFormatif} />
                <Blok title={`${L(1)}. Asesmen Sumatif`} body={hasil.asesmenSumatif} />
                <Blok title={`${L(2)}. Refleksi Guru`} body={hasil.refleksiGuru} />
                <Blok title={`${L(3)}. Refleksi Siswa`} body={hasil.refleksiSiswa} />
              </>
            );
          })()}

          {/* Tanda tangan sebelum lampiran */}
          <div className="mt-12 grid grid-cols-2 gap-8 text-sm">
            <div>
              <p>Mengetahui,<br />Kepala Sekolah,</p>
              <div className="h-16" />
              <p><strong>{form.kepalaSekolah || "(_______________)"}</strong><br />NIP. {form.nipKepalaSekolah || "-"}</p>
            </div>
            <div>
              <p>{form.kabupaten}, {new Date(form.tanggalPembuatan).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}<br />Guru Kelas/Mapel,</p>
              <div className="h-16" />
              <p><strong>{form.namaGuru}</strong><br />NIP. {form.nip || "-"}</p>
            </div>
          </div>

          <h2 className="page-break">LAMPIRAN 1 — Lembar Kerja Peserta Didik (LKPD)</h2>
          {hasil.lkpdData.map((l) => (
            <div key={l.pertemuan} className="mb-4">
              <h3>LKPD Pertemuan {l.pertemuan}: {l.judul}</h3>
              <p className="text-xs font-semibold mt-2">Identitas Peserta Didik:</p>
              <table className="lkpd-identitas">
                <tbody>
                  <tr><td className="lkpd-label">Nama</td><td>&nbsp;</td><td className="lkpd-label">Kelas</td><td>&nbsp;</td></tr>
                  <tr><td className="lkpd-label">No. Absen</td><td>&nbsp;</td><td className="lkpd-label">Tanggal</td><td>&nbsp;</td></tr>
                  <tr><td className="lkpd-label">Kelompok</td><td colSpan={3}>&nbsp;</td></tr>
                </tbody>
              </table>
              <p><strong>Petunjuk:</strong></p><RichText text={l.petunjuk} />
              <p><strong>Aktivitas / Soal:</strong></p><RichText text={l.aktivitas} />
              <p className="mt-3"><strong>Lembar Jawaban Tambahan:</strong></p>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="lkpd-fill-line" />
              ))}
            </div>
          ))}

          <h2 className="page-break">LAMPIRAN 2 — Kuis Sumatif</h2>
          <ol className="rich-list">
            {hasil.kuisData.map((k) => (
              <li key={k.nomor} className="mb-2">
                <strong>{k.pertanyaan}</strong>
                <div className="text-sm italic">Jawaban: {k.jawaban}</div>
              </li>
            ))}
          </ol>

          <h2 className="page-break">LAMPIRAN 3 — Rubrik Penilaian</h2>
          <table>
            <thead>
              <tr>
                <th>Kriteria</th><th>Sangat Baik</th><th>Baik</th><th>Cukup</th><th>Perlu Bimbingan</th>
              </tr>
            </thead>
            <tbody>
              {hasil.rubrikData.map((r) => (
                <tr key={r.kriteria}>
                  <td><strong>{r.kriteria}</strong></td>
                  <td>{r.sangatBaik}</td><td>{r.baik}</td><td>{r.cukup}</td><td>{r.perluBimbingan}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <tr><td style={{ width: 220 }}><strong>{label}</strong></td><td>: {value}</td></tr>;
}
function Blok({ title, body }: { title: string; body: string }) {
  return <><h2>{title}</h2><RichText text={body} /></>;
}

function exportPDF(hasil: ModulHasil, form: ModulForm) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 15;
  const width = 210 - margin * 2;
  const pageBottom = 297 - margin;
  let y = margin;
  const line = (h = 4) => { y += h; if (y > pageBottom) { doc.addPage(); y = margin; } };
  const text = (s: string, opts?: { bold?: boolean; size?: number; center?: boolean }) => {
    doc.setFont("helvetica", opts?.bold ? "bold" : "normal");
    doc.setFontSize(opts?.size ?? 11);
    const lines = doc.splitTextToSize(s, width - (opts?.center ? 0 : 0));
    for (const l of lines) {
      if (y > pageBottom) { doc.addPage(); y = margin; }
      doc.text(l, opts?.center ? 105 : margin, y, opts?.center ? { align: "center" } : undefined);
      y += (opts?.size ?? 11) * 0.45;
    }
    y += 1;
  };
  const rich = (s: string, startNumber = 1) => {
    const blocks = parseRichText(s);
    if (!blocks.length) { text("-"); return startNumber; }
    let counter = startNumber;
    for (const b of blocks) {
      if (b.kind === "p") { text(b.text); continue; }
      const indent = 6;
      b.items.forEach((it, i) => {
        const marker = b.kind === "ol" ? `${counter + i}.` : "•";
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        const lines = doc.splitTextToSize(it, width - indent);
        lines.forEach((l: string, idx: number) => {
          if (y > pageBottom) { doc.addPage(); y = margin; }
          if (idx === 0) doc.text(marker, margin, y);
          doc.text(l, margin + indent, y);
          y += 11 * 0.45;
        });
        y += 0.5;
      });
      if (b.kind === "ol") counter += b.items.length;
      y += 1;
    }
    return counter;
  };
  text(formatPemerintahHeader(form.kabupaten), { center: true, bold: true, size: 10 });
  text(formatKopDinas(form.kabupaten), { center: true, bold: true, size: 11 });
  text(form.sekolah.toUpperCase(), { center: true, bold: true, size: 13 });
  if (form.alamatSekolah) text(`Alamat: ${form.alamatSekolah}`, { center: true, size: 9 });
  doc.setLineWidth(0.6); doc.line(margin, y, 210 - margin, y); line(2);
  text("MODUL AJAR / RENCANA PEMBELAJARAN", { center: true, bold: true, size: 14 });
  text(hasil.judulModul, { center: true, bold: true, size: 12 });
  line(2);
  const meta: [string, string][] = [
    ["Guru", form.namaGuru], ["NIP", form.nip || "-"],
    ["Mata Pelajaran", form.mapel], ["Kelas / Fase", `${form.kelas} / Fase ${form.fase}`],
    ["Alokasi Waktu", `${form.jumlahPertemuan} × ${form.alokasiWaktu}`],
    ["Model Pembelajaran", form.modelPembelajaran],
    ["Dimensi Profil Lulusan", form.profilLulusan.join(", ")],
  ];
  meta.forEach(([k, v]) => text(`${k.padEnd(24, " ")}: ${v}`, { size: 10 }));
  line(2);
  const blocks: [string, string][] = [
    ["A. Asesmen Awal", hasil.asesmenAwal],
    ["B. Dimensi Profil Lulusan", hasil.dimensiProfilLulusan],
    ["C. Tujuan Pembelajaran", hasil.tujuanPembelajaran],
    ["D. Praktik Pedagogis", hasil.praktikPedagogis],
    ["E. Lingkungan Pembelajaran", hasil.lingkunganPembelajaran],
  ];
  blocks.forEach(([t, b]) => { text(t, { bold: true, size: 12 }); rich(b); });
  const hasMitra = !!hasil.kemitraanPembelajaran?.trim();
  let letterIdx = 5; // F
  const nextLetter = () => String.fromCharCode(65 + letterIdx++);
  if (hasMitra) {
    text(`${nextLetter()}. Kemitraan Pembelajaran (Opsional)`, { bold: true, size: 12 });
    rich(hasil.kemitraanPembelajaran);
  }
  text(`${nextLetter()}. Pemanfaatan Digital`, { bold: true, size: 12 }); rich(hasil.pemanfaatanDigital);
  text(`${nextLetter()}. Pertanyaan Pemantik`, { bold: true, size: 12 }); rich(hasil.pertanyaanPemantik);
  text(`${nextLetter()}. Kegiatan Pembelajaran`, { bold: true, size: 12 });
  hasil.pertemuanData.forEach((p) => {
    text(`Pertemuan ${p.pertemuan} — ${p.topik}`, { bold: true });
    let n = 1;
    text("Kegiatan Pembuka:", { bold: true }); n = rich(p.pembuka, n);
    text("Kegiatan Inti:", { bold: true }); n = rich(p.inti, n);
    text("Kegiatan Penutup:", { bold: true }); rich(p.penutup, n);
    line(2);
  });
  const blocks2: [string, string][] = [
    [`${nextLetter()}. Asesmen Formatif`, hasil.asesmenFormatif],
    [`${nextLetter()}. Asesmen Sumatif`, hasil.asesmenSumatif],
    [`${nextLetter()}. Refleksi Guru`, hasil.refleksiGuru],
    [`${nextLetter()}. Refleksi Siswa`, hasil.refleksiSiswa],
  ];
  blocks2.forEach(([t, b]) => { text(t, { bold: true, size: 12 }); rich(b); });

  // Tanda tangan sebelum lampiran
  const tgl = new Date(form.tanggalPembuatan).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  line(6);
  text("Mengetahui,", { size: 10 });
  text("Kepala Sekolah,", { size: 10 });
  line(14);
  text(form.kepalaSekolah || "(_______________)", { bold: true, size: 10 });
  text(`NIP. ${form.nipKepalaSekolah || "-"}`, { size: 10 });
  line(4);
  text(`${form.kabupaten}, ${tgl}`, { size: 10 });
  text("Guru Kelas/Mapel,", { size: 10 });
  line(14);
  text(form.namaGuru, { bold: true, size: 10 });
  text(`NIP. ${form.nip || "-"}`, { size: 10 });

  doc.addPage(); y = margin;
  text("LAMPIRAN 1 — LKPD", { bold: true, size: 13 });
  hasil.lkpdData.forEach((l) => {
    text(`LKPD Pertemuan ${l.pertemuan}: ${l.judul}`, { bold: true });
    text("Identitas Peserta Didik:", { bold: true, size: 10 });
    text("Nama       : ______________________________     Kelas    : ______________", { size: 10 });
    text("No. Absen  : ______________________________     Tanggal  : ______________", { size: 10 });
    text("Kelompok   : ______________________________________________________________", { size: 10 });
    text("Petunjuk:", { bold: true }); rich(l.petunjuk);
    text("Aktivitas / Soal:", { bold: true }); rich(l.aktivitas);
    text("Lembar Jawaban Tambahan:", { bold: true, size: 10 });
    for (let i = 0; i < 5; i++) text("__________________________________________________________________", { size: 10 });
    line(2);
  });
  doc.addPage(); y = margin;
  text("LAMPIRAN 2 — Kuis Sumatif", { bold: true, size: 13 });
  hasil.kuisData.forEach((k, i) => {
    text(`${i + 1}. ${k.pertanyaan}`, { bold: true });
    text(`   Jawaban: ${k.jawaban}`);
  });
  doc.addPage(); y = margin;
  text("LAMPIRAN 3 — Rubrik Penilaian", { bold: true, size: 13 });
  hasil.rubrikData.forEach((r) => {
    text(r.kriteria, { bold: true });
    text(`Sangat Baik: ${r.sangatBaik}`);
    text(`Baik: ${r.baik}`);
    text(`Cukup: ${r.cukup}`);
    text(`Perlu Bimbingan: ${r.perluBimbingan}`);
    line(1);
  });
  doc.save(`${hasil.judulModul.replace(/[^\w\s-]/g, "").slice(0, 60)}.pdf`);
}
