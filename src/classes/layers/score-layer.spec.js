import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest'
import ScoreLayer from './score-layer.js'
import Grid from '../grid.js'
import Theme from '../theme.js'
import {boardLayerTypes} from '../../constants/board.js'
import {stoneColors} from '../../constants/stone.js'
import {createStubContext} from '../../../test/helpers.js'

const {BLACK, WHITE} = stoneColors

beforeEach(() => {
  vi.stubGlobal('window', {devicePixelRatio: 1})
})

afterEach(() => {
  vi.unstubAllGlobals()
})

/**
 * A board stand-in with a stones layer that can be added to and taken from,
 * so that the layer's shuffling of dead stones can be followed
 */
const createBoard = ({cellSize = 40, stoneStyle} = {}) => {

  const stones = new Map()
  const theme = new Theme()

  //A mono stone draws one arc, which keeps what was painted countable
  if (stoneStyle) {
    theme.set('board.stoneStyle', stoneStyle)
  }

  return {
    stones,
    theme,
    width: 9,
    height: 9,
    drawWidth: 400,
    drawHeight: 400,
    getCellSize: () => cellSize,
    getDisplayColor: color => color,
    getAbsX: x => x * cellSize,
    getAbsY: y => y * cellSize,
    isOnBoard: () => true,
    get: (type, x, y) => stones.get(`${x},${y}`),
    has: (type, x, y) => stones.has(`${x},${y}`),
    add: (type, x, y, value) => stones.set(`${x},${y}`, value),
    remove: (type, x, y) => stones.delete(`${x},${y}`),
    getLayer: () => undefined,
  }
}

/**
 * Build a grid holding the given entries
 */
const gridOf = (entries, width = 9, height = 9) => {
  const grid = new Grid(width, height)
  for (const [x, y, value] of entries) {
    grid.set(x, y, value)
  }
  return grid
}

const createLayer = (options = {}) => {
  const board = createBoard(options)
  const context = createStubContext()
  const layer = new ScoreLayer(board)
  layer.setGridSize(9, 9)
  layer.setContext(context)
  return {layer, context, board}
}

describe('ScoreLayer', () => {

  it('is the score layer', () => {
    const {layer} = createLayer()
    expect(layer.type).toBe(boardLayerTypes.SCORE)
  })

  it('starts with nothing scored', () => {
    const {layer} = createLayer()

    expect(layer.territory).toBeNull()
    expect(layer.captures).toBeNull()
  })
})

describe('ScoreLayer dead stones', () => {

  it('lifts every captured stone off the stones layer', () => {

    //A dead stone has to come off the board so that the faded copy of it the
    //score layer draws is what shows, rather than the live stone underneath
    const {layer, board} = createLayer()
    const stone = {stoneColor: BLACK}
    board.add(boardLayerTypes.STONES, 2, 2, stone)

    layer.setAll(
      gridOf([]),
      gridOf([[2, 2, {color: BLACK}]])
    )

    expect(board.has(boardLayerTypes.STONES, 2, 2)).toBe(false)
  })

  it('puts them all back when the scoring is cleared', () => {
    const {layer, board} = createLayer()
    const stone = {stoneColor: BLACK}
    board.add(boardLayerTypes.STONES, 2, 2, stone)

    layer.setAll(gridOf([]), gridOf([[2, 2, {color: BLACK}]]))
    layer.removeAll()

    expect(board.get(boardLayerTypes.STONES, 2, 2)).toBe(stone)
  })

  it('forgets what it removed once it has put it back', () => {

    //Otherwise a second clear would restore the same stone over whatever has
    //since been played on that point
    const {layer, board} = createLayer()
    board.add(boardLayerTypes.STONES, 2, 2, {stoneColor: BLACK})

    layer.setAll(gridOf([]), gridOf([[2, 2, {color: BLACK}]]))
    layer.removeAll()
    board.remove(boardLayerTypes.STONES, 2, 2)
    layer.removeAll()

    expect(board.has(boardLayerTypes.STONES, 2, 2)).toBe(false)
  })

  it('clears what it was scoring', () => {
    const {layer} = createLayer()

    layer.setAll(gridOf([]), gridOf([[2, 2, {color: BLACK}]]))
    layer.removeAll()

    expect(layer.territory).toBeNull()
    expect(layer.captures).toBeNull()
  })

  it('starts from nothing when it is scored a second time', () => {
    const {layer, board} = createLayer()
    board.add(boardLayerTypes.STONES, 2, 2, {stoneColor: BLACK})
    board.add(boardLayerTypes.STONES, 4, 4, {stoneColor: WHITE})

    layer.setAll(gridOf([]), gridOf([[2, 2, {color: BLACK}]]))
    layer.setAll(gridOf([]), gridOf([[4, 4, {color: WHITE}]]))

    expect(board.has(boardLayerTypes.STONES, 2, 2)).toBe(true)
    expect(board.has(boardLayerTypes.STONES, 4, 4)).toBe(false)
  })

  it('survives being cleared before it was ever set', () => {
    const {layer} = createLayer()
    expect(() => layer.removeAll()).not.toThrow()
  })
})

describe('ScoreLayer drawing', () => {

  it('draws nothing until it has been given a score', () => {
    const {layer, context} = createLayer()
    layer.draw()

    expect(layer.canDraw()).toBeFalsy()
    expect(context.arc).not.toHaveBeenCalled()
  })

  it('draws nothing without a context', () => {
    const board = createBoard()
    const layer = new ScoreLayer(board)
    layer.setGridSize(9, 9)
    layer.setAll(gridOf([[1, 1, {color: BLACK, probability: 1}]]), gridOf([]))

    expect(() => layer.draw()).not.toThrow()
  })

  it('draws a captured stone at full size, where it stood', () => {
    const {layer, context} = createLayer({stoneStyle: 'mono'})
    layer.setAll(gridOf([]), gridOf([[2, 2, {color: BLACK}]]))

    layer.draw()

    expect(context.arc).toHaveBeenCalledTimes(1)
    expect(context.arc.mock.calls[0].slice(0, 3)).toEqual([80, 80, 19])
  })

  it('puts the fade back when it is done, so the next thing is opaque', () => {

    //The captured copy is drawn see through, and the alpha it sets is
    //context state that would carry on to everything drawn after it
    const {layer, context} = createLayer({stoneStyle: 'mono'})
    layer.setAll(gridOf([]), gridOf([[2, 2, {color: BLACK}]]))

    layer.draw()

    expect(context.globalAlpha).toBe(1)
  })

  it('draws a small stone on each point of territory', () => {

    //The size of the point stands for how sure the estimate is, so it is
    //scaled by the probability rather than drawn full size
    const {layer, context} = createLayer({stoneStyle: 'mono'})
    layer.setAll(
      gridOf([[1, 1, {color: WHITE, probability: 0.5}]]),
      gridOf([])
    )

    layer.draw()

    const [, , radius] = context.arc.mock.calls[0]
    expect(radius).toBeLessThan(20)
    expect(radius).toBeGreaterThan(0)
  })

  it('takes the size from the strength of the estimate', () => {
    const sure = createLayer({stoneStyle: 'mono'})
    const unsure = createLayer({stoneStyle: 'mono'})

    sure.layer.setAll(gridOf([[1, 1, {color: WHITE, probability: 1}]]), gridOf([]))
    unsure.layer.setAll(gridOf([[1, 1, {color: WHITE, probability: 0.3}]]), gridOf([]))
    sure.layer.draw()
    unsure.layer.draw()

    expect(sure.context.arc.mock.calls[0][2])
      .toBeGreaterThan(unsure.context.arc.mock.calls[0][2])
  })

  it('reads a negative probability as strength either way', () => {

    //The estimator signs the probability by colour, so a point that is
    //certainly one player's reads as -1 as readily as 1
    const positive = createLayer({stoneStyle: 'mono'})
    const negative = createLayer({stoneStyle: 'mono'})

    positive.layer.setAll(gridOf([[1, 1, {color: BLACK, probability: 1}]]), gridOf([]))
    negative.layer.setAll(gridOf([[1, 1, {color: BLACK, probability: -1}]]), gridOf([]))
    positive.layer.draw()
    negative.layer.draw()

    expect(negative.context.arc.mock.calls[0][2])
      .toBe(positive.context.arc.mock.calls[0][2])
  })

  it('leaves a living stone showing rather than drawing over it', () => {
    const {layer, context, board} = createLayer()
    board.add(boardLayerTypes.STONES, 1, 1, {stoneColor: BLACK})

    layer.setAll(
      gridOf([[1, 1, {color: BLACK, probability: 1}]]),
      gridOf([])
    )
    layer.draw()

    expect(context.arc).not.toHaveBeenCalled()
  })

  it('draws the captures under the territory', () => {

    //Territory is drawn second so that a point marked over a dead stone
    //reads as territory rather than as the stone
    const {layer, context} = createLayer({stoneStyle: 'mono'})

    layer.setAll(
      gridOf([[2, 2, {color: WHITE, probability: 1}]]),
      gridOf([[2, 2, {color: BLACK}]])
    )
    layer.draw()

    //The capture at full size first, the territory point over it
    expect(context.arc).toHaveBeenCalledTimes(2)
    expect(context.arc.mock.calls[0][2])
      .toBeGreaterThan(context.arc.mock.calls[1][2])
  })
})
