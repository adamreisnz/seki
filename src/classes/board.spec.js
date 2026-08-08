import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest'
import Board from './board.js'
import Game from './game.js'
import GamePosition from './game-position.js'
import {boardLayerTypes} from '../constants/board.js'
import {stoneColors} from '../constants/stone.js'

/**
 * A board with a known draw size, so the geometry is deterministic. Nothing
 * here needs a DOM, since only bootstrapping does.
 */
const createBoard = (config = {}, drawSize = 600) => {
  const board = new Board({size: 19, showCoordinates: false, ...config})
  board.setDrawSize(drawSize, drawSize)
  return board

}
/**
 * Minimal ResizeObserver stub. The real one isn't available outside a
 * browser, and all the board does with it is observe and disconnect.
 */
class ResizeObserverStub {
  static instances = []
  constructor(callback) {
    this.callback = callback
    this.observed = []
    this.disconnected = false
    ResizeObserverStub.instances.push(this)
  }
  observe(element) {
    this.observed.push(element)
  }
  disconnect() {
    this.disconnected = true
  }
}

const createContainer = () => ({tagName: 'DIV'})

describe('Board sizing', () => {

  it('defaults to 19x19', () => {
    const board = new Board()
    expect(board.width).toBe(19)
    expect(board.height).toBe(19)
  })

  it('takes a square size from config', () => {
    const board = new Board({size: 9})
    expect(board.width).toBe(9)
    expect(board.height).toBe(9)
  })

  it('takes separate width and height', () => {
    const board = new Board({width: 19, height: 13})
    expect(board.width).toBe(19)
    expect(board.height).toBe(13)
  })

  it('squares off when given only a width', () => {
    const board = new Board()
    board.setSize(13)
    expect(board.height).toBe(13)
  })

  it('ignores a size it cannot parse', () => {
    const board = new Board({size: 9})
    board.setSize('nonsense')
    expect(board.width).toBe(9)
  })

  it('takes its size from a game', () => {
    const board = new Board()
    board.loadConfigFromGame(new Game({board: {width: 19, height: 13}}))
    expect(board.width).toBe(19)
    expect(board.height).toBe(13)
  })
})

describe('Board geometry', () => {

  it('cannot draw without a draw size', () => {
    expect(new Board({size: 19}).canDraw()).toBe(false)
  })

  it('can draw once it has one', () => {
    expect(createBoard().canDraw()).toBe(true)
  })

  it('works out a cell size that fits the board', () => {
    const board = createBoard({}, 600)
    const cellSize = board.getCellSize()

    expect(cellSize).toBeGreaterThan(0)
    expect(cellSize * 18).toBeLessThanOrEqual(600)
  })

  it('maps grid coordinates to pixels and back', () => {
    const board = createBoard()

    for (const i of [0, 1, 9, 18]) {
      expect(board.getGridX(board.getAbsX(i))).toBe(i)
      expect(board.getGridY(board.getAbsY(i))).toBe(i)
    }
  })

  it('spaces the lines evenly', () => {
    const board = createBoard()
    const step = board.getAbsX(1) - board.getAbsX(0)

    for (let i = 1; i < 19; i++) {
      expect(board.getAbsX(i) - board.getAbsX(i - 1)).toBe(step)
    }
  })

  it('rounds a pixel between two lines to the nearest', () => {
    const board = createBoard()
    const justPast = board.getAbsX(5) + 2
    expect(board.getGridX(justPast)).toBe(5)
  })

  it('gives an unrounded coordinate when asked', () => {
    const board = createBoard()
    const between = (board.getAbsX(5) + board.getAbsX(6)) / 2
    expect(board.getGridX(between, false)).toBeCloseTo(5.5, 1)
  })

  it('never reports negative zero', () => {
    const board = createBoard()
    expect(Object.is(board.getGridX(board.getAbsX(0) - 1), -0)).toBe(false)
    expect(Object.is(board.getGridY(board.getAbsY(0) - 1), -0)).toBe(false)
  })

  it('leaves a bigger margin when showing coordinates', () => {
    const without = createBoard({showCoordinates: false})
    const with_ = createBoard({showCoordinates: true})
    expect(with_.getCellSize()).toBeLessThan(without.getCellSize())
  })
})

describe('Board bounds', () => {

  it('knows what is on the board', () => {
    const board = createBoard()
    expect(board.isOnBoard(0, 0)).toBe(true)
    expect(board.isOnBoard(18, 18)).toBe(true)
    expect(board.isOnBoard(-1, 0)).toBe(false)
    expect(board.isOnBoard(19, 0)).toBe(false)
  })

  it('narrows the playable area when edges are cut off', () => {
    const board = createBoard({cutOffLeft: 2, cutOffTop: 3})

    expect(board.xLeft).toBe(2)
    expect(board.yTop).toBe(3)
    expect(board.gridWidth).toBe(17)
    expect(board.gridHeight).toBe(16)
    expect(board.isOnBoard(1, 5)).toBe(false)
    expect(board.isOnBoard(2, 3)).toBe(true)
  })

  it('shifts the coordinate mapping by the cut off', () => {
    const plain = createBoard()
    const cut = createBoard({cutOffLeft: 2})

    //The first visible line sits at the left margin in both cases
    expect(cut.getAbsX(2) - cut.drawMarginHor)
      .toBe(plain.getAbsX(0) - plain.drawMarginHor)
  })
})

describe('Board layers', () => {

  it('has no layers before they are created', () => {
    expect(new Board().hasLayer(boardLayerTypes.STONES)).toBe(false)
  })

  it('creates the full set of layers', () => {
    const board = createBoard()
    board.createLayers()

    for (const type of board.layerOrder) {
      expect(board.hasLayer(type)).toBe(true)
    }
  })

  it('adds, reads and removes objects on a layer', () => {
    const board = createBoard()
    board.createLayers()

    //A stand in for a Stone or Markup instance, which only needs to satisfy
    //the draw and erase calls the layer makes
    const object = {draw: vi.fn(), erase: vi.fn()}
    board.add(boardLayerTypes.MARKUP, 3, 3, object)

    expect(board.has(boardLayerTypes.MARKUP, 3, 3)).toBe(true)
    expect(board.get(boardLayerTypes.MARKUP, 3, 3)).toBe(object)

    board.remove(boardLayerTypes.MARKUP, 3, 3)
    expect(board.has(boardLayerTypes.MARKUP, 3, 3)).toBe(false)
  })

  it('shrugs off operations on a layer that does not exist', () => {
    const board = createBoard()
    expect(() => board.add(boardLayerTypes.MARKUP, 3, 3, {})).not.toThrow()
    expect(board.get(boardLayerTypes.MARKUP, 3, 3)).toBe(null)
    expect(board.has(boardLayerTypes.MARKUP, 3, 3)).toBe(false)
  })
})

describe('Board colors', () => {

  it('leaves colors alone by default', () => {
    const board = createBoard()
    expect(board.getDisplayColor(stoneColors.BLACK)).toBe(stoneColors.BLACK)
  })

  it('swaps them when configured to', () => {
    const board = createBoard({swapColors: true})
    expect(board.getDisplayColor(stoneColors.BLACK)).toBe(stoneColors.WHITE)
    expect(board.getDisplayColor(stoneColors.WHITE)).toBe(stoneColors.BLACK)
  })
})

describe('Board teardown', () => {

  beforeEach(() => {
    ResizeObserverStub.instances = []
    vi.stubGlobal('ResizeObserver', ResizeObserverStub)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const createObservedBoard = () => {
    const board = new Board({size: 19})
    board.elements.container = createContainer()
    board.setupResizeObserver()
    return board
  }

  it('observes the container rather than the document body', () => {
    const board = new Board({size: 19})
    const container = createContainer()
    board.elements.container = container
    board.setupResizeObserver()

    expect(ResizeObserverStub.instances).toHaveLength(1)
    expect(ResizeObserverStub.instances[0].observed).toEqual([container])
  })

  it('disconnects the observer when destroyed', () => {
    const board = createObservedBoard()
    board.destroy()
    expect(ResizeObserverStub.instances[0].disconnected).toBe(true)
  })

  it('does not stack observers when set up twice', () => {
    const board = createObservedBoard()
    board.setupResizeObserver()

    expect(ResizeObserverStub.instances).toHaveLength(2)
    expect(ResizeObserverStub.instances[0].disconnected).toBe(true)
    expect(ResizeObserverStub.instances[1].disconnected).toBe(false)
  })

  it('clears its layers and element references', () => {
    const board = createObservedBoard()
    board.createLayers()
    board.destroy()

    expect(board.layers.size).toBe(0)
    expect(board.elements).toEqual({})
  })

  it('can be destroyed without ever having been bootstrapped', () => {
    const board = new Board({size: 19})
    expect(() => board.destroy()).not.toThrow()
  })
})

describe('Board position updates', () => {

  const {BLACK, WHITE} = stoneColors

  //Drawing lines reads the device pixel ratio off the window, which isn't
  //there outside a browser
  beforeEach(() => {
    vi.stubGlobal('window', {devicePixelRatio: 1})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const createBoardWithLayers = () => {
    const board = createBoard()
    board.createLayers()
    return board
  }

  const createPosition = (stones = [], markup = []) => {
    const position = new GamePosition(19, 19)
    stones.forEach(([x, y, color]) => position.stones.set(x, y, color))
    markup.forEach(([x, y, value]) => position.markup.set(x, y, value))
    return position
  }

  it('builds the full board on the first update', () => {
    const board = createBoardWithLayers()
    board.updatePosition(createPosition([[3, 3, BLACK], [15, 15, WHITE]]))

    expect(board.has(boardLayerTypes.STONES, 3, 3)).toBe(true)
    expect(board.has(boardLayerTypes.STONES, 15, 15)).toBe(true)
    expect(board.has(boardLayerTypes.SHADOW, 3, 3)).toBe(true)
    expect(board.has(boardLayerTypes.SHADOW, 15, 15)).toBe(true)
  })

  it('only touches the changed cells on the next update', () => {

    //NOTE: this used to rebuild every stone and redraw every layer in full
    //on every position change, so stepping through a game cost a whole
    //board redraw per move
    const board = createBoardWithLayers()
    board.updatePosition(createPosition([[3, 3, BLACK]]))

    const stonesLayer = board.getLayer(boardLayerTypes.STONES)
    const setAll = vi.spyOn(stonesLayer, 'setAll')

    board.updatePosition(createPosition([[3, 3, BLACK], [15, 15, WHITE]]))

    expect(setAll).not.toHaveBeenCalled()
    expect(board.has(boardLayerTypes.STONES, 3, 3)).toBe(true)
    expect(board.has(boardLayerTypes.STONES, 15, 15)).toBe(true)
  })

  it('removes captured stones, along with their shadows', () => {
    const board = createBoardWithLayers()
    board.updatePosition(createPosition([[3, 3, BLACK], [3, 4, WHITE]]))
    board.updatePosition(createPosition([[3, 4, WHITE]]))

    expect(board.has(boardLayerTypes.STONES, 3, 3)).toBe(false)
    expect(board.has(boardLayerTypes.SHADOW, 3, 3)).toBe(false)
    expect(board.has(boardLayerTypes.STONES, 3, 4)).toBe(true)
  })

  it('redraws the shadow layer in full rather than cell by cell', () => {

    //NOTE: erasing a single cell on the shadow layer also clips the shadow
    //blur spilling over from neighbouring stones, so the layer has to be
    //erased and drawn as a whole
    const board = createBoardWithLayers()
    board.updatePosition(createPosition([[3, 3, BLACK]]))

    const shadowLayer = board.getLayer(boardLayerTypes.SHADOW)
    const redraw = vi.spyOn(shadowLayer, 'redraw')

    board.updatePosition(createPosition([[3, 3, BLACK], [15, 15, WHITE]]))

    expect(redraw).toHaveBeenCalled()
  })

  it('does nothing at all when nothing changed', () => {
    const board = createBoardWithLayers()
    board.updatePosition(createPosition([[3, 3, BLACK]]))

    const stonesLayer = board.getLayer(boardLayerTypes.STONES)
    const applyChanges = vi.spyOn(stonesLayer, 'applyChanges')
    const clearHover = vi.spyOn(board, 'clearHoverLayer')

    board.updatePosition(createPosition([[3, 3, BLACK]]))

    expect(applyChanges).not.toHaveBeenCalled()
    expect(clearHover).not.toHaveBeenCalled()
  })

  it('leaves identical markup alone and replaces changed markup', () => {
    const board = createBoardWithLayers()
    board.updatePosition(createPosition(
      [],
      [[3, 3, {type: 'circle'}], [5, 5, {type: 'label', text: 'A'}]]
    ))

    const markupLayer = board.getLayer(boardLayerTypes.MARKUP)
    const remove = vi.spyOn(markupLayer, 'remove')
    const add = vi.spyOn(markupLayer, 'add')

    board.updatePosition(createPosition(
      [],
      [[3, 3, {type: 'circle'}], [5, 5, {type: 'label', text: 'B'}]]
    ))

    expect(remove).toHaveBeenCalledTimes(1)
    expect(remove).toHaveBeenCalledWith(5, 5)
    expect(add).toHaveBeenCalledTimes(1)
  })

  it('redraws markup sitting on a cell whose stone changed', () => {

    //NOTE: markup draws itself differently depending on the stone underneath
    //it, so it has to be drawn again when that stone appears or disappears
    const board = createBoardWithLayers()
    board.updatePosition(createPosition([], [[3, 3, {type: 'circle'}]]))

    const markupLayer = board.getLayer(boardLayerTypes.MARKUP)
    const redrawCell = vi.spyOn(markupLayer, 'redrawCell')

    board.updatePosition(createPosition(
      [[3, 3, BLACK]],
      [[3, 3, {type: 'circle'}]]
    ))

    expect(redrawCell).toHaveBeenCalledWith(3, 3)
  })

  it('redraws the lines only when they changed', () => {
    const board = createBoardWithLayers()
    const withLines = () => {
      const position = createPosition([[3, 3, BLACK]])
      position.lines = [[0, 0, 5, 5, 'red']]
      return position
    }
    board.updatePosition(withLines())

    const drawLayer = board.getLayer(boardLayerTypes.DRAW)
    const setAll = vi.spyOn(drawLayer, 'setAll')

    board.updatePosition(withLines())
    expect(setAll).not.toHaveBeenCalled()

    const changed = withLines()
    changed.lines = [[0, 0, 9, 9, 'blue']]
    board.updatePosition(changed)
    expect(setAll).toHaveBeenCalledTimes(1)
  })

  it('rebuilds in full when the stone style changes', () => {
    const board = createBoardWithLayers()
    board.updatePosition(createPosition([[3, 3, BLACK]]))

    const full = vi.spyOn(board, 'syncFullPosition')
    board.theme.set('board.stoneStyle', 'mono')
    board.updatePosition(createPosition([[3, 3, BLACK]]))

    expect(full).toHaveBeenCalled()
  })

  it('rebuilds in full after the board is cleared', () => {
    const board = createBoardWithLayers()
    board.updatePosition(createPosition([[3, 3, BLACK]]))
    board.removeAll()

    const full = vi.spyOn(board, 'syncFullPosition')
    board.updatePosition(createPosition([[3, 3, BLACK]]))

    expect(full).toHaveBeenCalled()
    expect(board.has(boardLayerTypes.STONES, 3, 3)).toBe(true)
  })

  it('is not fooled by the live position being mutated', () => {

    //NOTE: setup edits mutate the current position in place, so the baseline
    //has to be a copy taken at render time, not a reference
    const board = createBoardWithLayers()
    const position = createPosition([[3, 3, BLACK]])
    board.updatePosition(position)

    position.stones.set(5, 5, WHITE)
    board.updatePosition(position)

    expect(board.has(boardLayerTypes.STONES, 5, 5)).toBe(true)
  })
})
