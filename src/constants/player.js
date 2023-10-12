import {markupTypes} from './markup.js'
import {setupTypes} from './setup.js'

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
export const editTools = {

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
  STONE: 'stone',
}

/**
 * Player actions
 */
export const playerActions = {

  //General
  CANCEL_ACTION: 'cancelAction',

  //Mode selection
  SET_MODE_REPLAY: 'setModeReplay',
  SET_MODE_EDIT: 'setModeEdit',
  SET_MODE_PLAY: 'setModePlay',

  //Position handling
  PREV_POSITION: 'prevPosition',
  NEXT_POSITION: 'nextPosition',
  PREV_VARIATION: 'prevVariation',
  NEXT_VARIATION: 'nextVariation',

  //Setup tool selection
  SET_EDIT_TOOL_STONE: 'useEditToolStone',
  SET_EDIT_TOOL_BLACK: 'useEditToolBlack',
  SET_EDIT_TOOL_WHITE: 'useEditToolWhite',
  SET_EDIT_TOOL_CLEAR: 'useEditToolClear',

  //Markup tool selection
  SET_EDIT_TOOL_TRIANGLE: 'useEditToolTriangle',
  SET_EDIT_TOOL_CIRCLE: 'useEditToolCircle',
  SET_EDIT_TOOL_SQUARE: 'useEditToolSquare',
  SET_EDIT_TOOL_DIAMOND: 'useEditToolDiamond',
  SET_EDIT_TOOL_MARK: 'useEditToolMark',
  SET_EDIT_TOOL_HAPPY: 'useEditToolHappy',
  SET_EDIT_TOOL_SAD: 'useEditToolSad',
  SET_EDIT_TOOL_LETTER: 'useEditToolLetter',
  SET_EDIT_TOOL_NUMBER: 'useEditToolNumber',
}

