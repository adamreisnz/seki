import {kanjiNumbers, hangulNumbers} from '../constants/util.js'

/**
 * Parse komi
 */
export function parseKomi(komi) {

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

  //Parse main time
  mainTime = parseFloat(mainTime)
  if (isNaN(mainTime)) {
    return 0
  }

  //Return
  return mainTime
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
  result = result
    .replace(/0\.03'/, 'F') //Fox use 0.03 result for a Forfeit
    .replace(/0\.02'/, 'T') //Fox use 0.02 result for a Timeout
    .replace('¼', '.25')
    .replace('½', '.5')
    .replace('¾', '.75')

}

/**
 * Parse a rank string
 */
export function parseRank(raw) {

  //No input or invalid
  if (!raw || typeof raw !== 'string') {
    return ''
  }

  //First replace the actual rank with alphabetic characters
  //This also converts the shodan character to the number 1
  const str = raw
    .replace(/[段단]/, 'd') //Dan – Japanese & Chinese/Korean
    .replace(/[級级급]/, 'k') //Kyu – Japanese/Chinese/Korean
    .replace(/[初]/, '1') //Shodan
    .toLowerCase()

  //What we're left with is a string which may still contain the rank in a non
  //arabic numeral format, e.g. in Kanji or Hangul. We'll try to parse that.
  const match = str.match(/(.*)([dk])/)
  if (!match) {
    return ''
  }

  //Extract the rank and the type
  const rank = match[1]
  const type = match[2]

  //If the rank matches arabic numerals, we're done
  if (rank.match(/[0-9]+/)) {
    return `${parseInt(rank, 10)}${type}`
  }

  //Check if it matches Kanji numbers
  const kanjiIndex = kanjiNumbers.indexOf(rank)
  if (kanjiIndex !== -1) {
    return `${kanjiIndex + 1}${type}`
  }

  //Check if it matches Hangul numbers
  const hangulIndex = hangulNumbers.indexOf(rank)
  if (hangulIndex !== -1) {
    return `${hangulIndex + 1}${type}`
  }

  //Unknown rank format, return as is
  return rank
}
