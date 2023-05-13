import logUpdate from 'log-update'

/**
 * Forcefully sleep execution (for better UX).
 */
const sleep = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Updating logger with better UX.
 */
const log = async (...args: Parameters<typeof logUpdate>) => {
  logUpdate(...args)
  await sleep()
}

export { sleep, log }
