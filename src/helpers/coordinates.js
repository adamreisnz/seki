import {aCharUc, aCharLc} from '../constants/util.js'

//Kanji
const kanjiCoordinates = [
  '一', '二', '三', '四', '五', '六', '七', '八', '九', '十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
  '二十一', '二十二', '二十三', '二十四', '二十五', '二十六', '二十七', '二十八', '二十九', '三十',
  '三十一', '三十二', '三十三', '三十四', '三十五', '三十六', '三十七', '三十八', '三十九', '四十',
]

//Kanji coordinates generator
export function kanji(i) {
  return kanjiCoordinates[i] || ''
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
