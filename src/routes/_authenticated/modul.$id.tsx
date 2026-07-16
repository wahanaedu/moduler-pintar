import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getModul } from "@/lib/modul.functions";
import type { ModulHasil, ModulForm } from "@/lib/modul-schema";
import { formatKopDinas } from "@/lib/modul-constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Printer, Download, Loader2, AlertTriangle } from "lucide-react";
import jsPDF from "jspdf";

export const Route = createFileRoute("/_authenticated/modul/$id")({
  component: ModulPage,
  head: () => ({ meta: [{ title: "Pratinjau Modul — ModulAjar" }] }),
});

function ModulPage() {
  const { id } = Route.useParams();
  const fetchOne = useServerFn(getModul);
  const { data, isLoading } = useQuery({
    queryKey: ["modul", id],
    queryFn: () => fetchOne({ data: { id } }),
  });

  if (isLoading) return <div className="flex items-center justify-center py-24 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" />Memuat…</div>;
  if (!data) return <div className="text-center py-24">Modul tidak ditemukan.</div>;

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
          <Button size="sm" onClick={() => exportPDF(hasil, form)}><Download className="h-4 w-4 mr-1.5" />Unduh PDF</Button>
        </div>
      </div>

      <Card className="print-area shadow-lg">
        <CardContent className="p-8 md:p-12 modul-content">
          {/* Kop */}
          <div className="text-center border-b-4 border-double border-foreground pb-4 mb-6">
            <p className="text-xs">PEMERINTAH {form.provinsi.toUpperCase()}</p>
            <p className="text-sm font-bold">{formatKopDinas(form.kabupaten)}</p>
            <p className="text-lg font-bold font-serif">{form.sekolah.toUpperCase()}</p>
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
          <Blok title="B. Tujuan Pembelajaran" body={hasil.tujuanPembelajaran} />
          <Blok title="C. Pemahaman Bermakna" body={hasil.pemahamanBermakna} />
          <Blok title="D. Pertanyaan Pemantik" body={hasil.pertanyaanPemantik} />

          <h2>E. Kegiatan Pembelajaran</h2>
          {hasil.pertemuanData.map((p) => (
            <div key={p.pertemuan} className="mb-4">
              <h3>Pertemuan {p.pertemuan} — {p.topik}</h3>
              <p><strong>Tujuan:</strong> {p.tujuan}</p>
              <p><strong>Kegiatan Pembuka:</strong> {p.pembuka}</p>
              <p><strong>Kegiatan Inti:</strong> {p.inti}</p>
              <p><strong>Kegiatan Penutup:</strong> {p.penutup}</p>
            </div>
          ))}

          <Blok title="F. Asesmen Formatif" body={hasil.asesmenFormatif} />
          <Blok title="G. Asesmen Sumatif" body={hasil.asesmenSumatif} />
          <Blok title="H. Refleksi Guru" body={hasil.refleksiGuru} />
          <Blok title="I. Refleksi Siswa" body={hasil.refleksiSiswa} />

          <h2 className="page-break">LAMPIRAN 1 — Lembar Kerja Peserta Didik (LKPD)</h2>
          {hasil.lkpdData.map((l) => (
            <div key={l.pertemuan} className="mb-4">
              <h3>LKPD Pertemuan {l.pertemuan}: {l.judul}</h3>
              <p><strong>Petunjuk:</strong> {l.petunjuk}</p>
              <p><strong>Aktivitas:</strong> {l.aktivitas}</p>
            </div>
          ))}

          <h2 className="page-break">LAMPIRAN 2 — Kuis Sumatif</h2>
          <ol>
            {hasil.kuisData.map((k) => (
              <li key={k.nomor} className="mb-2">
                <p><strong>{k.pertanyaan}</strong></p>
                <p className="text-sm italic">Jawaban: {k.jawaban}</p>
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
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <tr><td style={{ width: 220 }}><strong>{label}</strong></td><td>: {value}</td></tr>;
}
function Blok({ title, body }: { title: string; body: string }) {
  return <><h2>{title}</h2><p style={{ whiteSpace: "pre-wrap" }}>{body}</p></>;
}

function exportPDF(hasil: ModulHasil, form: ModulForm) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 18;
  const width = 210 - margin * 2;
  let y = margin;
  const line = (h = 6) => { y += h; if (y > 280) { doc.addPage(); y = margin; } };
  const text = (s: string, opts?: { bold?: boolean; size?: number; center?: boolean }) => {
    doc.setFont("helvetica", opts?.bold ? "bold" : "normal");
    doc.setFontSize(opts?.size ?? 11);
    const lines = doc.splitTextToSize(s, width);
    for (const l of lines) {
      if (y > 280) { doc.addPage(); y = margin; }
      doc.text(l, opts?.center ? 105 : margin, y, opts?.center ? { align: "center" } : undefined);
      y += (opts?.size ?? 11) * 0.45;
    }
    y += 1;
  };
  text(`PEMERINTAH ${form.provinsi.toUpperCase()}`, { center: true, size: 10 });
  text(formatKopDinas(form.kabupaten), { center: true, bold: true, size: 11 });
  text(form.sekolah.toUpperCase(), { center: true, bold: true, size: 13 });
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
    ["B. Tujuan Pembelajaran", hasil.tujuanPembelajaran],
    ["C. Pemahaman Bermakna", hasil.pemahamanBermakna],
    ["D. Pertanyaan Pemantik", hasil.pertanyaanPemantik],
  ];
  blocks.forEach(([t, b]) => { text(t, { bold: true, size: 12 }); text(b); });
  text("E. Kegiatan Pembelajaran", { bold: true, size: 12 });
  hasil.pertemuanData.forEach((p) => {
    text(`Pertemuan ${p.pertemuan} — ${p.topik}`, { bold: true });
    text(`Tujuan: ${p.tujuan}`);
    text(`Pembuka: ${p.pembuka}`);
    text(`Inti: ${p.inti}`);
    text(`Penutup: ${p.penutup}`); line(2);
  });
  doc.save(`${hasil.judulModul.replace(/[^\w\s-]/g, "").slice(0, 60)}.pdf`);
}
