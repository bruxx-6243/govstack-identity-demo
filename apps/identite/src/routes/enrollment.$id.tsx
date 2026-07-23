import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
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
import { validateStep, type Enrollment, type EnrollmentStatus } from "@/domain/enrollment";
import { useEnrollmentStore } from "@/stores/enrollment.store";

export const Route = createFileRoute("/enrollment/$id")({
  head: () => ({
    meta: [
      { title: "Nouvel enrôlement — SNEC" },
      { name: "description", content: "Assistant d'enrôlement citoyen en 8 étapes." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EnrollmentWizard,
});

const STEPS: Step[] = [
  { id: 1, title: "Identité" },
  { id: 2, title: "Coordonnées" },
  { id: 3, title: "État civil" },
  { id: 4, title: "Famille" },
  { id: 5, title: "Socio-éco." },
  { id: 6, title: "Documents" },
  { id: 7, title: "Administratif" },
  { id: 8, title: "Consentement" },
];

function EnrollmentWizard() {
  const { id } = Route.useParams();
  const router = useRouter();
  const loadOne = useEnrollmentStore((s) => s.loadOne);
  const current = useEnrollmentStore((s) => s.current);
  const updateCurrent = useEnrollmentStore((s) => s.updateCurrent);
  const saveDraftInStore = useEnrollmentStore((s) => s.saveDraft);
  const finalizeInStore = useEnrollmentStore((s) => s.finalize);
  const uploadDocumentInStore = useEnrollmentStore((s) => s.uploadDocument);
  const verifyDocumentInStore = useEnrollmentStore((s) => s.verifyDocument);
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const data = current;

  useEffect(() => {
    loadOne(id).then((e) => {
      if (!e) {
        toast.error("Dossier introuvable");
        router.navigate({ to: "/" });
      }
    });
  }, [id, router, loadOne]);

  if (!data) return null;

  const update = <K extends keyof Enrollment>(k: K, v: Enrollment[K]) => updateCurrent(k, v);

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
    if (!validate(8)) return;
    await finalizeInStore();
    toast.success("Enrôlement finalisé");
    router.navigate({ to: "/citizens/$id", params: { id: data.id } });
  };

  return (
    <div className="min-h-screen bg-background">
      <GovHeader centre={data.centreEnrolement} agent={data.agentResponsable} />
      <div className="h-21" />
      <main className="mx-auto max-w-7xl px-6 py-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">
              ← Retour au tableau de bord
            </Link>
            <h1 className="mt-1 text-2xl font-semibold text-foreground">
              Enrôlement — Dossier {data.fileNumber}
            </h1>
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              <span>UID: {data.citizenUid}</span>
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
          {step === 3 && <Step3 data={data} update={update} errors={errors} />}
          {step === 4 && <Step4 data={data} update={update} errors={errors} />}
          {step === 5 && <Step5 data={data} update={update} errors={errors} />}
          {step === 6 && (
            <Step6
              data={data}
              update={update}
              onUpload={async (key, file) => {
                await uploadDocumentInStore(data.id, key, file);
              }}
              onVerify={async (key) => {
                await verifyDocumentInStore(data.id, key);
              }}
            />
          )}
          {step === 7 && <Step7 data={data} update={update} />}
          {step === 8 && <Step8 data={data} update={update} errors={errors} />}
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
              <CheckCircle2 className="h-4 w-4" /> Finaliser l'enrôlement
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}

type StepProps = {
  data: Enrollment;
  update: <K extends keyof Enrollment>(k: K, v: Enrollment[K]) => void;
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
  return (
    <>
      <SectionTitle
        title="Informations d'identité"
        subtitle="Renseignez l'identité du citoyen telle qu'elle figure sur ses pièces officielles."
      />
      <div className="grid gap-5 md:grid-cols-2">
        <FormField label="Nom" required error={errors.nom}>
          <Input value={data.nom} onChange={(e) => update("nom", e.target.value.toUpperCase())} />
        </FormField>
        <FormField label="Prénom(s)" required error={errors.prenom}>
          <Input value={data.prenom} onChange={(e) => update("prenom", e.target.value)} />
        </FormField>
        <FormField label="Sexe" required error={errors.sexe}>
          <Select value={data.sexe} onValueChange={(v) => update("sexe", v as Enrollment["sexe"])}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Masculin">Masculin</SelectItem>
              <SelectItem value="Féminin">Féminin</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Date de naissance" required error={errors.dateNaissance}>
          <Input
            type="date"
            value={data.dateNaissance}
            onChange={(e) => update("dateNaissance", e.target.value)}
          />
        </FormField>
        <FormField label="Lieu de naissance" required error={errors.lieuNaissance}>
          <Input
            value={data.lieuNaissance}
            onChange={(e) => update("lieuNaissance", e.target.value)}
          />
        </FormField>
        <FormField label="Nationalité" required error={errors.nationalite}>
          <Input value={data.nationalite} onChange={(e) => update("nationalite", e.target.value)} />
        </FormField>
        <FormField label="Type de pièce d'identité" required error={errors.typePiece}>
          <Select
            value={data.typePiece}
            onValueChange={(v) => update("typePiece", v as Enrollment["typePiece"])}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Carte Nationale d'Identité">Carte Nationale d'Identité</SelectItem>
              <SelectItem value="Passeport">Passeport</SelectItem>
              <SelectItem value="Permis de conduire">Permis de conduire</SelectItem>
              <SelectItem value="Autre">Autre</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Numéro de pièce d'identité" required error={errors.numeroPiece}>
          <Input value={data.numeroPiece} onChange={(e) => update("numeroPiece", e.target.value)} />
        </FormField>
      </div>
    </>
  );
}

function Step2({ data, update, errors }: StepProps) {
  return (
    <>
      <SectionTitle title="Informations de contact et résidence" />
      <div className="mb-6">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-cg-green">
          Contact
        </h3>
        <div className="grid gap-5 md:grid-cols-2">
          <FormField label="Numéro de téléphone" required error={errors.telephone}>
            <Input
              value={data.telephone}
              onChange={(e) => update("telephone", e.target.value)}
              placeholder="+242 06 000 00 00"
            />
          </FormField>
          <FormField label="Adresse email" hint="Optionnel">
            <Input
              type="email"
              value={data.email}
              onChange={(e) => update("email", e.target.value)}
            />
          </FormField>
        </div>
      </div>
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-cg-green">
          Résidence
        </h3>
        <div className="grid gap-5 md:grid-cols-2">
          <FormField
            label="Adresse complète"
            required
            error={errors.adresse}
            className="md:col-span-2"
          >
            <Textarea
              rows={2}
              value={data.adresse}
              onChange={(e) => update("adresse", e.target.value)}
              placeholder="Saisir l'adresse..."
            />
          </FormField>
          <FormField label="Quartier/Village">
            <Input value={data.quartier} onChange={(e) => update("quartier", e.target.value)} />
          </FormField>
          <FormField label="Arrondissement">
            <Input
              value={data.arrondissement}
              onChange={(e) => update("arrondissement", e.target.value)}
            />
          </FormField>
          <FormField label="Commune/Département" required error={errors.commune}>
            <Input value={data.commune} onChange={(e) => update("commune", e.target.value)} />
          </FormField>
          <FormField label="Ville" required error={errors.ville}>
            <Input value={data.ville} onChange={(e) => update("ville", e.target.value)} />
          </FormField>
          <FormField label="Pays" required error={errors.pays}>
            <Input value={data.pays} onChange={(e) => update("pays", e.target.value)} />
          </FormField>
        </div>
      </div>
    </>
  );
}

function Step3({ data, update, errors }: StepProps) {
  return (
    <>
      <SectionTitle title="Situation familiale" />
      <div className="grid gap-5 md:grid-cols-2">
        <FormField label="Situation matrimoniale" required error={errors.situationMatrimoniale}>
          <Select
            value={data.situationMatrimoniale}
            onValueChange={(v) =>
              update("situationMatrimoniale", v as Enrollment["situationMatrimoniale"])
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Célibataire">Célibataire</SelectItem>
              <SelectItem value="Marié(e)">Marié(e)</SelectItem>
              <SelectItem value="Divorcé(e)">Divorcé(e)</SelectItem>
              <SelectItem value="Veuf/Veuve">Veuf/Veuve</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
        {data.situationMatrimoniale === "Marié(e)" && (
          <FormField label="Nom du conjoint" required error={errors.nomConjoint}>
            <Input
              value={data.nomConjoint}
              onChange={(e) => update("nomConjoint", e.target.value)}
            />
          </FormField>
        )}
        <FormField label="Nombre d'enfants" hint="Optionnel">
          <Input
            type="number"
            min={0}
            value={data.nombreEnfants}
            onChange={(e) => update("nombreEnfants", e.target.value)}
          />
        </FormField>
      </div>
    </>
  );
}

function Step4({ data, update, errors }: StepProps) {
  return (
    <>
      <SectionTitle title="Informations familiales" />
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-cg-green">Parents</h3>
      <div className="grid gap-5 md:grid-cols-2">
        <FormField label="Nom complet du père" required error={errors.nomPere}>
          <Input value={data.nomPere} onChange={(e) => update("nomPere", e.target.value)} />
        </FormField>
        <FormField label="Nom complet de la mère" required error={errors.nomMere}>
          <Input value={data.nomMere} onChange={(e) => update("nomMere", e.target.value)} />
        </FormField>
      </div>

      <h3 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wider text-cg-green">
        Contact d'urgence
      </h3>
      <div className="grid gap-5 md:grid-cols-3">
        <FormField label="Nom complet" required error={errors.contactUrgenceNom}>
          <Input
            value={data.contactUrgenceNom}
            onChange={(e) => update("contactUrgenceNom", e.target.value)}
          />
        </FormField>
        <FormField label="Numéro de téléphone" required error={errors.contactUrgenceTel}>
          <Input
            value={data.contactUrgenceTel}
            onChange={(e) => update("contactUrgenceTel", e.target.value)}
          />
        </FormField>
        <FormField label="Lien de parenté" required error={errors.contactUrgenceLien}>
          <Select
            value={data.contactUrgenceLien}
            onValueChange={(v) =>
              update("contactUrgenceLien", v as Enrollment["contactUrgenceLien"])
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Père">Père</SelectItem>
              <SelectItem value="Mère">Mère</SelectItem>
              <SelectItem value="Frère/Sœur">Frère/Sœur</SelectItem>
              <SelectItem value="Conjoint">Conjoint</SelectItem>
              <SelectItem value="Autre">Autre</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
      </div>
    </>
  );
}

function Step5({ data, update }: StepProps) {
  return (
    <>
      <SectionTitle title="Profil socio-économique" />
      <div className="grid gap-5 md:grid-cols-2">
        <FormField label="Profession">
          <Input value={data.profession} onChange={(e) => update("profession", e.target.value)} />
        </FormField>
        <FormField label="Employeur">
          <Input value={data.employeur} onChange={(e) => update("employeur", e.target.value)} />
        </FormField>
        <FormField label="Niveau d'études">
          <Select
            value={data.niveauEtudes}
            onValueChange={(v) => update("niveauEtudes", v as Enrollment["niveauEtudes"])}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Aucun">Aucun</SelectItem>
              <SelectItem value="Primaire">Primaire</SelectItem>
              <SelectItem value="Secondaire">Secondaire</SelectItem>
              <SelectItem value="Universitaire">Universitaire</SelectItem>
              <SelectItem value="Formation professionnelle">Formation professionnelle</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Situation d'emploi">
          <Select
            value={data.situationEmploi}
            onValueChange={(v) => update("situationEmploi", v as Enrollment["situationEmploi"])}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Employé">Employé</SelectItem>
              <SelectItem value="Indépendant">Indépendant</SelectItem>
              <SelectItem value="Sans emploi">Sans emploi</SelectItem>
              <SelectItem value="Étudiant">Étudiant</SelectItem>
              <SelectItem value="Retraité">Retraité</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Revenus mensuels (FCFA)" hint="Optionnel">
          <Input
            type="number"
            min={0}
            value={data.revenus}
            onChange={(e) => update("revenus", e.target.value)}
          />
        </FormField>
      </div>
    </>
  );
}

function Step6({
  data,
  onUpload,
  onVerify,
}: {
  data: Enrollment;
  update: StepProps["update"];
  onUpload: (key: string, file: File) => Promise<void>;
  onVerify: (key: string) => Promise<void>;
}) {
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const upload = async (key: string, file: File) => {
    setPendingKey(key);
    try {
      await onUpload(key, file);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPendingKey(null);
    }
  };

  const verify = async (key: string) => {
    setPendingKey(key);
    try {
      await onVerify(key);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPendingKey(null);
    }
  };

  return (
    <>
      <SectionTitle
        title="Documents du citoyen"
        subtitle="Téléversez les pièces justificatives fournies par le citoyen."
      />
      <div className="grid gap-4 md:grid-cols-2">
        {data.documents.map((doc) => {
          const isPending = pendingKey === doc.key;
          return (
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
                <label
                  className={`inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-secondary ${isPending ? "pointer-events-none opacity-50" : ""}`}
                >
                  <Upload className="h-3.5 w-3.5" />
                  {isPending ? "Téléversement..." : "Téléverser"}
                  <input
                    type="file"
                    className="hidden"
                    disabled={isPending}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) upload(doc.key, f);
                    }}
                  />
                </label>
                {doc.status === "Téléversé" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => verify(doc.key)}
                    disabled={isPending}
                  >
                    <Check className="mr-1 h-3.5 w-3.5" />
                    {isPending ? "Vérification..." : "Marquer vérifié"}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function Step7({ data, update }: { data: Enrollment; update: StepProps["update"] }) {
  return (
    <>
      <SectionTitle title="Données d'enrôlement" />
      <div className="mb-6 rounded-md border border-border bg-secondary/30 p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <Meta
            label="Date d'enrôlement"
            value={new Date(data.createdAt).toLocaleDateString("fr-FR")}
          />
          <Meta label="Numéro de dossier" value={data.fileNumber} />
          <Meta label="Identifiant unique citoyen" value={data.citizenUid} />
        </div>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <FormField label="Centre d'enrôlement">
          <Input
            value={data.centreEnrolement}
            onChange={(e) => update("centreEnrolement", e.target.value)}
          />
        </FormField>
        <FormField label="Agent responsable">
          <Input
            value={data.agentResponsable}
            onChange={(e) => update("agentResponsable", e.target.value)}
          />
        </FormField>
        <FormField label="Statut du dossier">
          <Select
            value={data.status}
            onValueChange={(v) => update("status", v as EnrollmentStatus)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Brouillon">Brouillon</SelectItem>
              <SelectItem value="En attente de validation">En attente de validation</SelectItem>
              <SelectItem value="Validé">Validé</SelectItem>
              <SelectItem value="Rejeté">Rejeté</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
      </div>
    </>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-mono text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}

function Step8({ data, update, errors }: StepProps) {
  const providedDocs = data.documents.filter((d) => d.status !== "Non fourni");
  return (
    <>
      <SectionTitle title="Consentement et protection des données" />

      <div className="mb-6 rounded-lg border border-border bg-secondary/30 p-5">
        <h3 className="mb-3 text-sm font-semibold text-foreground">Récapitulatif</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <Meta label="Nom complet" value={`${data.prenom} ${data.nom}`.trim() || "—"} />
          <Meta label="Date de naissance" value={data.dateNaissance || "—"} />
          <Meta label="Identifiant unique" value={data.citizenUid} />
          <Meta label="Statut du dossier" value={data.status} />
        </div>
        <div className="mt-3">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Documents fournis
          </div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {providedDocs.length === 0 && (
              <span className="text-sm text-muted-foreground">Aucun document fourni</span>
            )}
            {providedDocs.map((d) => (
              <span
                key={d.key}
                className="rounded-full border border-border bg-card px-2 py-0.5 text-xs"
              >
                {d.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-cg-green/30 bg-cg-green-soft/40 p-4">
        <label className="flex items-start gap-3">
          <Checkbox
            checked={data.consentement}
            onCheckedChange={(v) => update("consentement", Boolean(v))}
          />
          <span className="text-sm text-foreground">
            J'accepte le traitement et la conservation de mes données personnelles conformément aux
            règles de protection des données.
          </span>
        </label>
        {errors.consentement && <p className="mt-2 text-xs text-cg-red">{errors.consentement}</p>}
      </div>

      <div className="mt-6">
        <FormField label="Signature électronique (nom en lettres)">
          <Input
            value={data.signature}
            onChange={(e) => update("signature", e.target.value)}
            placeholder="Tapez votre nom pour signer"
          />
        </FormField>
      </div>
    </>
  );
}
