import prompts from 'prompts'
import semver from 'semver'
import chalk from 'chalk'
import consola from 'consola'

import { $ } from 'zx'

import minimist from 'minimist'
import { version } from '../package.json'
import { getVersionChoices, packages, updateTemplateVersions, updateVersion } from './utils'

const args = minimist(process.argv.slice(2))
export const isDryRun = !!args.dry

async function main() {
  let targetVersion: string

  const { release }: { release: string } = await prompts({
    type: 'select',
    name: 'release',
    message: 'Select release type',
    choices: getVersionChoices(version),
  })

  if (release === 'custom') {
    const res: { version: string } = await prompts({
      type: 'text',
      name: 'version',
      message: 'Input custom version',
      initial: version,
    })
    targetVersion = res.version
  }
  else {
    targetVersion = release
  }

  if (!semver.valid(targetVersion))
    throw new Error(`invalid target version: ${targetVersion}`)

  const { yes }: { yes: boolean } = await prompts({
    type: 'confirm',
    name: 'yes',
    message: `Releasing ${chalk.yellow(targetVersion)} Confirm?`,
  })

  if (!yes)
    return

  consola.info('\nUpdating packages version...')
  updateVersion('package.json', targetVersion)
  packages.forEach((name) => {
    updateVersion(`packages/${name}/package.json`, targetVersion)
  })

  consola.info('\n Updating template version...')
  updateTemplateVersions(targetVersion)

  if (!isDryRun) {
    consola.info('\nCommitting changes...')
    await $`git add -A`
    await $`git commit -m "release: v${targetVersion}"`
    await $`git tag v${targetVersion}`

    consola.info('\nPushing to GitHub...')
    await $`git push`
    await $`git push origin --tags`
  }
}

main().catch((e) => {
  console.log(e)
})
