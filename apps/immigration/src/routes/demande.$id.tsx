import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Search, ShieldCheck, UserRound, CircleCheck, ShieldAlert } from "lucide-react";
import { GovHeader } from "@/components/gov/GovHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { validateCitizenUin } from "@/domain/passeport";
import { lookupCitizen } from "@/infrastructure/identity/http-citizen-lookup.repository";
import {
  verifierCasier,
  type CasierLookupResult,
} from "@/infrastructure/justice/http-casier-lookup.repository";
import { usePasseportStore } from "@/stores/passeport.store";
import { cn } from "@/lib/utils";

const IDENTITY_API_URL = import.meta.env.VITE_ENROLLMENT_API_URL as string | undefined;
const CASIER_API_URL = import.meta.env.VITE_CASIER_API_URL as string | undefined;

export const Route = createFileRoute("/demande/$id")({
  head: () => ({
    meta: [
      { title: "Nouvelle demande — Passeport" },
      { name: "description", content: "Créer une demande de passeport." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PasseportCreate,
});

function PasseportCreate() {
  const { id } = Route.useParams();
  const router = useRouter();
  const loadOne = usePasseportStore((s) => s.loadOne);
  const current = usePasseportStore((s) => s.current);
  const updateCurrent = usePasseportStore((s) => s.updateCurrent);
  const saveDraftInStore = usePasseportStore((s) => s.saveDraft);
  const [error, setError] = useState<string | undefined>();
  const [isSaving, setIsSaving] = useState(false);
  const [isLooking, setIsLooking] = useState(false);
  const [lookedUpName, setLookedUpName] = useState("");
  const [casierResult, setCasierResult] = useState<CasierLookupResult | null>(null);
  const [isCheckingCasier, setIsCheckingCasier] = useState(false);
  const data = current;

  useEffect(() => {
    // A freshly created passeport isn't on the backend yet (see startNew()) —
    // don't try to fetch it, that would 404. Only load when navigating
    // straight to an id that isn't already the in-memory current record.
    if (current?.id === id) return;
    loadOne(id).then((p) => {
      if (!p) {
        toast.error("Demande introuvable");
        router.navigate({ to: "/" });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, router, loadOne]);

  if (!data) return null;

  const clearLookup = (uin: string) => {
    updateCurrent("citizenUin", uin);
    if (lookedUpName) setLookedUpName("");
    if (casierResult) setCasierResult(null);
    if (error) setError(undefined);
  };

  const lookup = async () => {
    if (!data.citizenUin) return;
    if (!IDENTITY_API_URL) {
      toast.error("VITE_ENROLLMENT_API_URL n'est pas configuré.");
      return;
    }
    setIsLooking(true);
    try {
      const result = await lookupCitizen(IDENTITY_API_URL, data.citizenUin);
      if (!result.exists) {
        setLookedUpName("");
        toast.error("Aucun citoyen enrôlé avec cet UIN");
        return;
      }
      setLookedUpName(`${result.firstName ?? ""} ${result.lastName ?? ""}`.trim());
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setIsLooking(false);
    }
  };

  const checkCasier = async () => {
    if (!data.citizenUin) return;
    if (!CASIER_API_URL) {
      toast.error("VITE_CASIER_API_URL n'est pas configuré.");
      return;
    }
    setIsCheckingCasier(true);
    try {
      const result = await verifierCasier(CASIER_API_URL, data.citizenUin);
      setCasierResult(result);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setIsCheckingCasier(false);
    }
  };

  const create = async () => {
    const err = validateCitizenUin(data.citizenUin);
    setError(err);
    if (err) {
      toast.error("Veuillez corriger les erreurs");
      return;
    }
    setIsSaving(true);
    try {
      const saved = await saveDraftInStore();
      if (!saved) return;
      toast.success("Demande créée");
      router.navigate({ to: "/demandes/$id", params: { id: saved.id } });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <GovHeader />
      <div className="h-21" />
      <main className="mx-auto max-w-xl px-6 py-10">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Retour au tableau de bord
        </Link>

        <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="flag-stripe" />

          <div className="px-7 pt-7 pb-6">
            <div className="text-xs font-semibold uppercase tracking-wider text-cg-green">
              Affaires Étrangères &amp; Immigration
            </div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground text-balance">
              Nouvelle demande de passeport
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Saisissez l'identifiant unique national (UIN) du citoyen. Son identité est résolue
              auprès de l'Identity BB — aucune donnée d'identité n'est saisie ici.
            </p>
          </div>

          <div className="space-y-5 border-t border-border px-7 py-6">
            <div className="space-y-1.5">
              <Label htmlFor="uin" className="text-foreground">
                Identifiant unique national (UIN)
                <span className="ml-0.5 text-cg-red">*</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  id="uin"
                  value={data.citizenUin}
                  onChange={(e) => clearLookup(e.target.value)}
                  placeholder="CG-0000-0000-0000"
                  className={cn("font-mono", error && "border-cg-red focus-visible:ring-cg-red")}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={lookup}
                  disabled={isLooking || !data.citizenUin}
                  className="shrink-0 gap-1.5"
                >
                  <Search className="h-3.5 w-3.5" />
                  {isLooking ? "Recherche…" : "Rechercher"}
                </Button>
              </div>
              {error && <p className="text-xs text-cg-red">{error}</p>}
            </div>

            <div
              className={cn(
                "flex items-center gap-3 rounded-lg border px-4 py-3.5 transition-colors",
                lookedUpName
                  ? "border-cg-green/30 bg-cg-green-soft/60"
                  : "border-dashed border-border bg-secondary/30",
              )}
            >
              <div
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                  lookedUpName ? "bg-cg-green text-primary-foreground" : "bg-secondary text-muted-foreground",
                )}
              >
                {lookedUpName ? (
                  <CircleCheck className="h-4.5 w-4.5" />
                ) : (
                  <UserRound className="h-4.5 w-4.5" />
                )}
              </div>
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Identité résolue
                </div>
                <div
                  className={cn(
                    "truncate text-sm font-medium",
                    lookedUpName ? "text-cg-green-dark" : "text-muted-foreground",
                  )}
                >
                  {lookedUpName || "En attente de recherche"}
                </div>
              </div>
            </div>
            <p className="-mt-3 text-xs text-muted-foreground">
              Résolu auprès de l'Identity BB à titre de confirmation — non enregistré dans le
              dossier.
            </p>

            <div className="space-y-1.5 border-t border-border pt-5">
              <Label className="text-foreground">Casier judiciaire (Ministère de la Justice)</Label>
              <Button
                type="button"
                variant="outline"
                onClick={checkCasier}
                disabled={isCheckingCasier || !data.citizenUin}
                className="gap-1.5"
              >
                <Search className="h-3.5 w-3.5" />
                {isCheckingCasier ? "Vérification…" : "Vérifier le casier"}
              </Button>

              {casierResult && (
                <div
                  className={cn(
                    "mt-2 flex items-start gap-2 rounded-lg border px-4 py-3 text-sm",
                    casierResult.aMention
                      ? "border-yellow-300 bg-yellow-50 text-yellow-800"
                      : "border-cg-green/30 bg-cg-green-soft/60 text-cg-green-dark",
                  )}
                >
                  {casierResult.aMention ? (
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  ) : (
                    <CircleCheck className="mt-0.5 h-4 w-4 shrink-0" />
                  )}
                  <div>
                    <div className="font-medium">
                      {casierResult.aMention ? "Mention trouvée" : "Aucune mention trouvée"}
                    </div>
                    <div className="text-xs opacity-80">{casierResult.detail}</div>
                  </div>
                </div>
              )}
              {!casierResult && (
                <p className="text-xs text-muted-foreground">
                  Optionnel — informatif uniquement, n'empêche pas la création de la demande.
                </p>
              )}
            </div>

            <Button onClick={create} disabled={isSaving} size="lg" className="w-full gap-2">
              <ShieldCheck className="h-4 w-4" />
              {isSaving ? "Création en cours…" : "Créer la demande"}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
