import PlayerMode from './player-mode.js'
import Grid from '../grid.js'
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

  //The points the AI overlay has a marker on, which the markers above leave
  //to it rather than drawing over
  aiPoints = new Set()

  /**
   * Initialise
   */
  init() {

    //Extend player
    this.extendPlayer()

    //Create bound event listeners
    this.createBoundListeners(this.getEventListeners())
  }

  /**
   * Get the event listeners this mode needs
   *
   * NOTE: exposed as a method so that the modes extending this one can compose
   * their own map from it. They used to restate the whole map, which meant a
   * listener added here reached none of them, silently.
   */
  getEventListeners() {
    return {
      keydown: 'onKeyDown',
      click: 'onClick',
      wheel: 'onMouseWheel',
      config: 'onConfigChange',
      pathChange: 'onPathChange',
      variationChange: 'onVariationChange',
      analysisChange: 'onAnalysisChange',
      gameLoad: 'onGameLoad',
    }
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

    //The AI overlay goes on first, because it is only ever on the board
    //because it was asked for, so it should win where it lands on the same
    //point as a marker we generate ourselves. It lives on a layer of its own,
    //so winning means the markers below stand aside rather than being drawn
    //over, which is what aiPoints below is for. Markup the record itself
    //carries is still left alone, as it is everywhere else.
    if (showAnalysis) {
      this.addAnalysisMarkers(node)
      this.renderAnalysisOwnership(node)
    }

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
    const {board} = this
    const candidates = node.analysis?.candidates

    //Nothing to show
    if (!candidates || candidates.length === 0) {
      return
    }

    //Each marker says what its move gives up, which is worth reading even
    //when there is only one of them. A theme that would rather have bare
    //markers returns an empty string from the text handler.
    const showText = true

    //The move that was actually played from this position is the node's main
    //line child. Derived from the tree rather than flagged in the analysis
    //data, so every stored analysis gets the distinction for free.
    const child = node.getChild(0)
    const played = (child && child.isPlayMove()) ? child.move : null

    //Collect the markers on a grid of their own, as the whole set is handed to
    //the layer at once
    const grid = new Grid(board.width, board.height)

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
      const isPlayed = Boolean(played && played.x === x && played.y === y)
      const data = {index, loss, isBest, isPlayed, showText}

      //Add to the grid, remembering the point so that the markers we generate
      //ourselves know to leave it to us
      grid.set(x, y, MarkupFactory.create(markupTypes.CANDIDATE, board, data))
      this.aiPoints.add(`${x},${y}`)
    })

    //Hand the lot to the layer
    board.setAll(boardLayerTypes.AI, grid)
  }

  /**
   * Check if the AI overlay has a marker on a coordinate
   */
  hasAiMarker(x, y) {
    return this.aiPoints.has(`${x},${y}`)
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

      //The AI overlay has this point, leave it to it
      if (this.hasAiMarker(x, y)) {
        return
      }

      //Construct data for factory
      const index = i
      const isSelected = node.isSelectedPath(variation)
      const data = {index, displayColor, showText, isSelected}

      //Add to board, recording what we put there
      const markup = MarkupFactory.create(markupTypes.VARIATION, board, data)
      markers.push({x, y, markup})
      board.add(boardLayerTypes.MARKUP, x, y, markup)
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

    //The AI overlay has this point, leave it to it
    if (this.hasAiMarker(x, y)) {
      return
    }

    //Add to board, recording what we put there
    const markup = MarkupFactory.create(markupTypes.LAST_MOVE, board)
    markers.push({x, y, markup})
    board.add(boardLayerTypes.MARKUP, x, y, markup)
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

      //The AI overlay has this point, leave it to it
      if (this.hasAiMarker(x, y)) {
        return
      }

      //Add to board, recording what we put there
      const markup = MarkupFactory.create(markupTypes.MOVE_NUMBER, board, {number})
      markers.push({x, y, markup})
      board.add(boardLayerTypes.MARKUP, x, y, markup)
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

      //The AI overlay has this point, leave it to it
      if (this.hasAiMarker(x, y)) {
        return
      }

      //Add to board, recording what we put there
      const markup = MarkupFactory.create(markupTypes.MOVE_NUMBER, board, {number})
      markers.push({x, y, markup})
      board.add(boardLayerTypes.MARKUP, x, y, markup)
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

    //The AI overlay has this point, leave it to it
    if (this.hasAiMarker(x, y)) {
      return
    }

    //Add to board, recording what we put there
    const markup = MarkupFactory.create(markupTypes.MOVE_NUMBER, board, {number})
    markers.push({x, y, markup})
    board.add(boardLayerTypes.MARKUP, x, y, markup)
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

    //Remove the markers, but only where what is on the board is still the one
    //we put there.
    //
    //NOTE: this used to remove by coordinate alone, which took the record's
    //own markup off the board with it. Moving to a node that carries markup on
    //a point we had marked has the position sync draw that markup before we
    //get here, so removing the coordinate erased it until the next full
    //redraw.
    markers.forEach(({x, y, markup}) => {
      if (board.get(boardLayerTypes.MARKUP, x, y) === markup) {
        board.removeMarkup(x, y)
      }
    })

    //Reset markers array
    this.markers = []

    //Take the AI overlay down with them, as it describes the position we are
    //leaving just as much as the markers do. Both of its layers are cleared
    //as a whole, so there is nothing to match up cell by cell here.
    this.aiPoints.clear()
    board.removeAll(boardLayerTypes.AI)
    board.removeAll(boardLayerTypes.ANALYSIS)
  }
}
