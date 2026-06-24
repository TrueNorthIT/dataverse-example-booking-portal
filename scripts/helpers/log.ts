/** Colored console output helpers for CLI scripts */

const RESET = "\x1b[0m"
const GREEN = "\x1b[32m"
const RED = "\x1b[31m"
const YELLOW = "\x1b[33m"
const DIM = "\x1b[2m"
const BLUE = "\x1b[34m"
const BOLD = "\x1b[1m"

export function logSuccess(msg: string) {
  console.log(`${GREEN}${msg}${RESET}`)
}

export function logError(msg: string) {
  console.error(`${RED}${msg}${RESET}`)
}

export function logWarn(msg: string) {
  console.log(`${YELLOW}${msg}${RESET}`)
}

export function logSkip(msg: string) {
  console.log(`${DIM}${msg}${RESET}`)
}

export function logHeading(msg: string) {
  console.log(`\n${BLUE}${BOLD}${msg}${RESET}`)
}
