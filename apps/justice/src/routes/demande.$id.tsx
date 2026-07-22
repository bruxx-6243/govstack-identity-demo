import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Save, Check, Upload, FileCheck2, CheckCircle2 } from "lucide-react";
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
import { validateStep, type Casier } from "@/domain/casier";
import { useCasierStore } from "@/stores/casier.store";

export const Route = createFileRoute("/demande/$id")({
  head: () => ({
    meta: [
      { title: "Nouvelle demande — Casier Judiciaire" },
      { name: "description", content: "Assistant de demande de casier judiciaire en 4 étapes." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CasierWizard,
});

const STEPS: Step[] = [
  { id: 1, title: "Identité" },
  { id: 2, title: "Motif" },
  { id: 3, title: "Documents" },
  { id: 4, title: "Livraison" },
];

function CasierWizard() {
  const { id } = Route.useParams();
  const router = useRouter();
  const loadOne = useCasierStore((s) => s.loadOne);
  const current = useCasierStore((s) => s.current);
  const updateCurrent = useCasierStore((s) => s.updateCurrent);
  const saveDraftInStore = useCasierStore((s) => s.saveDraft);
  const finalizeInStore = useCasierStore((s) => s.finalize);
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const data = current;

  useEffect(() => {
    loadOne(id).then((c) => {
      if (!c) {
        toast.error("Demande introuvable");
        router.navigate({ to: "/" });
      }
    });
  }, [id, router, loadOne]);

  if (!data) return null;

  const update = <K extends keyof Casier>(k: K, v: Casier[K]) => updateCurrent(k, v);

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
    if (!validate(4)) return;
    await finalizeInStore();
    toast.success("Demande soumise à instruction");
    router.navigate({ to: "/dossiers/$id", params: { id: data.id } });
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
          {step === 4 && <Step4 data={data} update={update} errors={errors} />}
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
  data: Casier;
  update: <K extends keyof Casier>(k: K, v: Casier[K]) => void;
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
      <SectionTitle title="Motif de la demande" />
      <div className="grid gap-5 md:grid-cols-2">
        <FormField label="Motif" required error={errors.motifDemande}>
          <Select
            value={data.motifDemande}
            onValueChange={(v) => update("motifDemande", v as Casier["motifDemande"])}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Emploi">Emploi</SelectItem>
              <SelectItem value="Dossier judiciaire">Dossier judiciaire</SelectItem>
              <SelectItem value="Voyage">Voyage</SelectItem>
              <SelectItem value="Autre">Autre</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Juridiction compétente" required error={errors.juridictionCompetente}>
          <Input
            value={data.juridictionCompetente}
            onChange={(e) => update("juridictionCompetente", e.target.value)}
            placeholder="Tribunal de grande instance de..."
          />
        </FormField>
        <FormField label="Précisions" hint="Optionnel" className="md:col-span-2">
          <Textarea
            rows={3}
            value={data.precisionMotif}
            onChange={(e) => update("precisionMotif", e.target.value)}
          />
        </FormField>
      </div>
    </>
  );
}

function Step3({ data, update }: { data: Casier; update: StepProps["update"] }) {
  const setDoc = (key: string, patch: Partial<{ status: string; fileName: string }>) => {
    update(
      "documents",
      data.documents.map((d) => (d.key === key ? ({ ...d, ...patch } as typeof d) : d)),
    );
  };
  return (
    <>
      <SectionTitle
        title="Documents justificatifs"
        subtitle="Téléversez les pièces justificatives requises pour la demande."
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

function Step4({ data, update, errors }: StepProps) {
  return (
    <>
      <SectionTitle title="Livraison et consentement" />
      <div className="grid gap-5 md:grid-cols-2">
        <FormField label="Mode de retrait" required error={errors.modeRetrait}>
          <Select
            value={data.modeRetrait}
            onValueChange={(v) => update("modeRetrait", v as Casier["modeRetrait"])}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Retrait au guichet">Retrait au guichet</SelectItem>
              <SelectItem value="Envoi postal">Envoi postal</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
        {data.modeRetrait === "Envoi postal" && (
          <FormField label="Adresse de livraison" className="md:col-span-2">
            <Textarea
              rows={2}
              value={data.adresseLivraison}
              onChange={(e) => update("adresseLivraison", e.target.value)}
            />
          </FormField>
        )}
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
