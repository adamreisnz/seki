
//Regex to match event urls
export const regexEventUrl = /(,\s|:\s|\sat\s)?(https?:\/\/(.*?(?=\s|$)))/

/**
 * Parse event string
 */
export function parseEvent(str) {
  const match = str.match(regexEventUrl)
  if (!match) {
    return [str]
  }
  const name = str.replace(regexEventUrl, '')
  const location = match[2]
  return [name, location]
}

/**
 * Parse a game result
 */
export function parseResult(result) {

  //No input or invalid
  if (!result || typeof result !== 'string') {
    return '?'
  }

  //Make some replacements
  return result
    .replace(/resign/i, 'R')
    .replace(/time/i, 'T')
    .replace(/forfeit/i, 'F')
    .replace(/0\.03/, 'F') //Fox uses 0.03 result for a Forfeit
    .replace(/0\.02/, 'T') //Fox uses 0.02 result for a Timeout
    .replace(/¼/, '.25')
    .replace(/½/, '.5')
    .replace(/¾/, '.75')
    .toUpperCase()
}

/**
 * Parse komi
 */
export function parseKomi(komi) {

  //Undefined
  if (typeof komi === 'undefined') {
    return
  }

  //String given
  if (typeof komi === 'string') {
    komi = komi
      .replace(/375/, '3.75') //Fox uses chinese half-area counting
      .replace('¼', '.25')
      .replace('½', '.5')
      .replace('¾', '.75')
  }

  //Parse komi
  komi = parseFloat(komi)
  if (isNaN(komi)) {
    return 0
  }

  //Fix to 2 decimals at most and convert back to number
  return Number(komi.toFixed(2))
}

/**
 * Parse handicap
 */
export function parseHandicap(handicap) {

  //Undefined
  if (typeof handicap === 'undefined') {
    return
  }

  //Parse handicap
  handicap = parseInt(handicap, 10)
  if (isNaN(handicap)) {
    return 0
  }

  //Return
  return handicap
}

/**
 * Parse main time
 */
export function parseMainTime(mainTime) {

  //Undefined
  if (typeof mainTime === 'undefined') {
    return
  }

  //Parse main time
  mainTime = parseFloat(mainTime)
  if (isNaN(mainTime)) {
    return 0
  }

  //Return
  return mainTime
}
