import logUpdate from 'log-update'

/**
 * Forcefully sleep execution (for better UX).
 */
const sleep = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Updating logger with better UX.
 */
const log = async (message: string, done = false) => {
  logUpdate(message)

  await sleep()

  if (done) {
    logUpdate.done()
  }
}

export { sleep, log }
