import {markupTypes} from './markup.js'

/**
 * Player modes
 */
export const playerModes = {
  PLAY: 'play',
  REPLAY: 'replay',
  EDIT: 'edit',
  SOLVE: 'solve',
}

/**
 * Player tools
 */
export const playerTools = {
  NONE: 'none',
  MOVE: 'move',
  SCORE: 'score',
  SETUP: 'setup',
  MARKUP: 'markup',
}

/**
 * Keycodes
 */
export const keyCodes = {
  LEFT: 37,
  RIGHT: 39,
  UP: 38,
  DOWN: 40,
  ESC: 27,
  ENTER: 13,
  SPACE: 32,
  TAB: 9,
  SHIFT: 16,
  CTRL: 17,
  ALT: 18,
  HOME: 36,
  END: 35,
  PAGEUP: 33,
  PAGEDOWN: 34,
}

/**
 * Default player configuration
 */
export const defaultPlayerConfig = {

  //Default mode/tool
  mode: playerModes.REPLAY,
  tool: playerTools.MOVE,

  //Keys/scrollwheel navigation
  arrowKeysNavigation: true,
  scrollWheelNavigation: true,

  //Last move marker, leave empty for none
  lastMoveMarker: markupTypes.LAST,

  //Indicate variations with markup on the board, and show
  //successor node variations or current node variations
  variationMarkup: true,
  variationChildren: true,
  variationSiblings: false,

  //Show solution paths
  solutionPaths: false,
}
