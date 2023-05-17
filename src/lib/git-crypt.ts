import fs from 'fs'
import path from 'path'
import { execSync, spawnSync } from 'child_process'

import type { GlobalOptions } from './config'
import { getEnvironmentsPattern } from './environments'
import inquirer from 'inquirer'

let encodedKey = process.env.SHH_KEY

/**
 * Decode key from base64.
 */
const decode = (key: string) => Buffer.from(key.trim(), 'base64').toString('binary')

/**
 * Verifies if it's a valid base64 key.
 */
const isValidKey = (key: string) =>
  !key
    ? 'You must provide a key'
    : !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(key)
    ? 'You must provide a valid base64 string'
    : true

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

interface Files {
  key: string
  attributes: string
  ignore: string
}

/**
 * Resolve the paths needed to configure shh & git-crypt.
 */
const getPaths = (config: GlobalOptions): Files => ({
  key: path.resolve(config.cwd, '.git/shh/key'),
  attributes: path.resolve(config.cwd, '.gitattributes'),
  ignore: path.resolve(config.cwd, '.gitignore'),
})

interface Step {
  run: (config: GlobalOptions, paths: Files) => void | Promise<void>
  done: (config: GlobalOptions, paths: Files) => boolean | Promise<boolean>
}

type StepName = keyof Files

const steps: Record<StepName, Step> = {
  /**
   * .git/shh/key
   */
  key: {
    run: (_config, { key: file }) => {
      // 1. Persist any provided key.
      if (encodedKey) {
        fs.mkdirSync(path.dirname(file), { recursive: true })
        fs.writeFileSync(file, decode(encodedKey), 'binary')
      }

      // 2.A. Inititalize from scratch, when no key file available.
      if (!fs.existsSync(file)) {
        const spawn = spawnSync('git-crypt', ['init'])
        const error = spawn.stderr.toString().trim()

        // Throw unnexpected errors, but accept existing git-crypt key.
        if (spawn.status !== 0 && !error.includes('initialized with git-crypt')) {
          throw new Error(error.replace('Error: ', ''))
        }
      }
      // 2.B. Unlock, when a key file is available.
      else {
        execSync(`git-crypt unlock ${file}`)
      }
    },

    // Safe enough to always run.
    done: (_config, { key: file }) => fs.existsSync(file),
  },

  /**
   * .gitattributes
   */
  attributes: {
    run: (config, { attributes: file }) => {
      const content = fs.existsSync(file) ? fs.readFileSync(file, 'utf-8') : ''
      const append = `${getEnvironmentsPattern(config)} filter=git-crypt diff=git-crypt`

      fs.writeFileSync(file, [content, append].filter(Boolean).join('\n'))
    },

    done: (config, { attributes: file }) => {
      const content = fs.existsSync(file) ? fs.readFileSync(file, 'utf-8') : ''
      const append = `${getEnvironmentsPattern(config)} filter=git-crypt diff=git-crypt`

      return content.includes(append)
    },
  },

  /**
   * .gitignore
   */
  ignore: {
    run: (config, { ignore: file }) => {
      const content = fs.existsSync(file) ? fs.readFileSync(file, 'utf-8') : ''
      const append = `${config.target}`

      fs.writeFileSync(file, [content, append].filter(Boolean).join('\n'))
    },

    done: (config, { ignore: file }) => {
      const content = fs.existsSync(file) ? fs.readFileSync(file, 'utf-8') : ''
      const append = `${config.target}`

      return content.includes(append)
    },
  },
}

/**
 * Initializes git-crypt necessary configuration.
 */
const configure = async (config: GlobalOptions) => {
  const paths = getPaths(config)

  for (const step of Object.values(steps)) {
    if (!(await step.done(config, paths))) {
      await step.run(config, paths)
    }
  }
}

/**
 * Ensure a encoded key is provided.
 */
const ensureKey = async (config: GlobalOptions) => {
  // Let use input on first usage on new clone.
  if (!encodedKey && config.logLevel === 'log') {
    encodedKey = (
      await inquirer.prompt([
        {
          name: 'key',
          type: 'input',
          message: 'Provide a base64 encoded key:',
          validate: isValidKey,
        },
      ])
    ).key as string
  }

  const valid = isValidKey(encodedKey as string)

  if (valid !== true) {
    throw new Error(valid)
  }
}

/**
 * Install key and unlock repository.
 */
const unlock = async (config: GlobalOptions) => {
  const paths = getPaths(config)

  // 1. Ensure git-crypt is installed.
  if (!(await steps.key.done(config, paths))) {
    await ensureKey(config)
    await steps.key.run(config, paths)
  }

  // 2. Unlock repository.
  execSync('git-crypt ')
}

export { checkAvailability, configure, unlock }
