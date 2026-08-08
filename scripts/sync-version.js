//Syncs the appVersion constant with the package.json version. Runs as the
//`version` lifecycle script, after `pnpm version` bumps package.json but
//before it creates the release commit, so both files land in the same commit.
import {readFileSync, writeFileSync} from 'node:fs'

const {version} = JSON.parse(readFileSync('./package.json', 'utf8'))
const file = './src/constants/app.js'
const contents = readFileSync(file, 'utf8')
const updated = contents.replace(
  /appVersion = '[^']+'/,
  `appVersion = '${version}'`
)

if (!updated.includes(`appVersion = '${version}'`)) {
  console.error(`Could not sync appVersion in ${file}`)
  process.exit(1)
}

writeFileSync(file, updated)
console.log(`Synced appVersion to ${version} in ${file}`)
