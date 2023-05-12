import { execSync } from 'child_process'
import log from 'log-update'
import fs from 'fs'
import type { SecrecyConfig } from './config'
import path from 'path'

/**
 * Verify if git-crypt is properly installed.
 */
const checkGitCryptInstall = () => {
  log('Checking git-crypt install...')

  try {
    execSync('which git-crypt')
  } catch (err) {
    log('Checking git-crypt install: failed')
    throw new Error('git-crypt not found. Check README.md for instructions.')
  }

  log('Checking git-crypt install: ok')
  log.done()
}

/**
 * Check for existence of "secret" file.
 */
const checkSecretFile = (config: SecrecyConfig) => {
  log('Checking secret file...')

  const location = path.resolve(config.cwd, config.secret)

  if (!fs.existsSync(location)) {
    log('Checking secret file: failed')
    throw new Error(`Missing "${config.secret}" file.`)
  }

  log('Checking secret file: ok')
  log.done()
}

export { checkGitCryptInstall, checkSecretFile }
