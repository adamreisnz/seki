
/**
 * Sides
 */
export const boardSides = {
  TOP: 'top',
  BOTTOM: 'bottom',
  LEFT: 'left',
  RIGHT: 'right',
}

/**
 * Board layer types
 */
export const boardLayerTypes = {
  GRID: 'grid',
  COORDINATES: 'coordinates',
  SHADOW: 'shadow',
  STONES: 'stones',
  SCORE: 'score',
  MARKUP: 'markup',
  HOVER: 'hover',
}

/**
 * Default board configuration
 */
export const defaultBoardConfig = {

  //Width and height
  size: 19,

  //Grid cut-off sides
  cutoff: {
    top: false,
    bottom: false,
    left: false,
    right: false,
  },

  //Section of board to display
  section: {
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },

  //Flags
  showCoordinates: true,
  swapColors: false,
}
