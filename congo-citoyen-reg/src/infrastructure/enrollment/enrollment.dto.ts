import type { CitizenDocument, Enrollment, EnrollmentStatus } from "@/domain/enrollment";

/**
 * Wire format POSTed to / received from the backend. Kept snake_case to
 * match typical REST/JSON:API government backend conventions, decoupled
 * from the camelCase domain model so either side can evolve independently.
 */
export interface EnrollmentDto {
  id: string;
  file_number: string;
  citizen_uid: string;
  created_at: string;
  updated_at: string;
  status: EnrollmentStatus;

  identity: {
    last_name: string;
    first_name: string;
    gender: Enrollment["sexe"];
    date_of_birth: string;
    place_of_birth: string;
    nationality: string;
    national_id_number: string;
    id_document_type: Enrollment["typePiece"];
    id_document_number: string;
  };

  contact: {
    phone: string;
    email: string;
    address: string;
    district: string;
    borough: string;
    municipality: string;
    city: string;
    country: string;
  };

  civil_status: {
    marital_status: Enrollment["situationMatrimoniale"];
    spouse_name: string;
    children_count: string;
  };

  family: {
    father_name: string;
    mother_name: string;
    emergency_contact_name: string;
    emergency_contact_phone: string;
    emergency_contact_relationship: Enrollment["contactUrgenceLien"];
  };

  socio_economic: {
    profession: string;
    employer: string;
    education_level: Enrollment["niveauEtudes"];
    employment_status: Enrollment["situationEmploi"];
    monthly_income: string;
  };

  documents: Array<{
    key: string;
    label: string;
    status: CitizenDocument["status"];
    file_name?: string;
  }>;

  administrative: {
    enrollment_center: string;
    responsible_agent: string;
  };

  consent: {
    accepted: boolean;
    signature: string;
  };
}

export function toEnrollmentDto(e: Enrollment): EnrollmentDto {
  return {
    id: e.id,
    file_number: e.fileNumber,
    citizen_uid: e.citizenUid,
    created_at: e.createdAt,
    updated_at: e.updatedAt,
    status: e.status,
    identity: {
      last_name: e.nom,
      first_name: e.prenom,
      gender: e.sexe,
      date_of_birth: e.dateNaissance,
      place_of_birth: e.lieuNaissance,
      nationality: e.nationalite,
      national_id_number: e.nin,
      id_document_type: e.typePiece,
      id_document_number: e.numeroPiece,
    },
    contact: {
      phone: e.telephone,
      email: e.email,
      address: e.adresse,
      district: e.quartier,
      borough: e.arrondissement,
      municipality: e.commune,
      city: e.ville,
      country: e.pays,
    },
    civil_status: {
      marital_status: e.situationMatrimoniale,
      spouse_name: e.nomConjoint,
      children_count: e.nombreEnfants,
    },
    family: {
      father_name: e.nomPere,
      mother_name: e.nomMere,
      emergency_contact_name: e.contactUrgenceNom,
      emergency_contact_phone: e.contactUrgenceTel,
      emergency_contact_relationship: e.contactUrgenceLien,
    },
    socio_economic: {
      profession: e.profession,
      employer: e.employeur,
      education_level: e.niveauEtudes,
      employment_status: e.situationEmploi,
      monthly_income: e.revenus,
    },
    documents: e.documents.map((d) => ({
      key: d.key,
      label: d.label,
      status: d.status,
      file_name: d.fileName,
    })),
    administrative: {
      enrollment_center: e.centreEnrolement,
      responsible_agent: e.agentResponsable,
    },
    consent: {
      accepted: e.consentement,
      signature: e.signature,
    },
  };
}

export function fromEnrollmentDto(dto: EnrollmentDto): Enrollment {
  return {
    id: dto.id,
    fileNumber: dto.file_number,
    citizenUid: dto.citizen_uid,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
    status: dto.status,
    nom: dto.identity.last_name,
    prenom: dto.identity.first_name,
    sexe: dto.identity.gender,
    dateNaissance: dto.identity.date_of_birth,
    lieuNaissance: dto.identity.place_of_birth,
    nationalite: dto.identity.nationality,
    nin: dto.identity.national_id_number,
    typePiece: dto.identity.id_document_type,
    numeroPiece: dto.identity.id_document_number,
    telephone: dto.contact.phone,
    email: dto.contact.email,
    adresse: dto.contact.address,
    quartier: dto.contact.district,
    arrondissement: dto.contact.borough,
    commune: dto.contact.municipality,
    ville: dto.contact.city,
    pays: dto.contact.country,
    situationMatrimoniale: dto.civil_status.marital_status,
    nomConjoint: dto.civil_status.spouse_name,
    nombreEnfants: dto.civil_status.children_count,
    nomPere: dto.family.father_name,
    nomMere: dto.family.mother_name,
    contactUrgenceNom: dto.family.emergency_contact_name,
    contactUrgenceTel: dto.family.emergency_contact_phone,
    contactUrgenceLien: dto.family.emergency_contact_relationship,
    profession: dto.socio_economic.profession,
    employeur: dto.socio_economic.employer,
    niveauEtudes: dto.socio_economic.education_level,
    situationEmploi: dto.socio_economic.employment_status,
    revenus: dto.socio_economic.monthly_income,
    documents: dto.documents.map((d) => ({
      key: d.key,
      label: d.label,
      status: d.status,
      fileName: d.file_name,
    })),
    centreEnrolement: dto.administrative.enrollment_center,
    agentResponsable: dto.administrative.responsible_agent,
    consentement: dto.consent.accepted,
    signature: dto.consent.signature,
  };
}
