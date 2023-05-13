import { Command } from 'commander'
import fs from 'fs'
import path from 'path'

export interface EnvsConfig {
  /**
   * Install environment using a copy instead of symlink.
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
   * The root of the application.
   */
  cwd: string
}

// prettier-ignore
const configOptions = {
  copy: { flags: '-c, --copy', description: 'Install environment using a copy instead of symlink' },
  target: { flags: '-t, --target <path>', description: 'The path to the managed env file' },
  template: { flags: '-T, --template <path>', description: 'The path to the env template file' },
  environments: { flags: '-E, --environments <path>', description: 'The path pattern to the environment files' },
  cwd: { flags: '--cwd <path>', description: 'The root of the application' },
}

const configKeys = Object.keys(configOptions)

const defaults: EnvsConfig = {
  copy: false,
  target: '.env',
  template: '.env.template',
  environments: './env/.env.[name]',
  cwd: process.cwd(),
}

/**
 * Apply common options to to a command.
 */
const addConfigOptions = (command: Command) =>
  Object.values(configOptions).reduce(
    (command, { flags, description }) => command.option(flags, description),
    command
  )

/**
 * Read the .envsrc config file.
 */
const readConfig = (options?: Partial<EnvsConfig>): Partial<EnvsConfig> => {
  const root = options?.cwd ?? process.cwd()
  const configPath = path.resolve(root, '.envsrc')

  return fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, 'utf-8')) : {}
}

/**
 * Write the .envsrc config file.
 */
const writeConfig = (config: Partial<EnvsConfig>) => {
  const { cwd, ...options } = config
  const root = cwd ?? process.cwd()
  const configPath = path.resolve(root, '.envsrc')

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

  fs.writeFileSync(configPath, JSON.stringify(content, null, 2) + '\n', 'utf-8')
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
