import type { Passeport, PasseportHistoryEntry, PasseportStats } from "@/domain/passeport";

/** Wire format for GET/POST/PUT /demandes on api-passeport. */
export interface PasseportDto {
  id: string;
  citizen_uid: string;
  statut: "soumise" | "en_instruction" | "validee" | "rejetee";
  casier_verifie: boolean;
  document_url?: string | null;
  cree_le: string;
  mise_a_jour_le: string;
}

export interface PasseportCreateDto {
  citizen_uid: string;
}

/** Wire format for GET /demandes/stats. */
export interface PasseportStatsDto {
  total: number;
  soumises: number;
  en_instruction: number;
  validees: number;
  rejetees: number;
}

/** Wire format for a single entry of GET /demandes/{id}/history (bare array). */
export interface PasseportHistoryEntryDto {
  statut: "soumise" | "en_instruction" | "validee" | "rejetee";
  changed_by: string | null;
  changed_at: string;
  reason: string | null;
}

const statutToStatus: Record<PasseportDto["statut"], Passeport["status"]> = {
  soumise: "Soumise",
  en_instruction: "En instruction",
  validee: "Validée",
  rejetee: "Rejetée",
};

/** Only citizen_uid is accepted by POST /demandes. */
export function toPasseportCreateDto(p: Passeport): PasseportCreateDto {
  return { citizen_uid: p.citizenUin };
}

export function fromPasseportDto(dto: PasseportDto): Passeport {
  return {
    id: dto.id,
    citizenUin: dto.citizen_uid,
    createdAt: dto.cree_le,
    updatedAt: dto.mise_a_jour_le,
    status: statutToStatus[dto.statut],
    casierVerifie: dto.casier_verifie,
    documentUrl: dto.document_url ?? undefined,
  };
}

export function fromPasseportStatsDto(dto: PasseportStatsDto): PasseportStats {
  return {
    total: dto.total,
    soumises: dto.soumises,
    enInstruction: dto.en_instruction,
    validees: dto.validees,
    rejetees: dto.rejetees,
  };
}

export function fromPasseportHistoryEntryDto(dto: PasseportHistoryEntryDto): PasseportHistoryEntry {
  return {
    status: statutToStatus[dto.statut],
    changedBy: dto.changed_by,
    changedAt: dto.changed_at,
    reason: dto.reason,
  };
}
