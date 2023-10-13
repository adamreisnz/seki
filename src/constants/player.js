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
  TOGGLE_MODE_EDIT: 'toggleModeEdit',

  //Coordinates
  TOGGLE_COORDINATES: 'toggleCoordinates',

  //Position handling & navigation
  GO_TO_NEXT_POSITION: 'goToNextPosition',
  GO_TO_PREV_POSITION: 'goToPrevPosition',
  GO_TO_LAST_POSITION: 'goToLastPosition',
  GO_TO_FIRST_POSITION: 'goToFirstPosition',
  GO_FORWARD_NUM_POSITIONS: 'goForwardNumPositions',
  GO_BACK_NUM_POSITIONS: 'goBackNumPositions',
  GO_TO_NEXT_FORK: 'goToNextFork',
  GO_TO_PREV_FORK: 'goToPrevFork',
  SELECT_NEXT_VARIATION: 'selectNextVariation',
  SELECT_PREV_VARIATION: 'selectPrevVariation',
  TOGGLE_AUTO_PLAY: 'toggleAutoPlay',

  //Editing
  SET_EDIT_TOOL_STONE: 'useEditToolStone',
  SET_EDIT_TOOL_BLACK: 'useEditToolBlack',
  SET_EDIT_TOOL_WHITE: 'useEditToolWhite',
  SET_EDIT_TOOL_CLEAR: 'useEditToolClear',
  SET_EDIT_TOOL_TRIANGLE: 'useEditToolTriangle',
  SET_EDIT_TOOL_CIRCLE: 'useEditToolCircle',
  SET_EDIT_TOOL_SQUARE: 'useEditToolSquare',
  SET_EDIT_TOOL_DIAMOND: 'useEditToolDiamond',
  SET_EDIT_TOOL_MARK: 'useEditToolMark',
  SET_EDIT_TOOL_HAPPY: 'useEditToolHappy',
  SET_EDIT_TOOL_SAD: 'useEditToolSad',
  SET_EDIT_TOOL_LETTER: 'useEditToolLetter',
  SET_EDIT_TOOL_NUMBER: 'useEditToolNumber',
  CLEAR_ALL_MARKUP: 'clearAllMarkup',
}

