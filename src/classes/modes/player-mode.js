import Base from '../base.js'
import StoneFactory from '../stone-factory.js'
import MarkupFactory from '../markup-factory.js'
import {stoneModifierStyles} from '../../constants/stone.js'
import {playerActions, playerModes} from '../../constants/player.js'

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
    const {board, mode} = this

    //Register event listeners
    this.registerEventListeners()

    //Add static class on board
    if (mode === playerModes.STATIC) {
      board.addClass('seki-board-static')
    }

    //Debug
    this.debug(`mode activated`)
  }

  /**
   * Deactivate this mode
   */
  deactivate() {

    //Get data
    const {board, mode} = this

    //NOTE: There is no need to tear down any available tools or active tool,
    //because the new mode will do that automatically when it's activated.

    //Remove event listeners
    this.removeEventListeners()

    //Remove static class from board
    if (mode === playerModes.STATIC) {
      board.removeClass('seki-board-static')
    }

    //Debug
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
   * Process an action
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

      //Mode selection
      case playerActions.SET_MODE_REPLAY:
        player.setMode(playerModes.REPLAY)
        return true
      case playerActions.SET_MODE_PLAY:
        player.setMode(playerModes.PLAY)
        return true
      case playerActions.SET_MODE_EDIT:
        player.setMode(playerModes.EDIT)
        return true

      //Board config
      case playerActions.TOGGLE_COORDINATES:
        player.toggleConfig('showCoordinates')
        return true

      //Navigation
      case playerActions.GO_TO_NEXT_POSITION:
        player.goToNextPosition()
        return true
      case playerActions.GO_TO_PREV_POSITION:
        player.goToPreviousPosition()
        return true
      case playerActions.GO_FORWARD_NUM_POSITIONS:
        player.goForwardNumPositions()
        return true
      case playerActions.GO_BACK_NUM_POSITIONS:
        player.goBackNumPositions()
        return true
      case playerActions.GO_TO_LAST_POSITION:
        player.goToLastPosition()
        return true
      case playerActions.GO_TO_FIRST_POSITION:
        player.goToFirstPosition()
        return true
      case playerActions.GO_TO_NEXT_FORK:
        player.goToNextFork()
        return true
      case playerActions.GO_TO_PREV_FORK:
        player.goToPreviousFork()
        return true
      case playerActions.GO_TO_NEXT_COMMENT:
        player.goToNextComment()
        return true
      case playerActions.GO_TO_PREV_COMMENT:
        player.goToPreviousComment()
        return true

      //Variation selection
      case playerActions.SELECT_NEXT_VARIATION:
        player.selectNextVariation()
        return true
      case playerActions.SELECT_PREV_VARIATION:
        player.selectPreviousVariation()
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

  /**
   * Show hover stone of given color
   */
  showHoverStoneForColor(x, y, color) {

    //Get board and create stone
    const {board} = this
    const stone = this.createHoverStone(color)

    //Set hover cell, but clear whole layer first due to shadows
    board.clearHoverLayer()
    board.setHoverCell(x, y, stone)
  }
}
