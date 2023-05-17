import logUpdate from 'log-update'

import type { GlobalOptions } from './config'

/**
 * Forcefully sleep execution (for better UX).
 */
const sleep = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Create a custom logger with extented funcitonallity.
 */
const createLogger = (config: GlobalOptions) => ({
  /**
   * Log any message, optionally updating previous.
   */
  log: async (message: string, update = false) => {
    if (!update) {
      logUpdate.done()
    } else {
      await sleep()
    }

    if (config.logLevel === 'log') {
      logUpdate(message)
    }
  },

  /**
   * Log a warning message.
   */
  warn: async (message: string, update = false) => {
    if (!update) {
      logUpdate.done()
    } else {
      await sleep()
    }

    if (['log', 'warn'].includes(config.logLevel)) {
      console.warn(message)
    }
  },

  /**
   * Log an error message.
   */
  error: async (message: string, update = false) => {
    if (!update) {
      logUpdate.done()
    } else {
      await sleep()
    }

    if (config.logLevel !== 'silent') {
      console.error(message)
    }
  },
})

export { sleep, createLogger }
