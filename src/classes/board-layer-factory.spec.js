import {describe, it, expect} from 'vitest'
import Board from './board.js'
import BoardLayerFactory from './board-layer-factory.js'
import BoardLayer from './layers/board-layer.js'
import {boardLayerTypes} from '../constants/board.js'

const board = new Board({size: 19})

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
