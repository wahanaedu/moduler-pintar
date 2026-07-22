import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { changeMyPassword } from "@/lib/admin.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
  head: () => ({ meta: [{ title: "Pengaturan Akun — ModulAjar" }] }),
});

function SettingsPage() {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [show, setShow] = useState(false);
  const change = useServerFn(changeMyPassword);

  const rules = {
    length: pw.length >= 6,
    upper: /[A-Z]/.test(pw),
    number: /[0-9]/.test(pw),
    symbol: /[^A-Za-z0-9]/.test(pw),
    match: pw.length > 0 && pw === pw2,
  };
  const valid = Object.values(rules).every(Boolean);

  const mutation = useMutation({
    mutationFn: () => change({ data: { newPassword: pw } }),
    onSuccess: () => {
      toast.success("Kata sandi berhasil diperbarui");
      setPw(""); setPw2("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold flex items-center gap-2">
          <KeyRound className="h-7 w-7 text-primary" /> Pengaturan Akun
        </h1>
        <p className="text-muted-foreground mt-1">Perbarui kata sandi akun Anda.</p>
      </div>
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="pw">Kata Sandi Baru</Label>
            <div className="relative">
              <Input id="pw" type={show ? "text" : "password"} value={pw} onChange={(e) => setPw(e.target.value)} className="pr-10" />
              <button type="button" onClick={() => setShow((v) => !v)} className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground" aria-label={show ? "Sembunyikan" : "Tampilkan"}>
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pw2">Ulangi Kata Sandi Baru</Label>
            <Input id="pw2" type={show ? "text" : "password"} value={pw2} onChange={(e) => setPw2(e.target.value)} />
          </div>
          <ul className="text-xs space-y-0.5">
            <Rule ok={rules.length}>Minimal 6 karakter</Rule>
            <Rule ok={rules.upper}>Huruf kapital (A–Z)</Rule>
            <Rule ok={rules.number}>Angka (0–9)</Rule>
            <Rule ok={rules.symbol}>Karakter khusus (misal: ! @ # $)</Rule>
            <Rule ok={rules.match}>Kedua kata sandi sama</Rule>
          </ul>
          <Button className="w-full" disabled={!valid || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Perbarui Kata Sandi
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Rule({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className={ok ? "text-emerald-600" : "text-muted-foreground"}>
      <span className="inline-block w-3">{ok ? "✓" : "•"}</span> {children}
    </li>
  );
}