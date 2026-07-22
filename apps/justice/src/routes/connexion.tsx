import { createFileRoute } from "@tanstack/react-router";

// Le navigateur est simplement redirigé vers l'API, qui gère tout le flux
// OIDC avec eSignet (voir §4.2 et §5.2 de l'architecture). Le frontend ne
// manipule jamais de token OIDC — seulement le cookie de session httpOnly
// posé par le backend après le callback.
export const Route = createFileRoute("/connexion")({
  loader: () => {
    if (typeof window !== "undefined") {
      window.location.href = "/api/auth/login";
    }
  },
});
