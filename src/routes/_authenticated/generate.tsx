import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { generateModul, getMyLock, setKelasLock, setMapelLock } from "@/lib/modul.functions";
import { PILIHAN_MAPEL, PILIHAN_KELAS, PILIHAN_MODEL_PEMBELAJARAN, PILIHAN_PROFIL_LULUSAN, PROFIL_MATERI_DEFAULT } from "@/lib/modul-constants";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Sparkles, Lock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/generate")({
  component: GeneratePage,
  head: () => ({ meta: [{ title: "Buat Modul Baru — ModulAjar" }] }),
});

function faseForKelas(kelas: string): string {
  const n = parseInt(kelas.replace(/\D/g, ""), 10);
  if (n <= 2) return "A";
  if (n <= 4) return "B";
  if (n <= 6) return "C";
  if (n <= 7) return "D";
  return "D";
}

function GeneratePage() {
  const navigate = useNavigate();
  const gen = useServerFn(generateModul);
  const fetchLock = useServerFn(getMyLock);
  const saveKelas = useServerFn(setKelasLock);
  const saveMapel = useServerFn(setMapelLock);
  const qc = useQueryClient();
  const { data: lock } = useQuery({
    queryKey: ["my-lock"],
    queryFn: () => fetchLock(),
  });

  const [form, setForm] = useState({
    namaGuru: "",
    nip: "",
    sekolah: "",
    alamatSekolah: "",
    kabupaten: "",
    jabatan: "guru_kelas" as "guru_kelas" | "guru_mapel",
    kepalaSekolah: "",
    nipKepalaSekolah: "",
    tanggalPembuatan: new Date().toISOString().slice(0, 10),
    mapel: "Bahasa Indonesia",
    materi: PROFIL_MATERI_DEFAULT["Bahasa Indonesia"].materi,
    kelas: "Kelas 4",
    fase: "B",
    jumlahPertemuan: 2,
    alokasiWaktu: "2 x 35 menit",
    modelPembelajaran: "Problem Based Learning (PBL)",
    profilLulusan: ["Penalaran Kritis", "Kreativitas"] as string[],
    tambahGambar: false,
    tambahLK: true,
    tambahTabel: false,
  });

  // Sinkronkan kelas dari kunci profil.
  useEffect(() => {
    if (lock?.kelas && lock.jabatan === "guru_kelas" && lock.kelas !== form.kelas) {
      setForm((f) => ({ ...f, kelas: lock.kelas!, fase: faseForKelas(lock.kelas!) }));
    }
    if (lock?.mapel && lock.jabatan === "guru_mapel" && lock.mapel !== form.mapel) {
      const def = PROFIL_MATERI_DEFAULT[lock.mapel];
      setForm((f) => ({ ...f, mapel: lock.mapel!, materi: def?.materi ?? f.materi }));
    }
    if (lock?.jabatan && lock.jabatan !== form.jabatan) {
      setForm((f) => ({ ...f, jabatan: lock.jabatan! }));
    }
  }, [lock?.kelas, lock?.mapel, lock?.jabatan]);

  const [changeKelasOpen, setChangeKelasOpen] = useState(false);
  const [newKelas, setNewKelas] = useState<string>("");
  const changeKelasMutation = useMutation({
    mutationFn: async (v: string) => saveKelas({ data: { kelas: v } }),
    onSuccess: (res) => {
      toast.success(`Kelas diubah menjadi ${res.kelas}. Sisa perubahan: ${res.changesRemaining}.`);
      qc.invalidateQueries({ queryKey: ["my-lock"] });
      setChangeKelasOpen(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Gagal mengubah kelas"),
  });

  const [changeMapelOpen, setChangeMapelOpen] = useState(false);
  const [newMapel, setNewMapel] = useState<string>("");
  const changeMapelMutation = useMutation({
    mutationFn: async (v: string) => saveMapel({ data: { mapel: v } }),
    onSuccess: (res) => {
      toast.success(`Mata pelajaran diubah menjadi ${res.mapel}. Sisa perubahan: ${res.changesRemaining}.`);
      qc.invalidateQueries({ queryKey: ["my-lock"] });
      setChangeMapelOpen(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Gagal mengubah mapel"),
  });

  function upd<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  const mutation = useMutation({
    mutationFn: async () => {
      const kelasNum = parseInt(form.kelas.replace(/\D/g, ""), 10);
      const tingkatSekolah: "SD" | "SMP" = kelasNum <= 6 ? "SD" : "SMP";
      return gen({ data: { ...form, tingkatSekolah, provinsi: "" } });
    },
    onSuccess: (res) => {
      toast.success("Modul berhasil dibuat!");
      navigate({ to: "/modul/$id", params: { id: res.id } });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Gagal membuat modul"),
  });

  function onMapelChange(v: string) {
    const def = PROFIL_MATERI_DEFAULT[v];
    upd("mapel", v);
    if (def) {
      upd("materi", def.materi);
      if (!(lock?.kelas && lock.jabatan === "guru_kelas")) upd("fase", def.fase);
    }
  }

  function toggleProfil(name: string) {
    setForm((f) => ({
      ...f,
      profilLulusan: f.profilLulusan.includes(name)
        ? f.profilLulusan.filter((x) => x !== name)
        : [...f.profilLulusan, name],
    }));
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="font-serif text-3xl md:text-4xl font-bold">Buat Modul Ajar Baru</h1>
        <p className="text-muted-foreground mt-1">Isi formulir singkat berikut. AI akan menyusun modul lengkap untuk Anda.</p>
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}
        className="space-y-6"
      >
        <Section title="Identitas Guru & Sekolah">
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Nama Guru" required>
              <Input value={form.namaGuru} onChange={(e) => upd("namaGuru", e.target.value)} placeholder="Cth. Sri Handayani, S.Pd" required />
            </Field>
            <Field label="NIP (opsional)">
              <Input value={form.nip} onChange={(e) => upd("nip", e.target.value)} />
            </Field>
            <Field label="Nama Sekolah" required>
              <Input value={form.sekolah} onChange={(e) => upd("sekolah", e.target.value)} placeholder="Cth. SD Negeri 1 Merdeka" required />
            </Field>
            <Field label="Alamat Sekolah" required>
              <Input value={form.alamatSekolah} onChange={(e) => upd("alamatSekolah", e.target.value)} placeholder="Cth. Jl. Melati No. 12, Kec. Depok, Sleman" required />
            </Field>
            <Field label="Kabupaten/Kota" required>
              <Input value={form.kabupaten} onChange={(e) => upd("kabupaten", e.target.value)} placeholder="Cth. Kabupaten Sleman" required />
            </Field>
            <Field label="Kepala Sekolah (opsional)">
              <Input value={form.kepalaSekolah} onChange={(e) => upd("kepalaSekolah", e.target.value)} />
            </Field>
            <Field label="NIP Kepala Sekolah (opsional)">
              <Input value={form.nipKepalaSekolah} onChange={(e) => upd("nipKepalaSekolah", e.target.value)} />
            </Field>
            <Field label="Tanggal Pembuatan">
              <Input type="date" value={form.tanggalPembuatan} onChange={(e) => upd("tanggalPembuatan", e.target.value)} />
            </Field>
          </div>
        </Section>

        <Section title="Rencana Pembelajaran">
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Mata Pelajaran" required>
              {lock?.mapel && lock.jabatan === "guru_mapel" ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 h-10 px-3 rounded-md border bg-muted/50 text-sm">
                    <Lock className="h-4 w-4 text-primary" />
                    <span className="font-medium">{lock.mapel}</span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {lock.mapelChangesRemaining > 0
                        ? `Sisa perubahan: ${lock.mapelChangesRemaining}`
                        : "Terkunci permanen"}
                    </span>
                  </div>
                  {lock.mapelChangesRemaining > 0 && !changeMapelOpen && (
                    <Button type="button" variant="outline" size="sm" onClick={() => setChangeMapelOpen(true)}>
                      Ubah mata pelajaran (sekali saja)
                    </Button>
                  )}
                  {changeMapelOpen && (
                    <div className="flex gap-2 items-center">
                      <Select value={newMapel} onValueChange={setNewMapel}>
                        <SelectTrigger><SelectValue placeholder="Pilih mapel baru…" /></SelectTrigger>
                        <SelectContent>{PILIHAN_MAPEL.filter((m) => m !== lock.mapel).map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                      </Select>
                      <Button type="button" size="sm" disabled={!newMapel || changeMapelMutation.isPending} onClick={() => changeMapelMutation.mutate(newMapel)}>
                        Simpan
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => setChangeMapelOpen(false)}>Batal</Button>
                    </div>
                  )}
                </div>
              ) : (
                <Select value={form.mapel} onValueChange={onMapelChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PILIHAN_MAPEL.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              )}
            </Field>
            <Field label="Kelas" required>
              {lock?.kelas && lock.jabatan === "guru_kelas" ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 h-10 px-3 rounded-md border bg-muted/50 text-sm">
                    <Lock className="h-4 w-4 text-primary" />
                    <span className="font-medium">{lock.kelas}</span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {lock.kelasChangesRemaining > 0
                        ? `Sisa perubahan: ${lock.kelasChangesRemaining}`
                        : "Terkunci permanen"}
                    </span>
                  </div>
                  {lock.kelasChangesRemaining > 0 && !changeKelasOpen && (
                    <Button type="button" variant="outline" size="sm" onClick={() => setChangeKelasOpen(true)}>
                      Ubah kelas (sekali saja)
                    </Button>
                  )}
                  {changeKelasOpen && (
                    <div className="flex gap-2 items-center">
                      <Select value={newKelas} onValueChange={setNewKelas}>
                        <SelectTrigger><SelectValue placeholder="Pilih kelas baru…" /></SelectTrigger>
                        <SelectContent>{PILIHAN_KELAS.filter((k) => k !== lock.kelas).map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
                      </Select>
                      <Button type="button" size="sm" disabled={!newKelas || changeKelasMutation.isPending} onClick={() => changeKelasMutation.mutate(newKelas)}>
                        Simpan
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => setChangeKelasOpen(false)}>Batal</Button>
                    </div>
                  )}
                </div>
              ) : (
                <Select value={form.kelas} onValueChange={(v) => { upd("kelas", v); upd("fase", faseForKelas(v)); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PILIHAN_KELAS.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
                </Select>
              )}
            </Field>
            <Field label="Materi Pokok" required className="md:col-span-2">
              <Textarea rows={2} value={form.materi} onChange={(e) => upd("materi", e.target.value)} placeholder="Contoh: Menggunakan kata sifat dalam karangan deskripsi" required />
            </Field>
            <Field label="Model Pembelajaran">
              <Select value={form.modelPembelajaran} onValueChange={(v) => upd("modelPembelajaran", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PILIHAN_MODEL_PEMBELAJARAN.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Alokasi Waktu per Pertemuan">
              <Input value={form.alokasiWaktu} onChange={(e) => upd("alokasiWaktu", e.target.value)} placeholder="Cth. 2 x 35 menit" />
            </Field>
            <Field label={`Jumlah Pertemuan: ${form.jumlahPertemuan}`} className="md:col-span-2">
              <input
                type="range" min={1} max={8} value={form.jumlahPertemuan}
                onChange={(e) => upd("jumlahPertemuan", parseInt(e.target.value, 10))}
                className="w-full accent-primary"
              />
              <p className="text-xs text-muted-foreground mt-1">Semakin banyak pertemuan, semakin lama waktu generate (rekomendasi 1–4).</p>
            </Field>
          </div>
        </Section>

        <Section title="Dimensi Profil Lulusan Pancasila">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {PILIHAN_PROFIL_LULUSAN.map((p) => {
              const checked = form.profilLulusan.includes(p);
              return (
                <label key={p} className={`flex items-center gap-2 p-3 rounded-md border cursor-pointer hover:bg-accent ${checked ? "border-primary bg-primary/5" : ""}`}>
                  <Checkbox checked={checked} onCheckedChange={() => toggleProfil(p)} />
                  <span className="text-sm">{p}</span>
                </label>
              );
            })}
          </div>
        </Section>

        <Section title="Konten Tambahan (opsional)">
          <p className="text-sm text-muted-foreground -mt-2">Centang bagian yang ingin AI sertakan dalam modul.</p>
          <div className="grid md:grid-cols-3 gap-3">
            {[
              { key: "tambahGambar" as const, label: "Tambahkan gambar/media", desc: "Saran gambar, video, audio pendukung." },
              { key: "tambahLK" as const, label: "Tambahkan LKPD", desc: "Lembar Kerja Peserta Didik per pertemuan." },
              { key: "tambahTabel" as const, label: "Tambahkan tabel yang diperlukan", desc: "Tabel diferensiasi, skoring, dsb." },
            ].map((opt) => {
              const checked = form[opt.key];
              return (
                <label key={opt.key} className={`flex items-start gap-2 p-3 rounded-md border cursor-pointer hover:bg-accent ${checked ? "border-primary bg-primary/5" : ""}`}>
                  <Checkbox checked={checked} onCheckedChange={(v) => upd(opt.key, v === true)} className="mt-0.5" />
                  <span className="text-sm">
                    <span className="font-medium block">{opt.label}</span>
                    <span className="text-xs text-muted-foreground">{opt.desc}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </Section>

        <div className="sticky bottom-4 flex justify-end">
          <Button type="submit" size="lg" disabled={mutation.isPending} className="shadow-lg">
            {mutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Membuat modul…</> : <><Sparkles className="h-4 w-4 mr-2" />Generate Modul Ajar Wahana Edukasi</>}
          </Button>
        </div>
      </form>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <h2 className="font-serif text-xl font-semibold border-b pb-3">{title}</h2>
        {children}
      </CardContent>
    </Card>
  );
}

function Field({ label, children, required, className }: { label: string; children: React.ReactNode; required?: boolean; className?: string }) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label>{label}{required && <span className="text-destructive"> *</span>}</Label>
      {children}
    </div>
  );
}
