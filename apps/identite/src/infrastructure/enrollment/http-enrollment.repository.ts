import type { Enrollment, EnrollmentHistoryEntry, EnrollmentRepository, EnrollmentStats } from "@/domain/enrollment";
import { redirectToLogin } from "@/lib/auth-redirect";
import {
  fromEnrollmentDto,
  fromEnrollmentHistoryEntryDto,
  fromEnrollmentStatsDto,
  toEnrollmentDto,
  type EnrollmentDto,
  type EnrollmentHistoryEntryDto,
  type EnrollmentStatsDto,
} from "./enrollment.dto";

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
      if (res.status === 401) redirectToLogin();
      const body = await res.text().catch(() => "");
      throw new Error(`Enrollment API error ${res.status}: ${body || res.statusText}`);
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  /** Multipart requests must NOT send Content-Type: application/json — the
   * browser needs to set its own multipart boundary. */
  private async requestMultipart<T>(path: string, body: FormData): Promise<T> {
    const headers: Record<string, string> = {};
    const auth = this.options.getAuthHeader?.();
    if (auth) headers.Authorization = auth;
    const res = await fetch(`${this.options.baseUrl}${path}`, { method: "POST", headers, body });
    if (!res.ok) {
      if (res.status === 401) redirectToLogin();
      const responseBody = await res.text().catch(() => "");
      throw new Error(`Enrollment API error ${res.status}: ${responseBody || res.statusText}`);
    }
    return (await res.json()) as T;
  }

  async list(page = 1, pageSize = 100): Promise<Enrollment[]> {
    const dtos = await this.request<EnrollmentDto[]>(`/enrollments?page=${page}&page_size=${pageSize}`);
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

  async verify(enrollment: Enrollment): Promise<Enrollment> {
    const dto = await this.request<EnrollmentDto>(`/enrollments/${enrollment.id}/verify`, {
      method: "POST",
    });
    return fromEnrollmentDto(dto);
  }

  async reject(enrollment: Enrollment, reason: string): Promise<Enrollment> {
    const dto = await this.request<EnrollmentDto>(`/enrollments/${enrollment.id}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
    return fromEnrollmentDto(dto);
  }

  async getStats(): Promise<EnrollmentStats> {
    const dto = await this.request<EnrollmentStatsDto>("/enrollments/stats");
    return fromEnrollmentStatsDto(dto);
  }

  async getHistory(id: string): Promise<EnrollmentHistoryEntry[]> {
    const dtos = await this.request<EnrollmentHistoryEntryDto[]>(`/enrollments/${id}/history`);
    return dtos.map(fromEnrollmentHistoryEntryDto);
  }

  async uploadDocument(enrollmentId: string, key: string, file: File): Promise<Enrollment> {
    const form = new FormData();
    form.append("file", file);
    const dto = await this.requestMultipart<EnrollmentDto>(
      `/enrollments/${enrollmentId}/documents/${key}`,
      form,
    );
    return fromEnrollmentDto(dto);
  }

  async verifyDocument(enrollmentId: string, key: string): Promise<Enrollment> {
    const dto = await this.request<EnrollmentDto>(
      `/enrollments/${enrollmentId}/documents/${key}/verify`,
      { method: "POST" },
    );
    return fromEnrollmentDto(dto);
  }
}
