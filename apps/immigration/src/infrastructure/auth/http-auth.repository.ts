export interface LoginResponse {
  access_token: string;
  token_type: string;
}

/** Authenticates an agent against the api-passeport backend and returns the raw token response. */
export async function loginAgent(
  baseUrl: string,
  login: string,
  password: string,
): Promise<LoginResponse> {
  const res = await fetch(`${baseUrl}/auth/agent/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ login, password }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Auth API error ${res.status}: ${body || res.statusText}`);
  }
  return (await res.json()) as LoginResponse;
}
