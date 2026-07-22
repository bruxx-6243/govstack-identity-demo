import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Edit,
  Printer,
  Download,
  ShieldCheck,
  XCircle,
  Trash2,
  Stamp,
  FileCheck2,
  CalendarClock,
  ShieldQuestion,
  ShieldAlert,
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

export const Route = createFileRoute("/demandes/$id")({
  head: () => ({
    meta: [
      { title: "Dossier — Passeport" },
      { name: "description", content: "Détail d'une demande de passeport." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PasseportDetail,
});

const verifIcon = {
  "Non vérifié": <ShieldQuestion className="h-4 w-4 text-muted-foreground" />,
  Vérifié: <ShieldCheck className="h-4 w-4 text-cg-green" />,
  "Mention trouvée": <ShieldAlert className="h-4 w-4 text-cg-red" />,
};

function PasseportDetail() {
  const { id } = Route.useParams();
  const router = useRouter();
  const loadOne = usePasseportStore((s) => s.loadOne);
  const validatePasseport = usePasseportStore((s) => s.validate);
  const rejectPasseport = usePasseportStore((s) => s.reject);
  const deletePasseport = usePasseportStore((s) => s.deletePasseport);
  const [data, setData] = useState<Passeport | null>(null);

  useEffect(() => {
    loadOne(id).then((p) => {
      if (!p) {
        router.navigate({ to: "/" });
        return;
      }
      setData(p);
    });
  }, [id, router, loadOne]);

  if (!data) return null;

  const validate = async () => {
    const updated = await validatePasseport(data);
    if (updated) setData(updated);
    toast.success("Passeport validé");
  };

  const reject = async () => {
    const updated = await rejectPasseport(data);
    if (updated) setData(updated);
    toast.success("Demande rejetée");
  };

  const exportRecord = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${data.numeroDemande}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async () => {
    await deletePasseport(data.id);
    toast.success("Demande supprimée");
    router.navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-background">
      <GovHeader />
      <div className="h-21 print:hidden" />
      <main className="mx-auto max-w-7xl px-6 py-6 print:py-2">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Retour au tableau de bord
          </Link>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => router.navigate({ to: "/demande/$id", params: { id: data.id } })}
              className="gap-2"
            >
              <Edit className="h-4 w-4" /> Modifier
            </Button>
            <Button variant="outline" onClick={() => window.print()} className="gap-2">
              <Printer className="h-4 w-4" /> Imprimer
            </Button>
            <Button variant="outline" onClick={exportRecord} className="gap-2">
              <Download className="h-4 w-4" /> Exporter
            </Button>
            {data.status !== "Validée" && data.status !== "Rejetée" && (
              <>
                <Button onClick={validate} className="gap-2">
                  <ShieldCheck className="h-4 w-4" /> Valider
                </Button>
                <Button variant="destructive" onClick={reject} className="gap-2">
                  <XCircle className="h-4 w-4" /> Rejeter
                </Button>
              </>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="gap-2">
                  <Trash2 className="h-4 w-4" /> Supprimer
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Supprimer cette demande ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cette action est irréversible. La demande {data.numeroDemande} sera
                    définitivement supprimée.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Supprimer
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="flag-stripe" />
          <div className="grid gap-6 p-6 md:grid-cols-[auto_1fr_auto] md:items-center">
            <div className="flex h-32 w-28 items-center justify-center rounded-md bg-secondary ring-1 ring-border">
              <Stamp className="h-12 w-12 text-muted-foreground" />
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-widest text-cg-green">
                République du Congo — Passeport
              </div>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
                {data.citizenNomAffiche || "Demandeur non résolu"}
              </h1>
              <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                <Info label="UIN citoyen" value={data.citizenUin || "—"} mono />
                <Info label="Numéro de demande" value={data.numeroDemande} mono />
                <Info label="Type de passeport" value={data.typePasseport || "—"} />
                <Info label="Centre de retrait" value={data.centreRetrait || "—"} />
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <StatusBadge status={data.status} />
              <div className="text-xs text-muted-foreground">
                Soumise le {new Date(data.createdAt).toLocaleDateString("fr-FR")}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Section
            title="Vérification casier judiciaire"
            icon={<ShieldCheck className="h-4 w-4" />}
          >
            <div className="col-span-2 flex items-center gap-2 text-sm text-foreground">
              {verifIcon[data.verificationCasierStatut]}
              {data.verificationCasierStatut}
              <span className="text-xs text-muted-foreground">
                (vérification X-Road — Ministère de la Justice)
              </span>
            </div>
          </Section>

          <Section title="Documents" icon={<FileCheck2 className="h-4 w-4" />}>
            <div className="col-span-2 space-y-2">
              {data.documents.map((d) => (
                <div
                  key={d.key}
                  className="flex items-center justify-between rounded-md border border-border bg-secondary/30 px-3 py-2 text-sm"
                >
                  <div>
                    <div className="font-medium text-foreground">{d.label}</div>
                    {d.fileName && (
                      <div className="text-xs text-muted-foreground">{d.fileName}</div>
                    )}
                  </div>
                  <StatusBadge status={d.status} />
                </div>
              ))}
            </div>
          </Section>

          <Section
            title="Historique"
            icon={<CalendarClock className="h-4 w-4" />}
            className="lg:col-span-2"
          >
            <div className="col-span-2 space-y-3">
              <Timeline
                items={
                  [
                    { date: data.createdAt, title: "Demande créée", detail: data.numeroDemande },
                    { date: data.updatedAt, title: "Dernière mise à jour", detail: data.status },
                    data.status === "Validée"
                      ? {
                          date: data.updatedAt,
                          title: "Passeport validé",
                          detail: "Statut: Validée",
                        }
                      : null,
                    data.status === "Rejetée"
                      ? {
                          date: data.updatedAt,
                          title: "Demande rejetée",
                          detail: "Statut: Rejetée",
                        }
                      : null,
                  ].filter(Boolean) as { date: string; title: string; detail: string }[]
                }
              />
            </div>
          </Section>
        </div>
      </main>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
  className = "",
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-lg border border-border bg-card ${className}`}>
      <div className="flex items-center gap-2 border-b border-border px-5 py-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-cg-green-soft text-cg-green-dark">
          {icon}
        </div>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      </div>
      <div className="grid grid-cols-2 gap-4 p-5">{children}</div>
    </section>
  );
}

function Info({
  label,
  value,
  mono,
  full,
}: {
  label: string;
  value: string;
  mono?: boolean;
  full?: boolean;
}) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div
        className={`mt-0.5 flex items-center gap-1.5 text-sm text-foreground ${mono ? "font-mono font-semibold" : ""}`}
      >
        {value}
      </div>
    </div>
  );
}

function Timeline({ items }: { items: { date: string; title: string; detail: string }[] }) {
  return (
    <ol className="relative ml-2 border-l border-border">
      {items.map((it, i) => (
        <li key={i} className="mb-4 ml-4 last:mb-0">
          <div className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-card bg-cg-green" />
          <div className="text-sm font-medium text-foreground">{it.title}</div>
          <div className="text-xs text-muted-foreground">
            {new Date(it.date).toLocaleString("fr-FR")} · {it.detail}
          </div>
        </li>
      ))}
    </ol>
  );
}
