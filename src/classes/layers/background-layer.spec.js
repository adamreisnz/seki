import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest'
import BackgroundLayer from './background-layer.js'
import Theme from '../theme.js'

/**
 * A board and context stand-in with a canvas of the given size
 */
const createLayer = (theme, width = 100, height = 200) => {
  const board = {theme, drawWidth: width, drawHeight: height}
  const gradient = {addColorStop: vi.fn()}
  const pattern = {}
  const context = {
    gradient,
    pattern,
    canvas: {width, height},
    fillRect: vi.fn(),
    createLinearGradient: vi.fn(() => gradient),
    createPattern: vi.fn(() => pattern),
  }
  const layer = new BackgroundLayer(board)
  layer.setContext(context)
  return {layer, context}
}

describe('BackgroundLayer', () => {

  it('draws no gradient by default', () => {
    const {layer, context} = createLayer(new Theme())
    layer.draw()

    expect(context.createLinearGradient).not.toHaveBeenCalled()
    expect(context.fillRect).toHaveBeenCalledTimes(1)
  })

  it('draws the gradient the theme asks for', () => {
    const theme = new Theme({
      board: {
        backgroundGradient: {
          angle: 150,
          stops: [[0, '#e9bd7c'], [0.55, '#dcab63'], [1, '#d4a058']],
        },
      },
    })
    const {layer, context} = createLayer(theme)
    layer.draw()

    //CSS semantics for 150 degrees on a 100x200 canvas: the direction vector
    //is (sin 150, -cos 150) = (0.5, 0.866), the line is |w*x| + |h*y| long
    //and runs through the center
    const length = (100 * 0.5) + (200 * Math.cos(Math.PI / 6))
    const [x1, y1, x2, y2] = context.createLinearGradient.mock.calls[0]
    expect(x1).toBeCloseTo(50 - (0.5 * length / 2), 6)
    expect(y1).toBeCloseTo(100 - (Math.cos(Math.PI / 6) * length / 2), 6)
    expect(x2).toBeCloseTo(50 + (0.5 * length / 2), 6)
    expect(y2).toBeCloseTo(100 + (Math.cos(Math.PI / 6) * length / 2), 6)

    expect(context.gradient.addColorStop).toHaveBeenCalledTimes(3)
    expect(context.gradient.addColorStop)
      .toHaveBeenCalledWith(0.55, '#dcab63')

    //Both the base colour and the gradient are filled in
    expect(context.fillRect).toHaveBeenCalledTimes(2)
  })

  it('points an angle of zero up', () => {
    const theme = new Theme({
      board: {
        backgroundGradient: {
          angle: 0,
          stops: [[0, '#000'], [1, '#fff']],
        },
      },
    })
    const {layer, context} = createLayer(theme)
    layer.draw()

    //Bottom center to top center
    const [x1, y1, x2, y2] = context.createLinearGradient.mock.calls[0]
    expect(x1).toBeCloseTo(50, 6)
    expect(y1).toBeCloseTo(200, 6)
    expect(x2).toBeCloseTo(50, 6)
    expect(y2).toBeCloseTo(0, 6)
  })
})

describe('BackgroundLayer holds nothing of its own', () => {

  it('has inert grid methods, as it draws from the theme alone', () => {
    const {layer} = createLayer(new Theme())

    expect(layer.getAll()).toBeUndefined()
    expect(layer.setAll()).toBeUndefined()
    expect(layer.removeAll()).toBeUndefined()
  })
})

describe('BackgroundLayer image', () => {

  //The image is loaded and scaled through the DOM, which is not there under
  //plain node, so both are stood in for
  let loaded

  beforeEach(() => {
    loaded = []
    vi.stubGlobal('Image', class {
      constructor() {
        this.width = 20
        this.height = 10
      }
      addEventListener(type, handler) {
        loaded.push(handler)
      }
    })
    vi.stubGlobal('document', {
      createElement: () => ({
        getContext: () => ({drawImage: vi.fn()}),
      }),
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const withImage = (extra = {}) => new Theme({
    board: {
      backgroundImage: 'wood.png',
      backgroundImageScale: 2,
      ...extra,
    },
  })

  it('waits for the image before it paints anything with it', () => {
    const {layer, context} = createLayer(withImage())
    layer.draw()

    expect(loaded).toHaveLength(1)
    expect(context.createPattern).not.toHaveBeenCalled()
  })

  it('tiles the image across the board once it has loaded', () => {
    const {layer, context} = createLayer(withImage())
    layer.draw()
    loaded[0]()

    expect(context.createPattern).toHaveBeenCalledWith(
      expect.anything(), 'repeat'
    )
    expect(context.fillStyle).toBe(context.pattern)
    expect(context.fillRect).toHaveBeenLastCalledWith(0, 0, 100, 200)
  })

  it('draws no image when the theme names none', () => {
    const {layer, context} = createLayer(new Theme())
    layer.draw()

    expect(loaded).toHaveLength(0)
    expect(context.createPattern).not.toHaveBeenCalled()
  })

  it('skips the flat fill when the theme asks for no colour', () => {
    const theme = new Theme({board: {backgroundColor: null}})
    const {layer, context} = createLayer(theme)
    layer.draw()

    expect(context.fillRect).not.toHaveBeenCalled()
  })

  it('draws nothing at all before the board has a size', () => {
    const board = {theme: new Theme(), drawWidth: 0, drawHeight: 0}
    const layer = new BackgroundLayer(board)
    layer.setContext({fillRect: vi.fn(), canvas: {width: 0, height: 0}})

    layer.draw()

    expect(layer.context.fillRect).not.toHaveBeenCalled()
  })
})
