import {describe, it, expect} from 'vitest'
import {setSubtract} from './grid.js'

describe('grid helpers', () => {

  it('subtracts one set of coordinates from another', () => {
    const a = [{x: 0, y: 0}, {x: 1, y: 1}, {x: 2, y: 2}]
    const b = [{x: 1, y: 1}]
    expect(setSubtract(a, b)).toEqual([{x: 0, y: 0}, {x: 2, y: 2}])
  })

  it('returns everything when nothing is subtracted', () => {
    const a = [{x: 0, y: 0}]
    expect(setSubtract(a, [])).toEqual(a)
  })
})
