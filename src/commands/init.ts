import fs from 'fs'
import { Command } from 'commander'
import inquirer, { Question } from 'inquirer'

import { log } from '../lib/utils'
import { configOptions, initConfig, addConfigOptions, writeConfig } from '../lib/config'
import type { EnvsConfig } from '../lib/config'

type Options = Partial<EnvsConfig>

/**
 * Build inquirer questions based on passed-in params.
 */
const getQuestions = (options: Options) => {
  const initials = initConfig({})
  const questions: Question[] = []

  if (!options.copy) {
    questions.push({
      name: 'copy',
      type: 'confirm',
      default: initials.copy,
      message: configOptions.copy.description,
    })
  }

  if (!options.target) {
    questions.push({
      name: 'target',
      type: 'string',
      default: initials.target,
      message: configOptions.target.description,
    })
  }

  if (!options.template) {
    questions.push({
      name: 'template',
      type: 'string',
      default: initials.template,
      message: configOptions.target.description,
    })
  }

  if (!options.environments) {
    questions.push({
      name: 'environments',
      type: 'string',
      default: initials.environments,
      message: configOptions.environments.description,
    })
  }

  // Add form length status.
  for (let i = 0; i < questions.length; i++) {
    questions[i].message = `(${i + 1}/${questions.length}) ${questions[i].message}`
  }

  return questions
}

const steps = [
  {
    message: 'Writting .envsrc',
    action: writeConfig,
  },
]

/**
 * Command to initialize configuration file.
 */
const command = new Command()
  .name('init')
  .description('Initialize .envsrc config file and install necessary codebase changes.')
  .action(async () => {
    const options = command.optsWithGlobals()
    const questions = getQuestions(options)
    const input = questions.length ? await inquirer.prompt(questions) : {}
    const config = initConfig({ ...options, ...input })

    for (const step of steps) {
      await log(step.message)
      await step.action(config)
      await log(`${step.message}: ok`)
    }
  })

addConfigOptions(command)

export { command }
