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
   * Initialise
   */
  init() {

    //Extend player
    this.extendPlayer()

    //Create bound event listeners
    this.createBoundListeners({
      keydown: 'onKeyDown',
      click: 'onClick',
      wheel: 'onMouseWheel',
      config: 'onConfigChange',
      pathChange: 'onPathChange',
      variationChange: 'onVariationChange',
      analysisChange: 'onAnalysisChange',
      gameLoad: 'onGameLoad',
    })
  }

  /**
   * Tear down
   */
  teardown() {
    super.teardown()
    this.stopAutoPlay()
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
    player.extend('toggleAutoPlay', mode)
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
    const {player, board} = this
    const {nativeEvent} = event.detail
    const action = player.getActionForMouseEvent(nativeEvent)

    //Clear hover
    board.clearHoverLayer()

    //Process action
    if (action) {
      this.processAction(action, event)
    }
  }

  /**
   * Click handler
   */
  onClick(event) {

    //Check if valid coordinates
    if (!this.hasValidCoordinates(event)) {
      return
    }

    //Get data
    const {player, game} = this
    const {x, y} = event.detail

    //Clicked on move variation, select that variation
    if (game.isMoveVariation(x, y)) {
      this.selectMoveVariation(x, y)
    }
    else {
      player.goToNextPosition()
    }
  }

  /**
   * Config change event
   */
  onConfigChange(event) {

    //Changing the auto play delay mid-play re-queues the next move, so that
    //the new delay takes effect immediately. NOTE: this used to live on a
    //second, separately registered config listener, which was never part of
    //the event listeners map and so could never be removed again.
    if (event.detail.key === 'autoPlayDelay' && this.isAutoPlaying) {
      this.queueNextAutoPlay()
    }

    //The following config keys require a board redraw
    const redrawKeys = [
      'showLastMove',
      'showNextMove',
      'showVariations',
      'showSiblingVariations',
      'showAllMoveNumbers',
      'showLastMoveNumber',
      'showVariationMoveNumbers',
      'rememberVariationPaths',
      'showAnalysis',
      'showAnalysisOwnership',
    ]

    //Clear keys
    const clearKeys = [
      'showAllMoveNumbers',
      'showVariationMoveNumbers',
    ]

    //Redraw board if needed
    if (redrawKeys.includes(event.detail.key)) {

      //Clear all markers
      if (clearKeys.includes(event.detail.key)) {
        this.clearMarkers()
      }

      //Use patch change event to render the markers
      this.onPathChange()
    }
  }

  /**
   * Path change event
   */
  onPathChange() {

    //Get data
    const {player, game, isAutoPlaying} = this

    //Reset path index if not remembering
    if (!player.getConfig('rememberVariationPaths')) {
      game.resetCurrentPathIndex()
    }

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
   * On variation change
   */
  onVariationChange() {
    this.renderMarkers()
  }

  /**
   * On analysis change
   */
  onAnalysisChange() {
    this.renderMarkers()
  }

  /**************************************************************************
   * Actions
   ***/

  /**
   * Process an action
   */
  processAction(action, event) {

    //Parent method
    if (super.processAction(action, event)) {
      return true
    }

    //Get data
    const {player} = this

    //Determine action
    switch (action) {

      //Auto play
      case playerActions.START_AUTO_PLAY:
        player.startAutoPlay()
        return true
      case playerActions.STOP_AUTO_PLAY:
        player.stopAutoPlay()
        return true
      case playerActions.TOGGLE_AUTO_PLAY:
        player.toggleAutoPlay()
        return true
    }

    //No action was performed
    return false
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
    const {player, game, isAutoPlaying} = this
    const autoPlayStartsImmediately = player.getConfig('autoPlayStartsImmediately')

    //Already auto playing or no next position?
    if (isAutoPlaying || !game.hasNextPosition()) {
      return
    }

    //If starting immediately, go to the next position right away
    if (autoPlayStartsImmediately) {
      player.goToNextPosition()
    }

    //Toggle flag and queue next move
    this.isAutoPlaying = true
    this.queueNextAutoPlay()

    //Trigger event
    player.triggerEvent('autoPlayToggle', {isAutoPlaying: true})
  }

  /**
   * Stop auto play
   */
  stopAutoPlay() {

    //Get data
    const {player, autoPlayTimeout} = this

    //Clear timeout
    clearTimeout(autoPlayTimeout)

    //Clear flags
    this.isAutoPlaying = false
    this.autoPlayTimeout = null

    //Trigger event
    player.triggerEvent('autoPlayToggle', {isAutoPlaying: false})
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
      player.triggerEvent('autoPlayed')
    }, autoPlayDelay)
  }

  /**
   * Render markers
   */
  renderMarkers() {

    //Get data
    const {player, game, board} = this
    const {node} = game

    //Get settings
    const showLastMove = player.getConfig('showLastMove')
    const showNextMove = player.getConfig('showNextMove')
    const showVariations = player.getConfig('showVariations')
    const showSiblingVariations = player.getConfig('showSiblingVariations')
    const showAllMoveNumbers = player.getConfig('showAllMoveNumbers')
    const showLastMoveNumber = player.getConfig('showLastMoveNumber')
    const showVariationMoveNumbers = player.getConfig('showVariationMoveNumbers')
    const showAnalysis = player.getConfig('showAnalysis')

    //Clear hover layer
    board.clearHoverLayer()

    //Clear exsting markers
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

    //Show last move number
    else if (showLastMoveNumber) {
      this.numberLastMove(node)
    }

    //Last move
    else if (showLastMove) {
      this.addLastMoveMarker(node)
    }

    //Show the AI analysis overlay. This goes on last, because it is only ever
    //on the board because it was asked for, so it should win where it lands on
    //the same point as a marker we generated ourselves. Markup the record
    //itself carries is still left alone, as it is everywhere else.
    if (showAnalysis) {
      this.addAnalysisMarkers(node)
      this.renderAnalysisOwnership(node)
    }
  }

  /**
   * Add analysis candidate markers
   *
   * NOTE: the candidates belong to the position at this node, so they are the
   * suggestions for the move to play from here. The node's own loss and
   * quality describe the move that reached it, which is a different turn's
   * analysis and has no place on the board.
   */
  addAnalysisMarkers(node) {

    //Get data
    const {board, markers} = this
    const candidates = node.analysis?.candidates

    //Nothing to show
    if (!candidates || candidates.length === 0) {
      return
    }

    //A single candidate needs no ranking next to it
    const showText = (candidates.length > 1)

    //Loop candidates
    candidates.forEach((candidate, i) => {

      //Get data
      const {x, y, loss} = candidate

      //A pass has no home on the board
      if (typeof x !== 'number' || typeof y !== 'number') {
        return
      }

      //Not on top of stones
      if (board.has(boardLayerTypes.STONES, x, y)) {
        return
      }

      //Already has markup on this coordinate, preserve it
      if (node.hasMarkup(x, y)) {
        return
      }

      //Construct data for factory
      const index = i
      const isBest = (i === 0)
      const data = {index, loss, isBest, showText}

      //Add to markers
      markers.push({x, y})

      //Add to board
      board
        .add(boardLayerTypes.MARKUP, x, y, MarkupFactory
          .create(markupTypes.CANDIDATE, board, data))
    })
  }

  /**
   * Render the ownership heat map for a node
   */
  renderAnalysisOwnership(node) {

    //Get data
    const {player, board} = this
    const showOwnership = player.getConfig('showAnalysisOwnership')
    const ownership = node.analysis?.ownership

    //Not showing it, or nothing to show. The layer is cleared along with the
    //markers, so there is nothing to take off the board here.
    if (!showOwnership || !ownership) {
      return
    }

    //Hand it to the analysis layer
    board.setAll(boardLayerTypes.ANALYSIS, ownership)
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

      //Already has markup on this coordinate, preserve it
      if (node.hasMarkup(x, y)) {
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

    //Already has markup on this coordinate, preserve it
    if (node.hasMarkup(x, y)) {
      return
    }

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
    nodes.forEach((moveNode, i) => {

      //Get node data
      const {x, y} = moveNode.move
      const number = i + 1

      //Already has markup on this coordinate, preserve it
      if (node.hasMarkup(x, y)) {
        return
      }

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
    nodes.forEach((moveNode, i) => {

      //Get node data
      const {x, y} = moveNode.move
      const number = i + 1

      //Already has markup on this coordinate, preserve it
      if (node.hasMarkup(x, y)) {
        return
      }

      //Store
      markers.push({x, y})

      //Add to board
      board
        .add(boardLayerTypes.MARKUP, x, y, MarkupFactory
          .create(markupTypes.MOVE_NUMBER, board, {number}))
    })
  }

  /**
   * Number last move
   */
  numberLastMove(node) {

    //Not a move node
    if (!node.isMove()) {
      return
    }

    //Get data
    const {board, markers} = this
    const {x, y} = node.move
    const number = node.getMoveNumber()

    //Already has markup on this coordinate, preserve it
    if (node.hasMarkup(x, y)) {
      return
    }

    //Store
    markers.push({x, y})

    //Add to board
    board
      .add(boardLayerTypes.MARKUP, x, y, MarkupFactory
        .create(markupTypes.MOVE_NUMBER, board, {number}))
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
    markers.forEach(({x, y}) => board.removeMarkup(x, y))

    //Reset markers array
    this.markers = []

    //Take the analysis overlay down with them, as it describes the position
    //we are leaving just as much as the markers do
    board.removeAll(boardLayerTypes.ANALYSIS)
  }
}
