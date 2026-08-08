import {describe, it, expect} from 'vitest'
import {swapColor, isValidColor, colorToNumeric} from './color.js'
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
