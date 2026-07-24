export interface CasierLookupResult {
  citizenUid: string;
  aMention: boolean;
  detail: string;
}

interface VerifierMentionDto {
  citizen_uid: string;
  a_mention: boolean;
  detail: string;
}

/**
 * Calls api-justice's X-Road producer endpoint directly from the browser.
 * Stands in for the real Passeport <-> Justice X-Road-mediated call (no
 * Security Server bridge running in this dev setup) — ephemeral, display-only
 * check: the result is never persisted back onto the passeport record.
 */
export async function verifierCasier(baseUrl: string, citizenUid: string): Promise<CasierLookupResult> {
  const res = await fetch(`${baseUrl}/xroad/verifier-mention?citizen_uid=${encodeURIComponent(citizenUid)}`);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Justice API error ${res.status}: ${body || res.statusText}`);
  }
  const dto = (await res.json()) as VerifierMentionDto;
  return {
    citizenUid: dto.citizen_uid,
    aMention: dto.a_mention,
    detail: dto.detail,
  };
}
