import { Command, Option } from 'commander'
import fs from 'fs'
import path from 'path'

export interface ShhConfig {
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
}

const shhConfigKeys = ['copy', 'target', 'template', 'environments'] as const

export type GlobalOptions = ShhConfig & {
  /**
   * The root of the application.
   */
  cwd: string

  /**
   * What level of logs to report.
   */
  logLevel: 'log' | 'silent' | 'warn' | 'nothing'
}

const defaults: GlobalOptions = {
  copy: false,
  target: '.env',
  template: './envs/template',
  environments: './envs/env.[name]',
  cwd: process.cwd(),
  logLevel: 'log',
}

// prettier-ignore
const globalOptions = {
  // Shh configurations.
  copy: new Option('-c, --copy', 'Whether we should install environments using copy instead of symlink'),
  target: new Option('-t, --target <path>', 'The path to the managed env file'),
  template: new Option('-T, --template <path>', 'The path to the env template file'),
  environments: new Option('-E, --environments <path>', 'The path pattern to the environment files'),

  // CLI configuraiton
  cwd: new Option('--cwd <path>', 'The root of the application'),
  logLevel: new Option('-l, --log-level <level>', 'What level of logs to report').choices(['log', 'silent', 'warn', 'nothing']),
}

/**
 * Apply common options to to a command.
 */
const addConfigOptions = (command: Command) =>
  Object.values(globalOptions).reduce((command, option) => command.addOption(option), command)

/**
 * Read the .shhrc config file.
 */
const readConfig = (options?: Partial<GlobalOptions>): Partial<GlobalOptions> => {
  const root = options?.cwd ?? process.cwd()
  const configPath = path.resolve(root, '.shhrc')

  return fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, 'utf-8')) : {}
}

/**
 * Write the .shhrc config file.
 */
const writeConfig = (config: Partial<GlobalOptions>) => {
  // Clone object.
  const root = config.cwd ?? process.cwd()
  const configPath = path.resolve(root, '.shhrc')

  // Read current config file.
  const current = readConfig(config)

  // Create new content object.
  const content: Partial<ShhConfig> = {}

  // Cleanup content object.
  for (const key of shhConfigKeys) {
    const isSet = key in config
    const isDefault = config[key] === defaults[key]
    const isInCurrent = key in current

    if (isSet && (!isDefault || isInCurrent)) {
      content[key] = config[key] as any
    }
  }

  // Skip writting if not different than defaults.
  return Object.keys(content).length
    ? (fs.writeFileSync(configPath, JSON.stringify(content, null, 2) + '\n', 'utf-8'), true)
    : false
}

/**
 * Load the config file and merge with defaults and overrides.
 */
const initConfig = <Override extends Partial<ShhConfig>>(override: Override) => ({
  ...defaults,
  ...readConfig(override),
  ...override,
})

export { initConfig, readConfig, writeConfig, addConfigOptions }
