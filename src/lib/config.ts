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

  /**
   * Whether we should encrypt environment files using git-crypt.
   */
  encrypt: boolean
}

type ShhConfigKey = keyof ShhConfig

const shhConfigKeys = ['copy', 'target', 'template', 'environments', 'encrypt'] as const

export type GlobalOptions = ShhConfig & {
  /**
   * The root of the application.
   */
  cwd: string

  /**
   * What level of logs to report.
   */
  logLevel: 'log' | 'silent' | 'warn'
}

const defaults: GlobalOptions = {
  copy: false,
  target: '.env',
  template: './envs/template',
  environments: './envs/env.[name]',
  encrypt: true,
  cwd: process.cwd(),
  logLevel: 'log',
}

// prettier-ignore
const globalOptions = {
  // Shh configurations.
  copy: new Option('-c, --copy', 'Whether we should install environments using copy instead of symlink').default(defaults.copy),
  target: new Option('-t, --target <path>', 'The path to the managed env file').default(defaults.target),
  template: new Option('-T, --template <path>', 'The path to the env template file').default(defaults.template),
  environments: new Option('-E, --environments <path>', 'The path pattern to the environment files').default(defaults.environments),
  encrypt: new Option('--no-encrypt', 'Whether we should skip encryption setup (git-crypt)').default(defaults.encrypt),

  // CLI configuraiton
  cwd: new Option('--cwd <path>', 'The root of the application').default(defaults.cwd),
  logLevel: new Option('-l, --log-level <level>', 'What level of logs to report').default(defaults.logLevel).choices(['log', 'silent', 'warn']),
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
