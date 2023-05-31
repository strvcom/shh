const errors = {
  gitCrypt: { notInstalled: new Error('git-crypt not installed') },
  locked: new Error('Repository is locked. Run `shh unlock`.'),
  unlocked: new Error('Repository already unlocked!'),
  notConfigured: new Error('Repository not configured. Run `shh init`.'),
  configured: new Error(
    'Repository already configured, but locked. Unlock first with `shh unlock`.'
  ),

  environment: {
    invalidName: (error: string) => `Invalid environment name: ${error}`,
    noEnvironments: (path: string) => `No environments found at "${path}"`,
    fileNotFound: (name: string) => new Error(`File not found for environment "${name}".`),
    unresolvedName: (file: string) =>
      new Error(`Could not resolve environment name for file: "${file}"`),
  },

  symlink: (target: string, source: string) =>
    new Error(`Failed creating ${target} symlink to ${source}`),
}

export { errors }
