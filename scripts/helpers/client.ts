/**
 * Dataverse client for CLI scripts using client-credentials OAuth.
 *
 * Reads from .env:
 *   CLIENT_ID, CLIENT_SECRET, TENANT_ID, DATAVERSE_URL
 */

import "dotenv/config"

const CLIENT_ID = process.env.CLIENT_ID!
const CLIENT_SECRET = process.env.CLIENT_SECRET!
const TENANT_ID = process.env.TENANT_ID!
const DATAVERSE_URL = process.env.DATAVERSE_URL!

if (!CLIENT_ID || !CLIENT_SECRET || !TENANT_ID || !DATAVERSE_URL) {
  console.error(
    "Missing required env vars: CLIENT_ID, CLIENT_SECRET, TENANT_ID, DATAVERSE_URL"
  )
  process.exit(1)
}

const API_BASE = `${DATAVERSE_URL}/api/data/v9.2`

// ── Token cache ──────────────────────────────────────────────────────────────

let cachedToken: string | null = null
let tokenExpiry = 0

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry - 60_000) return cachedToken

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    scope: `${DATAVERSE_URL}/.default`,
  })

  const res = await fetch(
    `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`,
    { method: "POST", body }
  )

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Token request failed: ${res.status} ${text}`)
  }

  const json = (await res.json()) as { access_token: string; expires_in: number }
  cachedToken = json.access_token
  tokenExpiry = Date.now() + json.expires_in * 1000
  return cachedToken
}

// ── HTTP helpers ─────────────────────────────────────────────────────────────

interface DataverseError {
  error: { code: string; message: string }
}

function parseError(body: unknown): string {
  if (
    body &&
    typeof body === "object" &&
    "error" in body &&
    (body as DataverseError).error?.message
  ) {
    return (body as DataverseError).error.message
  }
  return "An unknown Dataverse error occurred"
}

interface RequestOptions {
  returnRepresentation?: boolean
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options?: RequestOptions
): Promise<T> {
  const token = await getAccessToken()

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "OData-Version": "4.0",
    Accept: "application/json",
  }

  if (method === "GET") {
    headers["Prefer"] =
      'odata.include-annotations="OData.Community.Display.V1.FormattedValue,Microsoft.Dynamics.CRM.lookuplogicalname"'
  }

  if (options?.returnRepresentation) {
    headers["Prefer"] = "return=representation"
  }

  if (body) {
    headers["Content-Type"] = "application/json"
  }

  const url = path.startsWith("http") ? path : `${API_BASE}/${path}`

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (response.status === 204) {
    return undefined as T
  }

  const responseBody = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(parseError(responseBody))
  }

  return responseBody as T
}

// ── Public API ───────────────────────────────────────────────────────────────

export interface ODataCollection<T> {
  value: T[]
  "@odata.count"?: number
  "@odata.nextLink"?: string
}

export const dv = {
  get: <T>(path: string) => request<T>("GET", path),
  getList: <T>(path: string) => request<ODataCollection<T>>("GET", path),
  post: <T>(path: string, body: unknown) => request<T>("POST", path, body),
  postAndReturn: <T>(path: string, body: unknown) =>
    request<T>("POST", path, body, { returnRepresentation: true }),
  patch: (path: string, body: unknown) => request<void>("PATCH", path, body),
  put: (path: string, body: unknown) => request<void>("PUT", path, body),
  del: (path: string) => request<void>("DELETE", path),
}

// ── Batch helper ─────────────────────────────────────────────────────────────

const BATCH_SIZE = 8

export async function batch<T>(
  tasks: (() => Promise<T>)[],
  size = BATCH_SIZE
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = []
  for (let i = 0; i < tasks.length; i += size) {
    const chunk = tasks.slice(i, i + size)
    const settled = await Promise.allSettled(chunk.map((fn) => fn()))
    results.push(...settled)
  }
  return results
}
