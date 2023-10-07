import {markupTypes} from './markup.js'
import {setupTypes} from './setup.js'

/**
 * Player modes
 */
export const playerModes = {
  NONE: 'none',
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
  MARKUP: 'markup',
  SETUP: 'setup',
}

/**
 * Markup tools
 */
export const markupTools = {
  TRIANGLE: markupTypes.TRIANGLE,
  CIRCLE: markupTypes.CIRCLE,
  SQUARE: markupTypes.SQUARE,
  ARROW: markupTypes.ARROW,
  DIAMOND: markupTypes.DIAMOND,
  MARK: markupTypes.MARK,
  SELECT: markupTypes.SELECT,
  HAPPY: markupTypes.HAPPY,
  SAD: markupTypes.SAD,
  LETTER: 'letter',
  NUMBER: 'number',
  CLEAR: 'clear',
}

/**
 * Setup tools
 */
export const setupTools = {
  BLACK: setupTypes.BLACK,
  WHITE: setupTypes.WHITE,
  CLEAR: setupTypes.CLEAR,
}

/**
 * Player actions
 */
export const playerActions = {
  PREV_POSITION: 'prevPosition',
  NEXT_POSITION: 'nextPosition',
  PREV_VARIATION: 'prevVariation',
  NEXT_VARIATION: 'nextVariation',
  CANCEL_ACTION: 'cancelAction',
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
 * Mouse events
 */
export const mouseEvents = {
  WHEEL_UP: 'wheelup',
  WHEEL_DOWN: 'wheeldown',
  WHEEL_LEFT: 'wheelleft',
  WHEEL_RIGHT: 'wheelright',
}

/**
 * Default player configuration
 */
export const defaultPlayerConfig = {

  //Available modes
  availableModes: [
    playerModes.NONE,
    playerModes.PLAY,
    playerModes.REPLAY,
    playerModes.EDIT,
    playerModes.SOLVE,
  ],

  //Initial mode and tool
  initialMode: playerModes.REPLAY,
  initialTool: playerTools.MOVE,

  //Key bindings
  keyBindings: {
    [keyCodes.LEFT]: playerActions.PREV_POSITION,
    [keyCodes.RIGHT]: playerActions.NEXT_POSITION,
    [keyCodes.UP]: playerActions.PREV_VARIATION,
    [keyCodes.DOWN]: playerActions.NEXT_VARIATION,
    [keyCodes.ESC]: playerActions.CANCEL_ACTION,
  },

  //Mouse bindings
  mouseBindings: {
    [mouseEvents.WHEEL_UP]: playerActions.PREV_POSITION,
    [mouseEvents.WHEEL_DOWN]: playerActions.NEXT_POSITION,
    [mouseEvents.WHEEL_LEFT]: playerActions.PREV_VARIATION,
    [mouseEvents.WHEEL_RIGHT]: playerActions.NEXT_VARIATION,
  },

  //Move and variation flags
  showLastMove: true,
  showNextMove: false,
  showSolutions: false,
  showVariations: true,
  showSiblingVariations: false,

  //Number of moves to skip at a time
  numSkipMoves: 10,

  //Allow player configuration settigns to be loaded from game records
  allowPlayerConfig: true,
}
