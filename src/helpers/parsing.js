
/**
 * Parse a game result
 */
export function parseResult(result) {

  //No input or invalid
  if (!result || typeof result !== 'string') {
    return '?'
  }

  //Make some replacements
  result = result
    .replace(/0\.03'/, 'F') //Fox uses 0.03 result for a Forfeit
    .replace(/0\.02'/, 'T') //Fox uses 0.02 result for a Timeout
    .replace('¼', '.25')
    .replace('½', '.5')
    .replace('¾', '.75')
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

  //Fix to 2 decimals
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
