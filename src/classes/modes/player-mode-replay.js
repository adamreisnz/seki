import PlayerMode from './player-mode.js'
import MarkupFactory from '../markup-factory.js'
import {boardLayerTypes} from '../../constants/board.js'
import {markupTypes} from '../../constants/markup.js'
import {mouseEvents} from '../../constants/common.js'
import {playerModes, playerActions} from '../../constants/player.js'

/**
 * Replay game records with this mode
 */
export default class PlayerModeReplay extends PlayerMode {

  //Mode type
  mode = playerModes.REPLAY

  //Auto play settings
  isAutoPlaying = false
  autoPlayInterval = null

  //Track last move and variation markers we've put on the board
  markers = []

  /**
   * Constructor
   */
  constructor(player) {

    //Parent method
    super(player)

    //Extend player
    this.extendPlayer()

    //Create bound event listeners
    this.createBoundListeners({
      keydown: 'onKeyDown',
      click: 'onClick',
      wheel: 'onMouseWheel',
      gridEnter: 'onGridEnter',
      gridLeave: 'onGridLeave',
      positionUpdate: 'onPositionUpdate',
      gameLoad: 'onGameLoad',
    })
  }

  /**
   * Extend the player with new methods
   */
  extendPlayer() {

    //Get data
    const {player, mode} = this

    //Extend player
    player.extend('startAutoPlay', mode)
    player.extend('stopAutoPlay', mode)
  }

  /**
   * Activate this mode
   */
  activate() {

    //Parent method
    super.activate()

    //Render markers
    this.renderMarkers()
  }

  /**
   * Deactivate this mode
   */
  deactivate() {

    //Parent method
    super.deactivate()

    //Stop auto play and clear markers
    this.stopAutoPlay()
    this.clearMarkers()
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
    this.processAction(action, event)
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
      this.processAction(action, event)
    }

    //Wheeling down
    else if (nativeEvent.deltaY > 0) {
      const action = player.getActionForMouseEvent(mouseEvents.WHEEL_DOWN)
      this.processAction(action, event)
    }
  }

  /**
   * Click handler
   */
  onClick(event) {

    //Get data
    const {board, game} = this
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

    //Clicked on move variation, select that variation
    if (game.isMoveVariation(x, y)) {
      this.selectMoveVariation(x, y)
    }
    else {
      this.playMove(x, y)
    }
  }

  /**
   * Position update event
   */
  onPositionUpdate() {
    this.renderMarkers()
  }

  /**
   * Game loaded
   */
  onGameLoad() {
    this.stopAutoPlay()
  }

  /**
   * On grid enter
   */
  onGridEnter(event) {
    this.showHoverStone(event)
  }

  /**
   * On grid leave
   */
  onGridLeave() {
    this.clearHover()
  }

  /**************************************************************************
   * Actions
   ***/

  /**
   * Process a bound action
   */
  processAction(action, event) {

    //No action
    if (!action) {
      return
    }

    //Debug
    this.debug(`🎯 action ${action}`)

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
    const {player, game, isAutoPlaying} = this

    //If we're remembering chosen variations, get the variation index
    const remember = player.getConfig('rememberVariationPaths')
    const i = remember ? game.getCurrentPathIndex() : 0

    //Stop auto play
    if (isAutoPlaying) {
      this.stopAutoPlay()
    }

    //Go to next position
    player.goToNextPosition(i)

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

    //Stop auto play
    if (isAutoPlaying) {
      this.stopAutoPlay()
    }

    //Go to previous position
    player.goToPreviousPosition()

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

      //Advance to the next position
      player.goToNextPosition()

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
   * Render markers
   */
  renderMarkers() {

    //Get data
    const {player, game} = this
    const {node} = game

    //Get settings
    const showLastMove = player.getConfig('showLastMove')
    const showNextMove = player.getConfig('showNextMove')
    const showVariations = player.getConfig('showVariations')
    const showSiblingVariations = player.getConfig('showSiblingVariations')
    const numberVariationMoves = player.getConfig('numberVariationMoves')

    //Clear hover and last move markers
    this.clearHover()
    this.clearMarkers()

    //Show sibling variations
    if (showVariations && showSiblingVariations) {
      if (node.parent && node.parent.hasMultipleMoveVariations()) {
        this.addMoveVariationMarkers(node.parent)
      }
    }

    //Show child variations or next move if we have more than one move variation
    if ((showVariations || showNextMove) && node.hasMultipleMoveVariations()) {
      this.addMoveVariationMarkers(node, showVariations)
    }

    //Show next move only
    else if (showNextMove && node.hasMoveVariations()) {
      this.addMoveVariationMarkers(node, false)
    }

    //Number variation moves
    if (numberVariationMoves && node.isVariationBranch()) {
      this.numberVariationMoves(node)
    }

    //Last move
    else if (showLastMove) {
      this.addLastMoveMarker(node)
    }
  }

  /**
   * Add move variation markers
   */
  addMoveVariationMarkers(node, showText = false) {

    //Get data
    const {board, markers} = this
    const variations = node.getMoveVariations()

    //Loop variations
    variations.forEach((variation, i) => {

      //Get data
      const {move} = variation
      const {x, y, color: displayColor} = move

      //Not on top of stones (if displaying sibling variations)
      if (board.has(boardLayerTypes.STONES, x, y)) {
        return
      }

      //Construct data for factory
      const index = i
      const isSelected = node.isSelectedPath(variation)
      const data = {index, displayColor, showText, isSelected}

      //Add to markers
      markers.push({x, y})

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
    const i = game.getMoveVariationIndex(x, y)

    //Follow a move variation
    player.goToNextPosition(i)
  }

  /**
   * Add last move marker
   */
  addLastMoveMarker(node) {

    //Not a play move
    if (!node.isPlayMove()) {
      return
    }

    //Get data
    const {board, markers} = this
    const {x, y} = node.move

    //Store
    markers.push({x, y})

    //Add to board
    board
      .add(boardLayerTypes.MARKUP, x, y, MarkupFactory
        .create(markupTypes.LAST_MOVE, board))
  }

  /**
   * Number variation moves
   */
  numberVariationMoves(node) {

    //Get variation nodes
    const {board, markers} = this
    const nodes = node.getVariationMoveNodes()

    //Loop each
    nodes.forEach((node, i) => {

      //Get node data
      const {x, y} = node.move
      const number = i + 1

      //Store
      markers.push({x, y})

      //Add to board
      board
        .add(boardLayerTypes.MARKUP, x, y, MarkupFactory
          .create(markupTypes.MOVE_NUMBER, board, {number}))
    })
  }

  /**
   * Clear markers
   */
  clearMarkers() {

    //Get data
    const {board, markers} = this
    if (!board) {
      return
    }

    //Remove markers
    markers.forEach(({x, y}) => board.remove(boardLayerTypes.MARKUP, x, y))
    this.markers = []

    //Redraw grid layer to fill in erased gaps
    board
      .getLayer(boardLayerTypes.GRID)
      .redraw()
  }

  /**
   * Play a move
   */
  playMove(x, y) {

    //Get player
    const {player} = this

    //Not allowed
    if (!player.getConfig('allowMovesInReplayMode')) {
      return
    }

    //Play move
    const outcome = player.playMove(x, y)
    if (outcome.isValid) {
      player.playSound('move')
    }
  }

  /**
   * Show hover stone
   */
  showHoverStone(event) {

    //Check if needed
    const {player, game} = this
    if (!player.getConfig('allowMovesInReplayMode')) {
      return
    }

    //Get data
    const {x, y} = event.detail
    const color = game.getTurn()

    //Parent method
    super.showHoverStone(x, y, color)
  }
}
