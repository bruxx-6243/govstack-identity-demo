import type { Passeport, PasseportDocument, PasseportStatus } from "@/domain/passeport";

/**
 * Wire format POSTed to / received from the backend. Kept snake_case to
 * match typical REST/JSON:API government backend conventions, decoupled
 * from the camelCase domain model so either side can evolve independently.
 *
 * No identity block here by design — only citizen_uin, a foreign key
 * resolved by the Identity BB via OIDC/X-Road.
 */
export interface PasseportDto {
  id: string;
  numero_demande: string;
  citizen_uin: string;
  created_at: string;
  updated_at: string;
  status: PasseportStatus;

  requester: {
    citizen_display_name: string;
  };

  request: {
    passport_type: Passeport["typePasseport"];
    travel_reason: string;
  };

  // Reflète l'appel X-Road vers le Ministère de la Justice
  // (voir architecture §4.5, endpoint "verifier-mention") — non implémenté,
  // simple statut affiché pour le moment.
  criminal_record_check: {
    status: Passeport["verificationCasierStatut"];
  };

  documents: Array<{
    key: string;
    label: string;
    status: PasseportDocument["status"];
    file_name?: string;
  }>;

  delivery: {
    pickup_center: string;
  };

  consent: {
    accepted: boolean;
  };

  document_url?: string;
}

export function toPasseportDto(p: Passeport): PasseportDto {
  return {
    id: p.id,
    numero_demande: p.numeroDemande,
    citizen_uin: p.citizenUin,
    created_at: p.createdAt,
    updated_at: p.updatedAt,
    status: p.status,
    requester: {
      citizen_display_name: p.citizenNomAffiche,
    },
    request: {
      passport_type: p.typePasseport,
      travel_reason: p.motifVoyage,
    },
    criminal_record_check: {
      status: p.verificationCasierStatut,
    },
    documents: p.documents.map((d) => ({
      key: d.key,
      label: d.label,
      status: d.status,
      file_name: d.fileName,
    })),
    delivery: {
      pickup_center: p.centreRetrait,
    },
    consent: {
      accepted: p.consentement,
    },
    document_url: p.documentUrl,
  };
}

export function fromPasseportDto(dto: PasseportDto): Passeport {
  return {
    id: dto.id,
    numeroDemande: dto.numero_demande,
    citizenUin: dto.citizen_uin,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
    status: dto.status,
    citizenNomAffiche: dto.requester.citizen_display_name,
    typePasseport: dto.request.passport_type,
    motifVoyage: dto.request.travel_reason,
    verificationCasierStatut: dto.criminal_record_check.status,
    documents: dto.documents.map((d) => ({
      key: d.key,
      label: d.label,
      status: d.status,
      fileName: d.file_name,
    })),
    centreRetrait: dto.delivery.pickup_center,
    consentement: dto.consent.accepted,
    documentUrl: dto.document_url,
  };
}
