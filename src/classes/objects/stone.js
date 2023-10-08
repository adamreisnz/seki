import GridObject from '../grid-object.js'

/**
 * This class is used for drawing stones on the board
 */
export default class Stone extends GridObject {

  //Stone color and computed display color
  stoneColor = null
  displayColor = null

  //Base style and modifier style (e.g. mini, hover, captured)
  style = null
  modifierStyle = null

  //Theme prop default values
  color = null
  scale = 1
  alpha = 1
  shadow = false

  //Props that can be set by theme
  themeProps = [
    'color',
    'alpha',
    'scale',
    'shadow',
  ]

  /**
   * Constructor
   */
  constructor(board, stoneColor, modifierStyle) {
    super(board)
    this.stoneColor = stoneColor
    this.modifierStyle = modifierStyle
  }

  /**
   * Load properties
   */
  loadProperties() {

    //Get data
    const {board, stoneColor} = this

    //Obtain cell size and stone color (which could be swapped)
    const cellSize = board.getCellSize()
    const displayColor = board.getDisplayColor(stoneColor)

    //Load basic theme props
    for (const prop of this.themeProps) {
      this.loadThemeProp(prop, displayColor, cellSize)
    }

    //Now load radius and remember display color
    this.radius = this.getRadius(displayColor, cellSize)
    this.displayColor = displayColor

    //Return cellsize and display color for child handlers
    return [displayColor, cellSize]
  }

  /**
   * Load a single theme prop
   */
  loadThemeProp(prop, ...args) {
    const value = this.getThemeProp(prop, ...args)
    if (typeof value !== 'undefined') {
      this[prop] = value
    }
  }

  /**
   * Get single theme property
   */
  getThemeProp(prop, ...args) {

    //Get data
    const {theme, style, modifierStyle} = this

    //Modifier style present, try to use that
    if (modifierStyle && theme.has(`stone.${modifierStyle}.${prop}`)) {
      return theme.get(`stone.${modifierStyle}.${prop}`, ...args)
    }

    //Return main theme prop
    return theme.get(`stone.${style}.${prop}`, ...args)
  }

  /**
   * Get stone radius, with scaling applied
   */
  getRadius(color, cellSize) {
    const {scale} = this
    const radius = this.getThemeProp('radius', color, cellSize)
    return Math.round(radius * (scale || 1))
  }
}
