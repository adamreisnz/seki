import BoardLayerFactory from './board-layer-factory.js'
import Theme from './theme.js'
import {defaultConfig, boardLayerTypes} from '../constants/board.js'

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

    //Init board
    this.init()

    //Set config
    if (config) {
      this.setConfig(config)
    }
  }

  /**
   * Initialize board
   */
  init() {

    //Default theme
    this.theme = new Theme()

    //Initialize board draw dimensions in pixels
    this.cellSize = 0
    this.drawWidth = 0
    this.drawHeight = 0
    this.drawMarginHor = 0
    this.drawMarginVer = 0
    this.gridDrawWidth = 0
    this.gridDrawHeight = 0

    //Layer map and order
    this.layers = new Map()
    this.layerOrder = [
      boardLayerTypes.GRID,
      boardLayerTypes.COORDINATES,
      boardLayerTypes.SHADOW,
      boardLayerTypes.STONES,
      boardLayerTypes.SCORE,
      boardLayerTypes.MARKUP,
      boardLayerTypes.HOVER,
    ]

    //Get vars
    const board = this
    const {theme} = this

    //Initialize layers
    for (const layerType of this.layerOrder) {
      this.layers.set(
        layerType,
        BoardLayerFactory.create(layerType, board, theme),
      )
    }

    //Static board flag
    this.static = false

    //Get margin from theme
    this.margin = theme.get('board.margin')

    //Color swapping
    this.swapColors = false

    //Turn off coordinates
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
   * Reset board
   */
  reset() {
    this.removeAll()
    this.init()
  }

  /**
   * Link the board to a HTML element
   */
  linkElement(element) {
    this.element = element
  }

  /**
   * Make this board static
   * (one canvas layer, only grid, coordinates, stones and markup)
   */
  makeStatic() {
    this.static = true
    this.layerOrder = [
      boardLayerTypes.GRID,
      boardLayerTypes.COORDINATES,
      boardLayerTypes.STONES,
      boardLayerTypes.MARKUP,
    ]
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
    this.swapColors(config.swapColors)
    this.setCutoff(config.cutoff)
    this.setSection(config.section)
    this.setSize(config.width, config.height)
  }

  /**
   * Set theme
   */
  setTheme(theme) {
    this.theme = theme
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

      //Broadcast event (no call to resized, as that is handled in the directive)
      //TODO $rootScope.$broadcast('ngGo.board.resize', this, width, height)
    }

    //Return self for chaining
    return this
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
  swapColors(swapColors) {

    //Set
    if (typeof swapColors !== 'undefined') {
      this.swapColors = swapColors
    }
    else {
      this.swapColors = !this.swapColors
    }

    //For static board, redraw the whole thing
    if (this.static) {
      this.redraw()
    }

    //For a dynamic board, only these layers
    else {
      this.redraw('stones')
      this.redraw('markup')
    }
  }

  /*****************************************************************************
   * Object handling
   ***/

  /**
   * Add an object to a board layer
   */
  add(layerType, x, y, value) {
    const layer = this.layers.get(layerType)
    if (layer) {
      layer.add(x, y, value)
    }
  }

  /**
   * Remove an object from a board layer
   */
  remove(layerType, x, y) {
    const layer = this.layers.get(layerType)
    if (layer) {
      layer.remove(x, y)
    }
  }

  /**
   * Get something from a board layer
   */
  get(layerType, x, y) {
    const layer = this.layers.get(layerType)
    if (layer) {
      return layer.get(x, y)
    }
    return null
  }

  /**
   * Check if we have something at given coordinates for a given layer
   */
  has(layerType, x, y) {
    const layer = this.layers.get(layerType)
    if (layer) {
      return layer.has(x, y)
    }
    return false
  }

  /**
   * Set all objects (grid) for a given layer
   */
  setAll(layerType, grid) {
    const layer = this.layers.get(layerType)
    if (layer) {
      layer.setAll(grid)
    }
  }

  /**
   * Remove all objects from the board, optionally for a given layer
   */
  removeAll(layerType) {

    //Specific layer type
    if (layerType) {
      const layer = this.layers.get(layerType)
      if (layer) {
        layer.removeAll()
      }
    }

    //All layers
    else {
      this.layers.forEach(layer => layer.removeAll())
    }
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
      this.removeAll('markup')
    }

    //Set new stones and markup grids
    this.setAll('stones', position.stones)
    this.setAll('markup', position.markup)
  }

  /*****************************************************************************
   * State handling
   ***/

  /**
   * Get the board state (list of objects per layer)
   */
  getState(layerType) {

    //Only specific layer?
    if (layerType) {
      const layer = this.layers.get(layerType)
      if (layer) {
        return layer.getAll()
      }
      return null
    }

    //All layers
    const state = {}
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
   * Restore the board state from given state object
   */
  restoreState(state, layerType) {

    //Only specific layer?
    if (layerType) {
      const layer = this.layers.get(layerType)
      if (layer) {
        layer.setAll(state)
      }
      return
    }

    //All layers
    this.layers.forEach((layer, type) => {
      layer.removeAll()
      if (state[layer]) {
        layer.setAll(state[type])
      }
    })
  }

  /*****************************************************************************
   * Drawing control
   ***/

  /**
   * Clear the whole board
   */
  clear(layerType) {

    //Just clearing one layer?
    if (layerType) {

      //If the board is static we can't do this
      if (this.static) {
        return
      }

      //Find layer
      const layer = this.layers.get(layerType)
      if (layer) {
        layer.clear()
      }
      return
    }

    //Static? Clearing stones is enough
    if (this.static) {
      const stonesLayer = this.layers.get(boardLayerTypes.STONES)
      stonesLayer.clear()
      return
    }

    //Clear all layers
    this.layers.forEach(layer => layer.clear())
  }

  /**
   * Redraw everything or just a single layer
   */
  redraw(layerType) {

    //The board can only be redrawn when there is a grid size and a draw size
    if (!this.width || !this.height || !this.drawWidth || !this.drawHeight) {
      return
    }

    //Just redrawing one layer?
    if (layerType) {

      //Static board
      if (this.static) {
        return
      }

      //Find layer
      const layer = this.layers.get(layerType)
      if (layer) {
        layer.redraw()
      }
      return
    }

    //Clear the board first
    this.clear()

    //Now draw all layers again in the correct order
    for (const layerType of this.layerOrder) {
      const layer = this.layers.get(layerType)
      layer.draw()
    }
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
  getAbsX(gridX) {
    let offset = this.cutoff.left ? 0.5 : 0
    return this.drawMarginHor + Math.round((gridX + offset) * this.cellSize)
  }

  /**
   * Convert grid coordinate to pixel coordinate
   */
  getAbsY(gridY) {
    let offset = this.cutoff.top ? 0.5 : 0
    return this.drawMarginVer + Math.round((gridY + offset) * this.cellSize)
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
  isOnBoard(gridX, gridY) {
    return (
      gridX >= this.grid.xLeft && gridY >= this.grid.yTop &&
      gridX <= this.grid.xRight && gridY <= this.grid.yBot
    )
  }
}
