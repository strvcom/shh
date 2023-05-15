import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

import type { EnvsConfig } from './config'
import { getEnvironmentsPattern } from './environments'
import { stage } from './utils'

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
const configureGitAttributes = (config: EnvsConfig, shouldStageFiles = false) => {
  const file = path.resolve(config.cwd, '.gitattributes')
  const content = fs.existsSync(file) ? fs.readFileSync(file, 'utf-8') : ''
  const append = `${getEnvironmentsPattern(config)} filter=git-crypt diff=git-crypt`

  if (!content.includes(append)) {
    fs.writeFileSync(file, `${content}\n${append}`)

    if (shouldStageFiles) {
      stage(file)
    }
  }
}

/**
 * Configure .gitignore file with git-crypt.
 */
const configureGitIgnore = (config: EnvsConfig, shouldStageFiles = false) => {
  const file = path.resolve(config.cwd, '.gitignore')
  const content = fs.existsSync(file) ? fs.readFileSync(file, 'utf-8') : ''
  const append = `${config.target}`

  if (!content.includes(append)) {
    fs.writeFileSync(file, `${content}\n${append}`)

    if (shouldStageFiles) {
      stage(file)
    }
  }
}

/**
 * Initializes git-crypt necessary configuration.
 */
const configure = (config: EnvsConfig, shouldStageFiles = false) => {
  // 1. Generate key.
  execSync('git-crypt init --key-name shh')

  // 2. Configure .gitattributes
  configureGitAttributes(config, shouldStageFiles)

  // 3. Configure .gitignore
  configureGitIgnore(config, shouldStageFiles)
}

export { checkAvailability, configure }
