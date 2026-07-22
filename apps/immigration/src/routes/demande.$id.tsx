import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Save,
  Check,
  Upload,
  FileCheck2,
  CheckCircle2,
  ShieldQuestion,
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
} from "lucide-react";
import { GovHeader } from "@/components/gov/GovHeader";
import { Stepper, type Step } from "@/components/gov/Stepper";
import { StatusBadge } from "@/components/gov/StatusBadge";
import { FormField } from "@/components/gov/FormField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { validateStep, type Passeport } from "@/domain/passeport";
import { usePasseportStore } from "@/stores/passeport.store";

export const Route = createFileRoute("/demande/$id")({
  head: () => ({
    meta: [
      { title: "Nouvelle demande — Passeport" },
      { name: "description", content: "Assistant de demande de passeport en 5 étapes." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PasseportWizard,
});

const STEPS: Step[] = [
  { id: 1, title: "Identité" },
  { id: 2, title: "Type & motif" },
  { id: 3, title: "Casier judiciaire" },
  { id: 4, title: "Documents" },
  { id: 5, title: "Livraison" },
];

function PasseportWizard() {
  const { id } = Route.useParams();
  const router = useRouter();
  const loadOne = usePasseportStore((s) => s.loadOne);
  const current = usePasseportStore((s) => s.current);
  const updateCurrent = usePasseportStore((s) => s.updateCurrent);
  const saveDraftInStore = usePasseportStore((s) => s.saveDraft);
  const finalizeInStore = usePasseportStore((s) => s.finalize);
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const data = current;

  useEffect(() => {
    loadOne(id).then((p) => {
      if (!p) {
        toast.error("Demande introuvable");
        router.navigate({ to: "/" });
      }
    });
  }, [id, router, loadOne]);

  if (!data) return null;

  const update = <K extends keyof Passeport>(k: K, v: Passeport[K]) => updateCurrent(k, v);

  const validate = (s: number): boolean => {
    const errs = validateStep(s, data);
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const saveDraft = async () => {
    await saveDraftInStore();
    toast.success("Brouillon enregistré");
  };

  const next = async () => {
    if (!validate(step)) {
      toast.error("Veuillez corriger les erreurs");
      return;
    }
    await saveDraftInStore();
    setStep((s) => Math.min(STEPS.length, s + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const prev = () => setStep((s) => Math.max(1, s - 1));

  const finalize = async () => {
    if (!validate(5)) return;
    await finalizeInStore();
    toast.success("Demande soumise à instruction");
    router.navigate({ to: "/demandes/$id", params: { id: data.id } });
  };

  return (
    <div className="min-h-screen bg-background">
      <GovHeader />
      <div className="h-21" />
      <main className="mx-auto max-w-7xl px-6 py-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">
              ← Retour au tableau de bord
            </Link>
            <h1 className="mt-1 text-2xl font-semibold text-foreground">
              Demande — Dossier {data.numeroDemande}
            </h1>
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              <span>UIN: {data.citizenUin || "—"}</span>
              <span>·</span>
              <StatusBadge status={data.status} />
            </div>
          </div>
          <Button variant="outline" onClick={saveDraft} className="gap-2">
            <Save className="h-4 w-4" /> Enregistrer brouillon
          </Button>
        </div>

        <Stepper steps={STEPS} current={step} onStepClick={(s) => s < step && setStep(s)} />

        <div className="mt-6 rounded-lg border border-border bg-card p-6">
          {step === 1 && <Step1 data={data} update={update} errors={errors} />}
          {step === 2 && <Step2 data={data} update={update} errors={errors} />}
          {step === 3 && <Step3 data={data} update={update} />}
          {step === 4 && <Step4 data={data} update={update} />}
          {step === 5 && <Step5 data={data} update={update} errors={errors} />}
        </div>

        <div className="mt-6 flex justify-between">
          <Button variant="outline" onClick={prev} disabled={step === 1} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Précédent
          </Button>
          {step < STEPS.length ? (
            <Button onClick={next} className="gap-2">
              Suivant <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={finalize} className="gap-2">
              <CheckCircle2 className="h-4 w-4" /> Soumettre la demande
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}

type StepProps = {
  data: Passeport;
  update: <K extends keyof Passeport>(k: K, v: Passeport[K]) => void;
  errors: Record<string, string>;
};

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6 border-b border-border pb-4">
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

function Step1({ data, update, errors }: StepProps) {
  const lookup = () => {
    // Placeholder — la résolution réelle de l'identité se fera via OIDC/eSignet
    // (Identity BB, voir §4.2 de l'architecture). Aucune saisie manuelle du nom
    // n'est autorisée ici : ce champ reste en lecture seule côté agent.
    update("citizenNomAffiche", data.citizenUin ? "Identité à résoudre via OIDC" : "");
  };
  return (
    <>
      <SectionTitle
        title="Identité du demandeur"
        subtitle="Saisissez l'identifiant unique national (UIN) du citoyen. Son identité est résolue auprès de l'Identity BB — aucune donnée d'identité n'est saisie ici."
      />
      <div className="grid gap-5 md:grid-cols-2">
        <FormField label="Identifiant unique national (UIN)" required error={errors.citizenUin}>
          <div className="flex gap-2">
            <Input
              value={data.citizenUin}
              onChange={(e) => update("citizenUin", e.target.value)}
              placeholder="CG-0000-0000-0000"
            />
            <Button type="button" variant="outline" onClick={lookup}>
              Rechercher
            </Button>
          </div>
        </FormField>
        <FormField
          label="Nom affiché"
          hint="Résolu automatiquement auprès de l'Identity BB — non modifiable"
        >
          <Input
            value={data.citizenNomAffiche}
            readOnly
            disabled
            placeholder="En attente de vérification"
          />
        </FormField>
      </div>
    </>
  );
}

function Step2({ data, update, errors }: StepProps) {
  return (
    <>
      <SectionTitle title="Type de passeport & motif" />
      <div className="grid gap-5 md:grid-cols-2">
        <FormField label="Type de passeport" required error={errors.typePasseport}>
          <Select
            value={data.typePasseport}
            onValueChange={(v) => update("typePasseport", v as Passeport["typePasseport"])}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Ordinaire">Ordinaire</SelectItem>
              <SelectItem value="Diplomatique">Diplomatique</SelectItem>
              <SelectItem value="Service">Service</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Motif du voyage" hint="Optionnel">
          <Input value={data.motifVoyage} onChange={(e) => update("motifVoyage", e.target.value)} />
        </FormField>
      </div>
    </>
  );
}

const verifIcon = {
  "Non vérifié": <ShieldQuestion className="h-5 w-5 text-muted-foreground" />,
  Vérifié: <ShieldCheck className="h-5 w-5 text-cg-green" />,
  "Mention trouvée": <ShieldAlert className="h-5 w-5 text-cg-red" />,
};

function Step3({ data, update }: { data: Passeport; update: StepProps["update"] }) {
  const runCheck = () => {
    // Placeholder — l'appel X-Road réel vers le Ministère de la Justice
    // (§4.5 de l'architecture, endpoint "verifier-mention") sera branché
    // ici une fois l'intégration inter-agence en place.
    update("verificationCasierStatut", "Vérifié");
  };
  return (
    <>
      <SectionTitle
        title="Vérification du casier judiciaire"
        subtitle="Contrôle croisé auprès du Ministère de la Justice via X-Road (§4.5 de l'architecture). Non implémenté à ce stade — statut simulé."
      />
      <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 p-5">
        <div className="flex items-center gap-3">
          {verifIcon[data.verificationCasierStatut]}
          <div>
            <div className="font-medium text-foreground">Statut de vérification</div>
            <div className="text-sm text-muted-foreground">{data.verificationCasierStatut}</div>
          </div>
        </div>
        <Button variant="outline" onClick={runCheck} className="gap-2">
          <RefreshCw className="h-4 w-4" /> Lancer la vérification (simulation)
        </Button>
      </div>
    </>
  );
}

function Step4({ data, update }: { data: Passeport; update: StepProps["update"] }) {
  const setDoc = (key: string, patch: Partial<{ status: string; fileName: string }>) => {
    update(
      "documents",
      data.documents.map((d) => (d.key === key ? ({ ...d, ...patch } as typeof d) : d)),
    );
  };
  return (
    <>
      <SectionTitle
        title="Documents du demandeur"
        subtitle="Téléversez les pièces justificatives fournies par le citoyen."
      />
      <div className="grid gap-4 md:grid-cols-2">
        {data.documents.map((doc) => (
          <div key={doc.key} className="rounded-lg border border-border bg-secondary/30 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-card ring-1 ring-border">
                  <FileCheck2 className="h-5 w-5 text-cg-green" />
                </div>
                <div>
                  <div className="font-medium text-foreground">{doc.label}</div>
                  {doc.fileName && (
                    <div className="text-xs text-muted-foreground">{doc.fileName}</div>
                  )}
                </div>
              </div>
              <StatusBadge status={doc.status} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-secondary">
                <Upload className="h-3.5 w-3.5" />
                Téléverser
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setDoc(doc.key, { status: "Téléversé", fileName: f.name });
                  }}
                />
              </label>
              {doc.status === "Téléversé" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDoc(doc.key, { status: "Vérifié" })}
                >
                  <Check className="mr-1 h-3.5 w-3.5" /> Marquer vérifié
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function Step5({ data, update, errors }: StepProps) {
  return (
    <>
      <SectionTitle title="Livraison et consentement" />
      <div className="grid gap-5 md:grid-cols-2">
        <FormField
          label="Centre de retrait"
          required
          error={errors.centreRetrait}
          className="md:col-span-2"
        >
          <Textarea
            rows={2}
            value={data.centreRetrait}
            onChange={(e) => update("centreRetrait", e.target.value)}
            placeholder="Centre Brazzaville - Aéroport Maya-Maya"
          />
        </FormField>
      </div>

      <div className="mt-6 rounded-lg border border-cg-green/30 bg-cg-green-soft/40 p-4">
        <label className="flex items-start gap-3">
          <Checkbox
            checked={data.consentement}
            onCheckedChange={(v) => update("consentement", Boolean(v))}
          />
          <span className="text-sm text-foreground">
            J'atteste l'exactitude des informations fournies et j'accepte le traitement de cette
            demande conformément aux règles de protection des données.
          </span>
        </label>
        {errors.consentement && <p className="mt-2 text-xs text-cg-red">{errors.consentement}</p>}
      </div>
    </>
  );
}
