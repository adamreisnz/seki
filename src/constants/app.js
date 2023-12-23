import pkg from '../../package.json' assert {type: "json"};

//App details
export const appIdentifier = pkg.name
export const appName = 'Seki'
export const appVersion = pkg.version
export const configVersion = '1.7'

//Supported kifu formats
export const kifuFormats = {
  JSON: 'json',
  JGF: 'jgf',
  SGF: 'sgf',
  GIB: 'gib',
}
