import { useMemo } from "react"
import { createClient } from "@truenorth-it/dataverse-client"
import { useAuth } from "@/auth/useAuth"
import { apiOrigin } from "@/config/entra"

/** Authenticated client — uses the Entra-issued OIDC JWT for /me and /all tier access. */
export function useDataverse() {
  const { getAccessTokenSilently } = useAuth()
  return useMemo(
    () =>
      createClient({
        baseUrl: apiOrigin,
        getToken: () => getAccessTokenSilently(),
        scope: "citizenbooking",
      }),
    [getAccessTokenSilently]
  )
}

/** Public client singleton — no auth, only client.public.list / .get. */
export const publicClient = createClient({
  baseUrl: apiOrigin,
  scope: "citizenbooking",
})
