import PlayerMode from '../player-mode.js'
import {boardLayerTypes} from '../../constants/board.js'
import {
  mouseEvents,
  playerModes,
  playerTools,
  playerActions,
} from '../../constants/player.js'

/**
 * Replay game records with this mode
 */
export default class PlayerModeReplay extends PlayerMode {

  /**
   * Constructor
   */
  constructor(player) {

    //Parent method
    super(player, playerModes.REPLAY)

    //Available tools in this mode
    this.availableTools = [
      playerTools.NONE,
      playerTools.MOVE,
      playerTools.SCORE,
    ]

    //Set default tool
    this.defaultTool = playerTools.MOVE
  }

  /**************************************************************************
   * Event listeners setup
   ***/

  /**
   * Create bound listeners
   */
  createBoundListeners() {
    super.createBoundListeners([
      'onKeyDown',
      'onMouseWheel',
      'onMouseMove',
      'onMouseOut',
    ])
  }

  /**
   * Register event listeners on the player
   */
  registerEventListeners() {

    //Get player
    const {player, bound} = this

    //Register event listeners
    player.on('keydown', bound.onKeyDown)
    player.on('wheel', bound.onMouseWheel)
    player.on('mousemove', bound.onMouseMove)
    player.on('mouseout', bound.onMouseOut)
  }

  /**
   * Remove event listeners
   */
  removeEventListeners() {

    //Get player
    const {player, bound} = this

    //Register event listeners
    player.off('keydown', bound.onKeyDown)
    player.off('wheel', bound.onMouseWheel)
    player.off('mousemove', bound.onMouseMove)
    player.off('mouseout', bound.onMouseOut)
  }

  /**************************************************************************
   * Event listeners
   ***/

  /**
   * Keydown events
   */
  onKeyDown(event) {

    //Get data
    const {player} = this
    const {keyCode} = event.detail.nativeEvent
    const action = player.getActionForKeyCode(keyCode)

    //Perform action
    this.performAction(action, event)
  }

  /**
   * Handler for mousewheel events
   */
  onMouseWheel(event) {

    //Get data
    const {player} = this
    const {nativeEvent} = event.detail

    //Clear hover layer
    this.clearHoverLayer()

    //Wheeling up
    if (nativeEvent.deltaY < 0) {
      const action = player.getActionForMouseEvent(mouseEvents.WHEEL_UP)
      this.performAction(action, event)
    }

    //Wheeling down
    else if (nativeEvent.deltaY > 0) {
      const action = player.getActionForMouseEvent(mouseEvents.WHEEL_DOWN)
      this.performAction(action, event)
    }
  }

  /**
   * Mouse move handler
   */
  onMouseMove(event) {

    //Last coordinates are the same?
    const {mouse} = this
    if (mouse.lastX === event.x && mouse.lastY === event.y) {
      return
    }

    //Remember last coordinates
    mouse.lastX = event.x
    mouse.lastY = event.y

    //Trigger hover event
    this.triggerHoverEvent(event)
  }

  /**
   * Mouse out handler
   */
  onMouseOut() {

    //Clear hover layer
    this.clearHoverLayer()
  }

  /**************************************************************************
   * Actions
   ***/

  /**
   * Trigger hover event
   */
  triggerHoverEvent(event) {

    //Get data
    const {player, board} = this
    const {nativeEvent} = event.detail

    //Anything to do
    if (board && board.hasLayer(boardLayerTypes.HOVER)) {
      player.triggerEvent('hover', {nativeEvent})
    }
  }

  /**
   * Clear hover layer
   */
  clearHoverLayer() {

    //Get data
    const {board} = this

    //Remove all hover data from board
    if (board && board.hasLayer(boardLayerTypes.HOVER)) {
      board.removeAll(boardLayerTypes.HOVER)
    }
  }

  /**
   * Perform an action
   */
  performAction(action, event) {

    //No action
    if (!action) {
      return
    }

    //Get data
    const {nativeEvent} = event.detail

    //Prevent default
    nativeEvent.preventDefault()

    //Determine action
    switch (action) {
      case playerActions.NEXT_POSITION:
        this.goToNextPosition()
        break
      case playerActions.PREV_POSITION:
        this.goToPreviousPosition()
        break
    }
  }

  /**
   * Go to next position
   */
  goToNextPosition() {

    //Get data
    const {player} = this

    //Go to the next move
    if (player.isToolActive(playerTools.MOVE)) {
      player.next()
    }
  }

  /**
   * To to previous position
   */
  goToPreviousPosition() {

    //Get data
    const {player} = this

    //Go to the previous move
    if (player.isToolActive(playerTools.MOVE)) {
      player.previous()
    }
  }
}
