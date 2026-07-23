/** Clears the stored session and sends the browser to the login page. Call on any 401 from the API. */
export function redirectToLogin(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("auth_token");
  if (window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
}
