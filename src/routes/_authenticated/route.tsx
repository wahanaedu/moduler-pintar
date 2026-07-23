import { createFileRoute, Outlet, redirect, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, LogOut, Plus, LayoutDashboard, ShieldCheck, Clock, Lock, Settings, GraduationCap, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { getMyApprovalStatus } from "@/lib/admin.functions";
import { getMyLock, setKelasLock, setMapelLock, setRole } from "@/lib/modul.functions";
import { PILIHAN_KELAS, PILIHAN_MAPEL } from "@/lib/modul-constants";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: Layout,
});

function Layout() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchStatus = useServerFn(getMyApprovalStatus);
  const { data: status, isLoading } = useQuery({
    queryKey: ["my-approval-status"],
    queryFn: () => fetchStatus(),
  });
  const fetchLock = useServerFn(getMyLock);
  const { data: lock } = useQuery({
    queryKey: ["my-lock"],
    queryFn: () => fetchLock(),
    enabled: Boolean(status?.approved),
  });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    toast.success("Berhasil keluar");
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-secondary/30">
      <header className="border-b bg-background sticky top-0 z-30">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2 font-serif text-xl font-bold text-primary">
            <FileText className="h-6 w-6" /> ModulAjar
          </Link>
          <nav className="flex items-center gap-1">
            {lock?.kelas && lock.jabatan === "guru_kelas" && (
              <span className="hidden md:inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-primary/10 text-primary mr-1">
                <Lock className="h-3 w-3" />{lock.kelas}
              </span>
            )}
            {lock?.mapel && lock.jabatan === "guru_mapel" && (
              <span className="hidden md:inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-primary/10 text-primary mr-1">
                <Lock className="h-3 w-3" />{lock.mapel}
              </span>
            )}
            <Link to="/dashboard"><Button variant="ghost" size="sm"><LayoutDashboard className="h-4 w-4 mr-1.5" />Dasbor</Button></Link>
            {status?.approved && (
              <Link to="/generate"><Button size="sm"><Plus className="h-4 w-4 mr-1.5" />Buat Modul</Button></Link>
            )}
            {status?.isAdmin && (
              <Link to="/admin"><Button variant="ghost" size="sm"><ShieldCheck className="h-4 w-4 mr-1.5" />Admin</Button></Link>
            )}
            <Link to="/settings"><Button variant="ghost" size="sm"><Settings className="h-4 w-4 mr-1.5" /><span className="hidden md:inline">Akun</span></Button></Link>
            <Button variant="ghost" size="sm" onClick={signOut}><LogOut className="h-4 w-4" /></Button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 md:px-6 py-8">
        {!isLoading && status && !status.approved && !status.isAdmin ? (
          <Card className="max-w-xl mx-auto mt-12 border-amber-300 bg-amber-50 dark:bg-amber-950/30">
            <CardContent className="p-8 text-center space-y-3">
              <div className="h-14 w-14 mx-auto rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 flex items-center justify-center">
                <Clock className="h-6 w-6" />
              </div>
              <h2 className="font-serif text-2xl font-bold">Menunggu Persetujuan Admin</h2>
              <p className="text-muted-foreground">
                Halo <span className="font-medium">{status.fullName ?? status.email}</span>, akun Anda telah terdaftar. Silakan tunggu admin menyetujui pendaftaran sebelum dapat membuat modul ajar.
              </p>
              <Button variant="outline" onClick={signOut} className="mt-2"><LogOut className="h-4 w-4 mr-2" />Keluar</Button>
            </CardContent>
          </Card>
        ) : status?.approved && lock && !lock.roleChosen ? (
          <RolePicker onDone={() => qc.invalidateQueries({ queryKey: ["my-lock"] })} />
        ) : status?.approved && lock && lock.roleChosen && lock.jabatan === "guru_kelas" && !lock.kelas ? (
          <KelasPicker onDone={() => qc.invalidateQueries({ queryKey: ["my-lock"] })} />
        ) : status?.approved && lock && lock.roleChosen && lock.jabatan === "guru_mapel" && !lock.mapel ? (
          <MapelPicker onDone={() => qc.invalidateQueries({ queryKey: ["my-lock"] })} />
        ) : (
          <Outlet />
        )}
      </main>
    </div>
  );
}

function RolePicker({ onDone }: { onDone: () => void }) {
  const save = useServerFn(setRole);
  const mutation = useMutation({
    mutationFn: async (v: "guru_kelas" | "guru_mapel") => save({ data: { jabatan: v } }),
    onSuccess: () => { toast.success("Peran berhasil disimpan"); onDone(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Gagal menyimpan"),
  });
  return (
    <Card className="max-w-2xl mx-auto mt-12">
      <CardContent className="p-8 space-y-5">
        <div className="text-center space-y-2">
          <h2 className="font-serif text-2xl font-bold">Pilih Peran Anda</h2>
          <p className="text-sm text-muted-foreground">
            Pilihan ini <strong>permanen</strong> dan menentukan apa yang akan dikunci pada akun Anda.
            Guru Kelas akan mengunci satu <em>kelas/jenjang</em>. Guru Mata Pelajaran akan mengunci satu <em>mata pelajaran</em>.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <button
            type="button"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate("guru_kelas")}
            className="text-left p-5 rounded-lg border-2 hover:border-primary hover:bg-primary/5 transition space-y-2 disabled:opacity-50"
          >
            <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div className="font-semibold">Guru Kelas</div>
            <p className="text-xs text-muted-foreground">
              Mengajar satu kelas untuk berbagai mata pelajaran. Akun akan terkunci pada satu <strong>kelas/jenjang</strong> (dapat diubah 1× saja).
            </p>
          </button>
          <button
            type="button"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate("guru_mapel")}
            className="text-left p-5 rounded-lg border-2 hover:border-primary hover:bg-primary/5 transition space-y-2 disabled:opacity-50"
          >
            <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <BookOpen className="h-5 w-5" />
            </div>
            <div className="font-semibold">Guru Mata Pelajaran</div>
            <p className="text-xs text-muted-foreground">
              Mengajar satu mata pelajaran di berbagai kelas. Akun akan terkunci pada satu <strong>mata pelajaran</strong> (dapat diubah 1× saja).
            </p>
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

function KelasPicker({ onDone }: { onDone: () => void }) {
  const [kelas, setKelas] = useState<string>("");
  const save = useServerFn(setKelasLock);
  const mutation = useMutation({
    mutationFn: async (v: string) => save({ data: { kelas: v } }),
    onSuccess: () => { toast.success("Kelas berhasil dikunci"); onDone(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Gagal menyimpan"),
  });
  return (
    <Card className="max-w-xl mx-auto mt-12">
      <CardContent className="p-8 space-y-4">
        <div className="h-14 w-14 mx-auto rounded-full bg-primary/10 text-primary flex items-center justify-center">
          <Lock className="h-6 w-6" />
        </div>
        <h2 className="font-serif text-2xl font-bold text-center">Pilih Kelas / Jenjang Anda</h2>
        <p className="text-sm text-muted-foreground text-center">
          Akun Anda akan <strong>terkunci pada satu kelas</strong>. Pilihan ini hanya dapat diubah <strong>satu kali</strong> setelahnya, jadi pastikan sudah tepat.
        </p>
        <Select value={kelas} onValueChange={setKelas}>
          <SelectTrigger><SelectValue placeholder="Pilih kelas…" /></SelectTrigger>
          <SelectContent>{PILIHAN_KELAS.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
        </Select>
        <Button className="w-full" disabled={!kelas || mutation.isPending} onClick={() => mutation.mutate(kelas)}>
          {mutation.isPending ? "Menyimpan…" : "Kunci Kelas Ini"}
        </Button>
      </CardContent>
    </Card>
  );
}

function MapelPicker({ onDone }: { onDone: () => void }) {
  const [mapel, setMapel] = useState<string>("");
  const save = useServerFn(setMapelLock);
  const mutation = useMutation({
    mutationFn: async (v: string) => save({ data: { mapel: v } }),
    onSuccess: () => { toast.success("Mata pelajaran berhasil dikunci"); onDone(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Gagal menyimpan"),
  });
  return (
    <Card className="max-w-xl mx-auto mt-12">
      <CardContent className="p-8 space-y-4">
        <div className="h-14 w-14 mx-auto rounded-full bg-primary/10 text-primary flex items-center justify-center">
          <Lock className="h-6 w-6" />
        </div>
        <h2 className="font-serif text-2xl font-bold text-center">Pilih Mata Pelajaran Anda</h2>
        <p className="text-sm text-muted-foreground text-center">
          Akun Anda akan <strong>terkunci pada satu mata pelajaran</strong>. Pilihan ini hanya dapat diubah <strong>satu kali</strong> setelahnya, jadi pastikan sudah tepat.
        </p>
        <Select value={mapel} onValueChange={setMapel}>
          <SelectTrigger><SelectValue placeholder="Pilih mata pelajaran…" /></SelectTrigger>
          <SelectContent>{PILIHAN_MAPEL.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
        </Select>
        <Button className="w-full" disabled={!mapel || mutation.isPending} onClick={() => mutation.mutate(mapel)}>
          {mutation.isPending ? "Menyimpan…" : "Kunci Mata Pelajaran Ini"}
        </Button>
      </CardContent>
    </Card>
  );
}
