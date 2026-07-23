import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  FilePlus,
  ClockAlert,
  ShieldCheck,
  ArrowRight,
  FileText,
  Trash2,
  User,
  XCircle,
} from "lucide-react";
import { GovHeader } from "@/components/gov/GovHeader";
import { StatusBadge } from "@/components/gov/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import type { Passeport } from "@/domain/passeport";
import { usePasseportStore } from "@/stores/passeport.store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tableau de bord — Passeport" },
      {
        name: "description",
        content:
          "Plateforme officielle de demande de passeport pour les agents du Ministère des Affaires Étrangères et de l'Immigration.",
      },
      { property: "og:title", content: "Passeport" },
      {
        property: "og:description",
        content: "Ministère des Affaires Étrangères et de l'Immigration — République du Congo.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const router = useRouter();
  const items = usePasseportStore((s) => s.items);
  const stats = usePasseportStore((s) => s.stats);
  const hasMore = usePasseportStore((s) => s.hasMore);
  const isLoadingMore = usePasseportStore((s) => s.isLoadingMore);
  const loadAll = usePasseportStore((s) => s.loadAll);
  const loadMore = usePasseportStore((s) => s.loadMore);
  const loadStats = usePasseportStore((s) => s.loadStats);
  const startNew = usePasseportStore((s) => s.startNew);
  const deletePasseport = usePasseportStore((s) => s.deletePasseport);

  useEffect(() => {
    loadAll();
    loadStats();
  }, [loadAll, loadStats]);

  const startNewPasseport = () => {
    const p = startNew();
    router.navigate({ to: "/demande/$id", params: { id: p.id } });
  };

  const handleDelete = async (p: Passeport) => {
    await deletePasseport(p.id);
    toast.success("Demande supprimée");
  };

  return (
    <div className="min-h-screen bg-background">
      <GovHeader />
      <div className="h-21" />
      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-medium uppercase tracking-wider text-cg-green">
              Tableau de bord agent
            </div>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
              Demandes de passeport
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Instruisez les demandes et délivrez le passeport des citoyens.
            </p>
          </div>
          <Button size="lg" onClick={startNewPasseport} className="gap-2">
            <FilePlus className="h-5 w-5" />
            Nouvelle demande
          </Button>
        </div>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Stat
            icon={<FileText className="h-5 w-5" />}
            label="Demandes totales"
            value={stats?.total ?? 0}
            tone="green"
          />
          <Stat
            icon={<FileText className="h-5 w-5" />}
            label="Soumises"
            value={stats?.soumises ?? 0}
            tone="neutral"
          />
          <Stat
            icon={<ClockAlert className="h-5 w-5" />}
            label="En instruction"
            value={stats?.enInstruction ?? 0}
            tone="yellow"
          />
          <Stat
            icon={<ShieldCheck className="h-5 w-5" />}
            label="Validées"
            value={stats?.validees ?? 0}
            tone="green"
          />
          <Stat
            icon={<XCircle className="h-5 w-5" />}
            label="Rejetées"
            value={stats?.rejetees ?? 0}
            tone="red"
          />
        </section>

        <section className="mt-8 rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">Demandes</h2>
              <p className="text-xs text-muted-foreground">
                {items.length} dossier{items.length > 1 ? "s" : ""} chargé
                {items.length > 1 ? "s" : ""}.
              </p>
            </div>
          </div>
          <div className="divide-y divide-border">
            {items.length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Aucune demande pour le moment.
              </div>
            )}
            {items.map((p) => (
              <div
                key={p.id}
                className="group flex items-center justify-between gap-4 px-6 py-4 transition-colors hover:bg-secondary/50"
              >
                <Link
                  to="/demandes/$id"
                  params={{ id: p.id }}
                  className="flex flex-1 items-center gap-4"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cg-green-soft text-cg-green-dark">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-medium text-foreground">{p.citizenUin || "UIN —"}</div>
                    <div className="text-xs text-muted-foreground">Dossier {p.id.slice(0, 8)}</div>
                  </div>
                </Link>
                <div className="flex items-center gap-3">
                  <StatusBadge status={p.status} />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground opacity-0 hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                        onClick={(ev) => ev.stopPropagation()}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer cette demande ?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Cette action est irréversible. La demande {p.id.slice(0, 8)} sera
                          définitivement supprimée.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(p)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Supprimer
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
          {hasMore && (
            <div className="border-t border-border p-4 text-center">
              <Button variant="outline" onClick={loadMore} disabled={isLoadingMore}>
                {isLoadingMore ? "Chargement..." : "Charger plus"}
              </Button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: "green" | "yellow" | "neutral" | "red";
}) {
  const toneMap = {
    green: "bg-cg-green-soft text-cg-green-dark",
    yellow: "bg-yellow-50 text-yellow-800",
    neutral: "bg-secondary text-muted-foreground",
    red: "bg-red-50 text-cg-red",
  };
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-md ${toneMap[tone]}`}>
          {icon}
        </div>
      </div>
      <div className="mt-4 text-3xl font-semibold text-foreground">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}
