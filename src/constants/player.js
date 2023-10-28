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
  DRAW: 'draw',

  //Setup
  BLACK: setupTypes.BLACK,
  WHITE: setupTypes.WHITE,
  CLEAR: setupTypes.CLEAR,
  CLEAR_AREA: 'clearArea',
  STONE: 'stone',
}

/**
 * Player actions
 */
export const playerActions = {

  //General
  CANCEL_ACTION: 'cancelAction',

  //Game handling
  NEW_GAME: 'newGame',
  LOAD_GAME: 'openGame',
  LOAD_GAME_FROM_URL: 'loadGameFromUrl',
  DOWNLOAD_GAME: 'downloadGame',
  DOWNLOAD_IMAGE: 'downloadImage',

  //Mode selection
  SET_MODE_REPLAY: 'setModeReplay',
  SET_MODE_EDIT: 'setModeEdit',
  SET_MODE_PLAY: 'setModePlay',
  TOGGLE_MODE_EDIT: 'toggleModeEdit',

  //Board config
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
  GO_TO_NEXT_COMMENT: 'goToNextComment',
  GO_TO_PREV_COMMENT: 'goToPrevComment',
  SELECT_NEXT_VARIATION: 'selectNextVariation',
  SELECT_PREV_VARIATION: 'selectPrevVariation',

  //Auto play
  START_AUTO_PLAY: 'startAutoPlay',
  STOP_AUTO_PLAY: 'stopAutoPlay',
  TOGGLE_AUTO_PLAY: 'toggleAutoPlay',

  //Editing
  SET_EDIT_TOOL_STONE: 'setEditToolStone',
  SET_EDIT_TOOL_BLACK: 'setEditToolBlack',
  SET_EDIT_TOOL_WHITE: 'setEditToolWhite',
  SET_EDIT_TOOL_CLEAR: 'setEditToolClear',
  SET_EDIT_TOOL_CLEAR_AREA: 'setEditToolClearArea',
  SET_EDIT_TOOL_TRIANGLE: 'setEditToolTriangle',
  SET_EDIT_TOOL_CIRCLE: 'setEditToolCircle',
  SET_EDIT_TOOL_SQUARE: 'setEditToolSquare',
  SET_EDIT_TOOL_DIAMOND: 'setEditToolDiamond',
  SET_EDIT_TOOL_MARK: 'setEditToolMark',
  SET_EDIT_TOOL_DRAW: 'setEditToolDraw',
  SET_EDIT_TOOL_HAPPY: 'setEditToolHappy',
  SET_EDIT_TOOL_SAD: 'setEditToolSad',
  SET_EDIT_TOOL_LETTER: 'setEditToolLetter',
  SET_EDIT_TOOL_NUMBER: 'setEditToolNumber',
  REMOVE_ALL_MARKUP: 'removeAllMarkup',
}

