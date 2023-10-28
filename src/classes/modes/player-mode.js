import Base from '../base.js'
import StoneFactory from '../stone-factory.js'
import MarkupFactory from '../markup-factory.js'
import {stoneModifierStyles} from '../../constants/stone.js'
import {
  playerActions,
  playerModes,
  editTools,
} from '../../constants/player.js'

/**
 * Base player mode class
 */
export default class PlayerMode extends Base {

  /**
   * Constructor
   */
  constructor(player) {

    //Parent constructor
    super()

    //Store reference to player
    this.player = player
  }

  /**
   * Game virtual shortcut
   */
  get game() {
    return this.player.game
  }

  /**
   * Board virtual shortcut
   */
  get board() {
    return this.player.board
  }

  /**
   * Whether this mode is active
   */
  get isActive() {
    return (this.player.mode === this.mode)
  }

  /**************************************************************************
   * Mode activation/deactivation
   ***/

  /**
   * Activate this mode
   */
  activate() {

    //Get data
    const {player, mode} = this

    //Register event listeners
    this.registerEventListeners()

    //Set player class
    player.addClass(`seki-player-mode-${mode}`)
    this.debug(`mode activated`)
  }

  /**
   * Deactivate this mode
   */
  deactivate() {

    //Get data
    const {player, mode} = this

    //NOTE: There is no need to tear down any available tools or active tool,
    //because the new mode will do that automatically when it's activated.

    //Remove event listeners
    this.removeEventListeners()

    //Remove player class
    player.removeClass(`seki-player-mode-${mode}`)
    this.debug(`mode deactivated`)
  }

  /**************************************************************************
   * Event handling
   ***/

  /**
   * Create bound listeners for given event/method map
   */
  createBoundListeners(map) {

    //No map given
    if (!map) {
      return
    }

    //Store map
    this.eventListenersMap = map

    //Create bound listeners
    this.bound = Object
      .values(map)
      .reduce((obj, name) => {
        obj[name] = this[name].bind(this)
        return obj
      }, {})
  }

  /**
   * Register event listeners on the player
   */
  registerEventListeners() {

    //Get event listeners map
    const {eventListenersMap, player, bound} = this
    if (!eventListenersMap) {
      return
    }

    //Register event listeners
    for (const key in eventListenersMap) {
      const fn = eventListenersMap[key]
      player.on(key, bound[fn])
    }
  }

  /**
   * Remove event listeners
   */
  removeEventListeners() {

    //Get event listeners map
    const {eventListenersMap, player, bound} = this
    if (!eventListenersMap) {
      return
    }

    //Remove event listeners
    for (const key in eventListenersMap) {
      const fn = eventListenersMap[key]
      player.off(key, bound[fn])
    }
  }

  /**
   * Process a global action
   */
  processAction(action, event) {

    //Debug
    this.debug(`🎯 action ${action}`)

    //Prevent default event
    if (event) {
      const {nativeEvent} = event.detail
      nativeEvent.preventDefault()
    }

    //Get data
    const {player} = this

    //Determine action
    switch (action) {

      //Game handling
      case playerActions.NEW_GAME:
        player.newGame()
        return true
      case playerActions.LOAD_GAME:
        player.loadGame()
        return true
      case playerActions.DOWNLOAD_GAME:
        player.downloadGame()
        return true
      case playerActions.DOWNLOAD_IMAGE:
        player.downloadImage()
        return true
      case playerActions.LOAD_GAME_FROM_URL:
        player.loadGameFromUrl()
        return true

      //Mode selection
      case playerActions.SET_MODE_REPLAY:
        player.setMode(playerModes.REPLAY)
        return true
      case playerActions.SET_MODE_EDIT:
        player.setMode(playerModes.EDIT)
        return true
      case playerActions.SET_MODE_PLAY:
        player.setMode(playerModes.PLAY)
        return true
      case playerActions.TOGGLE_MODE_EDIT:
        player.toggleMode(playerModes.EDIT)
        return true

      //Board config
      case playerActions.TOGGLE_COORDINATES:
        player.toggleConfig('showCoordinates')
        return true

      //Navigation
      case playerActions.GO_TO_NEXT_POSITION:
        player.setMode(playerModes.REPLAY)
        player.goToNextPosition()
        return true
      case playerActions.GO_TO_PREV_POSITION:
        player.setMode(playerModes.REPLAY)
        player.goToPreviousPosition()
        return true
      case playerActions.GO_FORWARD_NUM_POSITIONS:
        player.setMode(playerModes.REPLAY)
        player.goForwardNumPositions()
        return true
      case playerActions.GO_BACK_NUM_POSITIONS:
        player.setMode(playerModes.REPLAY)
        player.goBackNumPositions()
        return true
      case playerActions.GO_TO_LAST_POSITION:
        player.setMode(playerModes.REPLAY)
        player.goToLastPosition()
        return true
      case playerActions.GO_TO_FIRST_POSITION:
        player.setMode(playerModes.REPLAY)
        player.goToFirstPosition()
        return true
      case playerActions.GO_TO_NEXT_FORK:
        player.setMode(playerModes.REPLAY)
        player.goToNextFork()
        return true
      case playerActions.GO_TO_PREV_FORK:
        player.setMode(playerModes.REPLAY)
        player.goToPreviousFork()
        return true
      case playerActions.GO_TO_NEXT_COMMENT:
        player.setMode(playerModes.REPLAY)
        player.goToNextComment()
        return true
      case playerActions.GO_TO_PREV_COMMENT:
        player.setMode(playerModes.REPLAY)
        player.goToPreviousComment()
        return true

      //Variation selection
      case playerActions.SELECT_NEXT_VARIATION:
        player.setMode(playerModes.REPLAY)
        player.selectNextVariation()
        return true
      case playerActions.SELECT_PREV_VARIATION:
        player.setMode(playerModes.REPLAY)
        player.selectPreviousVariation()
        return true

      //Auto play
      case playerActions.START_AUTO_PLAY:
        player.setMode(playerModes.REPLAY)
        player.startAutoPlay()
        return true
      case playerActions.STOP_AUTO_PLAY:
        player.setMode(playerModes.REPLAY)
        player.stopAutoPlay()
        return true
      case playerActions.TOGGLE_AUTO_PLAY:
        player.setMode(playerModes.REPLAY)
        player.toggleAutoPlay()
        return true

      //Edit tools
      case playerActions.SET_EDIT_TOOL_STONE:
        player.setMode(playerModes.EDIT)
        player.setEditTool(editTools.STONE)
        return true
      case playerActions.SET_EDIT_TOOL_BLACK:
        player.setMode(playerModes.EDIT)
        player.setEditTool(editTools.BLACK)
        return true
      case playerActions.SET_EDIT_TOOL_WHITE:
        player.setMode(playerModes.EDIT)
        player.setEditTool(editTools.WHITE)
        return true
      case playerActions.SET_EDIT_TOOL_CLEAR:
        player.setMode(playerModes.EDIT)
        player.setEditTool(editTools.CLEAR)
        return true
      case playerActions.SET_EDIT_TOOL_CLEAR_AREA:
        player.setMode(playerModes.EDIT)
        player.setEditTool(editTools.CLEAR_AREA)
        return true
      case playerActions.SET_EDIT_TOOL_TRIANGLE:
        player.setMode(playerModes.EDIT)
        player.setEditTool(editTools.TRIANGLE)
        return true
      case playerActions.SET_EDIT_TOOL_CIRCLE:
        player.setMode(playerModes.EDIT)
        player.setEditTool(editTools.CIRCLE)
        return true
      case playerActions.SET_EDIT_TOOL_SQUARE:
        player.setMode(playerModes.EDIT)
        player.setEditTool(editTools.SQUARE)
        return true
      case playerActions.SET_EDIT_TOOL_DIAMOND:
        player.setMode(playerModes.EDIT)
        player.setEditTool(editTools.DIAMOND)
        return true
      case playerActions.SET_EDIT_TOOL_MARK:
        player.setMode(playerModes.EDIT)
        player.setEditTool(editTools.MARK)
        return true
      case playerActions.SET_EDIT_TOOL_HAPPY:
        player.setMode(playerModes.EDIT)
        player.setEditTool(editTools.HAPPY)
        return true
      case playerActions.SET_EDIT_TOOL_SAD:
        player.setMode(playerModes.EDIT)
        player.setEditTool(editTools.SAD)
        return true
      case playerActions.SET_EDIT_TOOL_LETTER:
        player.setMode(playerModes.EDIT)
        player.setEditTool(editTools.LETTER)
        return true
      case playerActions.SET_EDIT_TOOL_NUMBER:
        player.setMode(playerModes.EDIT)
        player.setEditTool(editTools.NUMBER)
        return true
      case playerActions.SET_EDIT_TOOL_DRAW:
        player.setMode(playerModes.EDIT)
        player.setEditTool(editTools.DRAW)
        return true
      case playerActions.REMOVE_ALL_MARKUP:
        player.setMode(playerModes.EDIT)
        player.removeAllMarkup()
        return true
    }

    //No action was performed
    return false
  }

  /**************************************************************************
   * Shared helpers
   ***/

  /**
   * Check if an event has valid coordinates
   */
  hasValidCoordinates(event) {
    if (!event || !event.detail) {
      return false
    }
    const {x, y} = event.detail
    return this.board.isOnBoard(x, y)
  }

  /**
   * Create markup
   */
  createMarkup(type, data) {
    const {board} = this
    return MarkupFactory.create(type, board, data)
  }

  /**
   * Create a hover stone with shadow
   */
  createHoverStone(color) {

    //Get data
    const {board} = this
    const style = board.theme.get('board.stoneStyle')

    //Create stone and shadow
    const stone = StoneFactory.create(style, color, board)
    const copy = StoneFactory.createCopy(stone, stoneModifierStyles.HOVER)
    const shadow = StoneFactory.createShadow(stone)

    //Return
    return [shadow, copy]
  }
}
