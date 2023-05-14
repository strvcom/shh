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
   * The path patterns to ignore when matching environments.
   */
  ignoreEnvironments: Array<string | RegExp>

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
  ignoreEnvironments: { flags: '-i, --ignore-environments <path>', description: 'The path patterns to ignore when matching environments' },
  cwd: { flags: '--cwd <path>', description: 'The root of the application' },
}

const configKeys = Object.keys(configOptions)

const defaults: EnvsConfig = {
  copy: false,
  target: '.env',
  template: '.env.template',
  environments: '.env.[name]',
  ignoreEnvironments: ['.env.local'],
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

  fs.writeFileSync(configPath, JSON.stringify(content, null, 2) + '\n', 'utf-8')
}

/**
 * Sanitize input where needed.
 */
const sanitize = <C extends EnvsConfig>(config: C) => {
  // Ensure ignore environments is an array.
  if (typeof config.ignoreEnvironments === 'string') {
    config.ignoreEnvironments = (config.ignoreEnvironments as string).split(/, ?/)
  }

  // Parse ignore environments regexes.
  config.ignoreEnvironments = (config.ignoreEnvironments ?? []).map((pattern) =>
    typeof pattern === 'string' && pattern.match(/^\/.+\/$/) ? new RegExp(pattern, 'i') : pattern
  )

  return config
}

/**
 * Load the config file and merge with defaults and overrides.
 */
const initConfig = <Override extends Partial<EnvsConfig>>(override: Override) =>
  sanitize({
    ...defaults,
    ...readConfig(override),
    ...override,
  })

export { configOptions, initConfig, readConfig, writeConfig, addConfigOptions }
