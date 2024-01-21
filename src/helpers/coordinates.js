import {aCharUc, aCharLc, kanjiNumbers, hangulNumbers} from '../constants/util.js'

//Kanji coordinates generator
export function kanji(i) {
  return kanjiNumbers[i] || i
}

//Hangul coordinates generator
export function hangul(i) {
  return hangulNumbers[i] || i
}

//Number coordinates generator (starting at 1)
export function numbers(i) {
  return i + 1
}

//Letter coordinates generator (capitalised)
export function letters(i) {

  //Initialize
  let ch = ''

  //Beyond Z? Prepend with A
  if (i >= 25) {
    ch = 'A'
    i -= 25
  }

  //The letter I is ommitted
  if (i >= 8) {
    i++
  }

  //Return
  return ch + String.fromCharCode(aCharUc + i)
}

//Index coordinates generator (starting at 0)
export function index(i) {
  return i
}

//Lowercase coordinates generator
export function lowercase(i) {
  let ch
  if (i < 26) {
    ch = aCharLc + i
  }
  else {
    ch = aCharUc + i
  }
  return String.fromCharCode(ch)
}

//Map of coordinate generators
export const coordinateGenerators = {
  kanji,
  numbers,
  letters,
  index,
  lowercase,
}

//Normalisation of coordinates object
export function normalizeCoordinatesObject(obj) {
  if (Array.isArray(obj)) {
    const [x, y] = obj
    return {x, y}
  }
  return obj
}
