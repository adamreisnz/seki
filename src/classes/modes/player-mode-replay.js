import PlayerMode from '../player-mode.js'
import MarkupFactory from '../markup-factory.js'
import {boardLayerTypes} from '../../constants/board.js'
import {markupTypes} from '../../constants/markup.js'
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

  //Mode type
  mode = playerModes.REPLAY

  //Available tools for this mode
  availableTools = [
    playerTools.NONE,
    playerTools.MOVE,
  ]

  //Default tool
  defaultTool = playerTools.MOVE

  //Auto play settings
  isAutoPlaying = false
  autoPlayInterval = null

  /**
   * Constructor
   */
  constructor(player) {

    //Parent method
    super(player)

    //Extend player
    this.extendPlayerForReplay()

    //Create bound event listeners
    this.createBoundListeners({
      keydown: 'onKeyDown',
      click: 'onClick',
      wheel: 'onMouseWheel',
      positionUpdate: 'onPositionUpdate',
      gameLoad: 'onGameLoad',
    })
  }

  /**
   * Extend the player with new methods
   */
  extendPlayerForReplay() {

    //Get data
    const {player, mode} = this

    //Extend player
    player.extend('startAutoPlay', mode)
    player.extend('stopAutoPlay', mode)
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

    //Clear hover
    this.clearHover()

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
   * Click handler
   */
  onClick(event) {

    //Get data
    const {player, board, game} = this
    const {x, y} = event.detail

    //Debug
    this.debug(`click event at (${x},${y})`)

    //Did the click fall outside of the board grid?
    if (!board || !board.isOnBoard(x, y)) {
      this.debug(`position (${x},${y}) is outside of board grid`)
      return
    }

    //Clear hover
    this.clearHover()

    //Move tool active
    if (player.isToolActive(playerTools.MOVE)) {
      if (game.isMoveVariation(x, y)) {
        this.selectMoveVariation(x, y)
      }
      else {
        this.playMove(x, y)
      }
    }

    //Score tool active
    else if (player.isToolActive(playerTools.SCORE)) {
      //TODO: Refactor later
      //Mark the clicked item and score the current game position
      // GameScorer.mark(event.x, event.y)
      // this.scoreGame()
    }
  }

  /**
   * Position update event
   */
  onPositionUpdate(event) {

    //Get data
    const {player} = this
    const {node} = event.detail

    //Get settings
    const showLastMove = player.getConfig('showLastMove')
    const showNextMove = player.getConfig('showNextMove')
    const showVariations = player.getConfig('showVariations')
    const showSiblingVariations = player.getConfig('showSiblingVariations')

    //Clear hover
    this.clearHover()

    //Show sibling variations
    if (showVariations && showSiblingVariations) {
      if (node.parent && node.parent.hasMultipleMoveVariations()) {
        this.showMoveVariations(node.parent)
      }
    }

    //Show child variations or next move if we have more than one move variation
    if ((showVariations || showNextMove) && node.hasMultipleMoveVariations()) {
      this.showMoveVariations(node, showVariations)
    }

    //Show next move only
    else if (showNextMove && node.hasMoveVariations()) {
      this.showMoveVariations(node, false)
    }

    //Last move markup
    if (showLastMove) {
      this.addLastMoveMarker(node)
    }
  }

  /**
   * Game loaded
   */
  onGameLoad() {
    this.stopAutoPlay()
  }

  /**************************************************************************
   * Actions
   ***/

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
      case playerActions.NEXT_VARIATION:
        this.selectNextVariation()
        break
      case playerActions.PREV_VARIATION:
        this.selectPreviousVariation()
        break
    }
  }

  /**
   * Go to next position
   */
  goToNextPosition() {

    //Get data
    const {player, isAutoPlaying} = this

    //Move tool not active? Switch first
    if (!player.isToolActive(playerTools.MOVE)) {
      player.switchTool(playerTools.MOVE)
    }

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

  /**
   * To to previous position
   */
  goToPreviousPosition() {

    //Get data
    const {player, isAutoPlaying} = this

    //Move tool not active? Switch first
    if (!player.isToolActive(playerTools.MOVE)) {
      player.switchTool(playerTools.MOVE)
    }

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

  /**
   * Select next variation
   */
  selectNextVariation() {
    this.debug(`selecting next variation`)
    this.player.selectNextVariation()
  }

  /**
   * Select previous variation
   */
  selectPreviousVariation() {
    this.debug(`selecting previous variation`)
    this.player.selectPreviousVariation()
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
  showMoveVariations(node, showText = false) {

    //Get data
    const {board} = this
    const variations = node.getMoveVariations()

    //Loop variations
    variations.forEach((variation, i) => {

      //Get data
      const {move} = variation
      const {x, y, color} = move

      //Not on top of stones (if displaying sibling variations)
      if (board.has(boardLayerTypes.STONES, x, y)) {
        return
      }

      //Construct data for factory
      const index = i
      const isSelected = node.isSelectedPath(variation)
      const data = {index, color, showText, isSelected}

      //Add to board
      board
        .add(boardLayerTypes.MARKUP, x, y, MarkupFactory
          .create(markupTypes.VARIATION, board, data))
    })
  }

  /**
   * Select move variation
   */
  selectMoveVariation(x, y) {

    //Get data
    const {player, game} = this
    const i = game.getMoveVariation(x, y)

    //Follow a move variation
    player.next(i)
  }

  /**
   * Add last move marker
   */
  addLastMoveMarker(node) {

    //Not a move node or a pass
    if (!node.isMove() || node.isPass()) {
      return
    }

    //Debug
    this.debug(`adding last move marker`)

    //Get data
    const {board} = this
    const {x, y} = node.move

    //Add to board
    board
      .add(boardLayerTypes.MARKUP, x, y, MarkupFactory
        .create(markupTypes.LAST_MOVE, board))
  }

  /**
   * Play a move
   */
  playMove(x, y) {
    const {player} = this
    player.play(x, y)
  }
}
