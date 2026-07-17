import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle, LevelFormat,
  PageOrientation, ShadingType,
} from "docx";
import { parseRichText } from "./rich-text";
import type { ModulHasil, ModulForm } from "./modul-schema";
import { formatKopDinas } from "./modul-constants";

function richParagraphs(text: string | undefined | null): Paragraph[] {
  const blocks = parseRichText(text);
  if (!blocks.length) return [new Paragraph({ children: [new TextRun("-")] })];
  const out: Paragraph[] = [];
  for (const b of blocks) {
    if (b.kind === "p") {
      out.push(new Paragraph({ children: [new TextRun(b.text)], spacing: { after: 120 } }));
    } else if (b.kind === "ol") {
      b.items.forEach((t) => out.push(new Paragraph({
        children: [new TextRun(t)],
        numbering: { reference: "numlist", level: 0 },
      })));
    } else {
      b.items.forEach((t) => out.push(new Paragraph({
        children: [new TextRun(t)],
        numbering: { reference: "bulletlist", level: 0 },
      })));
    }
  }
  return out;
}

function heading(text: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel] = HeadingLevel.HEADING_2) {
  return new Paragraph({ heading: level, children: [new TextRun({ text, bold: true })], spacing: { before: 200, after: 120 } });
}

function centered(text: string, bold = false, size = 22) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text, bold, size })],
  });
}

function metaTable(form: ModulForm): Table {
  const rows: [string, string][] = [
    ["Guru", form.namaGuru],
    ["NIP", form.nip || "-"],
    ["Mata Pelajaran", form.mapel],
    ["Kelas / Fase", `${form.kelas} / Fase ${form.fase}`],
    ["Alokasi Waktu", `${form.jumlahPertemuan} pertemuan × ${form.alokasiWaktu}`],
    ["Model Pembelajaran", form.modelPembelajaran],
    ["Dimensi Profil Lulusan", form.profilLulusan.join(", ")],
  ];
  const border = { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" };
  const borders = { top: border, bottom: border, left: border, right: border };
  return new Table({
    width: { size: 9000, type: WidthType.DXA },
    columnWidths: [3000, 6000],
    rows: rows.map(([k, v]) => new TableRow({
      children: [
        new TableCell({
          width: { size: 3000, type: WidthType.DXA }, borders,
          shading: { fill: "F1F5F9", type: ShadingType.CLEAR, color: "auto" },
          margins: { top: 60, bottom: 60, left: 100, right: 100 },
          children: [new Paragraph({ children: [new TextRun({ text: k, bold: true })] })],
        }),
        new TableCell({
          width: { size: 6000, type: WidthType.DXA }, borders,
          margins: { top: 60, bottom: 60, left: 100, right: 100 },
          children: [new Paragraph({ children: [new TextRun(v)] })],
        }),
      ],
    })),
  });
}

function rubrikTable(rubrik: ModulHasil["rubrikData"]): Table {
  const border = { style: BorderStyle.SINGLE, size: 4, color: "999999" };
  const borders = { top: border, bottom: border, left: border, right: border };
  const header = ["Kriteria", "Sangat Baik", "Baik", "Cukup", "Perlu Bimbingan"];
  const widths = [1800, 1800, 1800, 1800, 1800];
  const cell = (t: string, bold = false, shaded = false) => new TableCell({
    width: { size: 1800, type: WidthType.DXA }, borders,
    shading: shaded ? { fill: "E2E8F0", type: ShadingType.CLEAR, color: "auto" } : undefined,
    margins: { top: 60, bottom: 60, left: 80, right: 80 },
    children: [new Paragraph({ children: [new TextRun({ text: t, bold })] })],
  });
  return new Table({
    width: { size: 9000, type: WidthType.DXA },
    columnWidths: widths,
    rows: [
      new TableRow({ tableHeader: true, children: header.map((h) => cell(h, true, true)) }),
      ...rubrik.map((r) => new TableRow({
        children: [cell(r.kriteria, true), cell(r.sangatBaik), cell(r.baik), cell(r.cukup), cell(r.perluBimbingan)],
      })),
    ],
  });
}

export async function exportModulDocx(hasil: ModulHasil, form: ModulForm) {
  const children: (Paragraph | Table)[] = [];

  children.push(centered(`PEMERINTAH ${form.provinsi.toUpperCase()}`, false, 20));
  children.push(centered(formatKopDinas(form.kabupaten), true, 22));
  children.push(centered(form.sekolah.toUpperCase(), true, 26));
  children.push(new Paragraph({ children: [new TextRun("")], border: { bottom: { style: BorderStyle.DOUBLE, size: 8, color: "000000", space: 4 } } }));

  children.push(new Paragraph({ spacing: { before: 200 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: "MODUL AJAR / RENCANA PEMBELAJARAN", bold: true, size: 28 })] }));
  children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: hasil.judulModul, bold: true, size: 24 })] }));

  children.push(metaTable(form));

  const blocks: [string, string][] = [
    ["A. Asesmen Awal", hasil.asesmenAwal],
    ["B. Tujuan Pembelajaran", hasil.tujuanPembelajaran],
    ["C. Pemahaman Bermakna", hasil.pemahamanBermakna],
    ["D. Pertanyaan Pemantik", hasil.pertanyaanPemantik],
  ];
  for (const [t, b] of blocks) {
    children.push(heading(t));
    children.push(...richParagraphs(b));
  }

  children.push(heading("E. Kegiatan Pembelajaran"));
  for (const p of hasil.pertemuanData) {
    children.push(new Paragraph({ children: [new TextRun({ text: `Pertemuan ${p.pertemuan} — ${p.topik}`, bold: true })], spacing: { before: 160, after: 80 } }));
    for (const [k, v] of [["Tujuan", p.tujuan], ["Kegiatan Pembuka", p.pembuka], ["Kegiatan Inti", p.inti], ["Kegiatan Penutup", p.penutup]] as const) {
      children.push(new Paragraph({ children: [new TextRun({ text: `${k}:`, bold: true })], spacing: { before: 100 } }));
      children.push(...richParagraphs(v));
    }
  }

  const blocks2: [string, string][] = [
    ["F. Asesmen Formatif", hasil.asesmenFormatif],
    ["G. Asesmen Sumatif", hasil.asesmenSumatif],
    ["H. Refleksi Guru", hasil.refleksiGuru],
    ["I. Refleksi Siswa", hasil.refleksiSiswa],
  ];
  for (const [t, b] of blocks2) {
    children.push(heading(t));
    children.push(...richParagraphs(b));
  }

  children.push(new Paragraph({ pageBreakBefore: true, heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: "LAMPIRAN 1 — Lembar Kerja Peserta Didik (LKPD)", bold: true })] }));
  for (const l of hasil.lkpdData) {
    children.push(new Paragraph({ children: [new TextRun({ text: `LKPD Pertemuan ${l.pertemuan}: ${l.judul}`, bold: true })], spacing: { before: 160, after: 80 } }));
    children.push(new Paragraph({ children: [new TextRun({ text: "Petunjuk:", bold: true })] }));
    children.push(...richParagraphs(l.petunjuk));
    children.push(new Paragraph({ children: [new TextRun({ text: "Aktivitas:", bold: true })], spacing: { before: 80 } }));
    children.push(...richParagraphs(l.aktivitas));
  }

  children.push(new Paragraph({ pageBreakBefore: true, heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: "LAMPIRAN 2 — Kuis Sumatif", bold: true })] }));
  hasil.kuisData.forEach((k) => {
    children.push(new Paragraph({
      numbering: { reference: "numlist", level: 0 },
      children: [new TextRun({ text: k.pertanyaan, bold: true })],
    }));
    children.push(new Paragraph({ indent: { left: 720 }, children: [new TextRun({ text: `Jawaban: ${k.jawaban}`, italics: true })], spacing: { after: 100 } }));
  });

  children.push(new Paragraph({ pageBreakBefore: true, heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: "LAMPIRAN 3 — Rubrik Penilaian", bold: true })], spacing: { after: 120 } }));
  children.push(rubrikTable(hasil.rubrikData));

  const tgl = new Date(form.tanggalPembuatan).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  children.push(new Paragraph({ spacing: { before: 400 }, children: [new TextRun("")] }));
  const sigBorder = { top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" } };
  const sigCell = (lines: (string | { text: string; bold?: boolean })[]) => new TableCell({
    width: { size: 4500, type: WidthType.DXA }, borders: sigBorder,
    children: lines.map((l) => new Paragraph({ children: [typeof l === "string" ? new TextRun(l) : new TextRun({ text: l.text, bold: l.bold })] })),
  });
  children.push(new Table({
    width: { size: 9000, type: WidthType.DXA }, columnWidths: [4500, 4500],
    rows: [new TableRow({ children: [
      sigCell(["Mengetahui,", "Kepala Sekolah,", "", "", "", { text: form.kepalaSekolah || "(_______________)", bold: true }, `NIP. ${form.nipKepalaSekolah || "-"}`]),
      sigCell([`${form.kabupaten}, ${tgl}`, "Guru Kelas/Mapel,", "", "", "", { text: form.namaGuru, bold: true }, `NIP. ${form.nip || "-"}`]),
    ] })],
  }));

  const doc = new Document({
    creator: "ModulAjar",
    title: hasil.judulModul,
    styles: {
      default: { document: { run: { font: "Times New Roman", size: 22 } } },
    },
    numbering: {
      config: [
        { reference: "numlist", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
        { reference: "bulletlist", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      ],
    },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838, orientation: PageOrientation.PORTRAIT }, // A4
          margin: { top: 850, right: 850, bottom: 850, left: 850 }, // ~1.5cm
        },
      },
      children,
    }],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${hasil.judulModul.replace(/[^\w\s-]/g, "").slice(0, 60) || "modul-ajar"}.docx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}