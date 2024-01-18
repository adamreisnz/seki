import pkg from '../../package.json' assert {type: "json"}

//App details
export const appIdentifier = pkg.name
export const appName = 'Seki'
export const appVersion = pkg.version

//Supported kifu formats
export const kifuFormats = {
  JGF: 'jgf',
  SGF: 'sgf',
  GIB: 'gib',
}
