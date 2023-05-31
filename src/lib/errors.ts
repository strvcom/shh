const errors = {
  gitCrypt: { notInstalled: () => new Error('git-crypt not installed') },
  locked: () => new Error('Repository already locked.'),
  unlocked: () => new Error('Repository already unlocked!'),
  notConfigured: () => new Error('Repository not configured. Run `npx shh init`.'),
}

export { errors }
