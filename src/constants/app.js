import pkg from '../../package.json' assert {type: "json"}

//App details
export const appIdentifier = pkg.name
export const appVersion = pkg.version
export const appName = 'Seki'

//Supported kifu formats
export const kifuFormats = {
  JGF: 'jgf',
  SGF: 'sgf',
  GIB: 'gib',
}
