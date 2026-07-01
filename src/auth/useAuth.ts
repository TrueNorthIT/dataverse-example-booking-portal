import { useCallback, useMemo } from "react"
import {
  InteractionRequiredAuthError,
  InteractionStatus,
  type AccountInfo,
} from "@azure/msal-browser"
import { useIsAuthenticated, useMsal } from "@azure/msal-react"
import { entraConfig } from "@/config/entra"

/** Normalised user shape the UI consumes — keeps components MSAL-agnostic. */
export interface AuthUser {
  sub?: string
  name?: string
  email?: string
}

/**
 * Auth surface consumed across the app. Backed by MSAL (Microsoft Entra
 * External ID) — components stay identity-provider-agnostic and only depend on
 * these fields, not on any MSAL internals.
 */
export interface AuthState {
  isLoading: boolean
  isAuthenticated: boolean
  user: AuthUser | undefined
  error: Error | undefined
  /** Start an interactive sign-in redirect (requests the API scope). */
  loginWithRedirect: () => Promise<void>
  /** Sign the user out and return to the app origin. */
  logout: (options?: { logoutParams?: { returnTo?: string } }) => Promise<void>
  /** Acquire an API access token silently, falling back to a redirect. */
  getAccessTokenSilently: () => Promise<string>
}

function accountToUser(account: AccountInfo | null | undefined): AuthUser | undefined {
  if (!account) return undefined
  const claims = (account.idTokenClaims ?? {}) as Record<string, unknown>
  const claim = (key: string) => (typeof claims[key] === "string" ? (claims[key] as string) : undefined)

  const preferred = claim("preferred_username")
  const email =
    claim("email") ??
    (preferred && preferred.includes("@") ? preferred : undefined) ??
    (account.username && account.username.includes("@") ? account.username : undefined)

  return {
    sub: account.localAccountId || account.homeAccountId,
    name: claim("name") ?? account.name,
    email,
  }
}

/**
 * MSAL-backed auth hook. Exposes a stable, provider-agnostic surface
 * (`loginWithRedirect` / `logout` / `user` / `getAccessTokenSilently`) so the
 * rest of the app never imports `@azure/msal-*` directly.
 */
export function useAuth(): AuthState {
  const { instance, accounts, inProgress } = useMsal()
  const isAuthenticated = useIsAuthenticated()

  const account = instance.getActiveAccount() ?? accounts[0]

  const loginWithRedirect = useCallback(async () => {
    await instance.loginRedirect({ scopes: [entraConfig.apiScope] })
  }, [instance])

  const logout = useCallback(
    async (options?: { logoutParams?: { returnTo?: string } }) => {
      await instance.logoutRedirect({
        postLogoutRedirectUri: options?.logoutParams?.returnTo ?? entraConfig.redirectUri,
      })
    },
    [instance],
  )

  const getAccessTokenSilently = useCallback(async () => {
    const current = instance.getActiveAccount() ?? accounts[0]
    if (!current) throw new Error("Not signed in")
    try {
      const result = await instance.acquireTokenSilent({
        scopes: [entraConfig.apiScope],
        account: current,
      })
      return result.accessToken
    } catch (err) {
      if (err instanceof InteractionRequiredAuthError) {
        await instance.acquireTokenRedirect({
          scopes: [entraConfig.apiScope],
          account: current,
        })
      }
      throw err
    }
  }, [instance, accounts])

  return useMemo(
    () => ({
      // MSAL is still initialising / handling a redirect until it's idle.
      isLoading: inProgress !== InteractionStatus.None,
      isAuthenticated,
      user: accountToUser(account),
      error: undefined,
      loginWithRedirect,
      logout,
      getAccessTokenSilently,
    }),
    [inProgress, isAuthenticated, account, loginWithRedirect, logout, getAccessTokenSilently],
  )
}
