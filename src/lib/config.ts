import fs from 'fs'
import path from 'path'

interface SecrecyConfig {
  /**
   * Path to the secret key.
   */
  secret: string

  /**
   * Path pattern to environment files.
   */
  environments: string
}

const defaults = {
  secret: './env/secret',
  environments: './env/.env.[name].encrypted',
}

const getConfig = <Override extends {}>(override: Override) => {
  const root = process.cwd()
  const configPath = path.resolve(root, '.secrecyrc')

  const config: Partial<SecrecyConfig> = fs.existsSync(configPath)
    ? JSON.parse(fs.readFileSync(configPath, 'utf-8'))
    : {}

  return { ...defaults, ...config, ...override }
}

export { getConfig }
