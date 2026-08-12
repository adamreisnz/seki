import {describe, it, expect} from 'vitest'
import {
  swapColor, isValidColor, colorToNumeric,
  hexToRgb, rgbToHex, colorLuminance, interpolateColorScale
} from './color.js'
import {stoneColors} from '../constants/stone.js'

describe('color helpers', () => {

  it('swaps black and white', () => {
    expect(swapColor(stoneColors.BLACK)).toBe(stoneColors.WHITE)
    expect(swapColor(stoneColors.WHITE)).toBe(stoneColors.BLACK)
  })

  it('has nothing to swap for an unknown color', () => {
    expect(swapColor('green')).toBeUndefined()
  })

  it('validates colors', () => {
    expect(isValidColor(stoneColors.BLACK)).toBe(true)
    expect(isValidColor('green')).toBe(false)
    expect(isValidColor(undefined)).toBe(false)
  })

  it('converts to the numeric form used by external scoring libraries', () => {
    expect(colorToNumeric(stoneColors.BLACK)).toBe(1)
    expect(colorToNumeric(stoneColors.WHITE)).toBe(-1)
    expect(colorToNumeric(undefined)).toBe(0)
  })
})

describe('hex color helpers', () => {

  it('round trips a hex color through its channels', () => {
    expect(hexToRgb('#0e7f8c')).toEqual([14, 127, 140])
    expect(rgbToHex([14, 127, 140])).toBe('#0e7f8c')
  })

  it('reads black and white luminance off the ends of the scale', () => {
    expect(colorLuminance('#000000')).toBe(0)
    expect(colorLuminance('#ffffff')).toBe(255)
  })

  it('weighs green over red over blue, the way an eye does', () => {
    expect(colorLuminance('#00ff00')).toBeGreaterThan(colorLuminance('#ff0000'))
    expect(colorLuminance('#ff0000')).toBeGreaterThan(colorLuminance('#0000ff'))
  })
})

describe('interpolateColorScale', () => {

  const stops = [
    {value: 0, color: '#0e7f8c'},
    {value: 1, color: '#c8402c'},
    {value: 2, color: '#8c2f6b'},
  ]

  it('returns a stop color verbatim when the value lands on it', () => {
    expect(interpolateColorScale(stops, 0)).toBe('#0e7f8c')
    expect(interpolateColorScale(stops, 1)).toBe('#c8402c')
    expect(interpolateColorScale(stops, 2)).toBe('#8c2f6b')
  })

  it('holds the end colors rather than extrapolating', () => {
    expect(interpolateColorScale(stops, -1)).toBe('#0e7f8c')
    expect(interpolateColorScale(stops, 5)).toBe('#8c2f6b')
  })

  it('blends between stops', () => {
    const between = interpolateColorScale(stops, 0.5)
    expect(between).not.toBe('#0e7f8c')
    expect(between).not.toBe('#c8402c')
    expect(between).toMatch(/^#[0-9a-f]{6}$/)
  })

  it('keeps the midpoint of red and plum a colour, not a grey', () => {

    //This is the leg where naive RGB blending goes muddy. Perceptual
    //interpolation keeps the channels apart, so the midpoint stays as
    //saturated as the colors it sits between.
    const [r, g, b] = hexToRgb(interpolateColorScale(stops, 1.5))
    const spread = Math.max(r, g, b) - Math.min(r, g, b)
    expect(spread).toBeGreaterThan(80)
  })
})
