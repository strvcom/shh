<div align="center">

<h1>🤫<br /><small>@strv/shh</small></h1>

CLI tool to manage versioned environment variable files using [git-crypt](https://www.agwa.name/projects/git-crypt/).

[![npm version](https://badge.fury.io/js/@strv%2Fshh.svg)](https://www.npmjs.com/package/@strv/shh) [![by STRV](https://img.shields.io/badge/by-STRV-ec0d32)](https://www.strv.com/)

</div>

## Motivation

While many projects deserve proper secrets handling solution such as [Vault, by HashiCorp](https://www.vaultproject.io/) or [AWS KMS](https://aws.amazon.com/kms/), these solutions are often costy and simply an overkill for more simpler setups. However, manually managing environment variables is a pain and prone to much human mistakes.

Meanwhile, git-crypt has been providing a good solution to [manage your secrets together with your codebase](https://dev.to/heroku/how-to-manage-your-secrets-with-git-crypt-56ih). Although simple, git-crypt is not really feature rich and not at all focused on this particular use-case alone.

Comes `@strv/shh`. Together with git-crypt, this tool will help you:

- Encrypt versioned environment variables
- Setup CI usage of these environment variables
- Share environment variables safely with colleagues
- Compare environment variable of different targets
- Switch environments locally

## How it works

The main idea here is to have a set of environment files (by default at `./envs/env.[name]`) that are encrypted using git-crypt, and a `.env` symbolic link to one of the available environments.

`@strv/shh` will helps setting this up, and switching/selecting environments both on local machines and on CI.

## Install

Make sure to have [git-crypt](https://github.com/AGWA/git-crypt) installed. On Mac OS, I recommend using [brew](https://github.com/AGWA/git-crypt/blob/master/INSTALL.md#installing-on-mac-os-x).

```shell
npm add @strv/shh --dev
```

## Usage

### 1. Setup

The first user should be the one to setup `@strv/shh` on the repository:

```shell
npx shh init
```

This command has sensible defaults that can be overriden with extra [options](#options). After initialization, make sure to commit all generated files, and changes made to `.gitattributes` and `.gitignore`.

### 2. Save key

You'll need the encryption key for other users to use the encrypted files, and for CI decryption. Run the following to get the key:

```sh
npx shh export-key
```

The output key can be shared with other developers that are allowed to unlock the environment variables, and used on the CI setup.

> Disclaimer: the output is a base64 encoded secret for easier handling.

### 3. Unlock

After cloning the repository, it's necessary to unlock the environment variable files. Having the key generated on the [step above](#2-save-key), run:

```sh
npx shh unlock
```

### 4. Create environments

Different environments (development, production, etc) are defined by their variable declaring files. By default, this files should be found on `./envs/env.[name]` (replacing `[name]` with the environment name).

You can either create new environments by manually create these files, or you can use the following command:

```sh
npx shh new
```

The benefit of using the command is mainly to reuse the template, if set.

### 5. Switching environments

Whenever you intend to execute the application under a different environment locally, run the base CLI:

```sh
npx shh
```

### 6. CI

Setup on CI isn't much different than locally. However, we recommend this shortcut:

```sh
SHH_KEY=[key] npx shh -e [environment]
```

`SSH_KEY` becomes the only environment variable that has to be made available manually on the CI admin setup.

#### git-crypt

The main problem to use `@strv/shh` on CI is having git-crypt available, which depends entirely on the OS in use.

[Vercel](https://vercel.com/docs/concepts/deployments/build-image) uses an image based on [Amazon Linux 2](https://aws.amazon.com/amazon-linux-2). `@strv/shh` includes a pre-built git-crypt binary for that image available on `@strv/shh/bin/git-crypt--amazon-linux`, and this binary will be used by default when executing commands under a Vercel environment, but for safety reasons, we recommend you setup your CI environment following the git-crypt [install instructions](https://github.com/AGWA/git-crypt/blob/master/INSTALL.md).

## Commands & Options

All commands have available options and descriptions available by appending `--help` to the command.

### Global options

The following options are available to all commands, and are saved to `.shhrc` in case they differ from the defaults upon initializing. 

|                             | Description                                                                | Default               |
| --------------------------- | -------------------------------------------------------------------------- | --------------------- |
| `-t, --target <path>`       | The path to the managed env file                                           | `".env"`              |
| `-T, --template <path>`     | The path to the env template file                                          | `"./envs/template"`   |
| `-E, --environments <path>` | The path pattern to the environment files                                  | `"./envs/env.[name]"` |
| `-l, --log-level <level>`   | What level of logs to report (choices: "log", "silent", "warn", "nothing") | `"log"`               |
| `-c, --copy`                | Whether we should install environments using copy instead of symlink       | `false`               |

<details>
  <summary><strong>Initialize (<code>npx init</code>)</strong></summary>
  <hr />

  Initializes `@strv/shh` and git-crypt setup.
  <hr />
</details>

<details>
  <summary><strong>Switch (<code>npx shh</code>)</strong></summary>
  <hr />

  Switch to an available environment. Options:

  |                            | Description                  | Default  |
  | -------------------------- | ---------------------------- | -------- |
  | `-e, --environment <name>` | The environment to switch to | prompted |
  <hr />
</details>

<details>
  <summary><strong>Unlock (<code>npx unlock</code>)</strong></summary>
  <hr />

  Unlock repository using git-crypt. Options:

  |                           | Description            | Default  |
  | ------------------------- | ---------------------- | -------- |
  | `-k, --encoded-key <key>` | The base64 encoded key | prompted |
  <hr />
</details>

<details>
  <summary><strong>Lock (<code>npx lock</code>)</strong></summary>
  <hr />

  Locks the repository's and encrypt environment files.
  <hr />
</details>

<details>
  <summary><strong>New environment (<code>npx new</code>)</strong></summary>
  <hr />

  Create a new environment based on the template. Options:

  |                            | Description                | Default  |
  | -------------------------- | -------------------------- | -------- |
  | `-e, --environment <name>` | The environment to install | prompted |
  <hr />
</details>

<details>
  <summary><strong>Diff (<code>npx diff</code>)</strong></summary>
  <hr />

  Compares variables available on all environments (including template).
  <hr />
</details>

<details>
  <summary><strong>Export key (<code>npx export-key</code>)</strong></summary>
  <hr />

  Outputs a base64 encoded version of the encryption key.
  <hr />
</details>
