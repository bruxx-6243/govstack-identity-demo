import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Printer,
  Download,
  ShieldCheck,
  XCircle,
  Trash2,
  Scale,
  CalendarClock,
  FileText,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type { Casier, CasierStatus } from "@/domain/casier";
import { useCasierStore } from "@/stores/casier.store";

const STATUS_HISTORY_LABEL: Record<CasierStatus, string> = {
  Soumise: "Demande soumise",
  "En instruction": "Mise en instruction",
  Validée: "Casier validé",
  Rejetée: "Demande rejetée",
};

export const Route = createFileRoute("/dossiers/$id")({
  head: () => ({
    meta: [
      { title: "Dossier — Casier Judiciaire" },
      { name: "description", content: "Détail d'une demande de casier judiciaire." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CasierDetail,
});

function CasierDetail() {
  const { id } = Route.useParams();
  const router = useRouter();
  const loadOne = useCasierStore((s) => s.loadOne);
  const loadHistory = useCasierStore((s) => s.loadHistory);
  const history = useCasierStore((s) => s.history);
  const instruireCasier = useCasierStore((s) => s.finalize);
  const validateCasier = useCasierStore((s) => s.validate);
  const rejectCasier = useCasierStore((s) => s.reject);
  const deleteCasier = useCasierStore((s) => s.deleteCasier);
  const [data, setData] = useState<Casier | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  useEffect(() => {
    loadOne(id).then((c) => {
      if (!c) {
        router.navigate({ to: "/" });
        return;
      }
      setData(c);
    });
    loadHistory(id);
  }, [id, router, loadOne, loadHistory]);

  if (!data) return null;

  const instruire = async () => {
    const updated = await instruireCasier();
    if (updated) setData(updated);
    toast.success("Demande mise en instruction");
  };

  const validate = async () => {
    const updated = await validateCasier(data);
    if (updated) setData(updated);
    toast.success("Casier judiciaire validé");
  };

  const reject = async () => {
    if (!rejectReason.trim()) {
      toast.error("Veuillez indiquer un motif de rejet");
      return;
    }
    setIsRejecting(true);
    try {
      const updated = await rejectCasier(data, rejectReason.trim());
      if (updated) setData(updated);
      toast.success("Demande rejetée");
      setIsRejectOpen(false);
      setRejectReason("");
    } finally {
      setIsRejecting(false);
    }
  };

  const exportRecord = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${data.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async () => {
    await deleteCasier(data.id);
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
            <Button variant="outline" onClick={() => window.print()} className="gap-2">
              <Printer className="h-4 w-4" /> Imprimer
            </Button>
            <Button variant="outline" onClick={exportRecord} className="gap-2">
              <Download className="h-4 w-4" /> Exporter
            </Button>
            {data.status === "Soumise" && (
              <Button onClick={instruire} className="gap-2">
                <ShieldCheck className="h-4 w-4" /> Mettre en instruction
              </Button>
            )}
            {data.status === "En instruction" && (
              <Button onClick={validate} className="gap-2">
                <ShieldCheck className="h-4 w-4" /> Valider
              </Button>
            )}
            {(data.status === "Soumise" || data.status === "En instruction") && (
              <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
                <DialogTrigger asChild>
                  <Button variant="destructive" className="gap-2">
                    <XCircle className="h-4 w-4" /> Rejeter
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Rejeter cette demande ?</DialogTitle>
                    <DialogDescription>
                      Indiquez le motif du rejet. Il sera consigné dans l'historique de la
                      demande.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-1.5">
                    <Label htmlFor="reject-reason">Motif du rejet</Label>
                    <Textarea
                      id="reject-reason"
                      rows={3}
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Ex. : documents fournis non conformes"
                    />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsRejectOpen(false)}>
                      Annuler
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={reject}
                      disabled={isRejecting}
                      className="gap-2"
                    >
                      <XCircle className="h-4 w-4" />
                      {isRejecting ? "Rejet..." : "Rejeter la demande"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
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
                    Cette action est irréversible. La demande {data.id.slice(0, 8)} sera
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
              <Scale className="h-12 w-12 text-muted-foreground" />
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-widest text-cg-green">
                République du Congo — Casier Judiciaire
              </div>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
                Dossier {data.id.slice(0, 8)}
              </h1>
              <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                <Info label="UIN citoyen" value={data.citizenUin || "—"} mono />
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
          <Section title="Document" icon={<FileText className="h-4 w-4" />}>
            <Info
              label="URL du document"
              value={data.documentUrl || "—"}
              full
            />
          </Section>

          <Section
            title="Historique"
            icon={<CalendarClock className="h-4 w-4" />}
            className="lg:col-span-2"
          >
            <div className="col-span-2 space-y-3">
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun historique disponible.</p>
              ) : (
                <Timeline
                  items={history.map((h) => ({
                    date: h.changedAt,
                    title: STATUS_HISTORY_LABEL[h.status],
                    detail: h.reason ?? `Statut : ${h.status}`,
                  }))}
                />
              )}
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
