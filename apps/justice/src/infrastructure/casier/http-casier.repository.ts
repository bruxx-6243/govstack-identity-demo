import type { Casier, CasierHistoryEntry, CasierRepository, CasierStats } from "@/domain/casier";
import { redirectToLogin } from "@/lib/auth-redirect";
import {
  fromCasierDto,
  fromCasierHistoryEntryDto,
  fromCasierStatsDto,
  toCasierCreateDto,
  type CasierDto,
  type CasierHistoryEntryDto,
  type CasierStatsDto,
} from "./casier.dto";

export interface HttpCasierRepositoryOptions {
  /** Base API URL, e.g. https://api.casier-judiciaire.gouv.cg/v1 */
  baseUrl: string;
  /** Returns an auth header value (e.g. "Bearer <token>"), if any. */
  getAuthHeader?: () => string | undefined;
}

/**
 * Talks to the real backend (generic /demandes resource) over REST/JSON.
 * The backend only models citizen_uid, statut and document_url — the rest
 * of the Casier domain (motif, juridiction, documents, livraison...) is
 * client-only until the backend grows those fields. Status transitions go
 * through their own action endpoints, not a generic PUT.
 */
export class HttpCasierRepository implements CasierRepository {
  constructor(private readonly options: HttpCasierRepositoryOptions) {}

  private headers(): HeadersInit {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const auth = this.options.getAuthHeader?.();
    if (auth) headers.Authorization = auth;
    return headers;
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.options.baseUrl}${path}`, {
      ...init,
      headers: { ...this.headers(), ...init?.headers },
    });
    if (!res.ok) {
      if (res.status === 401) redirectToLogin();
      const body = await res.text().catch(() => "");
      throw new Error(`Casier API error ${res.status}: ${body || res.statusText}`);
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  async list(page = 1, pageSize = 100): Promise<Casier[]> {
    const dtos = await this.request<CasierDto[]>(`/demandes?page=${page}&page_size=${pageSize}`);
    return dtos.map(fromCasierDto);
  }

  async getById(id: string): Promise<Casier | undefined> {
    try {
      const dto = await this.request<CasierDto>(`/demandes/${id}`);
      return fromCasierDto(dto);
    } catch (err) {
      if (err instanceof Error && err.message.includes("404")) return undefined;
      throw err;
    }
  }

  /** Creates a new demande (citizen_uid only) or updates document_url on an existing one. */
  async save(casier: Casier): Promise<Casier> {
    const existing = await this.getById(casier.id).catch(() => undefined);
    const dto = existing
      ? await this.request<CasierDto>(`/demandes/${casier.id}`, {
          method: "PUT",
          body: JSON.stringify({ document_url: casier.documentUrl ?? null }),
        })
      : await this.request<CasierDto>("/demandes", {
          method: "POST",
          body: JSON.stringify(toCasierCreateDto(casier)),
        });
    return fromCasierDto(dto);
  }

  async remove(id: string): Promise<void> {
    await this.request<void>(`/demandes/${id}`, { method: "DELETE" });
  }

  async instruire(casier: Casier): Promise<Casier> {
    const dto = await this.request<CasierDto>(`/demandes/${casier.id}/instruire`, { method: "POST" });
    return fromCasierDto(dto);
  }

  async valider(casier: Casier): Promise<Casier> {
    const dto = await this.request<CasierDto>(`/demandes/${casier.id}/valider`, { method: "POST" });
    return fromCasierDto(dto);
  }

  async rejeter(casier: Casier, reason: string): Promise<Casier> {
    const dto = await this.request<CasierDto>(`/demandes/${casier.id}/rejeter`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
    return fromCasierDto(dto);
  }

  async getStats(): Promise<CasierStats> {
    const dto = await this.request<CasierStatsDto>("/demandes/stats");
    return fromCasierStatsDto(dto);
  }

  async getHistory(id: string): Promise<CasierHistoryEntry[]> {
    const dtos = await this.request<CasierHistoryEntryDto[]>(`/demandes/${id}/history`);
    return dtos.map(fromCasierHistoryEntryDto);
  }
}
