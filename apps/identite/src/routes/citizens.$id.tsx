import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Edit,
  Printer,
  Download,
  ShieldCheck,
  Trash2,
  User,
  Mail,
  Phone,
  MapPin,
  Users,
  FileCheck2,
  CalendarClock,
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
import type { Enrollment, EnrollmentStatus } from "@/domain/enrollment";
import { useEnrollmentStore } from "@/stores/enrollment.store";

const STATUS_HISTORY_LABEL: Record<EnrollmentStatus, string> = {
  Brouillon: "Dossier créé",
  "En attente de validation": "Soumis pour validation",
  Validé: "Identité validée",
  Rejeté: "Dossier rejeté",
};

export const Route = createFileRoute("/citizens/$id")({
  head: () => ({
    meta: [
      { title: "Fiche citoyen — SNEC" },
      { name: "description", content: "Profil complet d'un citoyen enrôlé." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CitizenProfile,
});

function CitizenProfile() {
  const { id } = Route.useParams();
  const router = useRouter();
  const loadOne = useEnrollmentStore((s) => s.loadOne);
  const loadHistory = useEnrollmentStore((s) => s.loadHistory);
  const history = useEnrollmentStore((s) => s.history);
  const verifyEnrollment = useEnrollmentStore((s) => s.verify);
  const rejectEnrollment = useEnrollmentStore((s) => s.reject);
  const deleteEnrollment = useEnrollmentStore((s) => s.deleteEnrollment);
  const [data, setData] = useState<Enrollment | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  useEffect(() => {
    loadOne(id).then((e) => {
      if (!e) {
        router.navigate({ to: "/" });
        return;
      }
      setData(e);
    });
    loadHistory(id);
  }, [id, router, loadOne, loadHistory]);

  if (!data) return null;

  const verify = async () => {
    const updated = await verifyEnrollment(data);
    if (updated) setData(updated);
    toast.success("Identité vérifiée et validée");
  };

  const reject = async () => {
    if (!rejectReason.trim()) {
      toast.error("Veuillez indiquer un motif de rejet");
      return;
    }
    setIsRejecting(true);
    try {
      const updated = await rejectEnrollment(data, rejectReason.trim());
      if (updated) setData(updated);
      toast.success("Dossier rejeté");
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
    a.download = `${data.citizenUid}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async () => {
    await deleteEnrollment(data.id);
    toast.success("Dossier supprimé");
    router.navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-background">
      <GovHeader centre={data.centreEnrolement} agent={data.agentResponsable} />
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
              onClick={() => router.navigate({ to: "/enrollment/$id", params: { id: data.id } })}
              className="gap-2"
            >
              <Edit className="h-4 w-4" /> Modifier
            </Button>
            <Button variant="outline" onClick={() => window.print()} className="gap-2">
              <Printer className="h-4 w-4" /> Imprimer certificat
            </Button>
            <Button variant="outline" onClick={exportRecord} className="gap-2">
              <Download className="h-4 w-4" /> Exporter
            </Button>
            {data.status !== "Validé" && (
              <Button onClick={verify} className="gap-2">
                <ShieldCheck className="h-4 w-4" /> Vérifier identité
              </Button>
            )}
            {data.status !== "Rejeté" && (
              <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
                <DialogTrigger asChild>
                  <Button variant="destructive" className="gap-2">
                    <XCircle className="h-4 w-4" /> Rejeter
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Rejeter ce dossier ?</DialogTitle>
                    <DialogDescription>
                      Indiquez le motif du rejet. Il sera consigné dans l'historique du dossier.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-1.5">
                    <Label htmlFor="reject-reason">Motif du rejet</Label>
                    <Textarea
                      id="reject-reason"
                      rows={3}
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Ex. : pièce d'identité non lisible"
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
                      {isRejecting ? "Rejet..." : "Rejeter le dossier"}
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
                  <AlertDialogTitle>Supprimer ce dossier ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cette action est irréversible. Le dossier de {data.prenom} {data.nom} (
                    {data.citizenUid}) sera définitivement supprimé.
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

        {/* ID Card */}
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="flag-stripe" />
          <div className="grid gap-6 p-6 md:grid-cols-[auto_1fr_auto] md:items-center">
            <div className="flex h-32 w-28 items-center justify-center rounded-md bg-secondary ring-1 ring-border">
              <User className="h-12 w-12 text-muted-foreground" />
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-widest text-cg-green">
                République du Congo — Carte d'identité citoyenne
              </div>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
                {data.prenom} {data.nom}
              </h1>
              <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                <Info label="Identifiant unique" value={data.citizenUid} mono />
                <Info label="Numéro de dossier" value={data.fileNumber} mono />
                <Info label="Date de naissance" value={data.dateNaissance || "—"} />
                <Info label="Nationalité" value={data.nationalite || "—"} />
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <StatusBadge status={data.status} />
              <div className="text-xs text-muted-foreground">
                Enrôlé le {new Date(data.createdAt).toLocaleDateString("fr-FR")}
              </div>
            </div>
          </div>
        </div>

        {/* Sections */}
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Section title="Informations d'identité" icon={<User className="h-4 w-4" />}>
            <Info label="Nom" value={data.nom || "—"} />
            <Info label="Prénom(s)" value={data.prenom || "—"} />
            <Info label="Sexe" value={data.sexe || "—"} />
            <Info label="Lieu de naissance" value={data.lieuNaissance || "—"} />
            <Info label="Type de pièce" value={data.typePiece || "—"} />
            <Info label="Numéro de pièce" value={data.numeroPiece || "—"} mono />
          </Section>

          <Section title="Coordonnées" icon={<Phone className="h-4 w-4" />}>
            <Info label="Téléphone" value={data.telephone || "—"} />
            <Info label="Email" value={data.email || "—"} icon={<Mail className="h-3 w-3" />} />
            <Info label="Adresse" value={data.adresse || "—"} full />
            <Info label="Quartier" value={data.quartier || "—"} />
            <Info label="Commune" value={data.commune || "—"} />
            <Info
              label="Ville"
              value={`${data.ville}, ${data.pays}`}
              icon={<MapPin className="h-3 w-3" />}
            />
          </Section>

          <Section title="Informations familiales" icon={<Users className="h-4 w-4" />}>
            <Info label="Situation matrimoniale" value={data.situationMatrimoniale || "—"} />
            {data.situationMatrimoniale === "Marié(e)" && (
              <Info label="Conjoint" value={data.nomConjoint || "—"} />
            )}
            <Info label="Nombre d'enfants" value={data.nombreEnfants || "0"} />
            <Info label="Père" value={data.nomPere || "—"} />
            <Info label="Mère" value={data.nomMere || "—"} />
            <Info
              label="Contact urgence"
              value={`${data.contactUrgenceNom || "—"} (${data.contactUrgenceLien || "—"}) · ${data.contactUrgenceTel || "—"}`}
              full
            />
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
            title="Historique d'enrôlement"
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
  icon,
  full,
}: {
  label: string;
  value: string;
  mono?: boolean;
  icon?: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div
        className={`mt-0.5 flex items-center gap-1.5 text-sm text-foreground ${mono ? "font-mono font-semibold" : ""}`}
      >
        {icon} {value}
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
