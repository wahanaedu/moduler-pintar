import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listAllUsers, setUserApproval, adminCreateUser } from "@/lib/admin.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck, ShieldOff, CheckCircle2, Users, UserPlus, Eye, EyeOff } from "lucide-react";
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
  return (
    <Card>
      <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
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
        <div className="shrink-0">
          {user.approved ? (
            <Button variant="outline" size="sm" disabled={pending || isAdmin} onClick={() => onToggle(false)}>
              <ShieldOff className="h-4 w-4 mr-1.5" />Cabut
            </Button>
          ) : (
            <Button size="sm" disabled={pending} onClick={() => onToggle(true)}>
              <CheckCircle2 className="h-4 w-4 mr-1.5" />Setujui
            </Button>
          )}
        </div>
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
