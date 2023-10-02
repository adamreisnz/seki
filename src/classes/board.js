import BoardLayerFactory from './board-layer-factory.js'
import Theme from './theme.js'
import {
  defaultConfig,
  boardLayerTypes,
} from '../constants/board.js'
import {
  pixelRatio,
  createCanvasContext,
} from '../helpers/canvas.js'

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

    //Last draw width/height
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
   * Color multiplier
   */
  get colorMultiplier() {
    return this.swapColors ? -1 : 1
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

    //Validate
    if (!config || typeof config !== 'object') {
      return
    }

    //Extend from default config
    config = Object.assign({}, defaultConfig, config)

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
      this.resized()
    }

    //Return self for chaining
    return this
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

    //Trigger resized if there were changes
    if (changes) {
      this.resized()
    }

    //Return self for chaining
    return this
  }

  /**
   * Set section of the board to be displayed
   */
  setSection(section) {

    //Nothing given?
    if (!section || typeof section !== 'object') {
      return this
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
      return this
    }

    //Set section and call resized handler
    this.section = section
    this.resized()

    //Return self for chaining
    return this
  }

  /**
   * Set board size. This will clear the board objects.
   */
  setSize(width, height) {

    //Check what's given
    width = parseInt(width || height || 0)
    height = parseInt(height || width || 0)

    //Invalid?
    if (isNaN(width) || isNaN(height)) {
      return
    }

    //Changing?
    if (width !== this.width || height !== this.height) {

      //Remember size
      this.width = width
      this.height = height

      //Set size in layers
      this.layers.forEach(layer => layer.setSize(width, height))

      //Determine draw size
      if (!this.determineDrawSize()) {

        //If the draw size didn't change, resized() won't be called, and so we
        //must call it manually. This may seem a bit "off", but it's the best
        //way to prevent redundant redraws.
        this.resized() //TODO verify
      }
    }
  }

  /**
   * Set new draw size
   */
  setDrawSize(width, height) {
    if (width !== this.drawWidth || height !== this.drawHeight) {
      this.drawWidth = width
      this.drawHeight = height
      this.resized()
    }
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

    //Set new stones and markup grids
    this.setAll(boardLayerTypes.STONES, position.stones)
    this.setAll(boardLayerTypes.MARKUP, position.markup)
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
   * Called after a board size change, draw size change, section change or margin change
   */
  resized() {

    //Determine the new grid
    this.grid = {
      xLeft: 0 + this.section.left,
      xRight: this.width - 1 - this.section.right,
      yTop: 0 + this.section.top,
      yBot: this.height - 1 - this.section.bottom,
    }

    //Only redraw when there is sensible data
    if (!this.width || !this.height || !this.drawWidth || !this.drawHeight) {
      return
    }

    //Determine number of cells horizontall and vertically
    //The margin is a factor of the cell size, so let's add it to the number of cells
    let noCellsHor = this.width + this.margin
    let noCellsVer = this.height + this.margin

    //Are we cutting off parts of the grid? Add half a cell of draw size
    for (let side in this.cutoff) {
      if (this.cutoff[side]) {
        if (side === 'top' || side === 'bottom') {
          noCellsVer += 0.5
        }
        else {
          noCellsHor += 0.5
        }
      }
    }

    //Determine cell size now
    this.cellSize = Math.floor(Math.min(
      this.drawWidth / noCellsHor,
      this.drawHeight / noCellsVer,
    ))

    //Determine actual grid draw size (taking off the margin again)
    this.gridDrawWidth = this.cellSize * (noCellsHor - this.margin - 1)
    this.gridDrawHeight = this.cellSize * (noCellsVer - this.margin - 1)

    //Determine draw margins
    this.drawMarginHor = Math.floor((this.drawWidth - this.gridDrawWidth) / 2)
    this.drawMarginVer = Math.floor((this.drawHeight - this.gridDrawHeight) / 2)

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
    return (
      x >= this.grid.xLeft && y >= this.grid.yTop &&
      x <= this.grid.xRight && y <= this.grid.yBot
    )
  }

  /**************************************************************************
   * DOM helpers
   ***/

  /**
   * Render board onto element
   */
  render(element) {

    //Already rendered
    if (this.element) {
      throw new Error(`Board has already been rendered!`)
    }

    //Link element and apply classes
    this.linkElement(element)
    this.applyClasses(element)

    //Determine initial draw size and render layers
    this.determineDrawSize()
    this.renderLayers(element)

    //Add resize handler on window
    this.addResizeListener()
  }

  /**
   * Add resize listener
   */
  addResizeListener() {

    //Create listener
    let throttled = false
    let timeout = null
    this.resizeListener = () => {
      if (!throttled) {
        this.determineDrawSize()
      }
      clearTimeout(timeout)
      throttled = true
      timeout = setTimeout(() => {
        throttled = false
      }, 250)
    }

    //Apply
    window.addEventListener('resize', this.resizeListener)
  }

  /**
   * Remove resize listener
   */
  removeResizeListener() {
    window.removeEventListener('resize', this.resizeListener)
  }

  /**
   * Apply element classes
   */
  applyClasses(element) {
    element.classList.add('seki-board')
  }

  /**
   * Render layers
   */
  renderLayers(element) {
    this.layers
      .forEach(layer => {
        const context = createCanvasContext(element, layer.type)
        layer.setContext(context)
      })
  }

  /**
   * Link the board to a HTML element
   */
  linkElement(element) {

    //Set
    this.element = element
    this.playerElement = null
    this.sizingElement = element

    //Set player element
    if (element.parentElement.classList.contains('seki-player')) {
      this.playerElement = element.parentElement
      this.sizingElement = element.parentElement.parentElement
    }
  }

  /**
   * Determine draw size
   */
  determineDrawSize() {

    //Get data
    const {width, height, lastDrawWidth, lastDrawHeight, sizingElement} = this

    //Initialise available width/height
    let availableWidth = sizingElement.clientWidth
    let availableHeight = sizingElement.clientHeight

    //Init vars
    let drawWidth, drawHeight, cellSize

    //Stretch available height to width if zero
    if (availableHeight === 0 && availableWidth > 0) {
      availableHeight = availableWidth
    }

    //Grid size known?
    if (width && height) {

      //Determine smallest cell size
      cellSize = Math.min(availableWidth / width, availableHeight / height)

      //Set draw size
      drawWidth = Math.floor(cellSize * width)
      drawHeight = Math.floor(cellSize * height)
    }

    //Otherwise, use the lesser of the available width/height
    else {
      drawWidth = drawHeight = Math.min(availableWidth, availableHeight)
    }

    //Propagate
    if (lastDrawWidth !== drawWidth || lastDrawHeight !== drawHeight) {
      this.lastDrawWidth = drawWidth
      this.lastDrawHeight = drawHeight
      this.propagateDrawSize(drawWidth, drawHeight)
      return true
    }

    //No change
    return false
  }

  /**
   * Propagate draw size
   */
  propagateDrawSize(width, height) {

    //Get element
    const {element, playerElement} = this
    if (!element) {
      return
    }

    //First set the new dimensions on the canvas elements
    const canvases = element.getElementsByTagName('canvas')
    for (const canvas of canvases) {
      canvas.width = width * pixelRatio
      canvas.height = height * pixelRatio
    }

    //In player element? Set dimensions on element
    if (playerElement) {
      element.style.width = `${width}px`
      element.style.height = `${height}px`
    }

    //Next set the draw size on the board itself
    this.setDrawSize(
      width * pixelRatio,
      height * pixelRatio,
    )
  }
}
