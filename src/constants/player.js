import {markupTypes} from './markup.js'
import {setupTypes} from './setup.js'
import audioMove from '../audio/move.wav'
import audioCapture from '../audio/capture.wav'

/**
 * Player modes
 */
export const playerModes = {
  STATIC: 'static',
  REPLAY: 'replay',
  PLAY: 'play',
  EDIT: 'edit',
  SCORE: 'score',
  SOLVE: 'solve',
}

/**
 * Editing tools
 */
export const editingTools = {

  //Markup
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

  //Setup
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
  USE_EDIT_TOOL_BLACK: 'useEditToolBlack',
  USE_EDIT_TOOL_WHITE: 'useEditToolWhite',
  USE_EDIT_TOOL_CLEAR: 'useEditToolClear',

  //Markup tool selection
  USE_EDIT_TOOL_TRIANGLE: 'useEditToolTriangle',
  USE_EDIT_TOOL_CIRCLE: 'useEditToolCircle',
  USE_EDIT_TOOL_SQUARE: 'useEditToolSquare',
  USE_EDIT_TOOL_DIAMOND: 'useEditToolDiamond',
  USE_EDIT_TOOL_MARK: 'useEditToolMark',
  USE_EDIT_TOOL_HAPPY: 'useEditToolHappy',
  USE_EDIT_TOOL_SAD: 'useEditToolSad',
  USE_EDIT_TOOL_LETTER: 'useEditToolLetter',
  USE_EDIT_TOOL_NUMBER: 'useEditToolNumber',
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

  //Initial mode
  initialMode: playerModes.REPLAY,

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
    [keyCodes.B]: playerActions.USE_EDIT_TOOL_BLACKOOL,
    [keyCodes.W]: playerActions.USE_EDIT_TOOL_WHITE,
    [keyCodes.X]: playerActions.USE_EDIT_TOOL_CLEAR,

    //Markup tool selection
    [keyCodes.T]: playerActions.USE_EDIT_TOOL_TRIANGLE,
    [keyCodes.C]: playerActions.USE_EDIT_TOOL_CIRCLE,
    [keyCodes.S]: playerActions.USE_EDIT_TOOL_SQUARE,
    [keyCodes.D]: playerActions.USE_EDIT_TOOL_DIAMOND,
    [keyCodes.M]: playerActions.USE_EDIT_TOOL_MARK,
    [keyCodes.H]: playerActions.USE_EDIT_TOOL_HAPPY,
    [keyCodes.J]: playerActions.USE_EDIT_TOOL_SAD,
    [keyCodes.L]: playerActions.USE_EDIT_TOOL_LETTER,
    [keyCodes.N]: playerActions.USE_EDIT_TOOL_NUMBER,
  },

  //Mouse bindings
  mouseBindings: {
    [mouseEvents.WHEEL_UP]: playerActions.PREV_POSITION,
    [mouseEvents.WHEEL_DOWN]: playerActions.NEXT_POSITION,
    [mouseEvents.WHEEL_LEFT]: playerActions.PREV_VARIATION,
    [mouseEvents.WHEEL_RIGHT]: playerActions.NEXT_VARIATION,
  },

  //Audio
  audio: {
    move: audioMove,
    capture: audioCapture,
  },

  //Move and variation flags
  showLastMove: true,
  showNextMove: false,
  showSolutions: false,
  showVariations: true,
  showSiblingVariations: false,
  numberVariationMoves: true,
  rememberVariationPaths: true,

  //Number of moves to skip at a time
  numSkipMoves: 10,

  //Allow player configuration settigns to be loaded from game records
  allowPlayerConfig: true,
}
