import { vi } from "vitest"

/**
 * Manual mock for @azure/web-pubsub-client. The PresenceProvider only
 * constructs a client when VITE_WEBPUBSUB_URL / _KEY are set (they are not in
 * tests), so this is a safety net to keep the real WebSocket transport out of
 * the test environment.
 */
export class WebPubSubClient {
  constructor(_options?: unknown) {}
  on = vi.fn()
  off = vi.fn()
  start = vi.fn(async () => {})
  stop = vi.fn()
  joinGroup = vi.fn(async () => {})
  leaveGroup = vi.fn(async () => {})
  sendToGroup = vi.fn(async () => {})
}
