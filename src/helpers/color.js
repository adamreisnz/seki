import {stoneColors} from '../constants/stone.js'
const validStoneColors = Object.values(stoneColors)

/**
 * Swap a stone color
 */
export function swapColor(color) {
  if (color === stoneColors.BLACK) {
    return stoneColors.WHITE
  }
  else if (color === stoneColors.WHITE) {
    return stoneColors.BLACK
  }
}

/**
 * Check if a color is valid
 */
export function isValidColor(color) {
  return validStoneColors.includes(color)
}

//Transform color to numeric value
export function colorToNumeric(color) {
  switch (color) {
    case stoneColors.BLACK:
      return 1
    case stoneColors.WHITE:
      return -1
    default:
      return 0
  }
}

/**
 * Parse a #rrggbb hex string into [r, g, b] on 0–255
 */
export function hexToRgb(hex) {
  const value = parseInt(hex.slice(1), 16)
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
}

/**
 * Turn [r, g, b] on 0–255 back into a #rrggbb hex string
 */
export function rgbToHex([r, g, b]) {
  const to = value => Math.round(value).toString(16).padStart(2, '0')
  return `#${to(r)}${to(g)}${to(b)}`
}

/**
 * Perceived luminance of a hex color on 0–255, the classic weighted sum used
 * to decide whether text on top of it should be light or dark
 */
export function colorLuminance(hex) {
  const [r, g, b] = hexToRgb(hex)
  return (0.299 * r) + (0.587 * g) + (0.114 * b)
}

//sRGB channel (0–255) to linear light and back
const toLinear = c => {
  const v = c / 255
  return (v <= 0.04045) ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
}
const fromLinear = v => {
  const c = (v <= 0.0031308) ? v * 12.92 : (1.055 * Math.pow(v, 1 / 2.4)) - 0.055
  return Math.min(255, Math.max(0, c * 255))
}

/**
 * Hex color to OKLCH [lightness, chroma, hue in radians]
 *
 * Björn Ottosson's OKLab (https://bottosson.github.io/posts/oklab/), taken to
 * its polar form. The matrices below are the reference ones.
 */
function hexToOklch(hex) {
  const [r, g, b] = hexToRgb(hex).map(toLinear)

  const l = Math.cbrt((0.4122214708 * r) + (0.5363325363 * g) + (0.0514459929 * b))
  const m = Math.cbrt((0.2119034982 * r) + (0.6806995451 * g) + (0.1073969566 * b))
  const s = Math.cbrt((0.0883024619 * r) + (0.2817188376 * g) + (0.6299787005 * b))

  const L = (0.2104542553 * l) + (0.793617785 * m) - (0.0040720468 * s)
  const A = (1.9779984951 * l) - (2.428592205 * m) + (0.4505937099 * s)
  const B = (0.0259040371 * l) + (0.7827717662 * m) - (0.808675766 * s)

  return [L, Math.hypot(A, B), Math.atan2(B, A)]
}

/**
 * OKLCH [lightness, chroma, hue in radians] back to a hex color, with the
 * channels clamped into gamut
 */
function oklchToHex([L, C, h]) {
  const A = C * Math.cos(h)
  const B = C * Math.sin(h)

  const l = Math.pow(L + (0.3963377774 * A) + (0.2158037573 * B), 3)
  const m = Math.pow(L - (0.1055613458 * A) - (0.0638541728 * B), 3)
  const s = Math.pow(L - (0.0894841775 * A) - (1.291485548 * B), 3)

  return rgbToHex([
    fromLinear((4.0767416621 * l) - (3.3077115913 * m) + (0.2309699292 * s)),
    fromLinear((-1.2684380046 * l) + (2.6097574011 * m) - (0.3413193965 * s)),
    fromLinear((-0.0041960863 * l) - (0.7034186147 * m) + (1.7076147010 * s)),
  ])
}

/**
 * Read a color off a scale of hex stops, interpolating in OKLCH
 *
 * Stops are [{value, color}] in ascending value order. Values before the first
 * stop or past the last hold that stop's color rather than extrapolating.
 * OKLCH because it is perceptually even, so the midpoint between two stops
 * looks halfway between them instead of dipping through grey or brown the way
 * plain RGB does, and hue takes the short way round the wheel.
 */
export function interpolateColorScale(stops, value) {

  //Find the first stop the value does not clear
  const next = stops.findIndex(stop => value <= stop.value)
  if (next === 0) {
    return stops[0].color
  }
  if (next === -1) {
    return stops[stops.length - 1].color
  }

  //Interpolate between that stop and the one before it. A value dead on a
  //stop gets that stop's color verbatim rather than a round trip through the
  //color space.
  const from = stops[next - 1]
  const to = stops[next]
  const share = (value - from.value) / (to.value - from.value)
  if (share === 1) {
    return to.color
  }

  const [L1, C1, h1] = hexToOklch(from.color)
  const [L2, C2, h2] = hexToOklch(to.color)

  //Shortest way round the hue wheel
  let dh = h2 - h1
  if (dh > Math.PI) {
    dh -= 2 * Math.PI
  }
  else if (dh < -Math.PI) {
    dh += 2 * Math.PI
  }

  return oklchToHex([
    L1 + ((L2 - L1) * share),
    C1 + ((C2 - C1) * share),
    h1 + (dh * share),
  ])
}
