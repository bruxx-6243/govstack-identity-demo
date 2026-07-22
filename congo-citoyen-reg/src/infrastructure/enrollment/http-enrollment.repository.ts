import type { Enrollment, EnrollmentRepository } from "@/domain/enrollment";
import { fromEnrollmentDto, toEnrollmentDto, type EnrollmentDto } from "./enrollment.dto";

export interface HttpEnrollmentRepositoryOptions {
  /** Base API URL, e.g. https://api.enrolement.gouv.cg/v1 */
  baseUrl: string;
  /** Returns an auth header value (e.g. "Bearer <token>"), if any. */
  getAuthHeader?: () => string | undefined;
}

/**
 * Talks to the real backend over REST/JSON. Implements the same
 * EnrollmentRepository port as the localStorage adapter, so it's a
 * drop-in swap in the store/use-cases once the API is live.
 */
export class HttpEnrollmentRepository implements EnrollmentRepository {
  constructor(private readonly options: HttpEnrollmentRepositoryOptions) {}

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
      throw new Error(`Enrollment API error ${res.status}: ${body || res.statusText}`);
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  async list(): Promise<Enrollment[]> {
    const dtos = await this.request<EnrollmentDto[]>("/enrollments");
    return dtos.map(fromEnrollmentDto);
  }

  async getById(id: string): Promise<Enrollment | undefined> {
    try {
      const dto = await this.request<EnrollmentDto>(`/enrollments/${id}`);
      return fromEnrollmentDto(dto);
    } catch (err) {
      if (err instanceof Error && err.message.includes("404")) return undefined;
      throw err;
    }
  }

  async save(enrollment: Enrollment): Promise<Enrollment> {
    const payload = toEnrollmentDto(enrollment);
    const existing = await this.getById(enrollment.id).catch(() => undefined);
    const dto = existing
      ? await this.request<EnrollmentDto>(`/enrollments/${enrollment.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        })
      : await this.request<EnrollmentDto>("/enrollments", {
          method: "POST",
          body: JSON.stringify(payload),
        });
    return fromEnrollmentDto(dto);
  }

  async remove(id: string): Promise<void> {
    await this.request<void>(`/enrollments/${id}`, { method: "DELETE" });
  }
}
