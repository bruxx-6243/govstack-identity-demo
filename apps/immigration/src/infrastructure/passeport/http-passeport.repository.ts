import type { Passeport, PasseportHistoryEntry, PasseportRepository, PasseportStats } from "@/domain/passeport";
import { redirectToLogin } from "@/lib/auth-redirect";
import {
  fromPasseportDto,
  fromPasseportHistoryEntryDto,
  fromPasseportStatsDto,
  toPasseportCreateDto,
  type PasseportDto,
  type PasseportHistoryEntryDto,
  type PasseportStatsDto,
} from "./passeport.dto";

export interface HttpPasseportRepositoryOptions {
  /** Base API URL, e.g. https://api.passeport.gouv.cg/v1 */
  baseUrl: string;
  /** Returns an auth header value (e.g. "Bearer <token>"), if any. */
  getAuthHeader?: () => string | undefined;
}

/**
 * Talks to the real backend (generic /demandes resource) over REST/JSON.
 * The backend only models citizen_uid, statut, casier_verifie and
 * document_url — the rest of the Passeport domain (type, motif, documents,
 * livraison...) is client-only until the backend grows those fields.
 * Status transitions go through their own action endpoints, not a generic
 * PUT.
 */
export class HttpPasseportRepository implements PasseportRepository {
  constructor(private readonly options: HttpPasseportRepositoryOptions) {}

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
      throw new Error(`Passeport API error ${res.status}: ${body || res.statusText}`);
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  async list(page = 1, pageSize = 100): Promise<Passeport[]> {
    const dtos = await this.request<PasseportDto[]>(`/demandes?page=${page}&page_size=${pageSize}`);
    return dtos.map(fromPasseportDto);
  }

  async getById(id: string): Promise<Passeport | undefined> {
    try {
      const dto = await this.request<PasseportDto>(`/demandes/${id}`);
      return fromPasseportDto(dto);
    } catch (err) {
      if (err instanceof Error && err.message.includes("404")) return undefined;
      throw err;
    }
  }

  /** Creates a new demande (citizen_uid only) or updates document_url on an existing one. */
  async save(passeport: Passeport): Promise<Passeport> {
    const existing = await this.getById(passeport.id).catch(() => undefined);
    const dto = existing
      ? await this.request<PasseportDto>(`/demandes/${passeport.id}`, {
          method: "PUT",
          body: JSON.stringify({ document_url: passeport.documentUrl ?? null }),
        })
      : await this.request<PasseportDto>("/demandes", {
          method: "POST",
          body: JSON.stringify(toPasseportCreateDto(passeport)),
        });
    return fromPasseportDto(dto);
  }

  async remove(id: string): Promise<void> {
    await this.request<void>(`/demandes/${id}`, { method: "DELETE" });
  }

  async instruire(passeport: Passeport): Promise<Passeport> {
    const dto = await this.request<PasseportDto>(`/demandes/${passeport.id}/instruire`, {
      method: "POST",
    });
    return fromPasseportDto(dto);
  }

  async valider(passeport: Passeport): Promise<Passeport> {
    const dto = await this.request<PasseportDto>(`/demandes/${passeport.id}/valider`, {
      method: "POST",
    });
    return fromPasseportDto(dto);
  }

  async rejeter(passeport: Passeport, reason: string): Promise<Passeport> {
    const dto = await this.request<PasseportDto>(`/demandes/${passeport.id}/rejeter`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
    return fromPasseportDto(dto);
  }

  async getStats(): Promise<PasseportStats> {
    const dto = await this.request<PasseportStatsDto>("/demandes/stats");
    return fromPasseportStatsDto(dto);
  }

  async getHistory(id: string): Promise<PasseportHistoryEntry[]> {
    const dtos = await this.request<PasseportHistoryEntryDto[]>(`/demandes/${id}/history`);
    return dtos.map(fromPasseportHistoryEntryDto);
  }
}
