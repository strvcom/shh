import { Command } from 'commander'
import fs from 'fs'
import path from 'path'

export interface EnvsConfig {
  /**
   * Whether we should install environments using copy instead of symlink.
   */
  copy: boolean

  /**
   * The path to the managed env file.
   */
  target: string

  /**
   * The path to the env template file.
   */
  template: string

  /**
   * The path pattern to the environment files.
   */
  environments: string

  /**
   * Whether we should encrypt environment files using git-crypt.
   */
  shouldEncrypt: boolean

  /**
   * The root of the application.
   */
  cwd: string
}

const defaults: EnvsConfig = {
  copy: false,
  target: '.env',
  template: './envs/template',
  environments: './envs/env.[name]',
  shouldEncrypt: true,
  cwd: process.cwd(),
}

// prettier-ignore
const configOptions = {
  copy: { flags: '-c, --copy', description: 'Whether we should install environments using copy instead of symlink', initial: defaults.copy },
  target: { flags: '-t, --target <path>', description: 'The path to the managed env file', initial: defaults.target },
  template: { flags: '-T, --template <path>', description: 'The path to the env template file', initial: defaults.template },
  environments: { flags: '-E, --environments <path>', description: 'The path pattern to the environment files', initial: defaults.environments },
  shouldEncrypt: { flags: '-x, --should-encrypt', description: 'Whether we should encrypt environment files using git-crypt', initial: defaults.shouldEncrypt },
  cwd: { flags: '--cwd <path>', description: 'The root of the application', initial: defaults.cwd },
}

const configKeys = Object.keys(configOptions)

/**
 * Apply common options to to a command.
 */
const addConfigOptions = (command: Command) =>
  Object.values(configOptions).reduce(
    (command, { flags, description, initial }) => command.option(flags, description, initial),
    command
  )

/**
 * Read the .shhrc config file.
 */
const readConfig = (options?: Partial<EnvsConfig>): Partial<EnvsConfig> => {
  const root = options?.cwd ?? process.cwd()
  const configPath = path.resolve(root, '.shhrc')

  return fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, 'utf-8')) : {}
}

/**
 * Write the .shhrc config file.
 */
const writeConfig = (config: Partial<EnvsConfig>) => {
  const { cwd, ...options } = config
  const root = cwd ?? process.cwd()
  const configPath = path.resolve(root, '.shhrc')

  // Clone object.
  const content: typeof options = { ...options }

  // Existing file config.
  const current = readConfig(config)

  // Remove invalid keys.
  for (const key of Object.keys(content) as (keyof typeof content)[]) {
    if (!configKeys.includes(key)) {
      delete content[key]
    }
  }

  // Cleanup defaults.
  for (const key of Object.keys(content) as (keyof typeof content)[]) {
    if (content[key] === defaults[key] && !(key in current)) {
      delete content[key]
    }
  }

  if (Object.keys(content).length) {
    fs.writeFileSync(configPath, JSON.stringify(content, null, 2) + '\n', 'utf-8')
  }
}

/**
 * Load the config file and merge with defaults and overrides.
 */
const initConfig = <Override extends Partial<EnvsConfig>>(override: Override) => ({
  ...defaults,
  ...readConfig(override),
  ...override,
})

export { configOptions, initConfig, readConfig, writeConfig, addConfigOptions }
