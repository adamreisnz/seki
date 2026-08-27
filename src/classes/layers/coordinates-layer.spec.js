import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest'
import CoordinatesLayer from './coordinates-layer.js'
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
 * A board stand-in big enough to draw a full set of coordinates around
 */
const createBoard = ({
  showCoordinates = true,
  cellSize = 20,
  width = 19,
  height = 19,
  theme = new Theme(),
} = {}) => ({
  theme,
  width,
  height,
  xLeft: 0,
  xRight: width - 1,
  yTop: 0,
  yBottom: height - 1,
  drawWidth: 400,
  drawHeight: 400,
  drawMarginHor: cellSize * 2,
  drawMarginVer: cellSize * 2,
  getCellSize: () => cellSize,
  getAbsX: x => cellSize * 2 + (x * cellSize),
  getAbsY: y => cellSize * 2 + (y * cellSize),
  isOnBoard: () => true,
  getConfig: key => (key === 'showCoordinates' ? showCoordinates : undefined),
})

const createLayer = (options = {}) => {
  const board = createBoard(options)
  const context = createStubContext()
  const layer = new CoordinatesLayer(board)
  layer.setContext(context)
  return {layer, context, board}
}

describe('CoordinatesLayer', () => {

  it('is the coordinates layer', () => {
    const {layer} = createLayer()
    expect(layer.type).toBe(boardLayerTypes.COORDINATES)
  })

  it('holds nothing of its own', () => {

    //It draws straight from the board dimensions rather than from a grid of
    //objects, so the grid methods it inherits are deliberately inert
    const {layer} = createLayer()

    expect(layer.getAll()).toBeUndefined()
    expect(layer.setAll()).toBeUndefined()
    expect(layer.removeAll()).toBeUndefined()
  })

  it('draws nothing without a context', () => {
    const layer = new CoordinatesLayer(createBoard())
    expect(() => layer.draw()).not.toThrow()
  })

  it('draws nothing when coordinates are turned off', () => {
    const {layer, context} = createLayer({showCoordinates: false})
    layer.draw()

    expect(context.fillText).not.toHaveBeenCalled()
  })

  it('draws both ends of every row and column', () => {

    //Nineteen rows and nineteen columns, each drawn at both edges
    const {layer, context} = createLayer()
    layer.draw()

    expect(context.fillText).toHaveBeenCalledTimes(19 * 4)
  })

  it('numbers the rows from the bottom up', () => {

    //Go numbers rows from the bottom, so the top row of a 19x19 board is 19
    const {layer, context} = createLayer()
    layer.draw()

    const rows = context.fillText.mock.calls
      .filter(([, x]) => x < 100 || x > 300)
      .map(([ch]) => ch)

    expect(rows[0]).toBe(19)
    expect(rows).toContain(1)
  })

  it('letters the columns from the left, skipping I', () => {

    //I is left out by convention, so the ninth column is J
    const {layer, context} = createLayer()
    layer.draw()

    const columns = context.fillText.mock.calls
      .map(([ch]) => ch)
      .filter(ch => typeof ch === 'string')

    expect(columns[0]).toBe('A')
    expect(columns).not.toContain('I')
    expect(columns).toContain('J')
    expect(columns).toContain('T')
  })

  it('centres each label on its line', () => {
    const {layer, context} = createLayer()
    layer.draw()

    expect(context.textAlign).toBe('center')
    expect(context.textBaseline).toBe('middle')
    expect(context.fillStyle).toBe('rgb(68, 44, 20)')
  })

  it('sizes each label from the cell size', () => {
    const {layer, context} = createLayer({cellSize: 20})
    layer.draw()

    expect(context.font).toBe(' 11px Arial')
  })

  it('puts the labels either side of the grid', () => {
    const {layer, context} = createLayer({cellSize: 20})
    layer.draw()

    //The margin is two cells, so the labels sit at the midpoint of the half
    //of it that is outside the grid, nudged out by a fifteenth of a cell
    const xl = Math.ceil((40 - 10) / 2 + 20 / 15)
    const rowCalls = context.fillText.mock.calls.filter(
      ([ch]) => typeof ch === 'number'
    )

    expect(rowCalls[0][1]).toBe(xl)
    expect(rowCalls[1][1]).toBe(400 - xl)
  })
})

describe('CoordinatesLayer character generators', () => {

  const withType = (axis, type) => {
    const theme = new Theme()
    theme.set(`coordinates.${axis}.type`, type)
    return createLayer({theme, width: 9, height: 9})
  }

  const drawn = context => context.fillText.mock.calls.map(([ch]) => ch)

  it('takes a named generator from the theme', () => {
    const {layer, context} = withType('horizontal', 'kanji')
    layer.draw()

    expect(drawn(context)).toContain('一')
  })

  it('cannot take a generator function from the theme', () => {

    //NOTE: pinning current behaviour, and it is a bug. Theme#get calls any
    //function it finds and returns the result, so a generator handed to the
    //theme is invoked once with no arguments and whatever it returns is then
    //treated as the name of a generator. The labels fall back to bare
    //indices. See KNOWN_ISSUES.md.
    const {layer, context} = withType('horizontal', i => `#${i}`)
    layer.draw()

    expect(drawn(context)).not.toContain('#0')
    expect(drawn(context)).toContain(0)
  })

  it('does use a generator function it is handed directly', () => {

    //The branch is there and works; nothing can reach it through the theme
    const {layer} = withType('horizontal', 'letters')
    expect(layer.getCharacter(3, i => `#${i}`)).toBe('#3')
  })

  it('falls back to the bare index for a name it does not know', () => {
    const {layer, context} = withType('horizontal', 'somethingElse')
    layer.draw()

    expect(drawn(context)).toContain(0)
  })

  it('falls back to the bare index for a type that is not a name at all', () => {
    const {layer, context} = withType('horizontal', 42)
    layer.draw()

    expect(drawn(context)).toContain(0)
  })
})

describe('CoordinatesLayer index direction', () => {

  it('counts up from the near edge when not inverted', () => {
    const layer = new CoordinatesLayer(createBoard())
    expect(layer.getIndex(0, 19, false)).toBe(0)
    expect(layer.getIndex(18, 19, false)).toBe(18)
  })

  it('counts down from the far edge when inverted', () => {
    const layer = new CoordinatesLayer(createBoard())
    expect(layer.getIndex(0, 19, true)).toBe(18)
    expect(layer.getIndex(18, 19, true)).toBe(0)
  })

  it('follows the theme when it turns the rows the other way up', () => {
    const theme = new Theme()
    theme.set('coordinates.vertical.inverse', false)
    const {layer, context} = createLayer({theme})

    layer.draw()

    const rows = context.fillText.mock.calls
      .map(([ch]) => ch)
      .filter(ch => typeof ch === 'number')

    expect(rows[0]).toBe(1)
  })
})
