import {markupTypes} from './markup.js'
import {setupTypes} from './setup.js'

/**
 * Player modes
 */
export const playerModes = {
  STATIC: 'static',
  REPLAY: 'replay',
  EDIT: 'edit',
  PLAY: 'play',
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

  //General
  CANCEL_ACTION: 'cancelAction',

  //Position handling
  PREV_POSITION: 'prevPosition',
  NEXT_POSITION: 'nextPosition',
  PREV_VARIATION: 'prevVariation',
  NEXT_VARIATION: 'nextVariation',

  //Setup tool selection
  SELECT_BLACK_SETUP_TOOL: 'selectBlackSetupTool',
  SELECT_WHITE_SETUP_TOOL: 'selectWhiteSetupTool',
  SELECT_CLEAR_TOOL: 'selectClearTool',

  //Markup tool selection
  SELECT_TRIANGLE_MARKUP_TOOL: 'selectTriangleMarkupTool',
  SELECT_CIRCLE_MARKUP_TOOL: 'selectCircleMarkupTool',
  SELECT_SQUARE_MARKUP_TOOL: 'selectSquareMarkupTool',
  SELECT_DIAMOND_MARKUP_TOOL: 'selectDiamondMarkupTool',
  SELECT_MARK_MARKUP_TOOL: 'selectMarkMarkupTool',
  SELECT_HAPPY_MARKUP_TOOL: 'selectHappyMarkupTool',
  SELECT_SAD_MARKUP_TOOL: 'selectSadMarkupTool',
  SELECT_LETTER_MARKUP_TOOL: 'selectLetterMarkupTool',
  SELECT_NUMBER_MARKUP_TOOL: 'selectNumberMarkupTool',
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
  A: 65,
  B: 66,
  C: 67,
  D: 68,
  E: 69,
  F: 70,
  G: 71,
  H: 72,
  I: 73,
  J: 74,
  K: 75,
  L: 76,
  M: 77,
  N: 78,
  O: 79,
  P: 80,
  Q: 81,
  R: 82,
  S: 83,
  T: 84,
  U: 85,
  V: 86,
  W: 87,
  X: 88,
  Y: 89,
  Z: 90,
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
    playerModes.STATIC,
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

    //General
    [keyCodes.ESC]: playerActions.CANCEL_ACTION,

    //Navigation
    [keyCodes.LEFT]: playerActions.PREV_POSITION,
    [keyCodes.RIGHT]: playerActions.NEXT_POSITION,
    [keyCodes.UP]: playerActions.PREV_VARIATION,
    [keyCodes.DOWN]: playerActions.NEXT_VARIATION,

    //Setup tool selection
    [keyCodes.B]: playerActions.SELECT_BLACK_SETUP_TOOL,
    [keyCodes.W]: playerActions.SELECT_WHITE_SETUP_TOOL,
    [keyCodes.X]: playerActions.SELECT_CLEAR_TOOL,

    //Markup tool selection
    [keyCodes.T]: playerActions.SELECT_TRIANGLE_MARKUP_TOOL,
    [keyCodes.C]: playerActions.SELECT_CIRCLE_MARKUP_TOOL,
    [keyCodes.S]: playerActions.SELECT_SQUARE_MARKUP_TOOL,
    [keyCodes.D]: playerActions.SELECT_DIAMOND_MARKUP_TOOL,
    [keyCodes.M]: playerActions.SELECT_MARK_MARKUP_TOOL,
    [keyCodes.H]: playerActions.SELECT_HAPPY_MARKUP_TOOL,
    [keyCodes.J]: playerActions.SELECT_SAD_MARKUP_TOOL,
    [keyCodes.L]: playerActions.SELECT_LETTER_MARKUP_TOOL,
    [keyCodes.N]: playerActions.SELECT_NUMBER_MARKUP_TOOL,
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
