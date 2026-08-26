import {describe, it, expect, vi} from 'vitest'
import GridObject from './grid-object.js'
import GridLayer from '../layers/grid-layer.js'
import Theme from '../theme.js'
import {createStubBoard, createStubContext} from '../../../test/helpers.js'

/**
 * A board stand-in with a fixed cell size, which is all a grid object asks it
 * for beyond the absolute coordinates
 */
const createBoard = (cellSize = 20) => ({
  theme: new Theme(),
  getCellSize: () => cellSize,
  getAbsX: x => x * cellSize,
  getAbsY: y => y * cellSize,
  isOnBoard: () => true,
  drawWidth: 100,
  drawHeight: 100,
})

/**
 * A context that records the translations applied to it
 */
const createContext = () => ({
  translations: [],
  translate(x, y) {
    this.translations.push([x, y])
  },
  clearRect: vi.fn(),
})

describe('GridObject theme access', () => {

  it('reads the theme off the board', () => {
    const board = createBoard()
    expect(new GridObject(board).theme).toBe(board.theme)
  })

  it('has no theme without a board', () => {
    expect(new GridObject().theme).toBeNull()
  })

  it('passes coordinates through to the board', () => {
    const object = new GridObject(createBoard(20))
    expect(object.getAbsX(3)).toBe(60)
    expect(object.getAbsY(4)).toBe(80)
  })

  it('loads a theme property onto itself', () => {
    const object = new GridObject(createBoard())
    object.getThemePaths = () => ['grid.lineColor']
    object.loadThemeProp('lineColor')
    expect(object.lineColor).toBe(object.theme.get('grid.lineColor'))
  })

  it('leaves a property alone when the theme has nothing for it', () => {
    const object = new GridObject(createBoard())
    object.getThemePaths = () => ['nothing.here']
    object.loadThemeProp('nothing')
    expect(object.nothing).toBeUndefined()
  })

  it('falls back through the theme paths in order', () => {
    const object = new GridObject(createBoard())
    object.getThemePaths = () => ['nothing.here', 'grid.lineCap']
    expect(object.getThemeProp('lineCap')).toBe('square')
  })
})

describe('GridObject radius', () => {

  it('scales the theme radius', () => {
    const object = new GridObject(createBoard(20))
    object.getThemePaths = () => ['stone.base.radius']
    object.scale = 0.5
    expect(object.getRadius(20)).toBe(Math.round(Math.floor(20 / 2) * 0.97 * 0.5))
  })

  it('uses the full radius without a scale', () => {
    const object = new GridObject(createBoard(20))
    object.getThemePaths = () => ['stone.base.radius']
    expect(object.getRadius(20)).toBe(Math.round(Math.floor(20 / 2) * 0.97))
  })

  it('erases a whole grid square regardless of its own radius', () => {
    const object = new GridObject(createBoard(20))
    expect(object.getEraseRadius()).toBe(10)
  })
})

describe('GridObject canvas alignment', () => {

  /**
   * What the grid layer translates its own drawing by at a given cell size
   */
  const layerTranslate = cellSize => {
    const board = createBoard(cellSize)
    const layer = new GridLayer(board)
    const lineWidth = board.theme.get('grid.lineWidth', cellSize)
    return layer.theme.canvasTranslate(lineWidth)
  }

  /**
   * What a grid object translates its own drawing by at the same cell size
   */
  const objectTranslate = cellSize => {
    const object = new GridObject(createBoard(cellSize))
    const context = createContext()
    object.prepareContext(context)
    return context.translations[0][0]
  }

  it.each([20, 55, 70])(
    'lines up with the grid at cell size %i',
    cellSize => {

      //NOTE: this used to ask the theme for the translation without a line
      //width, so the handler ran with no cell size and happened to fall
      //through to a width of 1. Everything drawn on the grid was then offset
      //by half a pixel from the grid itself on any board drawn larger than
      //that, which is most of them
      expect(objectTranslate(cellSize)).toBe(layerTranslate(cellSize))
    }
  )

  it('undoes exactly what it applied', () => {
    const object = new GridObject(createBoard(70))
    const context = createContext()

    object.prepareContext(context)
    object.restoreContext(context)

    const [[applied], [undone]] = context.translations
    expect(applied + undone).toBe(0)
  })

  it('applies transparency only when set below one', () => {
    const object = new GridObject(createBoard())
    const context = createContext()

    object.prepareContext(context)
    expect(context.globalAlpha).toBeUndefined()

    object.alpha = 0.5
    object.prepareContext(context)
    expect(context.globalAlpha).toBe(0.5)

    object.restoreContext(context)
    expect(context.globalAlpha).toBe(1)
  })
})

describe('GridObject erasing', () => {

  it('clears a square the size of a grid cell', () => {
    const object = new GridObject(createBoard(20))
    const context = createContext()

    object.erase(context, 3, 4)

    expect(context.clearRect).toHaveBeenCalledWith(50, 70, 20, 20)
  })
})

describe('GridObject base behaviour', () => {

  it('checks the property name itself, with nothing in front of it', () => {

    //Subclasses put a type or style in front; the base class has no such
    //notion, so it asks the theme for exactly what it was given
    const object = new GridObject(createStubBoard())

    expect(object.getThemePaths('scale')).toEqual(['scale'])
  })

  it('loads no properties of its own', () => {

    //The stub is here so that erase(), which calls it, does not have a method
    //that could only ever throw
    const object = new GridObject(createStubBoard())

    expect(object.loadProperties(3, 3)).toBeUndefined()
  })

  it('draws nothing of its own', () => {
    const context = createStubContext()
    new GridObject(createStubBoard()).draw(context, 3, 3)

    expect(context.beginPath).not.toHaveBeenCalled()
  })

  it('erases and then draws on a redraw', () => {
    const context = createStubContext()
    const object = new GridObject(createStubBoard({cellSize: 40}))
    const order = []
    object.erase = () => order.push('erase')
    object.draw = () => order.push('draw')

    object.redraw(context, 3, 3)

    expect(order).toEqual(['erase', 'draw'])
  })
})
