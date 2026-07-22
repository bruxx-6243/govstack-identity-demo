import type { Passeport, PasseportRepository } from "@/domain/passeport";
import { fromPasseportDto, toPasseportDto, type PasseportDto } from "./passeport.dto";

export interface HttpPasseportRepositoryOptions {
  /** Base API URL, e.g. https://api.passeport.gouv.cg/v1 */
  baseUrl: string;
  /** Returns an auth header value (e.g. "Bearer <token>"), if any. */
  getAuthHeader?: () => string | undefined;
}

/**
 * Talks to the real backend over REST/JSON. Implements the same
 * PasseportRepository port as the localStorage adapter, so it's a drop-in
 * swap in the store/use-cases once the API is live.
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
      const body = await res.text().catch(() => "");
      throw new Error(`Passeport API error ${res.status}: ${body || res.statusText}`);
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  async list(): Promise<Passeport[]> {
    const dtos = await this.request<PasseportDto[]>("/passeports");
    return dtos.map(fromPasseportDto);
  }

  async getById(id: string): Promise<Passeport | undefined> {
    try {
      const dto = await this.request<PasseportDto>(`/passeports/${id}`);
      return fromPasseportDto(dto);
    } catch (err) {
      if (err instanceof Error && err.message.includes("404")) return undefined;
      throw err;
    }
  }

  async save(passeport: Passeport): Promise<Passeport> {
    const payload = toPasseportDto(passeport);
    const existing = await this.getById(passeport.id).catch(() => undefined);
    const dto = existing
      ? await this.request<PasseportDto>(`/passeports/${passeport.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        })
      : await this.request<PasseportDto>("/passeports", {
          method: "POST",
          body: JSON.stringify(payload),
        });
    return fromPasseportDto(dto);
  }

  async remove(id: string): Promise<void> {
    await this.request<void>(`/passeports/${id}`, { method: "DELETE" });
  }
}
