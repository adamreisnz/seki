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

