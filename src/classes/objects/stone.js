import GridObject from './grid-object.js'

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
    'scale',
    'alpha',
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
   * Get theme paths to check
   */
  getThemePaths(prop) {
    const {style, modifierStyle} = this
    const paths = [
      `stone.${style}.${prop}`,
      `stone.base.${prop}`,
    ]
    if (modifierStyle) {
      paths.unshift(`stone.${modifierStyle}.${prop}`)
    }
    return paths
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
      this.loadThemeProp(prop, cellSize, displayColor)
    }

    //Now load radius and remember display color
    this.radius = this.getRadius(cellSize, displayColor)
    this.displayColor = displayColor

    //Return cellsize and display color for child handlers
    return [cellSize, displayColor]
  }
}
