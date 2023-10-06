import BoardLayerFactory from './board-layer-factory.js'
import StoneFactory from './stone-factory.js'
import MarkupFactory from './markup-factory.js'
import Theme from './theme.js'
import {
  defaultBoardConfig,
  boardLayerTypes,
} from '../constants/board.js'
import {
  throttle,
} from '../helpers/util.js'
import {
  pixelRatio,
  createElement,
  createCanvasContext,
} from '../helpers/dom.js'

/**
 * This class represents the Go board. It is a placeholder for all the various
 * board layers and is used for placing and removing objects on the board.
 * The class has helpers to figure out the correct size of the grid cells and
 * to toggle coordinates on or off. This class is responsible for drawing all
 * layers on the board.
 */
export default class Board {

  /**
   * Board constructor
   */
  constructor(config) {

    //Initialize properties and setup board
    this.init()
    this.setup()

    //Set config
    if (config) {
      this.setConfig(config)
    }
  }

  /**
   * Initialize properties
   */
  init() {

    //Instantiate services
    this.theme = new Theme()
    this.layers = new Map()

    //Instantiate properties
    this.layerOrder = [
      boardLayerTypes.GRID,
      boardLayerTypes.COORDINATES,
      boardLayerTypes.SHADOW,
      boardLayerTypes.STONES,
      boardLayerTypes.SCORE,
      boardLayerTypes.MARKUP,
      boardLayerTypes.HOVER,
    ]

    //Initialize board draw dimensions in pixels
    this.cellSize = 0
    this.drawWidth = 0
    this.drawHeight = 0
    this.drawMarginHor = 0
    this.drawMarginVer = 0
    this.gridDrawWidth = 0
    this.gridDrawHeight = 0

    //Last draw width/height values for change tracking
    this.lastDrawWidth = 0
    this.lastDrawHeight = 0

    //Get margin from theme
    this.margin = 0

    //Flags
    this.swapColors = false
    this.showCoordinates = false

    //Initialize grid size
    this.width = 0
    this.height = 0

    //Initialize cutoff
    this.cutoff = {
      top: false,
      left: false,
      right: false,
      bottom: false,
    }

    //Initialize section
    this.section = {
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    }
  }

  /**
   * Setup board
   */
  setup() {

    //Get margin from theme
    this.margin = this.theme.get('board.margin')

    //Clear layers
    this.layers.clear()

    //Create layers
    for (const type of this.layerOrder) {
      this.createLayer(type)
    }
  }

  /**
   * Reset board
   */
  reset() {
    this.removeAll()
    this.init()
    this.setup()
  }

  /**************************************************************************
   * Virtual getters
   ***/

  /**
   * Whether we have been bootstrapped (e.g. elements linked)
   */
  get isBootstrapped() {
    return (
      this.elements &&
      this.elements.container
    )
  }

  /**
   * Board's x & y coordinates
   */
  get xLeft() {
    const {section} = this
    return 0 + section.left
  }
  get xRight() {
    const {width, section} = this
    return width - 1 - section.right
  }
  get yTop() {
    const {section} = this
    return 0 + section.top
  }
  get yBottom() {
    const {height, section} = this
    return height - 1 - section.bottom
  }

  /**************************************************************************
   * Layer handling
   ***/

  /**
   * Create layer of given type
   */
  createLayer(type) {
    this.layers.set(
      type,
      BoardLayerFactory.create(type, this),
    )
  }

  /**
   * Get layer of given type
   */
  getLayer(type) {
    return this.layers.get(type)
  }

  /*****************************************************************************
   * Configuration
   ***/

  /**
   * Set config instructions in bulk
   */
  setConfig(config) {

    //Extend from default config
    config = Object.assign({}, defaultBoardConfig, config || {})

    //Process config
    this.toggleCoordinates(config.showCoordinates)
    this.toggleSwapColors(config.swapColors)
    this.setCutoff(config.cutoff)
    this.setSection(config.section)
    this.setSize(config.width, config.height)
  }

  /**
   * Set theme config
   */
  setThemeConfig(themeConfig) {
    this.theme.setConfig(themeConfig)
  }

  /**
   * Set margin
   */
  setMargin(margin) {

    //Reset when not defined
    if (typeof margin === 'undefined') {
      margin = this.theme.get('board.margin')
    }

    //Set margin if changed
    if (this.margin !== margin) {
      this.margin = margin
      this.computeAndRedraw()
    }
  }

  /**
   * Set grid cut-off
   */
  setCutoff(cutoff) {

    //Nothing given? Reset cutoff
    if (!cutoff || !Array.isArray(cutoff)) {
      cutoff = []
    }

    //Init
    let changes = false

    //Check if there's a change
    for (const side in this.cutoff) {
      if (cutoff[side] !== this.cutoff[side]) {
        this.cutoff[side] = cutoff[side]
        changes = true
      }
    }

    //Trigger redraw if there were changes
    if (changes) {
      this.computeAndRedraw()
    }
  }

  /**
   * Set section of the board to be displayed
   */
  setSection(section) {

    //Nothing given?
    if (!section || typeof section !== 'object') {
      return
    }

    //Expand on default
    section = Object.assign({
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    }, section)

    //No changes?
    if (
      this.section.top === section.top &&
      this.section.bottom === section.bottom &&
      this.section.left === section.left &&
      this.section.right === section.right
    ) {
      return
    }

    //Set section and call resized handler
    this.section = section
    this.computeAndRedraw()
  }

  /**
   * Set board (grid) size. This will clear the board objects.
   */
  setSize(width, height) {

    //Check what's given
    width = parseInt(width || height || 0)
    height = parseInt(height || width || 0)

    //Invalid?
    if (isNaN(width) || isNaN(height)) {
      return
    }

    //No change
    if (width === this.width && height === this.height) {
      return
    }

    //Remember size
    this.width = width
    this.height = height

    //Set size in each layer
    this.layers.forEach(layer => layer.setGridSize(width, height))

    //Compute and redraw
    this.computeAndRedraw()
  }

  /**
   * Set new draw size
   */
  setDrawSize(drawWidth, drawHeight) {

    //No change
    if (drawWidth === this.drawWidth && drawHeight === this.drawHeight) {
      return
    }

    //Set
    this.drawWidth = drawWidth
    this.drawHeight = drawHeight

    //Redraw
    this.computeAndRedraw()
  }

  /**
   * Toggle the coordinates
   */
  toggleCoordinates(show) {

    //Set or toggle
    if (typeof show !== 'undefined') {
      this.showCoordinates = show
    }
    else {
      this.showCoordinates = !this.showCoordinates
    }

    //Set the proper board margin
    if (this.showCoordinates) {
      this.setMargin(this.theme.get('coordinates.margin'))
    }
    else {
      this.setMargin(this.theme.get('board.margin'))
    }
  }

  /**
   * Swap colors on the board
   */
  toggleSwapColors(swapColors) {

    //Set
    if (typeof swapColors !== 'undefined') {
      this.swapColors = swapColors
    }
    else {
      this.swapColors = !this.swapColors
    }

    //Redraw as needed
    this.redrawAfterColorSwap()
  }

  /*****************************************************************************
   * Object handling
   ***/

  /**
   * Has layer check
   */
  hasLayer(type) {
    return this.layers.has(type)
  }

  /**
   * Add an object to a board layer
   */
  add(type, x, y, value) {
    const layer = this.getLayer(type)
    if (layer) {
      layer.add(x, y, value)
    }
  }

  /**
   * Remove an object from a board layer
   */
  remove(type, x, y) {
    const layer = this.getLayer(type)
    if (layer) {
      layer.remove(x, y)
    }
  }

  /**
   * Get something from a board layer
   */
  get(type, x, y) {
    const layer = this.getLayer(type)
    if (layer) {
      return layer.get(x, y)
    }
    return null
  }

  /**
   * Check if we have something at given coordinates for a given layer
   */
  has(type, x, y) {
    const layer = this.getLayer(type)
    if (layer) {
      return layer.has(x, y)
    }
    return false
  }

  /**
   * Set all objects (grid) for a given layer
   */
  setAll(type, grid) {
    const layer = this.getLayer(type)
    if (layer) {
      layer.setAll(grid)
    }
  }

  /**
   * Remove all objects from the board, optionally for a given layer
   */
  removeAll(type) {

    //Specific layer type
    if (type) {
      const layer = this.getLayer(type)
      if (layer) {
        layer.removeAll()
      }
      return
    }

    //All layers
    this.layers.forEach(layer => layer.removeAll())
  }

  /*****************************************************************************
   * Position handling
   ***/

  /**
   * Update the board with a new position
   */
  updatePosition(position, pathChanged) {

    //If we have no grid size yet, use what's in the position
    if (!this.width || !this.height) {
      this.setSize(position.width, position.height)
    }

    //Remove markup if path changed
    if (pathChanged) {
      this.removeAll(boardLayerTypes.MARKUP)
    }

    //Get theme
    const {theme} = this
    const style = theme.get('stone.style')

    //Transform stones grid into actual stone instances of given style
    const stones = position.stones
      .map(color => StoneFactory
        .create(style, color, this))

    //Do the same for markup
    const markup = position.markup
      .map(({type, text}) => MarkupFactory
        .create(type, this, {text}))

    //Set new stones and markup grids
    this.setAll(boardLayerTypes.STONES, stones)
    this.setAll(boardLayerTypes.MARKUP, markup)
  }

  /*****************************************************************************
   * State handling
   ***/

  /**
   * Get the board state (list of objects per layer)
   */
  getState() {

    //Initialize
    const state = {}

    //Get state of each layer
    this.layers.forEach((layer, type) => {
      const grid = layer.getAll()
      if (grid && !grid.isEmpty()) {
        state[type] = grid
      }
    })

    //Return state
    return state
  }

  /**
   * Get state of a specific layer
   */
  getLayerState(type) {
    const layer = this.layers.get(type)
    if (layer) {
      return layer.getAll()
    }
  }

  /**
   * Restore the board state from given state object
   */
  restoreState(state) {
    this.layers.forEach((layer, type) => {
      layer.removeAll()
      if (state[type]) {
        layer.setAll(state[type])
      }
    })
  }

  /**
   * Restore state of single layer
   */
  restoreLayerState(type, state) {
    const layer = this.layers.get(type)
    if (layer) {
      layer.setAll(state)
    }
  }

  /*****************************************************************************
   * Drawing control
   ***/

  /**
   * Erase the whole board
   */
  erase() {
    this.layers
      .forEach(layer => layer.erase())
  }

  /**
   * Erase a specific layer
   */
  eraseLayer(type) {
    const layer = this.layers.get(type)
    if (layer) {
      layer.erase()
    }
  }

  /**
   * Redraw the whole board
   */
  redraw() {

    //Check if can draw
    if (!this.canDraw()) {
      return
    }

    //Erase the board first
    this.erase()

    //Now draw all layers again in the correct order
    this.layers
      .forEach(layer => layer.draw())
  }

  /**
   * Redraw layer
   */
  redrawLayer(type) {
    const layer = this.layers.get(type)
    if (layer) {
      layer.redraw()
    }
  }

  /**
   * Redraw after a color swap
   */
  redrawAfterColorSwap() {
    this.redrawLayer(boardLayerTypes.STONES)
    this.redrawLayer(boardLayerTypes.MARKUP)
    this.redrawLayer(boardLayerTypes.SCORE)
  }

  /**
   * Can draw check
   */
  canDraw() {
    const {width, height, drawWidth, drawHeight} = this
    return (width && height && drawWidth && drawHeight)
  }

  /*****************************************************************************
   * Drawing helpers
   ***/

  /**
   * Compute draw parameters and redraw board
   * Called after a board size change, draw size change, section change or margin change
   */
  computeAndRedraw() {

    //If we can't redraw, then this doesn't make sense either
    if (!this.canDraw()) {
      return
    }

    //Get data
    const {
      width, height,
      drawWidth, drawHeight,
      margin, cutoff,
    } = this

    //Add half a cell of draw size if we're cutting of parts of the grid
    const cutoffHor = [cutoff.left, cutoff.right]
      .map(side => side ? 0.5 : 0)
      .reduce((value, total) => value + total, 0)
    const cutoffVer = [cutoff.top, cutoff.bottom]
      .map(side => side ? 0.5 : 0)
      .reduce((value, total) => value + total, 0)

    //Determine number of cells horizontally and vertically
    //The margin is a factor of the cell size, so let's add it to the number of cells
    const numCellsHor = width + margin + cutoffHor
    const numCellsVer = height + margin + cutoffVer

    //Determine cell size now
    const cellSize = Math.floor(Math.min(
      drawWidth / numCellsHor,
      drawHeight / numCellsVer,
    ))

    //Determine actual grid draw size (taking off the margin again)
    const gridDrawWidth = cellSize * (numCellsHor - margin - 1)
    const gridDrawHeight = cellSize * (numCellsVer - margin - 1)

    //Determine draw margins
    const drawMarginHor = Math.floor((drawWidth - gridDrawWidth) / 2)
    const drawMarginVer = Math.floor((drawHeight - gridDrawHeight) / 2)

    //Set values
    this.cellSize = cellSize
    this.gridDrawWidth = gridDrawWidth
    this.gridDrawHeight = gridDrawHeight
    this.drawMarginHor = drawMarginHor
    this.drawMarginVer = drawMarginVer

    //Redraw
    this.redraw()
  }

  /**
   * Get the current cell size
   */
  getCellSize() {
    return this.cellSize
  }

  /**
   * Convert grid coordinate to pixel coordinate
   */
  getAbsX(x) {
    let offset = this.cutoff.left ? 0.5 : 0
    return this.drawMarginHor + Math.round((x + offset) * this.cellSize)
  }

  /**
   * Convert grid coordinate to pixel coordinate
   */
  getAbsY(y) {
    let offset = this.cutoff.top ? 0.5 : 0
    return this.drawMarginVer + Math.round((y + offset) * this.cellSize)
  }

  /**
   * Convert pixel coordinate to grid coordinate
   */
  getGridX(absX) {
    let offset = this.cutoff.left ? 0.5 : 0
    return Math.round((absX - this.drawMarginHor) / this.cellSize - offset)
  }

  /**
   * Convert pixel coordinate to grid coordinate
   */
  getGridY(absY) {
    let offset = this.cutoff.top ? 0.5 : 0
    return Math.round((absY - this.drawMarginVer) / this.cellSize - offset)
  }

  /**
   * Check if given grid coordinates are on board
   */
  isOnBoard(x, y) {
    const {xLeft, xRight, yTop, yBottom} = this
    return (
      x >= xLeft && y >= yTop &&
      x <= xRight && y <= yBottom
    )
  }

  /**************************************************************************
   * Bootstrapping
   ***/

  /**
   * Bootstrap board onto element
   */
  bootstrap(container) {
    this.setupElements(container)
    this.createLayerContexts()
    this.setupResizeObserver()
  }

  /**
   * Setup board elements
   */
  setupElements(container) {

    //Reset elements container
    this.elements = {}

    //Add container class
    container.classList.add('seki-board-container')

    //Create board element
    const board = createElement(
      container, `seki-board`,
    )

    //Create canvas container element within board
    const canvasContainer = createElement(
      board, `seki-board-canvas-container`,
    )

    //Set element references
    this.elements = {
      container,
      board,
      canvasContainer,
    }
  }

  /**
   * Create layer contexts
   */
  createLayerContexts() {

    //Get data
    const {elements, layers} = this
    const {canvasContainer} = elements

    //Create for each layer
    layers.forEach(layer => {
      const context = createCanvasContext(
        canvasContainer, `seki-board-layer-${layer.type}`,
      )
      layer.setContext(context)
    })

    //Store canvases as elements array
    elements.canvasses = Array.from(
      canvasContainer.getElementsByTagName('canvas'),
    )
  }

  /**
   * Setup window listeners
   */
  setupResizeObserver() {

    //Create throttled resize handler
    const fn = throttle(() => {
      this.recalculateDrawSize()
    }, 100)

    //Create observer
    const resizeObserver = new ResizeObserver(fn)
    const {container} = this.elements

    //Observe the canvas container
    resizeObserver.observe(container)
  }

  /**
   * Recalculate draw size
   */
  recalculateDrawSize() {

    //Get data
    const {lastDrawWidth, lastDrawHeight} = this
    const {drawWidth, drawHeight} = this.getDrawSize()
    const hasChanged = (
      lastDrawWidth !== drawWidth ||
      lastDrawHeight !== drawHeight
    )

    //Propagate if it has changed
    if (hasChanged) {
      this.propagateDrawSize(drawWidth, drawHeight)
    }
  }

  /**
   * Get available width and height within parent container
   */
  getAvailableSize() {

    //Get data
    const {container} = this.elements

    //Return size of canvas container
    return {
      availableWidth: container.clientWidth,
      availableHeight: container.clientHeight,
    }
  }

  /**
   * Determine draw width and height
   */
  getDrawSize() {

    //Get data
    const {width, height} = this
    const {availableWidth, availableHeight} = this.getAvailableSize()

    //Grid size known?
    if (width && height) {

      //Determine smallest cell size
      const cellSize = Math.min(
        availableWidth / width,
        availableHeight / height,
      )

      //Set draw size
      const drawWidth = Math.floor(cellSize * width)
      const drawHeight = Math.floor(cellSize * height)

      //Return
      return {drawWidth, drawHeight}
    }

    //Use the lesser of available width/height
    const drawWidth = Math.min(availableWidth, availableHeight)
    const drawHeight = drawWidth

    //Return
    return {drawWidth, drawHeight}
  }

  /**
   * Propagate draw size
   */
  propagateDrawSize(width, height) {

    //Store last draw width/height (unmodified by pixel ratio)
    this.lastDrawWidth = width
    this.lastDrawHeight = height

    //Not bootstrapped yet
    if (!this.isBootstrapped) {
      return
    }

    //Get elements
    const {board, canvasses} = this.elements

    //Set the new dimension on the main board element
    board.style.width = `${width}px`
    board.style.height = `${height}px`

    //Set the new dimensions on the canvas elements
    canvasses
      .forEach(canvas => {
        canvas.width = width * pixelRatio
        canvas.height = height * pixelRatio
      })

    //Now set the draw size on the board itself
    //This will trigger a compute and redraw
    this.setDrawSize(
      width * pixelRatio,
      height * pixelRatio,
    )
  }
}
