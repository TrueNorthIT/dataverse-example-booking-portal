/**
 * Client-credentials Dataverse client for integration tests.
 *
 * Uses CLIENT_ID, CLIENT_SECRET, TENANT_ID, DATAVERSE_URL from .env
 * (loaded automatically by Vitest).
 */

const TENANT_ID = process.env.TENANT_ID ?? process.env.VITE_TENANT_ID
const CLIENT_ID = process.env.CLIENT_ID ?? process.env.VITE_CLIENT_ID
const CLIENT_SECRET = process.env.CLIENT_SECRET
const DATAVERSE_URL = process.env.DATAVERSE_URL ?? process.env.VITE_DATAVERSE_URL

if (!TENANT_ID || !CLIENT_ID || !CLIENT_SECRET || !DATAVERSE_URL) {
  throw new Error(
    "Missing env vars for integration tests. Need: TENANT_ID, CLIENT_ID, CLIENT_SECRET, DATAVERSE_URL"
  )
}

const API_BASE = `${DATAVERSE_URL}/api/data/v9.2`

let cachedToken: string | null = null

async function getToken(): Promise<string> {
  if (cachedToken) return cachedToken

  const tokenUrl = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: CLIENT_ID!,
    client_secret: CLIENT_SECRET!,
    scope: `${DATAVERSE_URL}/.default`,
  })

  const res = await fetch(tokenUrl, { method: "POST", body })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Token request failed: ${res.status} ${text}`)
  }

  const json = (await res.json()) as { access_token: string }
  cachedToken = json.access_token
  return cachedToken
}

interface ODataCollection<T> {
  value: T[]
  "@odata.count"?: number
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = await getToken()
  const url = path.startsWith("http") ? path : `${API_BASE}/${path}`

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "OData-Version": "4.0",
    Accept: "application/json",
  }

  if (method === "GET") {
    headers["Prefer"] =
      'odata.include-annotations="OData.Community.Display.V1.FormattedValue"'
  }

  if (body) {
    headers["Content-Type"] = "application/json"
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (res.status === 204) return undefined as T

  const json = await res.json().catch(() => null)
  if (!res.ok) {
    const msg = (json as { error?: { message?: string } })?.error?.message ?? `HTTP ${res.status}`
    throw new Error(msg)
  }
  return json as T
}

/** Test Dataverse client — mirrors the shape of src/lib/dataverse.ts */
export const dv = {
  get: <T>(path: string) => request<T>("GET", path),
  getList: <T>(path: string) => request<ODataCollection<T>>("GET", path),
}
