import type { Casier, CasierHistoryEntry, CasierStats } from "@/domain/casier";

/** Wire format for GET/POST/PUT /demandes on api-justice. */
export interface CasierDto {
  id: string;
  citizen_uid: string;
  statut: "soumise" | "en_instruction" | "validee" | "rejetee";
  document_url?: string | null;
  cree_le: string;
  mise_a_jour_le: string;
}

export interface CasierCreateDto {
  citizen_uid: string;
}

/** Wire format for GET /demandes/stats. */
export interface CasierStatsDto {
  total: number;
  soumises: number;
  en_instruction: number;
  validees: number;
  rejetees: number;
}

/** Wire format for a single entry of GET /demandes/{id}/history (bare array). */
export interface CasierHistoryEntryDto {
  statut: "soumise" | "en_instruction" | "validee" | "rejetee";
  changed_by: string | null;
  changed_at: string;
  reason: string | null;
}

const statutToStatus: Record<CasierDto["statut"], Casier["status"]> = {
  soumise: "Soumise",
  en_instruction: "En instruction",
  validee: "Validée",
  rejetee: "Rejetée",
};

/** Only citizen_uid is accepted by POST /demandes. */
export function toCasierCreateDto(c: Casier): CasierCreateDto {
  return { citizen_uid: c.citizenUin };
}

export function fromCasierDto(dto: CasierDto): Casier {
  return {
    id: dto.id,
    citizenUin: dto.citizen_uid,
    createdAt: dto.cree_le,
    updatedAt: dto.mise_a_jour_le,
    status: statutToStatus[dto.statut],
    documentUrl: dto.document_url ?? undefined,
  };
}

export function fromCasierStatsDto(dto: CasierStatsDto): CasierStats {
  return {
    total: dto.total,
    soumises: dto.soumises,
    enInstruction: dto.en_instruction,
    validees: dto.validees,
    rejetees: dto.rejetees,
  };
}

export function fromCasierHistoryEntryDto(dto: CasierHistoryEntryDto): CasierHistoryEntry {
  return {
    status: statutToStatus[dto.statut],
    changedBy: dto.changed_by,
    changedAt: dto.changed_at,
    reason: dto.reason,
  };
}
