import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { FileText, Loader2, Eye, EyeOff } from "lucide-react";
import { CheckCircle2, ExternalLink } from "lucide-react";

const search = z.object({ mode: z.enum(["signin", "signup"]).optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: (s) => search.parse(s),
  component: AuthPage,
  head: () => ({ meta: [{ title: "Masuk / Daftar — ModulAjar" }] }),
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const [isSignup, setIsSignup] = useState(mode === "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [registered, setRegistered] = useState<null | { email: string; fullName: string }>(null);

  const passwordRules = {
    length: password.length >= 6,
    upper: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
  };
  const passwordValid = Object.values(passwordRules).every(Boolean);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignup) {
        if (!passwordValid) {
          toast.error("Kata sandi belum memenuhi syarat.");
          setLoading(false);
          return;
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        // Sign the user out immediately — akun akan aktif setelah pembayaran & persetujuan admin.
        await supabase.auth.signOut();
        toast.success("Akun terdaftar. Silakan selesaikan pembayaran untuk aktivasi.");
        setRegistered({ email, fullName });
        return;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Selamat datang kembali!");
        navigate({ to: "/dashboard" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-secondary/40">
      <header className="border-b bg-background">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center">
          <Link to="/" className="flex items-center gap-2 font-serif text-xl font-bold text-primary">
            <FileText className="h-6 w-6" /> ModulAjar
          </Link>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        {registered ? (
          <Card className="w-full max-w-md border-2 border-primary/30">
            <CardContent className="p-8 space-y-5">
              <div className="h-14 w-14 mx-auto rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <div className="text-center space-y-1">
                <h1 className="font-serif text-2xl font-bold">Pendaftaran Berhasil</h1>
                <p className="text-sm text-muted-foreground">
                  Halo <span className="font-medium">{registered.fullName || registered.email}</span>, akun Anda sudah terdaftar.
                </p>
              </div>
              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 p-4 text-sm space-y-2">
                <p className="font-medium text-amber-900 dark:text-amber-200">Langkah aktivasi akun:</p>
                <ol className="list-decimal ml-5 space-y-1 text-amber-900/90 dark:text-amber-100/90">
                  <li>Klik tombol <strong>Selesaikan Pembayaran</strong> di bawah.</li>
                  <li>Selesaikan transaksi pada halaman pembayaran yang terbuka di tab baru.</li>
                  <li>Tim admin akan memverifikasi &amp; mengaktifkan akun Anda setelah pembayaran diterima (biasanya kurang dari 1×24 jam).</li>
                  <li>Setelah aktif, silakan masuk kembali menggunakan email &amp; kata sandi ini.</li>
                </ol>
              </div>
              <Button
                asChild
                className="w-full"
                size="lg"
              >
                <a
                  href="https://lynk.id/alunagra/lq48r3m5rlw9"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Selesaikan Pembayaran
                </a>
              </Button>
              <button
                type="button"
                onClick={() => { setRegistered(null); setIsSignup(false); setPassword(""); }}
                className="w-full text-sm text-muted-foreground hover:text-foreground"
              >
                Sudah bayar? Masuk ke akun
              </button>
            </CardContent>
          </Card>
        ) : (
        <Card className="w-full max-w-md border-2">
          <CardContent className="p-8">
            <h1 className="font-serif text-2xl font-bold mb-1">
              {isSignup ? "Buat Akun Guru" : "Selamat datang kembali"}
            </h1>
            <p className="text-sm text-muted-foreground mb-6">
              {isSignup ? "Gratis, tanpa kartu kredit." : "Masuk untuk melanjutkan membuat modul."}
            </p>
            <form onSubmit={submit} className="space-y-4">
              {isSignup && (
                <div className="space-y-1.5">
                  <Label htmlFor="name">Nama Lengkap</Label>
                  <Input id="name" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Cth. Ibu Sri Handayani, S.Pd" />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pw">Kata Sandi</Label>
                <div className="relative">
                  <Input
                    id="pw"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {isSignup && (
                  <ul className="text-xs mt-2 space-y-0.5">
                    <Rule ok={passwordRules.length}>Minimal 6 karakter</Rule>
                    <Rule ok={passwordRules.upper}>Mengandung huruf kapital (A–Z)</Rule>
                    <Rule ok={passwordRules.number}>Mengandung angka (0–9)</Rule>
                    <Rule ok={passwordRules.symbol}>Mengandung karakter khusus (misal: ! @ # $)</Rule>
                  </ul>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={loading || (isSignup && !passwordValid)}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isSignup ? "Daftar" : "Masuk"}
              </Button>
            </form>
            <button
              type="button"
              onClick={() => setIsSignup((v) => !v)}
              className="mt-6 w-full text-sm text-muted-foreground hover:text-foreground"
            >
              {isSignup ? "Sudah punya akun? Masuk" : "Belum punya akun? Daftar"}
            </button>
          </CardContent>
        </Card>
        )}
      </main>
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
