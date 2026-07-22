import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  UserPlus,
  Users,
  ClockAlert,
  ShieldCheck,
  ArrowRight,
  FileText,
  Trash2,
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
import type { Enrollment } from "@/domain/enrollment";
import { useEnrollmentStore } from "@/stores/enrollment.store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tableau de bord — Système National d'Enrôlement Citoyen" },
      {
        name: "description",
        content:
          "Plateforme officielle d'enrôlement citoyen de la République du Congo pour les agents des centres d'enregistrement.",
      },
      { property: "og:title", content: "Système National d'Enrôlement Citoyen" },
      {
        property: "og:description",
        content: "Plateforme d'identité numérique nationale — République du Congo.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const router = useRouter();
  const items = useEnrollmentStore((s) => s.items);
  const loadAll = useEnrollmentStore((s) => s.loadAll);
  const startNewEnrollment = useEnrollmentStore((s) => s.startNew);
  const deleteEnrollment = useEnrollmentStore((s) => s.deleteEnrollment);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const total = items.length;
  const pending = items.filter((i) => i.status === "En attente de validation").length;
  const completed = items.filter((i) => i.status === "Validé").length;
  const drafts = items.filter((i) => i.status === "Brouillon").length;

  const startNew = async () => {
    const e = await startNewEnrollment();
    router.navigate({ to: "/enrollment/$id", params: { id: e.id } });
  };

  const handleDelete = async (e: Enrollment) => {
    await deleteEnrollment(e.id);
    toast.success("Dossier supprimé");
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
              Enrôlement citoyen
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Enregistrez les citoyens et générez leur identifiant national unique.
            </p>
          </div>
          <Button size="lg" onClick={startNew} className="gap-2">
            <UserPlus className="h-5 w-5" />
            Nouvel enrôlement citoyen
          </Button>
        </div>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            icon={<Users className="h-5 w-5" />}
            label="Citoyens enrôlés"
            value={total}
            tone="green"
          />
          <Stat
            icon={<ClockAlert className="h-5 w-5" />}
            label="En attente"
            value={pending}
            tone="yellow"
          />
          <Stat
            icon={<ShieldCheck className="h-5 w-5" />}
            label="Validés"
            value={completed}
            tone="green"
          />
          <Stat
            icon={<FileText className="h-5 w-5" />}
            label="Brouillons"
            value={drafts}
            tone="neutral"
          />
        </section>

        <section className="mt-8 rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">Enrôlements récents</h2>
              <p className="text-xs text-muted-foreground">
                Derniers dossiers créés dans votre centre.
              </p>
            </div>
          </div>
          <div className="divide-y divide-border">
            {items.length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Aucun enrôlement pour le moment.
              </div>
            )}
            {items.slice(0, 8).map((e) => (
              <div
                key={e.id}
                className="group flex items-center justify-between gap-4 px-6 py-4 transition-colors hover:bg-secondary/50"
              >
                <Link
                  to="/citizens/$id"
                  params={{ id: e.id }}
                  className="flex flex-1 items-center gap-4"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cg-green-soft font-semibold text-cg-green-dark">
                    {(e.prenom[0] || "?") + (e.nom[0] || "")}
                  </div>
                  <div>
                    <div className="font-medium text-foreground">
                      {e.prenom || "—"} {e.nom || "—"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {e.citizenUid} · {e.fileNumber}
                    </div>
                  </div>
                </Link>
                <div className="flex items-center gap-3">
                  <StatusBadge status={e.status} />
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
                        <AlertDialogTitle>Supprimer ce dossier ?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Cette action est irréversible. Le dossier de {e.prenom} {e.nom} (
                          {e.citizenUid}) sera définitivement supprimé.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(e)}
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
