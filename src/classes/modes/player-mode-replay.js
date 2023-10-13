import PlayerMode from './player-mode.js'
import MarkupFactory from '../markup-factory.js'
import {boardLayerTypes} from '../../constants/board.js'
import {markupTypes} from '../../constants/markup.js'
import {playerModes, playerActions} from '../../constants/player.js'

/**
 * Replay game records with this mode
 */
export default class PlayerModeReplay extends PlayerMode {

  //Mode type
  mode = playerModes.REPLAY

  //Auto play settings
  isAutoPlaying = false
  autoPlayTimeout = null

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
      pathChange: 'onPathChange',
      gameLoad: 'onGameLoad',
      config: 'onPathChange',
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

  /**************************************************************************
   * Event listeners
   ***/

  /**
   * Keydown events
   */
  onKeyDown(event) {

    //Get data
    const {player} = this
    const {nativeEvent} = event.detail
    const action = player.getActionForKeyDownEvent(nativeEvent)

    //Process action
    if (action) {
      this.processAction(action, event)
    }
  }

  /**
   * Handler for mousewheel events
   */
  onMouseWheel(event) {

    //Get data
    const {player} = this
    const {nativeEvent} = event.detail
    const action = player.getActionForMouseEvent(nativeEvent)

    //Clear hover
    this.clearHover()

    //Process action
    if (action) {
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
  onPathChange() {

    //Get data
    const {game, isAutoPlaying} = this

    //Check if auto playing
    if (isAutoPlaying) {
      if (!game.hasNextPosition()) {
        this.stopAutoPlay()
      }
      else {
        this.queueNextAutoPlay()
      }
    }

    //Render markers
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

    //Parent method
    if (super.processAction(action, event)) {
      return true
    }

    //Get player
    const {player} = this

    //Determine action
    switch (action) {
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
      case playerActions.SELECT_NEXT_VARIATION:
        this.selectNextVariation()
        return true
      case playerActions.SELECT_PREV_VARIATION:
        this.selectPreviousVariation()
        return true
      case playerActions.TOGGLE_AUTO_PLAY:
        this.toggleAutoPlay()
        return true
    }

    //No action was performed
    return false
  }

  /**
   * Select next variation
   */
  selectNextVariation() {
    this.player.selectNextVariation()
    this.renderMarkers()
  }

  /**
   * Select previous variation
   */
  selectPreviousVariation() {
    this.player.selectPreviousVariation()
    this.renderMarkers()
  }

  /**
   * Toggle auto play
   */
  toggleAutoPlay() {
    if (this.isAutoPlaying) {
      this.stopAutoPlay()
    }
    else {
      this.startAutoPlay()
    }
  }

  /**
   * Start auto play
   */
  startAutoPlay() {

    //Get data
    const {game, isAutoPlaying} = this

    //Already auto playing or no next position?
    if (isAutoPlaying || !game.hasNextPosition()) {
      return
    }

    //Toggle flag and queue next move
    this.isAutoPlaying = true
    this.queueNextAutoPlay()
  }

  /**
   * Stop auto play
   */
  stopAutoPlay() {

    //Get data
    const {autoPlayTimeout} = this

    //Clear timeout
    clearTimeout(autoPlayTimeout)

    //Clear flags
    this.isAutoPlaying = false
    this.autoPlayTimeout = null
  }

  /**
   * Queue next auto play move
   */
  queueNextAutoPlay() {

    //Get data
    const {player, autoPlayTimeout} = this
    const autoPlayDelay = player.getConfig('autoPlayDelay', 1000)

    //Clear any existing timeout
    clearTimeout(autoPlayTimeout)

    //Create timeout for next move
    this.autoPlayTimeout = setTimeout(() => {
      player.goToNextPosition()
    }, autoPlayDelay)
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
    const showAllMoveNumbers = player.getConfig('showAllMoveNumbers')
    const showVariationMoveNumbers = player.getConfig('showVariationMoveNumbers')

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

    //Show all move numbers
    if (showAllMoveNumbers) {
      this.numberAllMoves(node)
    }

    //Number variation moves
    else if (showVariationMoveNumbers && node.isVariationBranch()) {
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
   * Number all moves
   */
  numberAllMoves(node) {

    //Get variation nodes
    const {board, markers} = this
    const nodes = node.getAllMoveNodes()

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
    markers.forEach(({x, y}) => {
      board.remove(boardLayerTypes.MARKUP, x, y)
      this.redrawGridCell(x, y)
    })

    //Reset markers array
    this.markers = []
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
