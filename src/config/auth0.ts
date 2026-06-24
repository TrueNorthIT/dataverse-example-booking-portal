const domain = import.meta.env.VITE_AUTH0_DOMAIN as string
const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID as string
const audience = import.meta.env.VITE_AUTH0_AUDIENCE as string
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL as string

// Fail fast at startup rather than surfacing confusing auth/network errors later.
const missing = [
  ["VITE_AUTH0_DOMAIN", domain],
  ["VITE_AUTH0_CLIENT_ID", clientId],
  ["VITE_AUTH0_AUDIENCE", audience],
  ["VITE_API_BASE_URL", apiBaseUrl],
]
  .filter(([, value]) => !value)
  .map(([name]) => name)

if (missing.length > 0) {
  throw new Error(`Missing required environment variables: ${missing.join(", ")}`)
}

export const auth0Config = {
  domain,
  clientId,
  cacheLocation: "localstorage" as const,
  useRefreshTokens: true,
  authorizationParams: {
    redirect_uri: window.location.origin,
    audience,
    scope: "openid profile email offline_access",
  },
}

/** Origin-only base URL for the SDK (strips /api/v2/citizenbooking) */
export const apiOrigin = new URL(apiBaseUrl).origin

/** Dataverse environment URL + a deep link to the Citizen Service Bookings table (demo aid) */
const dataverseUrl = import.meta.env.VITE_DATAVERSE_URL as string | undefined
export const dataverseBookingsUrl = dataverseUrl
  ? `${dataverseUrl.replace(/\/$/, "")}/main.aspx?pagetype=entitylist&etn=tn_citizenservicebooking`
  : undefined

export { audience, apiBaseUrl, dataverseUrl }
