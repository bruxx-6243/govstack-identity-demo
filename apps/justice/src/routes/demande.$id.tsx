import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Search, ShieldCheck, UserRound, CircleCheck } from "lucide-react";
import { GovHeader } from "@/components/gov/GovHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { validateCitizenUin } from "@/domain/casier";
import { lookupCitizen } from "@/infrastructure/identity/http-citizen-lookup.repository";
import { useCasierStore } from "@/stores/casier.store";
import { cn } from "@/lib/utils";

const IDENTITY_API_URL = import.meta.env.VITE_ENROLLMENT_API_URL as string | undefined;

export const Route = createFileRoute("/demande/$id")({
  head: () => ({
    meta: [
      { title: "Nouvelle demande — Casier Judiciaire" },
      { name: "description", content: "Créer une demande de casier judiciaire." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CasierCreate,
});

function CasierCreate() {
  const { id } = Route.useParams();
  const router = useRouter();
  const loadOne = useCasierStore((s) => s.loadOne);
  const current = useCasierStore((s) => s.current);
  const updateCurrent = useCasierStore((s) => s.updateCurrent);
  const saveDraftInStore = useCasierStore((s) => s.saveDraft);
  const [error, setError] = useState<string | undefined>();
  const [isSaving, setIsSaving] = useState(false);
  const [isLooking, setIsLooking] = useState(false);
  const [lookedUpName, setLookedUpName] = useState("");
  const data = current;

  useEffect(() => {
    // A freshly created casier isn't on the backend yet (see startNew()) —
    // don't try to fetch it, that would 404. Only load when navigating
    // straight to an id that isn't already the in-memory current record.
    if (current?.id === id) return;
    loadOne(id).then((c) => {
      if (!c) {
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
      router.navigate({ to: "/dossiers/$id", params: { id: saved.id } });
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
              Ministère de la Justice
            </div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground text-balance">
              Nouvelle demande de casier judiciaire
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
