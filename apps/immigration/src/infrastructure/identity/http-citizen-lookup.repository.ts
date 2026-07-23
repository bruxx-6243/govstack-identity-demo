export interface CitizenLookupResult {
  exists: boolean;
  status?: string;
  firstName?: string;
  lastName?: string;
}

interface CitizenExistsDto {
  exists: boolean;
  status?: string;
  first_name?: string;
  last_name?: string;
}

/**
 * Calls api-identite's X-Road producer endpoint directly from the browser.
 * Stands in for the real Immigration <-> Identité X-Road-mediated call (no
 * Security Server bridge running in this dev setup) — only exposes
 * minimal demographic attributes, never full identity data.
 */
export async function lookupCitizen(baseUrl: string, citizenUid: string): Promise<CitizenLookupResult> {
  const res = await fetch(`${baseUrl}/xroad/citizens/${encodeURIComponent(citizenUid)}/exists`);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Identity API error ${res.status}: ${body || res.statusText}`);
  }
  const dto = (await res.json()) as CitizenExistsDto;
  return {
    exists: dto.exists,
    status: dto.status,
    firstName: dto.first_name,
    lastName: dto.last_name,
  };
}
