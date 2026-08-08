import {describe, it, expect} from 'vitest'
import Stone from './stone.js'
import StoneFactory from '../stone-factory.js'
import Theme from '../theme.js'
import {stoneColors, stoneStyles, stoneModifierStyles} from '../../constants/stone.js'

const {BLACK, WHITE} = stoneColors

/**
 * A board stand-in that draws stones in the colour they are given
 */
const createBoard = (cellSize = 40, theme = new Theme()) => ({
  theme,
  getCellSize: () => cellSize,
  getDisplayColor: color => color,
  getAbsX: x => x * cellSize,
  getAbsY: y => y * cellSize,
  isOnBoard: () => true,
  drawWidth: 400,
  drawHeight: 400,
})

describe('Stone theme paths', () => {

  it('looks at its own style before the base', () => {
    const stone = new Stone(createBoard(), BLACK)
    stone.style = stoneStyles.MONO

    expect(stone.getThemePaths('radius')).toEqual([
      'stone.mono.radius',
      'stone.base.radius',
    ])
  })

  it('puts a modifier style ahead of both', () => {
    const stone = new Stone(createBoard(), BLACK, stoneModifierStyles.HOVER)
    stone.style = stoneStyles.MONO

    expect(stone.getThemePaths('alpha')).toEqual([
      'stone.hover.alpha',
      'stone.mono.alpha',
      'stone.base.alpha',
    ])
  })

  it('falls back to the base radius for a style that has none', () => {
    const stone = new Stone(createBoard(40), BLACK)
    stone.style = stoneStyles.GLASS

    expect(stone.getRadius(40)).toBe(Math.round(Math.floor(40 / 2) * 0.97))
  })

  it('takes the style radius when there is one', () => {
    const stone = new Stone(createBoard(40), BLACK)
    stone.style = stoneStyles.MONO

    expect(stone.getRadius(40)).toBe(20)
  })
})

describe('Stone properties', () => {

  it('loads its colour and radius off the theme', () => {
    const stone = new Stone(createBoard(40), BLACK)
    stone.style = stoneStyles.MONO

    const [cellSize, displayColor] = stone.loadProperties()

    expect(cellSize).toBe(40)
    expect(displayColor).toBe(BLACK)
    expect(stone.color).toBe('#000')
    expect(stone.radius).toBe(20)
  })

  it('uses the colour the board says to display', () => {
    const board = createBoard(40)
    board.getDisplayColor = () => WHITE

    const stone = new Stone(board, BLACK)
    stone.style = stoneStyles.MONO
    stone.loadProperties()

    expect(stone.displayColor).toBe(WHITE)
    expect(stone.color).toBe('#fff')
  })

  it('starts fully opaque and unscaled', () => {
    const stone = new Stone(createBoard(), BLACK)
    expect(stone.alpha).toBe(1)
    expect(stone.scale).toBe(1)
  })

  it('picks up an alpha the theme sets for a modifier', () => {
    const theme = new Theme({stone: {hover: {alpha: 0.4}}})
    const stone = new Stone(
      createBoard(40, theme), BLACK, stoneModifierStyles.HOVER
    )
    stone.style = stoneStyles.MONO
    stone.loadProperties()

    expect(stone.alpha).toBe(0.4)
  })
})

describe('A stone built by the factory', () => {

  it('carries the style it was built with into its theme paths', () => {
    const stone = StoneFactory.create(stoneStyles.MONO, BLACK, createBoard())
    expect(stone.getThemePaths('radius')).toEqual([
      'stone.mono.radius',
      'stone.base.radius',
    ])
  })

  it('resolves a modified copy through the modifier first', () => {
    const stone = StoneFactory.create(stoneStyles.MONO, BLACK, createBoard())
    const copy = StoneFactory.createCopy(stone, stoneModifierStyles.HOVER)

    expect(copy.getThemePaths('alpha')[0]).toBe('stone.hover.alpha')
    expect(stone.getThemePaths('alpha')[0]).toBe('stone.mono.alpha')
  })
})
