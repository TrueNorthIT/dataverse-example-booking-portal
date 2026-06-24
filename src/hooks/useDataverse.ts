import { useMemo } from "react"
import { useAuth0 } from "@auth0/auth0-react"
import { createClient } from "@truenorth-it/dataverse-client"
import { apiOrigin } from "@/config/auth0"

/** Authenticated client — uses Auth0 JWT for /me and /all tier access. */
export function useDataverse() {
  const { getAccessTokenSilently } = useAuth0()
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
