import fs from 'fs'
import path from 'path'
import { spawnSync } from 'child_process'

import type { GlobalOptions } from './config'
import { getEnvironmentsPattern } from './environments'
import tempy from 'tempy'

interface Files {
  gitCryptKey: string
  attributes: string
  ignore: string
}

type Config = GlobalOptions & {
  encodedKey?: string
}

/**
 * Utility to safely execute commands that might throw errors.
 */
const exec = (command: string, throwOnError = false) => {
  const [_command, ...args] = command.split(' ')
  const result = spawnSync(_command, args)

  const returned = {
    ok: result.status === 0,
    error:
      result.status !== 0
        ? result.stderr
            .toString()
            .replace(/^\s+|\s+$/, '')
            .replace(/^Error: /, '')
        : null,
    output: result.stdout.toString().replace(/^\s+|\s+$/, ''),
    result,
  }

  if (throwOnError && !returned.ok) {
    throw new Error(returned.error ?? `Failed executing: \`${command}\``)
  }

  return returned
}

/**
 * Resolved git-crypt binary path.
 */
const binary = (() => {
  // Special case for Vercel execution.
  if (!exec('which git-crypt').ok && process.env.VERCEL) {
    return path.resolve(__dirname, '../../bin/git-crypt--amazon-linux')
  }

  return 'git-crypt'
})()

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
    ? 'You must provide a valid base64 string as key'
    : true

/**
 * Safely verify if git-crypt is installed.
 */
const checkAvailability = () => exec(`which ${binary}`).ok

/**
 * Find the root of the git repository.
 */
const getGitRoot = () => exec('git rev-parse --show-toplevel', true).output

/**
 * Resolve the paths needed to configure shh & git-crypt.
 */
const getPaths = (config: GlobalOptions): Files => ({
  gitCryptKey: path.resolve(getGitRoot(), '.git/git-crypt/keys/shh'),
  attributes: path.resolve(config.cwd, '.gitattributes'),
  ignore: path.resolve(config.cwd, '.gitignore'),
})

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
    [config.target, `!${getEnvironmentsPattern(config)}`]
      .filter((pattern) => !(content && new RegExp(`^${pattern}$`, 'm').test(content)))
      .join('\n'),
}

interface Step {
  run: (config: Config, paths: Files) => void | Promise<void>
  done: (config: Config, paths: Files) => boolean | Promise<boolean>
}

type StepName = 'gitCrypt' | 'attributes' | 'ignore'

const steps: Record<StepName, Step> = {
  /**
   * .git/shh/key
   */
  gitCrypt: {
    run: () => {
      const result = exec(`${binary} init --key-name shh`)

      // Throw unnexpected errors, but accept existing git-crypt key.
      if (!result.ok && !result.error?.includes('initialized with git-crypt')) {
        throw new Error(result.error as string)
      }
    },

    // Safe enough to always run.
    done: (_config, paths) => fs.existsSync(paths.gitCryptKey),
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

      return content.includes(append)
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
 * Lock repository.
 *
 * TODO: support multiple keys?
 */
const lock = async () => exec(`${binary} lock --key-name shh`, true)

/**
 * Unlock repository with provided key.
 */
const unlock = async (key: string) => {
  const valid = isValidKey(key as string)

  if (valid !== true) {
    throw new Error(valid)
  }

  const content = Buffer.from(decode(key), 'binary')

  await tempy.write.task(content, (key) => {
    exec(`${binary} unlock ${key}`, true)
  })
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
 * Get the states of each configuration step.
 */
const getStates = async (config: GlobalOptions) => {
  const paths = getPaths(config)

  return {
    gitCrypt: await steps.gitCrypt.done(config, paths),
    attributes: await steps.attributes.done(config, paths),
    ignore: await steps.ignore.done(config, paths),
  }
}

/**
 * Get the general status of this repository.
 */
const getStatus = async (config: GlobalOptions) => {
  const states = await getStates(config)

  // A. Everything is configured and operational.
  if (states.gitCrypt && states.attributes && states.ignore) {
    return 'ready'
  }

  // B. Configuration found, but no git-crypt installed.
  if (states.attributes && states.ignore) {
    return 'locked'
  }

  return 'empty'
}

type Status = Awaited<ReturnType<typeof getStatus>>

/**
 * Throws errors based on statues.
 */
const invariantStatus = async (config: GlobalOptions, map: Partial<Record<Status, Error>>) => {
  const status = await getStatus(config)

  for (const name in map) {
    if (name === status) {
      throw map[name]
    }
  }
}

/**
 * Get encoded key.
 */
const getKey = (config: GlobalOptions) =>
  encode(fs.readFileSync(getPaths(config).gitCryptKey, 'binary'))

export {
  checkAvailability,
  configure,
  lock,
  unlock,
  isConfigured,
  isValidKey,
  getStatus,
  getKey,
  invariantStatus,
}
