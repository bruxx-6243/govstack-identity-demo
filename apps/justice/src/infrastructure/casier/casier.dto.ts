import type { Casier, CasierDocument, CasierStatus } from "@/domain/casier";

/**
 * Wire format POSTed to / received from the backend. Kept snake_case to
 * match typical REST/JSON:API government backend conventions, decoupled
 * from the camelCase domain model so either side can evolve independently.
 *
 * No identity block here by design — only citizen_uin, a foreign key
 * resolved by the Identity BB via OIDC/X-Road.
 */
export interface CasierDto {
  id: string;
  numero_demande: string;
  citizen_uin: string;
  created_at: string;
  updated_at: string;
  status: CasierStatus;

  requester: {
    citizen_display_name: string;
  };

  request: {
    reason: Casier["motifDemande"];
    competent_jurisdiction: string;
    reason_details: string;
  };

  documents: Array<{
    key: string;
    label: string;
    status: CasierDocument["status"];
    file_name?: string;
  }>;

  delivery: {
    delivery_address: string;
    pickup_mode: Casier["modeRetrait"];
  };

  consent: {
    accepted: boolean;
  };

  document_url?: string;
}

export function toCasierDto(c: Casier): CasierDto {
  return {
    id: c.id,
    numero_demande: c.numeroDemande,
    citizen_uin: c.citizenUin,
    created_at: c.createdAt,
    updated_at: c.updatedAt,
    status: c.status,
    requester: {
      citizen_display_name: c.citizenNomAffiche,
    },
    request: {
      reason: c.motifDemande,
      competent_jurisdiction: c.juridictionCompetente,
      reason_details: c.precisionMotif,
    },
    documents: c.documents.map((d) => ({
      key: d.key,
      label: d.label,
      status: d.status,
      file_name: d.fileName,
    })),
    delivery: {
      delivery_address: c.adresseLivraison,
      pickup_mode: c.modeRetrait,
    },
    consent: {
      accepted: c.consentement,
    },
    document_url: c.documentUrl,
  };
}

export function fromCasierDto(dto: CasierDto): Casier {
  return {
    id: dto.id,
    numeroDemande: dto.numero_demande,
    citizenUin: dto.citizen_uin,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
    status: dto.status,
    citizenNomAffiche: dto.requester.citizen_display_name,
    motifDemande: dto.request.reason,
    juridictionCompetente: dto.request.competent_jurisdiction,
    precisionMotif: dto.request.reason_details,
    documents: dto.documents.map((d) => ({
      key: d.key,
      label: d.label,
      status: d.status,
      fileName: d.file_name,
    })),
    adresseLivraison: dto.delivery.delivery_address,
    modeRetrait: dto.delivery.pickup_mode,
    consentement: dto.consent.accepted,
    documentUrl: dto.document_url,
  };
}
