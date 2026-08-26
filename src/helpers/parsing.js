
import {gameResults} from '../constants/game.js'

//Regex to match event urls
export const regexEventUrl = /(,\s|:\s|\sat\s)?(https?:\/\/(.*?(?=\s|$)))/

//Regex to match a whole SGF date list, allowing the shorthand the spec permits
//within one, where a date leaves off whatever it shares with the one before it
export const regexDateList =
  /^(\d{4}(-\d{1,2}(-\d{1,2})?)?(\s*,\s*(\d{4}|(\d{4}-)?\d{1,2}(-\d{1,2})?))*)?$/

//Regex to match the ways a drawn result is written. Seki wrote 'D' for it for
//a long time, so records it made still have to read back as a draw
export const regexDrawnResult = /^(0|d|draw)$/i

//Regex to match a void result
export const regexVoidResult = /^void$/i

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
    return gameResults.UNKNOWN
  }

  //A drawn game keeps the spec's spelling of '0' (zero), which is the only
  //one other programs read as a draw, and every way of writing one normalises
  //to it. NOTE: this has to come before the replacements below, which end in
  //toUpperCase() and would leave a draw as an invalid 'D'.
  if (result.match(regexDrawnResult)) {
    return gameResults.DRAW
  }

  //A void game keeps the spec's spelling of 'Void' for the same reason: the
  //uppercasing below would otherwise write a 'VOID' nothing else reads
  if (result.match(regexVoidResult)) {
    return gameResults.VOID
  }

  //Make some replacements
  return result
    .replace(/draw/i, 'D')
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
 * Parse time
 */
export function parseTime(time) {

  //Undefined
  if (typeof time === 'undefined') {
    return
  }

  //Parse main time
  time = parseFloat(time)
  if (isNaN(time)) {
    return 0
  }

  //Return
  return time
}

/**
 * Parse an SGF date list into an array of YYYY[-MM[-DD]] date strings
 *
 * A record can carry more than one date, for a game played over several days
 * or an adjourned one, and the SGF spec allows a date in such a list to leave
 * off whatever it shares with the date before it. So 2024-03-01,02 is the
 * first and second of March, and 1996-10-18,19 the 18th and 19th of October.
 *
 * NOTE: this and stringifyDates below are ported from Sabaki's SGF library
 * (https://github.com/SabakiHQ/sgf, MIT licensed), which implements both
 * directions of that shorthand. Sabaki works in [year, month, day] tuples,
 * where we keep dates as strings throughout, so the padding it does on the
 * way out happens here on the way in instead.
 */
export function parseDates(input) {

  //Not a string, or not a date list at all
  if (typeof input !== 'string' || !input.match(regexDateList)) {
    return []
  }

  //Nothing in it
  if (input.trim() === '') {
    return []
  }

  //Split into its dates, and each of those into its parts
  const dates = input
    .split(',')
    .map(date => date.trim().split('-'))

  //Fill in the parts each date leaves off, taking them from the date before
  //it: a lone day inherits the year and month, a month and day the year
  for (let i = 1; i < dates.length; i++) {
    const date = dates[i]
    const prev = dates[i - 1]
    if (date[0].length !== 4) {
      if (date.length === 1 && prev.length === 3) {
        date.unshift(prev[1])
      }
      date.unshift(prev[0])
    }
  }

  //Pad the months and days back out to two digits, so that what comes out is
  //a plain YYYY[-MM[-DD]] date however abbreviated it was written
  return dates.map(date => date
    .map((part, i) => (i === 0) ? part : part.padStart(2, '0'))
    .join('-'))
}

/**
 * Stringify an array of dates into an SGF date list
 *
 * This is the inverse of parseDates above, writing the same shorthand back
 * out: a date only spells out the parts it doesn't share with the one before.
 */
export function stringifyDates(dates) {

  //Nothing to write
  if (!Array.isArray(dates) || dates.length === 0) {
    return ''
  }

  //Split each date into its parts
  const parts = dates.map(date => String(date).split('-'))

  //Trim the leading parts each date shares with the one before it, always
  //leaving at least one part behind so that a repeated date still writes
  //something rather than an empty entry
  return parts
    .map((date, i) => {
      if (i === 0) {
        return date
      }

      //Only a date written to the same precision as the one before it can be
      //abbreviated, because that is the precision an abbreviated one is read
      //at: 2024-03-01,05 is the 5th of March, so a month following a day has
      //to be spelled out in full. NOTE: Sabaki abbreviates on the shared
      //prefix alone, which turns ['2024-03-01', '2024-05'] into that very
      //string and reads it back as the 5th of March.
      const prev = parts[i - 1]
      if (date.length !== prev.length) {
        return date
      }

      let shared = 0
      while (shared < date.length - 1 && date[shared] === prev[shared]) {
        shared++
      }
      return date.slice(shared)
    })
    .map(date => date.join('-'))
    .join(',')
}
