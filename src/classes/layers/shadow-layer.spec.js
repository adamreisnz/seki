import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest'
import ShadowLayer from './shadow-layer.js'
import Theme from '../theme.js'
import {boardLayerTypes} from '../../constants/board.js'
import {createStubContext} from '../../../test/helpers.js'

beforeEach(() => {
  vi.stubGlobal('window', {devicePixelRatio: 1})
})

afterEach(() => {
  vi.unstubAllGlobals()
})

/**
 * A shadow that records where it was drawn
 */
const createShadow = () => ({draw: vi.fn(), erase: vi.fn()})

const createLayer = ({cellSize = 40, withContext = true} = {}) => {
  const board = {
    theme: new Theme(),
    width: 19,
    height: 19,
    drawWidth: 400,
    drawHeight: 400,
    getCellSize: () => cellSize,
    isOnBoard: () => true,
  }
  const context = createStubContext()
  context.setTransform = vi.fn()

  const layer = new ShadowLayer(board)
  layer.setGridSize(19, 19)
  if (withContext) {
    layer.setContext(context)
  }

  return {layer, context, board}
}

describe('ShadowLayer', () => {

  it('is the shadow layer', () => {
    const {layer} = createLayer()
    expect(layer.type).toBe(boardLayerTypes.SHADOW)
  })

  it('offsets the whole layer rather than each shadow', () => {

    //Every shadow on the board falls the same way, so the offset is a
    //transform on the layer instead of something each object works out
    const {layer, context} = createLayer({cellSize: 400})
    layer.draw()

    expect(context.setTransform).toHaveBeenCalledWith(1, 0, 0, 1, 4, 4)
  })

  it('draws each shadow it holds', () => {
    const {layer, context} = createLayer()
    const shadow = createShadow()

    layer.grid.set(3, 3, shadow)
    layer.draw()

    expect(shadow.draw).toHaveBeenCalledWith(context, 3, 3)
  })

  it('draws nothing without a context', () => {
    const {layer} = createLayer({withContext: false})
    const shadow = createShadow()

    layer.grid.set(3, 3, shadow)

    expect(() => layer.draw()).not.toThrow()
    expect(shadow.draw).not.toHaveBeenCalled()
  })

  it('repaints the whole layer when one shadow comes off', () => {

    //Shadows overlap their neighbours, so clearing the cell one sits in
    //would take a bite out of the ones around it
    const {layer, context} = createLayer()
    const kept = createShadow()

    layer.grid.set(3, 3, createShadow())
    layer.grid.set(4, 4, kept)
    context.clearRect.mockClear()
    kept.draw.mockClear()

    layer.remove(3, 3)

    expect(layer.grid.has(3, 3)).toBe(false)
    expect(context.clearRect).toHaveBeenCalled()
    expect(kept.draw).toHaveBeenCalled()
  })

  it('leaves the layer alone when there was nothing to remove', () => {
    const {layer} = createLayer()
    expect(() => layer.remove(3, 3)).not.toThrow()
  })
})
