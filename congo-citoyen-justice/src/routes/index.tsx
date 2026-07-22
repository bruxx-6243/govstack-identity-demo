import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { FilePlus, ClockAlert, ShieldCheck, ArrowRight, FileText, Trash2 } from "lucide-react";
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
import type { Casier } from "@/domain/casier";
import { useCasierStore } from "@/stores/casier.store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tableau de bord — Casier Judiciaire" },
      {
        name: "description",
        content:
          "Plateforme officielle de demande du casier judiciaire pour les agents du Ministère de la Justice.",
      },
      { property: "og:title", content: "Casier Judiciaire" },
      {
        property: "og:description",
        content: "Ministère de la Justice — République du Congo.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const router = useRouter();
  const items = useCasierStore((s) => s.items);
  const loadAll = useCasierStore((s) => s.loadAll);
  const startNew = useCasierStore((s) => s.startNew);
  const deleteCasier = useCasierStore((s) => s.deleteCasier);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const total = items.length;
  const pending = items.filter((i) => i.status === "En instruction").length;
  const validated = items.filter((i) => i.status === "Validée").length;
  const submitted = items.filter((i) => i.status === "Soumise").length;

  const startNewCasier = async () => {
    const c = await startNew();
    router.navigate({ to: "/demande/$id", params: { id: c.id } });
  };

  const handleDelete = async (c: Casier) => {
    await deleteCasier(c.id);
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
              Demandes de casier judiciaire
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Instruisez les demandes et délivrez le casier judiciaire des citoyens.
            </p>
          </div>
          <Button size="lg" onClick={startNewCasier} className="gap-2">
            <FilePlus className="h-5 w-5" />
            Nouvelle demande
          </Button>
        </div>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            icon={<FileText className="h-5 w-5" />}
            label="Demandes totales"
            value={total}
            tone="green"
          />
          <Stat
            icon={<ClockAlert className="h-5 w-5" />}
            label="En instruction"
            value={pending}
            tone="yellow"
          />
          <Stat
            icon={<ShieldCheck className="h-5 w-5" />}
            label="Validées"
            value={validated}
            tone="green"
          />
          <Stat
            icon={<FileText className="h-5 w-5" />}
            label="Soumises"
            value={submitted}
            tone="neutral"
          />
        </section>

        <section className="mt-8 rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">Demandes récentes</h2>
              <p className="text-xs text-muted-foreground">Derniers dossiers soumis.</p>
            </div>
          </div>
          <div className="divide-y divide-border">
            {items.length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Aucune demande pour le moment.
              </div>
            )}
            {items.slice(0, 8).map((c) => (
              <div
                key={c.id}
                className="group flex items-center justify-between gap-4 px-6 py-4 transition-colors hover:bg-secondary/50"
              >
                <Link
                  to="/dossiers/$id"
                  params={{ id: c.id }}
                  className="flex flex-1 items-center gap-4"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cg-green-soft font-semibold text-cg-green-dark">
                    {c.citizenNomAffiche ? c.citizenNomAffiche[0] : "?"}
                  </div>
                  <div>
                    <div className="font-medium text-foreground">{c.citizenNomAffiche || "—"}</div>
                    <div className="text-xs text-muted-foreground">
                      {c.citizenUin || "UIN —"} · {c.numeroDemande}
                    </div>
                  </div>
                </Link>
                <div className="flex items-center gap-3">
                  <StatusBadge status={c.status} />
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
                          Cette action est irréversible. La demande {c.numeroDemande} sera
                          définitivement supprimée.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(c)}
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
  tone: "green" | "yellow" | "neutral";
}) {
  const toneMap = {
    green: "bg-cg-green-soft text-cg-green-dark",
    yellow: "bg-yellow-50 text-yellow-800",
    neutral: "bg-secondary text-muted-foreground",
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
