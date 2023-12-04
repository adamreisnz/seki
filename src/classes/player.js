import Base from './base.js'
import Board from './board.js'
import Game from './game.js'
import EventHandler from './event-handler.js'
import PlayerModeFactory from './player-mode-factory.js'
import {playerModes} from '../constants/player.js'
import {defaultPlayerConfig} from '../constants/defaults.js'
import {
  getPixelRatio,
  isKeyDownEvent,
  isMouseEvent,
} from '../helpers/util.js'

/**
 * This class brings the board to life and allows a user to interact with it.
 * It handles user input, controls objects going to the board, can load game
 * records, and allows the user to manipulate the board according to the current
 * player mode. Unless you want to display static positions, this is the class
 * you'd use by default.
 */
export default class Player extends Base {

  //Props
  board
  elements = {}
  modeHandlers = {}
  audioElements = {}
  activeMode

  //Mouse event helper vars
  lastDetail = null
  dragDetail = null
  isMouseDown = false
  isDragging = false

  /**
   * Constructor
   */
  constructor(config) {

    //Parent constructor
    super()

    //Create mode handlers
    this.createModeHandlers()

    //Initialise
    this.initBoard(config.board, config.theme)
    this.initGame()
    this.initConfig(config)
  }

  /**
   * Create mode handlers
   */
  createModeHandlers() {

    //Modes to set up
    const modes = [
      playerModes.STATIC,
      playerModes.REPLAY,
      playerModes.EDIT,
      playerModes.PLAY,
    ]

    //Instantiate
    for (const mode of modes) {
      this.modeHandlers[mode] = PlayerModeFactory.create(mode, this)
    }
  }

  /**
   * Initialise board
   */
  initBoard(boardConfig, themeConfig) {
    this.board = new Board(boardConfig, themeConfig)
  }

  /**
   * Initialise game
   */
  initGame(game, info) {

    //Create new game and reset path
    this.game = game || new Game(info)
    this.path = null

    //Propagate events
    this.game.on('info', event => {
      this.triggerEvent('gameInfo', event.detail)
    })
    this.game.on('positionChange', event => {
      this.triggerEvent('gamePositionChange', event.detail)
    })

    //Restricted nodes
    this.restrictedStartNode = null
    this.restrictedEndNode = null
  }

  /**
   * Extend player with methods
   */
  extend(method, mode) {

    //Ensure doesn't already exist
    if (typeof this[method] !== 'undefined') {
      return
    }

    //Debug
    this.debug(
      `extending with ${method} method for ${mode} mode`,
    )

    //Extend
    this[method] = (...args) => {

      //Check if mode is active
      if (!this.isModeActive(mode)) {
        this.warn(`not calling ${method} method as ${mode} mode is not active`)
        return
      }

      //Log
      this.debug(`calling ${method} method for ${mode} mode`)

      //Get handler
      const handler = this.getModeHandler(mode)
      if (!handler) {
        this.warn(`not calling ${method} method as ${mode} has no handler`)
        return
      }

      //Call method
      return handler[method](...args)
    }
  }

  /*****************************************************************************
   * Configuration
   ***/

  /**
   * Initialise configuration
   */
  initConfig(config) {

    //Extend from default config
    super.initConfig(config, defaultPlayerConfig)

    //Get initial mode
    const {initialMode} = this.config

    //Switch to the configured mode
    this.setMode(initialMode)
  }

  /**
   * Load configuration from a game if allowed
   */
  loadConfigFromGame(game) {

    //Check if allowed
    if (!this.getConfig('allowPlayerConfig')) {
      return
    }

    //Get config
    const config = game.getSettings()

    //Load config
    this.loadConfig(config)
  }

  /*****************************************************************************
   * Mode handling
   ***/

  /**
   * Check if a specific player mode is available
   */
  isModeAvailable(mode) {
    if (mode === playerModes.STATIC) {
      return true
    }
    const availableModes = this.getConfig('availableModes', [])
    return availableModes.includes(mode)
  }

  /**
   * Check if a specific player mode is active
   */
  isModeActive(mode) {
    return (this.activeMode === mode)
  }

  /**
   * Get active mode
   */
  getActiveMode() {
    return this.activeMode
  }

  /**
   * Get mode handler for a given mode
   */
  getModeHandler(mode) {

    //No mode specified
    if (!mode) {
      throw new Error(`No mode specified`)
    }

    //Get mode handlers
    const {modeHandlers} = this

    //Check if handler needs to be instantiated
    if (!modeHandlers[mode]) {
      modeHandlers[mode] = PlayerModeFactory.create(mode, this)
    }

    //Return handler
    return modeHandlers[mode]
  }

  /**
   * Get current mode handler
   */
  getCurrentModeHandler() {
    const {activeMode} = this
    if (activeMode) {
      return this.getModeHandler(activeMode)
    }
  }

  /**
   * Switch the active player mode
   */
  setMode(mode) {

    //Already active
    if (this.isModeActive(mode)) {
      this.debug(`${mode} mode is already active`)
      return
    }

    //Check if available
    if (!this.isModeAvailable(mode)) {
      this.debug(`${mode} mode is not available`)
      return
    }

    //Get handlers
    const currentHandler = this.getCurrentModeHandler()
    const newHandler = this.getModeHandler(mode)

    //Deactivate current mode
    if (currentHandler) {
      currentHandler.deactivate()
    }

    //Activate new mode
    if (newHandler) {
      newHandler.activate()
    }

    //Set active mode
    this.activeMode = mode
    this.triggerEvent('modeChange', {mode})
    return
  }

  /*****************************************************************************
   * Game handling
   ***/

  /**
   * Start new game
   */
  newGame(info) {
    const game = new Game(info)
    this.loadGame(game)
  }

  /**
   * Load game from data
   */
  loadData(data) {
    const game = Game.fromData(data)
    this.loadGame(game)
  }

  /**
   * Load game
   */
  loadGame(game) {
    this.initGame(game)
    this.processLoadedGame()
  }

  /**
   * Process loaded game
   */
  processLoadedGame() {

    //Get game and board
    const {game, board} = this

    //Load game config and trigger event
    this.loadConfigFromGame(game)
    this.triggerEvent('gameLoad', {game})

    //Go to first position
    game.goToFirstPosition()

    //Reset board
    if (board) {
      board.reset()
      board.loadConfigFromGame(game)
      this.processPathChange()
    }
  }

  /*****************************************************************************
   * Navigation
   ***/

  /**
   * Go to the next position
   */
  goToNextPosition() {

    //No next position
    if (!this.game.hasNextPosition()) {
      return
    }

    //At restricted end node
    if (this.isAtRestrictedEndNode()) {
      return
    }

    //Get path index
    const i = this.game.getCurrentPathIndex()

    //Go to next position
    this.game.goToNextPosition(i)
    this.processPathChange()
  }

  /**
   * Go to the previous position
   */
  goToPreviousPosition() {

    //No previous position
    if (!this.game.hasPreviousPosition()) {
      return
    }

    //At restricted start node
    if (this.isAtRestrictedStartNode()) {
      return
    }

    //Go to previous position
    this.game.goToPreviousPosition()
    this.processPathChange()
  }

  /**
   * Go to the last position
   */
  goToLastPosition() {

    //Already at last position
    if (!this.game.hasNextPosition()) {
      return
    }

    //Go to last position
    this.game.goToLastPosition()
    this.processPathChange()
  }

  /**
   * Go to the first position
   */
  goToFirstPosition() {

    //Already at first position
    if (!this.game.hasPreviousPosition()) {
      return
    }

    //Go to first position
    this.game.goToFirstPosition()
    this.processPathChange()
  }

  /**
   * Go to the previous fork
   */
  goToPreviousFork() {
    this.game.goToPreviousFork()
    this.processPathChange()
  }

  /**
   * Go to the next fork
   */
  goToNextFork() {
    this.game.goToNextFork()
    this.processPathChange()
  }

  /**
   * Go to the next position with a comment
   */
  goToNextComment() {
    this.game.goToNextComment()
    this.processPathChange()
  }

  /**
   * Go back to the previous position with a comment
   */
  goToPreviousComment() {
    this.game.goToPreviousComment()
    this.processPathChange()
  }

  /**
   * Go forward a number of positions
   */
  goForwardNumPositions(num) {
    num = num || this.getConfig('numSkipMoves')
    this.game.goForwardNumPositions(num)
    this.processPathChange()
  }

  /**
   * Go backward a number of positions
   */
  goBackNumPositions(num) {
    num = num || this.getConfig('numSkipMoves')
    this.game.goBackNumPositions(num)
    this.processPathChange()
  }

  /**
   * Go to a specific target node
   */
  goToNode(target) {
    this.game.goToNode(target)
    this.processPathChange()
  }

  /**
   * Go to a specific named node
   */
  goToNamedNode(name) {
    this.game.goToNamedNode(name)
    this.processPathChange()
  }

  /**
   * Select the previous variation
   */
  selectNextVariation() {
    this.game.selectNextVariation()
    this.triggerEvent('variationChange')
  }

  /**
   * Select the next variation
   */
  selectPreviousVariation() {
    this.game.selectPreviousVariation()
    this.triggerEvent('variationChange')
  }

  /**
   * Play a move
   */
  playMove(x, y) {
    const outcome = this.game.playMove(x, y)
    if (outcome.isValid) {
      this.processPathChange()
    }
    return outcome
  }

  /**
   * Play a pass move
   */
  passMove(x, y) {
    const outcome = this.game.passMove(x, y)
    if (outcome.isValid) {
      this.processPathChange()
    }
    return outcome
  }

  /**
   * Set the current node as restricted start node
   */
  setRestrictedStartNode() {
    this.restrictedStartNode = this.game.node
  }

  /**
   * Set the current node as restricted end node
   */
  setRestrictedEndNode() {
    this.restrictedEndNode = this.game.node
  }

  /**
   * Is restricted start node
   */
  isAtRestrictedStartNode() {
    const {game, restrictedStartNode} = this
    return (game && restrictedStartNode && game.node === restrictedStartNode)
  }

  /**
   * Is restricted end node
   */
  isAtRestrictedEndNode() {
    const {game, restrictedEndNode} = this
    return (game && restrictedEndNode && game.node === restrictedEndNode)
  }

  /**
   * Process path change
   */
  processPathChange() {

    //Check if path changed
    const path = this.game.getPath()
    const pathChanged = !path.isSameAs(this.path)

    //Path didn't change
    if (!pathChanged) {
      return
    }

    //Get data
    const node = this.game.getCurrentNode()

    //Debug
    this.debug('path changed')

    //Update board position
    this.updateBoardPosition()

    //Copy new path and trigger path change event
    this.path = path.clone()
    this.triggerEvent('pathChange', {node})

    //Named node reached?
    if (node.name) {
      this.triggerEvent(`namedNode`, {node})
    }

    //Passed?
    if (node.move && node.move.pass) {
      this.triggerEvent('pass', {node})
    }
  }

  /*****************************************************************************
   * Scoring
   ***/

  /**
   * Score the current game position
   */
  // scoreGame() {

  //   //Get game and create new came scorer
  //   const {game} = this
  //   const scorer = new GameScorer(game)

  //   //Calculate score
  //   scorer.calculate()

  //   //Get score, points and captures
  //   const score = scorer.getScore()
  //   const points = scorer.getPoints()
  //   const captures = scorer.getCaptures()

  //   //Remove all markup, and set captures and points
  //   this.board.removeAllMarkup()
  //   this.board.layers.score.setAll(points, captures)

  //   //Broadcast score
  //   this.triggerEvent('score', {score})
  // }

  /*****************************************************************************
   * Board handling
   ***/

  /**
   * Get the board
   */
  getBoard() {
    return this.board
  }

  /**
   * Set the board
   */
  setBoard(board) {

    //Set it
    this.board = board

    //Set up board
    this.board.removeAll()
    this.board.loadConfigFromGame(this.game)

    //Update board position
    this.updateBoardPosition()
  }

  /**
   * Update the board position
   */
  updateBoardPosition() {
    const {board, game} = this
    const position = game.getPosition()
    if (board) {
      board.updatePosition(position)
    }
  }

  /*****************************************************************************
   * Bootstrapping
   ***/

  /**
   * Bootstrap
   */
  bootstrap(container) {

    //Already bootstrapped
    if (this.elements.container) {
      throw new Error(`Player has already been bootstrapped`)
    }

    //Link element
    this.elements.container = container

    //Create audio elements
    this.createAudioElements()

    //Bootstrap board
    this.bootstrapBoard()

    //Setup listeners
    this.setupDocumentListeners()
    this.setupElementListeners()
  }

  /**
   * Bootstrap board
   */
  bootstrapBoard() {

    //Get player element
    const {elements, board} = this
    const {container} = elements

    //Bootstrap it and link it to the player
    board.bootstrap(container)
    board.linkPlayer(this)
  }

  /**
   * Create audio elements
   */
  createAudioElements() {

    //Get audio config
    const audio = this.getConfig('audio')
    const {container} = this.elements

    //Create audio elements
    for (const key in audio) {
      if (!audio[key]) {
        continue
      }
      const audioElement = document.createElement('audio')
      audioElement.src = audio[key]
      container.appendChild(audioElement)
      this.audioElements[key] = audioElement
    }
  }

  /**
   * Play sound
   */
  playSound(type) {

    //Check if enabled
    if (!this.getConfig('playSounds')) {
      return
    }

    //Get audio element
    const audioElement = this.audioElements[type]
    if (audioElement) {
      try {
        audioElement.play()
      }
      catch (error) {
        //Fall through
      }
    }
  }

  /**
   * Stop sound
   */
  stopSound(type) {
    const audioElement = this.audioElements[type]
    if (audioElement) {
      try {
        audioElement.pause()
        audioElement.currentTime = 0
      }
      catch (error) {
        //Fall through
      }
    }
  }

  /**************************************************************************
   * Event handling
   ***/

  /**
   * Setup document listeners
   */
  setupDocumentListeners() {

    //Create event handler
    this.documentEventHandler = new EventHandler(document)

    //Propagate keydown events
    this.documentEventHandler.on('keydown', event => {
      this.triggerEvent('keydown', {nativeEvent: event})
    })

    //Handle mouse up events that occurred outside of the board element
    this.documentEventHandler.on('mousedown', () => {
      this.isMouseDown = true
    })
    this.documentEventHandler.on('mousemove', () => {
      if (this.isMouseDown) {
        this.isDragging = true
      }
    })

    //Handle mouse up events that occurred outside of the board element
    this.documentEventHandler.on('click', () => {
      this.isMouseDown = false
      this.isDragging = false
    })
  }

  /**
   * Setup element listeners
   */
  setupElementListeners() {

    //Get board
    const {board} = this
    if (!board.elements.board) {
      return
    }

    //Get event types
    const eventTypes = [
      'click',
      'wheel',
      'mousedown',
      'mouseup',
      'mousemove',
      'mouseout',
    ]

    //Create event handler
    this.elementEventHandler = new EventHandler(board.elements.board)

    //Setup listeners
    for (const type of eventTypes) {
      this.elementEventHandler.on(type, (event) => {
        event.preventDefault()
        this.triggerEvent(type, {nativeEvent: event})
      })
    }
  }

  /**
   * Get action for a key down event
   */
  getActionForKeyDownEvent(nativeEvent) {

    //Debug
    this.debug(`#️⃣ key ${nativeEvent.key}`)

    //Find binding
    const binding = this
      .getConfig('keyBindings')
      .find(binding => isKeyDownEvent(nativeEvent, binding))

    //Return action if found
    if (binding) {
      return binding.action
    }
  }

  /**
   * Get action for given mouse event
   */
  getActionForMouseEvent(nativeEvent) {

    //Find binding
    const binding = this
      .getConfig('mouseBindings')
      .find(binding => isMouseEvent(nativeEvent, binding))

    //Return action if found
    if (binding) {
      return binding.action
    }
  }

  /**
   * Process an action (pass to mode handler)
   */
  processAction(action) {
    this
      .getCurrentModeHandler()
      .processAction(action)
  }

  /**
   * Trigger an event
   */
  triggerEvent(type, detail) {

    //No detail provided, or not a mouse event, just trigger
    if (!detail || !type.match(/^mouse|click/)) {
      return super.triggerEvent(type, detail)
    }

    //Append grid coordinates
    this.appendCoordinatesToEvent(detail)

    //Capture/reset drag detail
    if (type === 'mousedown') {
      this.captureDragDetail(detail)
    }
    else if (type === 'click') {
      this.resetDragDetail()
    }

    //Trigger grid entry/leave events
    if (type === 'mousemove' || type === 'mouseout') {
      this.triggerGridEvent(detail)
    }

    //Parent method
    super.triggerEvent(type, detail)
  }

  /**
   * Trigger grid entry/leave events
   */
  triggerGridEvent(detail) {

    //Get data
    const {lastDetail} = this
    const {x, y, isDragging} = detail

    //Last coordinates are the same? Ignore, unless we started dragging
    if (
      lastDetail &&
      lastDetail.isDragging === isDragging &&
      lastDetail.x === x &&
      lastDetail.y === y
    ) {
      return
    }

    //Remember last detail
    this.lastDetail = detail

    //Trigger grid leave and entry events
    this.triggerEvent('gridLeave', lastDetail)
    this.triggerEvent('gridEnter', detail)
  }

  /**
   * Capture drag detail
   */
  captureDragDetail(detail) {
    const {x, y} = detail
    if (this.board.isOnBoard(x, y)) {
      this.dragDetail = detail
    }
  }

  /**
   * Stop dragging
   */
  resetDragDetail() {
    this.dragDetail = null
  }

  /**
   * Helper to append coordinates to a mouse event
   */
  appendCoordinatesToEvent(detail) {

    //Get board
    const {board, isDragging} = this
    const {nativeEvent} = detail

    //Can only do this with a native mouse event
    if (!nativeEvent) {
      detail.x = -1
      detail.y = -1
      detail.area = []
      return
    }

    //Get data
    const {offsetX, offsetY} = nativeEvent
    const pixelRatio = getPixelRatio()

    //Apply pixel ratio factor
    const absX = offsetX * pixelRatio
    const absY = offsetY * pixelRatio

    //Append coords
    const x = board.getGridX(absX)
    const y = board.getGridY(absY)
    const area = this.getDragArea(x, y)

    //Append details
    Object.assign(detail, {x, y, area, isDragging})
  }

  /**
   * Get drag area
   */
  getDragArea(x, y) {

    //Get data
    const {board, dragDetail} = this

    //Not dragging
    if (!dragDetail) {
      return [{x, y}]
    }

    //Determine coordinates
    const fromX = Math.max(0, Math.min(dragDetail.x, x))
    const toX = Math.min(board.width - 1, Math.max(dragDetail.x, x))
    const fromY = Math.max(0, Math.min(dragDetail.y, y))
    const toY = Math.min(board.height - 1, Math.max(dragDetail.y, y))

    //Create area
    const area = []
    for (let x = fromX; x <= toX; x++) {
      for (let y = fromY; y <= toY; y++) {
        area.push({x, y})
      }
    }

    //Return area
    return area
  }
}
