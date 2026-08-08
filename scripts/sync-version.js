//Syncs the appVersion constant with the package.json version. Runs as the
//`version` lifecycle script, after `pnpm version` bumps package.json but
//before it creates the release commit, so both files land in the same commit.
import {readFileSync} from 'node:fs'
import {replaceInFile} from 'replace-in-file'

const {version} = JSON.parse(readFileSync('./package.json', 'utf8'))
const [result] = await replaceInFile({
  files: 'src/constants/app.js',
  from: /appVersion = '[^']+'/,
  to: `appVersion = '${version}'`,
  countMatches: true,
})

if (!result?.numMatches) {
  console.error('Could not sync appVersion in src/constants/app.js')
  process.exit(1)
}

console.log(`Synced appVersion to ${version} in ${result.file}`)
