import {vi} from 'vitest'
import Theme from '../src/classes/theme.js'
import {boardLayerTypes} from '../src/constants/board.js'

/**
 * Shared stand-ins for the specs
 *
 * The library core is DOM free, but everything that draws needs a canvas
 * context and a board to ask for coordinates, neither of which exists under
 * plain node. These build the smallest stand-ins that let the drawing code
 * run for real and be asserted on, rather than being skipped.
 *
 * This file lives outside src/ on purpose: the published package is src minus
 * the specs, so a helper in there would ship to consumers.
 */

/**
 * A canvas context stand-in that records every call made on it
 *
 * Every method is a spy, so a spec can assert on the shape that was drawn.
 * The style properties are plain values, so the last one assigned is what the
 * spec reads back. Gradients come back as recorders of their own.
 */
export const createStubContext = () => {

  //The gradients handed out, in the order they were asked for
  const gradients = []

  //Create a gradient recorder
  const createGradient = (...args) => {
    const gradient = {args, stops: [], addColorStop: vi.fn()}
    gradient.addColorStop.mockImplementation((offset, color) => {
      gradient.stops.push([offset, color])
    })
    gradients.push(gradient)
    return gradient
  }

  //Build the context
  return {
    gradients,
    canvas: {clientWidth: 400, clientHeight: 400},

    //Path building
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    rect: vi.fn(),
    bezierCurveTo: vi.fn(),
    quadraticCurveTo: vi.fn(),

    //Painting
    fill: vi.fn(),
    stroke: vi.fn(),
    fillText: vi.fn(),
    strokeText: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    clearRect: vi.fn(),
    drawImage: vi.fn(),

    //State
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    setTransform: vi.fn(),
    resetTransform: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    setLineDash: vi.fn(),
    measureText: vi.fn(() => ({width: 10})),

    //Gradients and patterns
    createRadialGradient: vi.fn(createGradient),
    createLinearGradient: vi.fn(createGradient),
    createPattern: vi.fn(() => ({})),
  }
}

/**
 * A board stand-in for the objects that draw on it
 *
 * Coordinates map onto whole cells so that an expectation can be written as a
 * multiple of the cell size. The stones map is keyed as 'x,y' and holds
 * whatever the spec wants the stones layer to report.
 */
export const createStubBoard = ({
  cellSize = 40,
  width = 19,
  height = 19,
  stones = {},
  markup = {},
  theme = new Theme(),
  swapColors = false,
} = {}) => {

  //The grid layer records what it was asked to take out and put back
  const gridLayer = {
    eraseCell: vi.fn(),
    redrawCell: vi.fn(),
  }

  //Build the board
  return {
    gridLayer,
    stones,
    markup,
    theme,
    width,
    height,
    drawWidth: cellSize * width,
    drawHeight: cellSize * height,
    getCellSize: () => cellSize,
    getDisplayColor: color => (
      swapColors ? (color === 'black' ? 'white' : 'black') : color
    ),
    getAbsX: x => x * cellSize,
    getAbsY: y => y * cellSize,
    isOnBoard: (x, y) => (x >= 0 && y >= 0 && x < width && y < height),
    get: (layer, x, y) => {
      if (layer === boardLayerTypes.STONES) {
        return stones[`${x},${y}`]
      }
      if (layer === boardLayerTypes.MARKUP) {
        return markup[`${x},${y}`]
      }
      return undefined
    },
    has: (layer, x, y) => Boolean(
      layer === boardLayerTypes.STONES
        ? stones[`${x},${y}`]
        : layer === boardLayerTypes.MARKUP ? markup[`${x},${y}`] : undefined
    ),
    getLayer: type => (type === boardLayerTypes.GRID ? gridLayer : undefined),
  }
}

/**
 * A DOM stand-in, enough of one for bootstrapping
 *
 * The library is DOM free at its core and the suite runs under plain node, so
 * bootstrapping — which builds elements, canvases and audio, and attaches
 * listeners — had no way to run at all. This is the smallest set of the DOM it
 * actually touches: elements with a class list and children, canvases that
 * hand out a recording context, audio elements that record what was asked of
 * them, and listener registration that can be fired by hand.
 */

/**
 * One element
 */
export const createStubElement = (tag = 'div') => {

  const classes = new Set()
  const listeners = new Map()

  const element = {
    tagName: tag.toUpperCase(),
    className: '',
    children: [],
    style: {},
    listeners,

    //Class handling, as the class helpers use it
    classList: {
      add: (...names) => names.forEach(name => classes.add(name)),
      remove: (...names) => names.forEach(name => classes.delete(name)),
      contains: name => classes.has(name),
      toggle: (name, value) => {
        const on = (value === undefined) ? !classes.has(name) : value
        classes[on ? 'add' : 'delete'](name)
        return on
      },
      get size() {
        return classes.size
      },
    },

    //Tree
    appendChild: child => {
      element.children.push(child)
      child.parentNode = element
      return child
    },
    removeChild: child => {
      element.children = element.children.filter(c => c !== child)
      return child
    },
    remove: () => element.parentNode?.removeChild(element),
    getElementsByTagName: name => element.children
      .filter(child => child.tagName === name.toUpperCase()),

    //Listeners, recorded so a spec can fire them
    addEventListener: (type, fn) => {
      if (!listeners.has(type)) {
        listeners.set(type, new Set())
      }
      listeners.get(type).add(fn)
    },
    removeEventListener: (type, fn) => listeners.get(type)?.delete(fn),
    dispatch: (type, event = {}) => {
      for (const fn of listeners.get(type) ?? []) {
        fn(event)
      }
    },
    focus: () => {
      element.hasFocus = true
    },
  }

  //A canvas hands out a context of its own, which points back at it the way
  //a real one does
  if (element.tagName === 'CANVAS') {
    element.width = 0
    element.height = 0
    element.clientWidth = 0
    element.clientHeight = 0
    element.context = createStubContext()
    element.context.canvas = element
    element.getContext = () => element.context
  }

  //An audio element records what it was asked to do
  if (element.tagName === 'AUDIO') {
    element.src = ''
    element.volume = 1
    element.currentTime = 0
    element.paused = true
    element.playCount = 0
    element.play = () => {
      element.paused = false
      element.playCount++
      return Promise.resolve()
    }
    element.pause = () => {
      element.paused = true
    }
  }

  return element
}

/**
 * A document, and the globals that come with it
 *
 * Returns the container to bootstrap into. Call inside a test that unstubs its
 * globals afterwards.
 */
export const stubDom = ({devicePixelRatio = 1} = {}) => {

  const created = []

  vi.stubGlobal('document', {
    createElement: tag => {
      const element = createStubElement(tag)
      created.push(element)
      return element
    },
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })

  vi.stubGlobal('window', {devicePixelRatio})
  vi.stubGlobal('HTMLCollection', class {})
  vi.stubGlobal('Image', class {
    constructor() {
      this.width = 1
      this.height = 1
    }
    addEventListener() {} // eslint-disable-line no-empty-function
  })

  //The board observes its container for size changes. A real observer fires
  //once as soon as it starts observing, which is what gives the board its
  //first size, so this one does too.
  const observers = []
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback) {
      this.callback = callback
      this.observed = []
      this.disconnected = false
      observers.push(this)
    }
    observe(element) {
      this.observed.push(element)
      this.callback()
    }
    disconnect() {
      this.disconnected = true
    }
  })

  return {container: createStubElement(), created, observers}
}
