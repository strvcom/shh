import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

import type { EnvsConfig } from './config'
import { getEnvironmentsPattern } from './environments'

/**
 * Safely verify if git-crypt is installed.
 */
const checkAvailability = () => {
  try {
    execSync('which git-crypt')
    return true // success
  } catch (err) {
    return false
  }
}

/**
 * Configure .gitattributes file with git-crypt.
 */
const configureGitAttributes = (config: EnvsConfig) => {
  const file = path.resolve(config.cwd, '.gitattributes')
  const content = fs.existsSync(file) ? fs.readFileSync(file, 'utf-8') : ''
  const append = `${getEnvironmentsPattern(config)} filter=git-crypt diff=git-crypt`

  if (!content.includes(append)) {
    fs.writeFileSync(file, [content, append].filter(Boolean).join('\n'))
  }
}

/**
 * Configure .gitignore file with git-crypt.
 */
const configureGitIgnore = (config: EnvsConfig) => {
  const file = path.resolve(config.cwd, '.gitignore')
  const content = fs.existsSync(file) ? fs.readFileSync(file, 'utf-8') : ''
  const append = `${config.target}`

  if (!content.includes(append)) {
    fs.writeFileSync(file, [content, append].filter(Boolean).join('\n'))
  }
}

/**
 * Initializes git-crypt necessary configuration.
 */
const configure = (config: EnvsConfig) => {
  // 1. Generate key.
  if (!fs.existsSync(path.join(config.cwd, '.git/git-crypt/keys/shh'))) {
    execSync('git-crypt init --key-name shh', { cwd: config.cwd })
  }

  // 2. Configure .gitattributes
  configureGitAttributes(config)

  // 3. Configure .gitignore
  configureGitIgnore(config)
}

export { checkAvailability, configure }
