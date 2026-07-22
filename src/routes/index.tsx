import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, FileText, Clock3, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "ModulAjar — Generator Modul Ajar Kurikulum Merdeka" },
      { name: "description", content: "Buat Modul Ajar & RPP Pembelajaran Mendalam lengkap dengan LKPD, kuis, dan rubrik penilaian secara otomatis dalam hitungan menit." },
    ],
  }),
});

function Landing() {
  return (
    <div className="min-h-screen">
      <header className="border-b bg-background/80 backdrop-blur sticky top-0 z-40">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-serif text-xl font-bold text-primary">
            <FileText className="h-6 w-6" /> ModulAjar
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/auth"><Button variant="ghost">Masuk</Button></Link>
            <Link to="/auth" search={{ mode: "signup" as const }}><Button>Daftar Gratis</Button></Link>
          </div>
        </div>
      </header>

      <section className="bg-hero-gradient text-primary-foreground">
        <div className="mx-auto max-w-6xl px-6 py-24 md:py-32 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-medium mb-6">
            <Sparkles className="h-3.5 w-3.5" /> Ditenagai Lovable AI · Gemini
          </div>
          <h1 className="font-serif text-4xl md:text-6xl font-bold leading-tight max-w-3xl mx-auto">
            Modul Ajar Kurikulum Merdeka, siap dalam 2 menit.
          </h1>
          <p className="mt-6 text-lg md:text-xl text-white/85 max-w-2xl mx-auto">
            Buat Rencana Pembelajaran lengkap — kop dinas, tujuan, kegiatan per pertemuan, LKPD, kuis, hingga rubrik penilaian — otomatis dengan AI.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link to="/auth" search={{ mode: "signup" as const }}>
              <Button size="lg" className="bg-[oklch(0.78_0.16_75)] text-primary hover:bg-[oklch(0.82_0.16_75)]">
                Mulai Buat Modul
              </Button>
            </Link>
            <a href="#fitur"><Button size="lg" variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20">Lihat Fitur</Button></a>
          </div>
        </div>
      </section>

      <section id="fitur" className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="font-serif text-3xl md:text-4xl font-bold text-center mb-4">Semua yang guru butuhkan</h2>
        <p className="text-center text-muted-foreground max-w-xl mx-auto mb-12">Draf modul yang koheren dari halaman kop dinas sampai penilaian akhir.</p>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: FileText, title: "Struktur Lengkap", desc: "Identitas, tujuan pembelajaran, pemahaman bermakna, kegiatan per pertemuan, asesmen, dan rubrik." },
            { icon: Clock3, title: "Hemat Waktu", desc: "Dari 3 jam menjadi 2 menit. Fokus mengajar, bukan mengetik." },
            { icon: ShieldCheck, title: "Sesuai Kurikulum Merdeka", desc: "Mengikuti Fase A–F, Profil Lulusan, dan sintaks model pembelajaran yang benar." },
          ].map((f) => (
            <Card key={f.title} className="border-2">
              <CardContent className="p-6">
                <div className="h-11 w-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-serif text-xl font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} ModulAjar · Untuk guru Indonesia
      </footer>
    </div>
  );
}
