import {describe, it, expect} from 'vitest'
import Board from '../src/classes/board.js'
import Player from '../src/classes/player.js'
import StoneFactory from '../src/classes/stone-factory.js'
import MarkupFactory from '../src/classes/markup-factory.js'
import BoardLayerFactory from '../src/classes/board-layer-factory.js'
import PlayerModeFactory from '../src/classes/player-mode-factory.js'
import Stone from '../src/classes/objects/stone.js'
import StoneShadow from '../src/classes/objects/stone-shadow.js'
import Markup from '../src/classes/objects/markup.js'
import BoardLayer from '../src/classes/layers/board-layer.js'
import PlayerMode from '../src/classes/modes/player-mode.js'
import {stoneColors, stoneStyles, stoneModifierStyles} from '../src/constants/stone.js'
import {markupTypes} from '../src/constants/markup.js'
import {boardLayerTypes} from '../src/constants/board.js'
import {playerModes} from '../src/constants/player.js'

const board = new Board({size: 19})

describe('StoneFactory', () => {

  it('builds a stone of each style', () => {
    for (const style of Object.values(stoneStyles)) {
      const stone = StoneFactory.create(style, stoneColors.BLACK, board)
      expect(stone).toBeInstanceOf(Stone)
      expect(stone.stoneColor).toBe(stoneColors.BLACK)
    }
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

describe('MarkupFactory', () => {

  it('builds markup of every type it knows', () => {
    const buildable = Object
      .values(markupTypes)
      .filter(type => type !== markupTypes.ARROW && type !== markupTypes.LINE)

    for (const type of buildable) {
      const data = {index: 0, text: 'A', number: 1}
      const markup = MarkupFactory.create(type, board, data)
      expect(markup).toBeInstanceOf(Markup)
      expect(markup.type).toBe(type)
    }
  })

  it('carries label text through', () => {
    const markup = MarkupFactory.create(markupTypes.LABEL, board, {text: 'A'})
    expect(markup.getText()).toBe('A')
  })

  it('rejects an unknown type', () => {
    expect(() => MarkupFactory.create('nonsense', board))
      .toThrow('Unknown markup type')
  })

  it('rejects the types that are not implemented yet', () => {
    expect(() => MarkupFactory.create(markupTypes.ARROW, board)).toThrow()
    expect(() => MarkupFactory.create(markupTypes.LINE, board)).toThrow()
  })
})

describe('BoardLayerFactory', () => {

  it('builds a layer of each type, tagged with that type', () => {
    for (const type of Object.values(boardLayerTypes)) {
      const layer = BoardLayerFactory.create(type, board)
      expect(layer).toBeInstanceOf(BoardLayer)
      expect(layer.type).toBe(type)
    }
  })

  it('rejects an unknown type', () => {
    expect(() => BoardLayerFactory.create('nonsense', board))
      .toThrow('Unknown board layer type')
  })
})

describe('PlayerModeFactory', () => {

  const player = new Player()

  it('builds a handler for each mode, tagged with that mode', () => {
    for (const mode of Object.values(playerModes)) {
      const handler = PlayerModeFactory.create(mode, player)
      expect(handler).toBeInstanceOf(PlayerMode)
      expect(handler.mode).toBe(mode)
    }
  })

  it('rejects an unknown mode', () => {
    expect(() => PlayerModeFactory.create('nonsense', player))
      .toThrow('Unrecognized player mode')
  })

  it('initialises the handler it builds', () => {
    const handler = PlayerModeFactory.create(playerModes.REPLAY, player)
    expect(handler.eventListenersMap).toBeDefined()
    expect(handler.bound).toBeDefined()
  })
})
