import Base from './base.js'
import BoardLayerFactory from './board-layer-factory.js'
import StoneFactory from './stone-factory.js'
import MarkupFactory from './markup-factory.js'
import Theme from './theme.js'
import {defaultBoardConfig} from '../constants/defaults.js'
import {boardLayerTypes} from '../constants/board.js'
import {swapColor} from '../helpers/color.js'
import {
  addClass,
  removeClass,
  throttle,
  getPixelRatio,
  createElement,
  createCanvasContext,
  mergeCanvases
} from '../helpers/util.js'

/**
 * Compare two markup entries by content, as the position grids create fresh
 * objects for every position and reference equality would report every piece
 * of markup as changed on every update
 */
const isSameMarkup = (a, b) => (
  a === b || (
    Boolean(a) && Boolean(b) &&
    a.type === b.type && a.text === b.text
  )
)

/**
 * Compare two sets of free form drawing lines by content
 */
const areSameLines = (a, b) => (
  a.length === b.length &&
  a.every((line, i) => (
    line.length === b[i].length &&
    line.every((value, j) => value === b[i][j])
  ))
)

/**
 * This class represents the Go board. It is a placeholder for all the various
 * board layers and is used for placing and removing objects on the board.
 * The class has helpers to figure out the correct size of the grid cells and
 * to toggle coordinates on or off. This class is responsible for drawing all
 * layers on the board.
 */
export default class Board extends Base {

  //Layer order
  layerOrder = [
    boardLayerTypes.BACKGROUND,
    boardLayerTypes.GRID,
    boardLayerTypes.COORDINATES,
    boardLayerTypes.SHADOW,
    boardLayerTypes.STONES,
    boardLayerTypes.SCORE,
    boardLayerTypes.ANALYSIS,
    boardLayerTypes.MARKUP,
    boardLayerTypes.DRAW,
    boardLayerTypes.HOVER,
  ]

  //Board draw dimensions in pixels
  cellSize = 0
  drawWidth = 0
  drawHeight = 0
  drawMarginHor = 0
  drawMarginVer = 0
  gridDrawWidth = 0
  gridDrawHeight = 0

  //Last draw width/height values for change tracking
  lastDrawWidth = 0
  lastDrawHeight = 0

  //The position as it was last rendered, kept as a baseline so that a
  //position update only has to touch the cells that changed
  renderedPosition = null
  renderedLines = []
  renderedStyle = null

  /**
   * Board constructor
   */
  constructor(boardConfig, themeConfig) {

    //Parent constructor
    super()

    //Theme config passed via board config
    if (!themeConfig && boardConfig?.theme) {
      themeConfig = boardConfig.theme
    }

    //Instantiate theme and layers map
    this.theme = new Theme(themeConfig)
    this.layers = new Map()
    this.elements = {}

    //Debug
    this.debug('initialising board')

    //Initialize board
    this.init()
    this.initConfig(boardConfig)

    //Create config event listeners
    this.setupConfigListeners()
  }

  /**
   * Initialize board
   */
  init() {

    //Initialize board size
    this.width = 19
    this.height = 19
  }

  /**
   * Reset board
   */
  reset() {

    //Preserve config
    const {config} = this

    //Reinitialise board (no need to recreate layers)
    this.removeAll()
    this.init()
    this.initConfig(config)
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
   * Cut-off config
   */
  get cutOffLeft() {
    return this.getConfig('cutOffLeft', false)
  }
  get cutOffRight() {
    return this.getConfig('cutOffRight', false)
  }
  get cutOffTop() {
    return this.getConfig('cutOffTop', false)
  }
  get cutOffBottom() {
    return this.getConfig('cutOffBottom', false)
  }

  /**
   * Actual grid width and height, factoring in cut-off
   */
  get gridWidth() {
    const {width, cutOffLeft, cutOffRight} = this
    return width - cutOffLeft - cutOffRight
  }
  get gridHeight() {
    const {height, cutOffTop, cutOffBottom} = this
    return height - cutOffTop - cutOffBottom
  }

  /**
   * Board's x & y coordinates
   */
  get xLeft() {
    return 0 + this.cutOffLeft
  }
  get xRight() {
    return this.width - 1 - this.cutOffRight
  }
  get yTop() {
    return 0 + this.cutOffTop
  }
  get yBottom() {
    return this.height - 1 - this.cutOffBottom
  }

  /**
   * Get margin from theme
   */
  get margin() {

    //Get data
    const {theme} = this
    const showCoordinates = this.getConfig('showCoordinates')

    //Check if showing coordinates
    if (showCoordinates) {
      return theme.get('coordinates.margin', 0)
    }
    return theme.get('board.margin', 0)
  }

  /**************************************************************************
   * Layer handling
   ***/

  /**
   * Create layers
   */
  createLayers() {
    for (const type of this.layerOrder) {
      this.createLayer(type)
    }
  }

  /**
   * Create layer of given type
   */
  createLayer(type) {

    //Create layer
    const {layers, width, height} = this
    const layer = BoardLayerFactory.create(type, this)

    //Set grid size and store layer in map
    layer.setGridSize(width, height)
    layers.set(type, layer)
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
   * Initialise config
   */
  initConfig(config) {

    //Extend from default config
    super.initConfig(config, defaultBoardConfig)

    //Load size from config
    this.loadSizeFromConfig()
  }

  /**
   * Load config from game info
   */
  loadConfigFromGame(game) {

    //Get board config
    const config = game.getBoardConfig()

    //Load it and redraw
    this.loadConfig(config)
    this.loadSizeFromConfig()
  }

  /**
   * Load size from config
   */
  loadSizeFromConfig() {

    //Get sizing
    const {size, width, height} = this.config

    //Set size
    if (width && height) {
      this.setSize(width, height)
    }
    else if (size) {
      this.setSize(size)
    }
  }

  /**
   * Set board (grid) size. This will clear the board objects.
   */
  setSize(width, height) {

    //Check what's given
    width = parseInt(width || 0)
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

    //The rendered baseline described a board of the old size
    this.renderedPosition = null

    //Set size in each layer
    this.layers.forEach(layer => layer.setGridSize(width, height))

    //Compute and redraw
    this.computeAndRedraw('setSize')
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
    this.computeAndRedraw('setDrawSize')
  }

  /**
   * Get display color for a stone
   */
  getDisplayColor(color) {
    if (this.getConfig('swapColors')) {
      return swapColor(color)
    }
    return color
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
  setAll(type, ...args) {
    const layer = this.getLayer(type)
    if (layer) {
      layer.setAll(...args)
    }
  }

  /**
   * Remove all objects from the board, optionally for a given layer
   */
  removeAll(type) {

    //The rendered baseline only describes the position layers, so only their
    //clearing throws it away. NOTE: the hover layer in particular is cleared
    //on every path change, which must leave the baseline standing.
    const positionLayers = [
      boardLayerTypes.STONES,
      boardLayerTypes.SHADOW,
      boardLayerTypes.MARKUP,
      boardLayerTypes.DRAW,
    ]
    if (!type || positionLayers.includes(type)) {
      this.renderedPosition = null
    }

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
   *
   * NOTE: when the previously rendered position is a valid baseline, only the
   * cells that changed are touched. Rebuilding and redrawing every stone on
   * every position change made stepping through a game cost a full board
   * redraw per move, when a move changes one to a handful of cells.
   */
  updatePosition(position) {

    //If we have no grid size yet, use what's in the position
    if (!this.width || !this.height) {
      this.setSize(position.width, position.height)
    }

    //Get the stone style
    const {theme, renderedPosition, renderedStyle} = this
    const style = theme.get('board.stoneStyle')

    //The previous render is only a baseline to sync against while the board
    //size and stone style still match it
    const canSync = Boolean(
      renderedPosition &&
      renderedPosition.width === position.width &&
      renderedPosition.height === position.height &&
      renderedStyle === style
    )

    //Sync the changes, or rebuild the lot
    if (canSync) {
      this.syncChangedCells(position, style)
    }
    else {
      this.syncFullPosition(position, style)
    }

    //Remember what was rendered, as a copy, because the live position is
    //mutated in place by setup edits
    this.renderedPosition = position.clone(true)
    this.renderedLines = position.lines.slice()
    this.renderedStyle = style
  }

  /**
   * Build and draw the full position
   */
  syncFullPosition(position, style) {

    //Transform stones grid into actual stone instances of given style
    const stones = position.stones
      .map(color => StoneFactory
        .create(style, color, this))

    //Do the same for markup
    const markup = position.markup
      .map(({type, text}) => MarkupFactory
        .create(type, this, {text}))

    //Get lines
    const {lines} = position

    //Clear the hover layer before the grids underneath it are replaced.
    //Anything it displaced belongs to the position being replaced, and would
    //otherwise be restored on top of the new one.
    this.clearHoverLayer()

    //Redraw grid
    this.redrawLayer(boardLayerTypes.GRID)

    //Set new stones and markup grids
    this.setAll(boardLayerTypes.STONES, stones)
    this.setAll(boardLayerTypes.MARKUP, markup)
    this.setAll(boardLayerTypes.DRAW, lines)
  }

  /**
   * Sync only the cells that changed since the last rendered position
   */
  syncChangedCells(position, style) {

    //Compare against the rendered baseline
    const {renderedPosition, renderedLines} = this
    const stoneChanges = renderedPosition.stones
      .compare(position.stones)
    const markupChanges = renderedPosition.markup
      .compare(position.markup, isSameMarkup)
    const linesChanged = !areSameLines(renderedLines, position.lines)

    //Nothing changed at all
    if (!stoneChanges.has() && !markupChanges.has() && !linesChanged) {
      return
    }

    //Clear the hover layer, as it may be covering cells about to change
    this.clearHoverLayer()

    //Apply the stone changes; the stones layer keeps the shadow layer in step
    const stonesLayer = this.getLayer(boardLayerTypes.STONES)
    if (stonesLayer) {
      stonesLayer.applyChanges(stoneChanges, color => StoneFactory
        .create(style, color, this))
    }

    //Apply the markup changes cell by cell. Erasing markup restores the grid
    //underneath it, so the grid layer needs no redraw of its own.
    const markupLayer = this.getLayer(boardLayerTypes.MARKUP)
    if (markupLayer) {
      for (const {x, y} of markupChanges.remove) {
        markupLayer.remove(x, y)
      }
      for (const {x, y, value} of markupChanges.add) {
        const {type, text} = value
        markupLayer.add(x, y, MarkupFactory.create(type, this, {text}))
      }

      //Markup draws itself differently depending on the stone underneath it,
      //so unchanged markup sitting on a changed cell has to be drawn again
      const markupTouched = new Set(
        markupChanges.remove.concat(markupChanges.add)
          .map(({x, y}) => `${x},${y}`)
      )
      for (const {x, y} of stoneChanges.remove.concat(stoneChanges.add)) {
        if (markupLayer.has(x, y) && !markupTouched.has(`${x},${y}`)) {
          markupLayer.redrawCell(x, y)
        }
      }
    }

    //Replace the lines when they changed
    if (linesChanged) {
      this.setAll(boardLayerTypes.DRAW, position.lines)
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

    //Debug
    this.debug('🎨 redrawing')

    //Redraw all layers
    this.layers.forEach(layer => layer.redraw())
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
   * Redraw cell on given layer
   */
  redrawCell(type, x, y) {
    const layer = this.layers.get(type)
    if (layer) {
      layer.redrawCell(x, y)
    }
  }

  /**
   * Can draw check
   */
  canDraw() {
    const {width, height, drawWidth, drawHeight} = this
    return Boolean(width && height && drawWidth && drawHeight)
  }

  /**************************************************************************
   * Helper to perform common actions on specific layers
   ***/

  /**
   * Set a specific hover cell
   */
  setHoverCell(x, y, object) {
    this.add(boardLayerTypes.HOVER, x, y, object)
  }

  /**
   * Add objects to the hover layer
   */
  setHoverArea(area, object) {
    for (const {x, y} of area) {
      this.setHoverCell(x, y, object)
    }
  }

  /**
   * Clear a specific hover cell
   */
  clearHoverCell(x, y) {
    this.remove(boardLayerTypes.HOVER, x, y)
    this.redrawGridCell(x, y)
  }

  /**
   * Clear a hover area
   */
  clearHoverArea(area) {
    for (const {x, y} of area) {
      this.clearHoverCell(x, y)
    }
  }

  /**
   * Clear entire hover layer
   */
  clearHoverLayer() {
    this.removeAll(boardLayerTypes.HOVER)
  }

  /**
   * Remove markup from a specific cell
   */
  removeMarkup(x, y) {
    this.remove(boardLayerTypes.MARKUP, x, y)
    this.redrawGridCell(x, y)
  }

  /**
   * Remove markup from area
   */
  removeMarkupFromArea(area) {
    for (const {x, y} of area) {
      this.removeMarkup(x, y)
    }
  }

  /**
   * Remove all markup
   */
  removeAllMarkup() {
    this.removeAll(boardLayerTypes.MARKUP)
  }

  /**
   * Remove stone from a specific cell
   */
  removeStone(x, y) {
    this.remove(boardLayerTypes.STONES, x, y)
  }

  /**
   * Remove stones from area
   */
  removeStonesFromArea(area) {
    for (const {x, y} of area) {
      this.removeStone(x, y)
    }
  }

  /**
   * Redraw a grid cell if needed
   */
  redrawGridCell(x, y) {

    //Stone here, not needed
    if (this.has(boardLayerTypes.STONES, x, y)) {
      return
    }

    //Markup here, keep as is
    if (this.has(boardLayerTypes.MARKUP, x, y)) {
      return
    }

    //Redraw cell
    this
      .getLayer(boardLayerTypes.GRID)
      ?.redrawCell(x, y)
  }

  /**
   * Draw line on board, keeping it across redraws
   */
  drawLine(fromX, fromY, toX, toY, color) {
    this
      .getLayer(boardLayerTypes.DRAW)
      .addLine(fromX, fromY, toX, toY, color)
  }

  /**
   * Remove all lines
   */
  removeAllLines() {
    this.removeAll(boardLayerTypes.DRAW)
  }

  /*****************************************************************************
   * Drawing helpers
   ***/

  /**
   * Compute draw parameters and redraw board
   * Called after a board size change, draw size change, section change or margin change
   */
  computeAndRedraw(calledFrom) {

    //If we can't redraw, then this doesn't make sense either
    if (!this.canDraw()) {
      return
    }

    //Debug
    this.debug(`compute & redraw, called from: ${calledFrom}`)

    //Get data
    const {
      gridWidth, gridHeight,
      drawWidth, drawHeight,
      margin,
    } = this

    //Determine number of cells horizontally and vertically
    //The margin is a factor of the cell size, so let's add it to the number of cells
    const numCellsHor = gridWidth + margin
    const numCellsVer = gridHeight + margin

    //Determine cell size now
    const cellSize = Math.floor(Math.min(
      drawWidth / numCellsHor,
      drawHeight / numCellsVer
    ))

    //Determine actual grid draw size (taking off the margin again)
    const gridDrawWidth = cellSize * (numCellsHor - margin - 1)
    const gridDrawHeight = cellSize * (numCellsVer - margin - 1)

    //Determine draw margins
    const drawMarginHor = Math.floor((drawWidth - gridDrawWidth) / 2)
    const drawMarginVer = Math.floor((drawHeight - gridDrawHeight) / 2)

    //Debug
    // this.debug({
    //   margin,
    //   cellSize,
    //   cellSizeHor: drawWidth / numCellsHor,
    //   cellSizeVer: drawHeight / numCellsVer,
    //   gridWidth,
    //   gridHeight,
    //   numCellsHor,
    //   numCellsVer,
    //   gridDrawWidth,
    //   gridDrawHeight,
    //   drawWidth,
    //   drawHeight,
    //   drawMarginHor,
    //   drawMarginVer,
    // })

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
    const {cutOffLeft, drawMarginHor, cellSize} = this
    const offset = -cutOffLeft
    return drawMarginHor + Math.round((x + offset) * cellSize)
  }

  /**
   * Convert grid coordinate to pixel coordinate
   */
  getAbsY(y) {
    const {cutOffTop, drawMarginVer, cellSize} = this
    const offset = -cutOffTop
    return drawMarginVer + Math.round((y + offset) * cellSize)
  }

  /**
   * Convert pixel coordinate to grid coordinate
   */
  getGridX(absX, rounded = true) {
    const {cutOffLeft, drawMarginHor, cellSize} = this
    const offset = -cutOffLeft
    const val = (absX - drawMarginHor) / cellSize - offset
    const x = rounded ? Math.round(val) : val
    return Object.is(x, -0) ? 0 : x
  }

  /**
   * Convert pixel coordinate to grid coordinate
   */
  getGridY(absY, rounded = true) {
    const {cutOffTop, drawMarginVer, cellSize} = this
    const offset = -cutOffTop
    const val = (absY - drawMarginVer) / cellSize - offset
    const y = rounded ? Math.round(val) : val
    return Object.is(y, -0) ? 0 : y
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
    this.createLayers()
    this.createLayerContexts()
    this.setupResizeObserver()
    this.makeVisible()
  }

  /**
   * Setup board elements
   */
  setupElements(container) {

    //Reset elements
    this.elements = {}

    //Create elements
    const wrapper = createElement(container, `seki-board-wrapper`)
    const board = createElement(wrapper, `seki-board`)
    const canvasses = createElement(board, `seki-board-canvas-container`)

    //Set element references
    this.elements = {
      container,
      wrapper,
      board,
      canvasses,
    }
  }

  /**
   * Add class to board element
   */
  addClass(className) {
    addClass(this.elements.board, className)
  }

  /**
   * Remove class from board element
   */
  removeClass(className) {
    removeClass(this.elements.board, className)
  }

  /**
   * Make visible
   */
  makeVisible() {
    const {board} = this.elements
    setTimeout(() => {
      board.style.visibility = 'visible'
    }, 150)
  }

  /**
   * Create layer contexts
   */
  createLayerContexts() {

    //Get data
    const {elements, layers} = this
    const {canvasses} = elements

    //Create for each layer
    layers.forEach(layer => {
      const context = createCanvasContext(
        canvasses, `seki-board-layer-${layer.type}`
      )
      layer.setContext(context)
    })

    //Store canvases as elements array
    elements.canvasses = Array.from(
      canvasses.getElementsByTagName('canvas')
    )
  }

  /**
   * Setup window listeners
   */
  setupResizeObserver() {

    //Tear down any previous observer, so re-bootstrapping doesn't stack them
    this.teardownResizeObserver()

    //Create throttled resize handler
    const fn = throttle(() => {
      this.recalculateDrawSize()
    }, 100)

    //Create observer and keep a reference, so it can be disconnected again
    this.resizeObserver = new ResizeObserver(fn)

    //Observe the container the board sizes itself against. NOTE: this used to
    //observe the document body, which both missed container only changes (a
    //sidebar opening, a panel collapsing) and left a library owned observer
    //attached to a global element for the lifetime of the page.
    this.resizeObserver.observe(this.elements.container)
  }

  /**
   * Tear down the resize observer
   */
  teardownResizeObserver() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect()
      this.resizeObserver = null
    }
  }

  /**
   * Destroy the board, releasing everything it holds on to
   */
  destroy() {

    //Debug
    this.debug('destroying board')

    //Disconnect the observer and clear the layers
    this.teardownResizeObserver()
    this.removeAll()
    this.layers.clear()

    //Drop element references
    this.elements = {}
    this.player = null
  }

  /**
   * Recalculate draw size
   */
  recalculateDrawSize() {

    //Can only recalculate when we've been bootstrapped onto a container element
    if (!this.elements.container) {
      return
    }

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
    const {availableWidth, availableHeight} = this.getAvailableSize()
    const {gridWidth, gridHeight, margin} = this

    //Grid size known?
    if (gridWidth && gridHeight) {

      //Determine number of cells horizontally and vertically
      //The margin is a factor of the cell size, so let's add it to the number of cells
      const numCellsHor = gridWidth + margin
      const numCellsVer = gridHeight + margin

      //Determine cell size now
      const cellSize = Math.min(
        availableWidth / numCellsHor,
        availableHeight / numCellsVer
      )

      //Set draw size
      const drawWidth = Math.floor(cellSize * numCellsHor)
      const drawHeight = Math.floor(cellSize * numCellsVer)

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
    const pixelRatio = getPixelRatio()

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
      height * pixelRatio
    )
  }

  /**
   * Setup config change listeners
   */
  setupConfigListeners() {

    //These need recalculation of draw size
    const needsDrawSize = [
      'cutOffTop',
      'cutOffBottom',
      'cutOffLeft',
      'cutOffRight',
    ]

    //These need a redraw
    const needsRedraw = [
      'showCoordinates',
      'showStarPoints',
      'swapColors',
    ]

    //Create throttled config change handler
    const fn = throttle(event => {

      //Check what has changed
      const {key, value} = event.detail
      this.debug(`${key} changed to ${value}`)

      //Need to recalculate draw size?
      if (needsDrawSize.includes(key)) {
        this.recalculateDrawSize()
        this.computeAndRedraw(`${key} value changed`)
      }

      //Need to reprocess position?
      else if (needsRedraw.includes(key)) {
        this.computeAndRedraw(`${key} value changed`)
      }
    }, 100)

    //Config change
    this.on('config', fn)
  }

  /**
   * Link to player
   */
  linkPlayer(player) {

    //Link player
    this.player = player

    //Config to pass from player to board
    const boardConfig = [
      'showCoordinates',
      'showStarPoints',
      'swapColors',
    ]

    //Set up event listener
    player.on('config', event => {

      //Check what has changed
      const {key, value} = event.detail

      //Pass on to board
      if (boardConfig.includes(key)) {
        this.setConfig(key, value)
      }
    })

    //Grab initial settings
    for (const key of boardConfig) {
      this.setConfig(key, player.getConfig(key))
    }
  }

  /**
   * Get merged canvas of board
   */
  getCanvas() {

    //Get canvases and merged them
    const {layers} = this
    const canvases = Array
      .from(layers.values())
      .map(layer => layer.context.canvas)

    //Return merged canvasses
    return mergeCanvases(canvases)
  }
}
