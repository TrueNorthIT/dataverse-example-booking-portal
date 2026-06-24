/**
 * Minimal logger.
 *
 * `debug`/`info` are silenced outside development so the production console
 * stays clean (and never leaks tokens or connection details). `warn`/`error`
 * always surface — wire them to a real sink (Sentry/LogRocket) here if needed.
 */

const isDev = import.meta.env.DEV

export const logger = {
  debug: (...args: unknown[]): void => {
    if (isDev) console.debug(...args)
  },
  info: (...args: unknown[]): void => {
    if (isDev) console.info(...args)
  },
  warn: (...args: unknown[]): void => {
    console.warn(...args)
  },
  error: (...args: unknown[]): void => {
    console.error(...args)
  },
}
