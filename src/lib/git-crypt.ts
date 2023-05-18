import fs from 'fs'
import path from 'path'
import { execSync, spawnSync } from 'child_process'

import type { GlobalOptions } from './config'
import { getEnvironmentsPattern } from './environments'
import inquirer from 'inquirer'

/**
 * Encode key to base64.
 */
const encode = (key: string) => Buffer.from(key).toString('base64')

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
  gitCryptKey: string
  attributes: string
  ignore: string
}

type Config = GlobalOptions & {
  encodedKey?: string
}

/**
 * Resolve the paths needed to configure shh & git-crypt.
 */
const getPaths = (config: GlobalOptions): Files => ({
  key: path.resolve(config.cwd, '.shh-key'),
  gitCryptKey: path.resolve(config.cwd, '.git/git-crypt/keys/shh'),
  attributes: path.resolve(config.cwd, '.gitattributes'),
  ignore: path.resolve(config.cwd, '.gitignore'),
})

interface Step {
  run: (config: Config, paths: Files) => void | Promise<void>
  done: (config: Config, paths: Files) => boolean | Promise<boolean>
}

type StepName = 'gitCrypt' | 'attributes' | 'ignore'

/**
 * Configuration content generation.
 */
const generate = {
  /**
   * Apply git-crypt-shh filter to encrypted envs.
   */
  attributes: (config: Config) =>
    `${getEnvironmentsPattern(config)} filter=git-crypt-shh diff=git-crypt-shh`,

  /**
   * 1. Ignore .env
   * 2. Do NOT ignore encrypted envs if encryption is on.
   */
  ignore: (config: Config, content?: string) =>
    [config.target]
      .concat(config.encrypt ? [`!${getEnvironmentsPattern(config)}`, '.shh-key'] : [])
      .filter((pattern) => !(content && new RegExp(`^${pattern}$`, 'm').test(content)))
      .join('\n'),
}

const steps: Record<StepName, Step> = {
  /**
   * .git/shh/key
   */
  gitCrypt: {
    run: (config, paths) => {
      // 1. Install any provided key for unlocking.
      if (config.encodedKey) {
        fs.mkdirSync(path.dirname(paths.key), { recursive: true })
        fs.writeFileSync(paths.key, decode(config.encodedKey), 'binary')
      }

      // 2. If git-crypt needs installing.
      if (!fs.existsSync(paths.gitCryptKey)) {
        // 2.a. Unlock using available symetric key.
        if (fs.existsSync(paths.key)) {
          execSync(`git-crypt unlock ${paths.key}`)
        }
        // 2.b. Initialize from scratch
        else {
          const spawn = spawnSync('git-crypt', ['init', '--key-name', 'shh'])
          const error = spawn.stderr.toString().trim()

          // Throw unnexpected errors, but accept existing git-crypt key.
          if (spawn.status !== 0 && !error.includes('initialized with git-crypt')) {
            throw new Error(error.replace('Error: ', ''))
          }

          // Save git-crypt key for posterior unlock.
          execSync(`git-crypt export-key --key-name shh ${paths.key}`)
        }
      }
    },

    // Safe enough to always run.
    done: (_config, paths) => fs.existsSync(paths.key) && fs.existsSync(paths.gitCryptKey),
  },

  /**
   * .gitattributes
   */
  attributes: {
    run: (config, { attributes: file }) => {
      const content = fs.existsSync(file) ? fs.readFileSync(file, 'utf-8') : ''
      const append = generate.attributes(config)

      fs.writeFileSync(file, [content, append].filter(Boolean).join('\n'))
    },

    done: (config, { attributes: file }) => {
      const content = fs.existsSync(file) ? fs.readFileSync(file, 'utf-8') : ''
      const append = generate.attributes(config)

      return !config.encrypt || content.includes(append)
    },
  },

  /**
   * .gitignore
   */
  ignore: {
    run: (config, { ignore: file }) => {
      const content = fs.existsSync(file) ? fs.readFileSync(file, 'utf-8') : ''
      const append = generate.ignore(config, content)

      fs.writeFileSync(file, [content, append].filter(Boolean).join('\n'))
    },

    done: (config, { ignore: file }) => {
      const content = fs.existsSync(file) ? fs.readFileSync(file, 'utf-8') : ''
      const append = generate.ignore(config, content)

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
  let encodedKey = process.env.SHH_KEY

  // Let use input on first usage on new clone.
  if (!encodedKey && config.logLevel === 'log') {
    encodedKey = (
      await inquirer.prompt([
        {
          name: 'key',
          type: 'input',
          message: 'Provide the shh key (run `shh export-key` to get one):',
          validate: isValidKey,
        },
      ])
    ).key as string
  }

  const valid = isValidKey(encodedKey as string)

  if (valid !== true) {
    throw new Error(valid)
  }

  return encodedKey as string
}

/**
 * Install key and unlock repository.
 */
const unlock = async (config: GlobalOptions) => {
  const paths = getPaths(config)

  // 1. Ensure git-crypt is configured.
  if (!(await steps.gitCrypt.done(config, paths))) {
    const encodedKey = await ensureKey(config)
    await steps.gitCrypt.run({ ...config, encodedKey }, paths)
  }

  // 2. Unlock repository.
  execSync('git-crypt ')
}

/**
 * Check if git-crypt and key are installed.
 */
const isConfigured = async (config: GlobalOptions) => {
  const paths = getPaths(config)

  for (const step of Object.values(steps)) {
    if (!(await step.done(config, paths))) {
      return false
    }
  }

  return true
}

/**
 * Get the status of this repository.
 */
const getStatus = async (config: GlobalOptions) => {
  const paths = getPaths(config)

  // Everything is properly initialized.
  if (await isConfigured(config)) {
    return 'ready'
  }

  // Previous configuration found.
  if ((await steps.attributes.done(config, paths)) && (await steps.ignore.done(config, paths))) {
    return 'locked'
  }

  return 'empty'
}

/**
 * Get encoded key.
 */
const getKey = (config: GlobalOptions) =>
  encode(fs.readFileSync(getPaths(config).gitCryptKey, 'binary'))

export { checkAvailability, configure, unlock, isConfigured, getStatus, getKey }
