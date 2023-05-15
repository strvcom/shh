import { execSync } from 'child_process'
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

/**
 * Add file/pattern to git staged.
 */
const stage = (file: string) => execSync(`git add ${file}`)

export { sleep, log, stage }
