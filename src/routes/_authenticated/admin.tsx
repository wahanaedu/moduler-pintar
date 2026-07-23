import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listAllUsers, setUserApproval, adminCreateUser, adminResetUserPassword, adminGenerateTempPassword, adminDeleteUser } from "@/lib/admin.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck, ShieldOff, CheckCircle2, Users, UserPlus, Eye, EyeOff, KeyRound, Copy, Wand2, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
  head: () => ({ meta: [{ title: "Panel Admin — ModulAjar" }] }),
});

function AdminPage() {
  const qc = useQueryClient();
  const fetchUsers = useServerFn(listAllUsers);
  const approveFn = useServerFn(setUserApproval);
  const createFn = useServerFn(adminCreateUser);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => fetchUsers(),
  });

  const mutation = useMutation({
    mutationFn: (v: { userId: string; approved: boolean }) => approveFn({ data: v }),
    onSuccess: (_r, v) => {
      toast.success(v.approved ? "Pengguna disetujui" : "Persetujuan dibatalkan");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createMut = useMutation({
    mutationFn: (v: { fullName: string; email: string; password: string }) =>
      createFn({ data: { ...v, approved: true } }),
    onSuccess: () => {
      toast.success("Pengguna berhasil ditambahkan");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="p-6 text-destructive">
          Gagal memuat: {(error as Error).message}
        </CardContent>
      </Card>
    );
  }

  const pending = (data ?? []).filter((u) => !u.approved);
  const approved = (data ?? []).filter((u) => u.approved);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl md:text-4xl font-bold flex items-center gap-2">
          <ShieldCheck className="h-8 w-8 text-primary" /> Panel Admin
        </h1>
        <p className="text-muted-foreground mt-1">Kelola persetujuan pendaftar dan lihat seluruh pengguna terdaftar.</p>
      </div>

      <AddUserForm onSubmit={(v: { fullName: string; email: string; password: string }) => createMut.mutate(v)} pending={createMut.isPending} />

      {isLoading ? (
        <div className="flex items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />Memuat…
        </div>
      ) : (
        <>
          <Section
            title="Menunggu Persetujuan"
            icon={<Users className="h-5 w-5" />}
            count={pending.length}
            empty="Tidak ada pendaftar baru."
          >
            {pending.map((u) => (
              <UserRow key={u.id} user={u} onToggle={(approved) => mutation.mutate({ userId: u.id, approved })} pending={mutation.isPending} />
            ))}
          </Section>

          <Section
            title="Pengguna Aktif"
            icon={<CheckCircle2 className="h-5 w-5" />}
            count={approved.length}
            empty="Belum ada pengguna aktif."
          >
            {approved.map((u) => (
              <UserRow key={u.id} user={u} onToggle={(approved) => mutation.mutate({ userId: u.id, approved })} pending={mutation.isPending} />
            ))}
          </Section>
        </>
      )}
    </div>
  );
}

function Section({ title, icon, count, empty, children }: { title: string; icon: React.ReactNode; count: number; empty: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="text-primary">{icon}</div>
        <h2 className="font-serif text-xl font-semibold">{title}</h2>
        <Badge variant="secondary">{count}</Badge>
      </div>
      {count === 0 ? (
        <Card className="border-dashed"><CardContent className="p-6 text-sm text-muted-foreground text-center">{empty}</CardContent></Card>
      ) : (
        <div className="grid gap-3">{children}</div>
      )}
    </div>
  );
}

type UserRowData = {
  id: string;
  email: string | null;
  full_name: string | null;
  sekolah: string | null;
  kabupaten: string | null;
  provinsi: string | null;
  approved: boolean;
  created_at: string;
  roles: string[];
};

function UserRow({ user, onToggle, pending }: { user: UserRowData; onToggle: (approved: boolean) => void; pending: boolean }) {
  const isAdmin = user.roles.includes("admin");
  const [resetOpen, setResetOpen] = useState(false);
  const [newPw, setNewPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [generated, setGenerated] = useState<string | null>(null);
  const resetFn = useServerFn(adminResetUserPassword);
  const genFn = useServerFn(adminGenerateTempPassword);
  const deleteFn = useServerFn(adminDeleteUser);
  const qc = useQueryClient();

  const resetMut = useMutation({
    mutationFn: () => resetFn({ data: { userId: user.id, newPassword: newPw } }),
    onSuccess: () => {
      toast.success("Kata sandi berhasil diperbarui");
      setGenerated(newPw);
      setNewPw("");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const genMut = useMutation({
    mutationFn: () => genFn({ data: { userId: user.id } }),
    onSuccess: (r: { newPassword: string }) => {
      toast.success("Kata sandi sementara dibuat");
      setGenerated(r.newPassword);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const deleteMut = useMutation({
    mutationFn: () => deleteFn({ data: { userId: user.id } }),
    onSuccess: () => {
      toast.success("Pengguna dihapus");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function confirmDelete() {
    const label = user.full_name || user.email || "pengguna ini";
    if (window.confirm(`Hapus akun "${label}" secara permanen? Tindakan ini tidak dapat dibatalkan.`)) {
      deleteMut.mutate();
    }
  }

  async function copyGenerated() {
    if (!generated) return;
    try {
      await navigator.clipboard.writeText(generated);
      toast.success("Kata sandi disalin ke clipboard");
    } catch {
      toast.error("Gagal menyalin");
    }
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold truncate">{user.full_name || user.email}</h3>
              {isAdmin && <Badge className="bg-primary/10 text-primary hover:bg-primary/20">Admin</Badge>}
              {user.approved ? (
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">Disetujui</Badge>
              ) : (
                <Badge variant="outline" className="border-amber-500 text-amber-700 dark:text-amber-300">Menunggu</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground truncate">{user.email}</p>
            {(user.sekolah || user.kabupaten) && (
              <p className="text-xs text-muted-foreground mt-1 truncate">
                {[user.sekolah, user.kabupaten, user.provinsi].filter(Boolean).join(" · ")}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-0.5">
              Terdaftar {new Date(user.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
          <div className="shrink-0 flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => { setResetOpen((v) => !v); setGenerated(null); }}>
              <KeyRound className="h-4 w-4 mr-1.5" />Reset Sandi
            </Button>
            {user.approved ? (
              <Button variant="outline" size="sm" disabled={pending || isAdmin} onClick={() => onToggle(false)}>
                <ShieldOff className="h-4 w-4 mr-1.5" />Cabut
              </Button>
            ) : (
              <Button size="sm" disabled={pending} onClick={() => onToggle(true)}>
                <CheckCircle2 className="h-4 w-4 mr-1.5" />Setujui
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              disabled={isAdmin || deleteMut.isPending}
              onClick={confirmDelete}
              className="text-destructive hover:text-destructive"
            >
              {deleteMut.isPending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1.5" />}
              Hapus
            </Button>
          </div>
        </div>

        {resetOpen && (
          <div className="rounded-md border bg-muted/40 p-3 space-y-3">
            <p className="text-xs text-muted-foreground">
              Demi keamanan, kata sandi pengguna <strong>tidak dapat dilihat</strong> (tersimpan terenkripsi).
              Anda dapat menetapkan kata sandi baru atau membuat sandi acak sementara untuk pengguna ini.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Input
                  type={showPw ? "text" : "password"}
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  placeholder="Kata sandi baru (min. 6 karakter)"
                  className="pr-10"
                />
                <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground" aria-label={showPw ? "Sembunyikan" : "Tampilkan"}>
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button size="sm" disabled={newPw.length < 6 || resetMut.isPending} onClick={() => resetMut.mutate()}>
                {resetMut.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Simpan
              </Button>
              <Button size="sm" variant="secondary" disabled={genMut.isPending} onClick={() => genMut.mutate()}>
                {genMut.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}
                Buat Sandi Acak
              </Button>
            </div>
            {generated && (
              <div className="rounded-md border border-primary/40 bg-primary/5 p-3 space-y-1">
                <p className="text-xs text-muted-foreground">Kata sandi baru (salin dan berikan ke pengguna — hanya ditampilkan sekali):</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 font-mono text-sm break-all">{generated}</code>
                  <Button size="sm" variant="outline" onClick={copyGenerated}>
                    <Copy className="h-4 w-4 mr-1.5" />Salin
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
function AddUserForm({ onSubmit, pending }: { onSubmit: (v: { fullName: string; email: string; password: string }) => void; pending: boolean }) {
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({ fullName, email, password });
    setFullName(""); setEmail(""); setPassword("");
  }

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)}>
        <UserPlus className="h-4 w-4 mr-2" />Tambah Pengguna Baru
      </Button>
    );
  }
  return (
    <Card className="border-primary/40">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-lg font-semibold flex items-center gap-2"><UserPlus className="h-5 w-5 text-primary" />Tambah Pengguna</h2>
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Batal</Button>
        </div>
        <form onSubmit={submit} className="grid md:grid-cols-3 gap-3 items-end">
          <div className="space-y-1.5">
            <Label htmlFor="nu-name">Nama Lengkap</Label>
            <Input id="nu-name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nu-email">Email</Label>
            <Input id="nu-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nu-pw">Kata Sandi</Label>
            <div className="relative">
              <Input id="nu-pw" type={show ? "text" : "password"} required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="pr-10" />
              <button type="button" onClick={() => setShow((v) => !v)} className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground" aria-label={show ? "Sembunyikan" : "Tampilkan"}>
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="md:col-span-3">
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Buat Akun (Langsung Aktif)
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
