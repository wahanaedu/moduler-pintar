import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listModuls } from "@/lib/modul.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Loader2, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Dasbor — ModulAjar" }] }),
});

function Dashboard() {
  const fetchList = useServerFn(listModuls);
  const { data, isLoading } = useQuery({
    queryKey: ["moduls"],
    queryFn: () => fetchList(),
  });

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-3xl md:text-4xl font-bold">Modul Saya</h1>
          <p className="text-muted-foreground mt-1">Daftar modul ajar yang pernah Anda buat.</p>
        </div>
        <Link to="/generate"><Button size="lg"><Plus className="h-4 w-4 mr-2" />Buat Modul Baru</Button></Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" />Memuat…</div>
      ) : !data || data.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="p-12 text-center">
            <div className="h-14 w-14 mx-auto rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
              <FileText className="h-6 w-6" />
            </div>
            <h3 className="font-serif text-xl font-semibold mb-2">Belum ada modul</h3>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">Mulai dengan membuat modul ajar pertama Anda. Hanya butuh beberapa menit.</p>
            <Link to="/generate"><Button><Plus className="h-4 w-4 mr-2" />Buat Modul Pertama</Button></Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((m) => (
            <Link key={m.id} to="/modul/$id" params={{ id: m.id }}>
              <Card className="h-full hover:border-primary transition-colors cursor-pointer">
                <CardContent className="p-5 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-xs font-medium text-primary uppercase tracking-wide">{m.mapel}</div>
                    <StatusBadge status={m.status} />
                  </div>
                  <h3 className="font-serif text-lg font-semibold line-clamp-2 leading-snug">{m.materi}</h3>
                  <p className="text-xs text-muted-foreground">{m.kelas} · {new Date(m.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
                  {m.status === "failed" && m.error_message && (
                    <p className="text-xs text-destructive flex items-start gap-1 mt-2"><AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />{m.error_message}</p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "ready") return <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">Siap</Badge>;
  if (status === "failed") return <Badge variant="destructive">Gagal</Badge>;
  return <Badge variant="outline">Diproses…</Badge>;
}
