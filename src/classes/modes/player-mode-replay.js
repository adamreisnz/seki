import PlayerMode from '../player-mode.js'
import MarkupFactory from '../markup-factory.js'
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
    ]

    //Set default tool
    this.defaultTool = playerTools.MOVE

    //Auto play settings
    this.isAutoPlaying = false
    this.autoPlayInterval = null
  }

  /**
   * Deactivate this mode
   */
  deactivate() {

    //Parent method
    super.deactivate()

    //Stop auto play
    this.stopAutoPlay()
  }

  /**
   * Auto play delay setting
   */
  get autoPlayDelay() {
    return this.player.getConfig('autoPlayDelay', 1000)
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
      'onPathChange',
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
    player.on('mouseout', bound.onMouseOut)
    player.on('pathChange', bound.onPathChange)
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
    player.off('pathChange', bound.onPathChange)
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

  /**
   * Path change event
   */
  onPathChange(event) {

    //Get data
    const {player} = this
    const {node} = event.detail

    //Get settings
    const variationMarkup = player.getConfig('variationMarkup')
    const variationSiblings = player.getConfig('variationSiblings')

    //Show variations
    if (variationMarkup) {
      if (node.hasMoveVariations()) {
        const variations = node.getMoveVariations()
        this.showMoveVariations(variations)
      }
    }

    //Show sibling variations
    if (variationSiblings && node.parent) {
      if (node.parent.hasMoveVariations()) {
        const variations = node.parent.getMoveVariations()
        this.showMoveVariations(variations)
      }
    }
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
    const {player, isAutoPlaying} = this

    //Go to the next move
    if (player.isToolActive(playerTools.MOVE)) {

      //Stop auto play
      if (isAutoPlaying) {
        this.stopAutoPlay()
      }

      //Go to next move
      player.next()

      //Start auto play again
      if (isAutoPlaying) {
        this.startAutoPlay()
      }
    }
  }

  /**
   * To to previous position
   */
  goToPreviousPosition() {

    //Get data
    const {player, isAutoPlaying} = this

    //Go to the previous move
    if (player.isToolActive(playerTools.MOVE)) {

      //Stop auto play
      if (isAutoPlaying) {
        this.stopAutoPlay()
      }

      //Go to previous move
      player.previous()

      //Start auto play again
      if (isAutoPlaying) {
        this.startAutoPlay()
      }
    }
  }

  /**
   * Start auto play with a given delay
   */
  startAutoPlay(delay = this.autoPlayDelay) {

    //Get data
    const {player, game, isAutoPlaying} = this
    if (isAutoPlaying) {
      return
    }

    //No game, or no further moves
    if (!game || !game.node.hasChildren()) {
      return
    }

    //Create interval
    this.isAutoPlaying = true
    this.autoPlayInterval = setInterval(() => {

      //Advance to the next node
      player.next()

      //Ran out of children?
      if (!game.node.hasChildren()) {
        this.stopAutoPlay()
      }
    }, delay)
  }

  /**
   * Stop auto play
   */
  stopAutoPlay() {

    //Get data
    const {isAutoPlaying, autoPlayInterval} = this
    if (!isAutoPlaying) {
      return
    }

    //Clear interval
    clearInterval(autoPlayInterval)

    //Clear flags
    this.autoPlayInterval = null
    this.isAutoPlaying = false
  }

  /**
   * Show move variations on the board
   */
  showMoveVariations(variations) {

    //Get data
    const {player} = this
    const {board} = player

    //Loop variations
    variations.forEach((variation, i) => {
      const {move} = variation
      const {x, y} = move

      //Auto variation markup should never overwrite existing markup
      if (board.has(boardLayerTypes.MARKUP, x, y)) {
        return
      }

      //Add to board
      board
        .add(boardLayerTypes.MARKUP, x, y, MarkupFactory
          .createForVariation(i, board))
    })
  }
}