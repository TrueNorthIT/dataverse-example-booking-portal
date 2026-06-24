import { describe, it, expect, vi, afterEach } from "vitest"
import { logger } from "@/lib/logger"

afterEach(() => vi.restoreAllMocks())

describe("logger", () => {
  it("forwards warn and error to the console", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const error = vi.spyOn(console, "error").mockImplementation(() => {})
    logger.warn("w")
    logger.error("e")
    expect(warn).toHaveBeenCalledWith("w")
    expect(error).toHaveBeenCalledWith("e")
  })

  it("emits debug/info in the dev (test) environment", () => {
    const debug = vi.spyOn(console, "debug").mockImplementation(() => {})
    const info = vi.spyOn(console, "info").mockImplementation(() => {})
    logger.debug("d")
    logger.info("i")
    // Vitest runs with import.meta.env.DEV === true
    expect(debug).toHaveBeenCalledWith("d")
    expect(info).toHaveBeenCalledWith("i")
  })
})
