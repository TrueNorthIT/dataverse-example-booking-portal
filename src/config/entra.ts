const tenantId = import.meta.env.VITE_ENTRA_TENANT_ID as string
const clientId = import.meta.env.VITE_ENTRA_CLIENT_ID as string
const apiScope = import.meta.env.VITE_ENTRA_API_SCOPE as string
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL as string

// Fail fast at startup rather than surfacing confusing auth/network errors later.
const missing = [
  ["VITE_ENTRA_TENANT_ID", tenantId],
  ["VITE_ENTRA_CLIENT_ID", clientId],
  ["VITE_ENTRA_API_SCOPE", apiScope],
  ["VITE_API_BASE_URL", apiBaseUrl],
]
  .filter(([, value]) => !value)
  .map(([name]) => name)

if (missing.length > 0) {
  throw new Error(`Missing required environment variables: ${missing.join(", ")}`)
}

/**
 * MSAL PublicClientApplication configuration for Microsoft Entra External ID.
 *
 * The CIAM authority uses the tenant-scoped `ciamlogin.com` domain; it must be
 * registered in `knownAuthorities` for MSAL to trust it.
 */
export const entraConfig = {
  clientId,
  tenantId,
  /** API access scope, e.g. "api://<citizenbooking-api-app-id>/access_as_user" */
  apiScope,
  authority: `https://${tenantId}.ciamlogin.com/${tenantId}`,
  knownAuthorities: [`${tenantId}.ciamlogin.com`],
  redirectUri: window.location.origin,
}

/** Origin-only base URL for the SDK (strips /api/v2/citizenbooking) */
export const apiOrigin = new URL(apiBaseUrl).origin

/** Dataverse environment URL + a deep link to the Citizen Service Bookings table (demo aid) */
const dataverseUrl = import.meta.env.VITE_DATAVERSE_URL as string | undefined
export const dataverseBookingsUrl = dataverseUrl
  ? `${dataverseUrl.replace(/\/$/, "")}/main.aspx?pagetype=entitylist&etn=tn_citizenservicebooking`
  : undefined

export { apiScope, apiBaseUrl, dataverseUrl }
