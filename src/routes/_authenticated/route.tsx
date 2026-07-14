import { createFileRoute, Outlet, redirect, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, LogOut, Plus, LayoutDashboard, ShieldCheck, Clock } from "lucide-react";
import { toast } from "sonner";
import { getMyApprovalStatus } from "@/lib/admin.functions";

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
            <Link to="/dashboard"><Button variant="ghost" size="sm"><LayoutDashboard className="h-4 w-4 mr-1.5" />Dasbor</Button></Link>
            {status?.approved && (
              <Link to="/generate"><Button size="sm"><Plus className="h-4 w-4 mr-1.5" />Buat Modul</Button></Link>
            )}
            {status?.isAdmin && (
              <Link to="/admin"><Button variant="ghost" size="sm"><ShieldCheck className="h-4 w-4 mr-1.5" />Admin</Button></Link>
            )}
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
        ) : (
          <Outlet />
        )}
      </main>
    </div>
  );
}
