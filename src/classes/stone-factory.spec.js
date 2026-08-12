import {describe, it, expect} from 'vitest'
import Board from './board.js'
import StoneFactory from './stone-factory.js'
import Stone from './objects/stone.js'
import StoneGradient from './objects/stone-gradient.js'
import StoneShadow from './objects/stone-shadow.js'
import {stoneColors, stoneStyles, stoneModifierStyles} from '../constants/stone.js'

const board = new Board({size: 19})

describe('StoneFactory', () => {

  it('builds a stone of each style', () => {
    for (const style of Object.values(stoneStyles)) {
      const stone = StoneFactory.create(style, stoneColors.BLACK, board)
      expect(stone).toBeInstanceOf(Stone)
      expect(stone.stoneColor).toBe(stoneColors.BLACK)
    }
  })

  it('maps the gradient style onto the gradient stone', () => {
    const stone = StoneFactory.create(stoneStyles.GRADIENT, stoneColors.BLACK, board)
    expect(stone).toBeInstanceOf(StoneGradient)
  })

  it('falls back to slate and shell for an unknown style', () => {
    const known = StoneFactory.create(stoneStyles.SLATE_SHELL, stoneColors.BLACK, board)
    const unknown = StoneFactory.create('nonsense', stoneColors.BLACK, board)
    expect(unknown.constructor).toBe(known.constructor)
  })

  it('copies a stone with a modifier style', () => {
    const stone = StoneFactory.create(stoneStyles.GLASS, stoneColors.WHITE, board)
    const copy = StoneFactory.createCopy(stone, stoneModifierStyles.HOVER)

    expect(copy).toBeInstanceOf(stone.constructor)
    expect(copy).not.toBe(stone)
    expect(copy.stoneColor).toBe(stoneColors.WHITE)
    expect(copy.modifierStyle).toBe(stoneModifierStyles.HOVER)
  })

  it('applies extra properties to a copy', () => {
    const stone = StoneFactory.create(stoneStyles.MONO, stoneColors.BLACK, board)
    const copy = StoneFactory.createCopy(stone, stoneModifierStyles.POINTS, {
      probability: 0.5,
    })
    expect(copy.probability).toBe(0.5)
  })

  it('refuses to copy something that is not a stone', () => {
    expect(() => StoneFactory.createCopy({}, stoneModifierStyles.HOVER))
      .toThrow('Unexpected input')
  })

  it('builds a shadow tied to its stone', () => {
    const stone = StoneFactory.create(stoneStyles.SLATE_SHELL, stoneColors.BLACK, board)
    const shadow = StoneFactory.createShadow(stone)

    expect(shadow).toBeInstanceOf(StoneShadow)
    expect(shadow.parent).toBe(stone)
  })
})
