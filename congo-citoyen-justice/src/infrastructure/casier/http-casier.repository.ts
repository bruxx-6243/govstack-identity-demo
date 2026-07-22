import type { Casier, CasierRepository } from "@/domain/casier";
import { fromCasierDto, toCasierDto, type CasierDto } from "./casier.dto";

export interface HttpCasierRepositoryOptions {
  /** Base API URL, e.g. https://api.casier-judiciaire.gouv.cg/v1 */
  baseUrl: string;
  /** Returns an auth header value (e.g. "Bearer <token>"), if any. */
  getAuthHeader?: () => string | undefined;
}

/**
 * Talks to the real backend over REST/JSON. Implements the same
 * CasierRepository port as the localStorage adapter, so it's a drop-in
 * swap in the store/use-cases once the API is live.
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
      const body = await res.text().catch(() => "");
      throw new Error(`Casier API error ${res.status}: ${body || res.statusText}`);
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  async list(): Promise<Casier[]> {
    const dtos = await this.request<CasierDto[]>("/casiers");
    return dtos.map(fromCasierDto);
  }

  async getById(id: string): Promise<Casier | undefined> {
    try {
      const dto = await this.request<CasierDto>(`/casiers/${id}`);
      return fromCasierDto(dto);
    } catch (err) {
      if (err instanceof Error && err.message.includes("404")) return undefined;
      throw err;
    }
  }

  async save(casier: Casier): Promise<Casier> {
    const payload = toCasierDto(casier);
    const existing = await this.getById(casier.id).catch(() => undefined);
    const dto = existing
      ? await this.request<CasierDto>(`/casiers/${casier.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        })
      : await this.request<CasierDto>("/casiers", {
          method: "POST",
          body: JSON.stringify(payload),
        });
    return fromCasierDto(dto);
  }

  async remove(id: string): Promise<void> {
    await this.request<void>(`/casiers/${id}`, { method: "DELETE" });
  }
}
