import Base from './base.js'
import Board from './board.js'
import Game from './game.js'
import GameScorer from './game-scorer.js'
import EventHandler from './event-handler.js'
import PlayerModeFactory from './player-mode-factory.js'
import {playerModes} from '../constants/player.js'
import {defaultPlayerConfig} from '../constants/defaults.js'
import {
  getPixelRatio,
  addClass,
  removeClass,
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
  modeHandlers = {}
  audioElements = {}
  activeMode

  //Mouse coordinates helper var
  mouse = {
    lastX: -1,
    lastY: -1,
  }

  /**
   * Constructor
   */
  constructor(config) {

    //Parent constructor
    super()

    //Initialise
    this.init()
    this.initConfig(config)
  }

  /**
   * Initialization
   */
  init() {

    //Create new game and reset path
    this.game = new Game()
    this.path = null

    //Restricted nodes
    this.restrictedStartNode = null
    this.restrictedEndNode = null
  }

  /**
   * Reset
   */
  reset() {

    //Get board and game
    const {board, config} = this

    //Reset player but preserve config
    this.init()
    this.initConfig(config)

    //Get newly created game
    const {game} = this

    //Go to first position
    game.goToFirstPosition()

    //Reset board
    if (board) {
      board.reset()
      board.loadConfigFromGame(game)
    }
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
        return
      }

      //Call method
      handler[method](...args)
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
    this.switchMode(initialMode)
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
    const config = game.getInfo('settings')

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
  switchMode(mode) {

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
    this.debug(`${mode} mode activated`)
    this.triggerEvent('modeChange', {mode})
  }

  /**************************************************************************
   * State handling
   ***/

  /**
   * Save the full player state
   */
  saveState() {

    //Get data
    const {mode, tool, restrictedStartNode, restrictedEndNode} = this

    //Save player state
    this.playerState = {
      mode,
      tool,
      restrictedStartNode,
      restrictedEndNode,
    }

    //Save game state
    this.saveGameState()
  }

  /**
   * Restore to the saved player state
   */
  restoreState() {

    //Must have player state
    if (!this.playerState) {
      return
    }

    //Get data
    const {
      mode, restrictedStartNode, restrictedEndNode,
    } = this.playerState

    //Restore
    this.switchMode(mode)
    this.restrictedStartNode = restrictedStartNode
    this.restrictedEndNode = restrictedEndNode

    //Restore game state
    this.restoreGameState()
  }

  /*****************************************************************************
   * Game record handling
   ***/

  /**
   * Load game data
   */
  load(data) {

    //Create new game
    const game = Game.fromData(data)

    //Set
    this.game = game
    this.path = null

    //Load game config and trigger event
    this.loadConfigFromGame(game)
    this.triggerEvent('gameLoad', {game})

    //Go to first position
    game.goToFirstPosition()

    //Board present?
    if (this.board) {
      this.board.removeAll()
      this.board.loadConfigFromGame(game)
      this.processPosition()
    }
  }

  /**
   * Save the current state
   */
  saveGameState() {
    this.gameState = this.game.getState()
  }

  /**
   * Restore to the saved state
   */
  restoreGameState() {

    //Must have saved state
    if (!this.gameState) {
      return
    }

    //Restore state
    this.game.restoreState(this.gameState)

    //Update board
    if (this.board) {
      this.board.removeAll()
      this.processPosition()
    }
  }

  /*****************************************************************************
   * Navigation
   ***/

  /**
   * Go to the next position
   */
  goToNextPosition(i) {

    //No next position
    if (!this.game.hasNextPosition()) {
      return
    }

    //At restricted end node
    if (this.isAtRestrictedEndNode()) {
      return
    }

    //Go to next position
    this.game.goToNextPosition(i)
    this.processPosition()
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
    this.processPosition()
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
    this.processPosition()
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
    this.processPosition()
  }

  /**
   * Go to the previous fork
   */
  goToPreviousFork() {
    this.game.goToPreviousFork()
    this.processPosition()
  }

  /**
   * Go to the next fork
   */
  goToNextFork() {
    this.game.goToNextFork()
    this.processPosition()
  }

  /**
   * Go to the next position with a comment
   */
  goToNextComment() {
    this.game.goToNextComment()
    this.processPosition()
  }

  /**
   * Go back to the previous position with a comment
   */
  goToPreviousComment() {
    this.game.goToPreviousComment()
    this.processPosition()
  }

  /**
   * Go forward a number of positions
   */
  goForwardNumPositions(num) {
    num = num || this.getConfig('numSkipMoves')
    this.game.goForwardNumPositions(num)
    this.processPosition()
  }

  /**
   * Go backward a number of positions
   */
  goBackNumPositions(num) {
    num = num || this.getConfig('numSkipMoves')
    this.game.goBackNumPositions(num)
    this.processPosition()
  }

  /**
   * Select the previous variation
   */
  selectNextVariation() {
    this.game.selectNextVariation()
    this.processPosition()
  }

  /**
   * Select the next variation
   */
  selectPreviousVariation() {
    this.game.selectPreviousVariation()
    this.processPosition()
  }

  /**
   * Play a move
   */
  playMove(x, y) {
    const outcome = this.game.playMove(x, y)
    if (outcome.isValid) {
      this.processPosition()
    }
    return outcome
  }

  /**
   * Play a pass move
   */
  passMove(x, y) {
    const outcome = this.game.passMove(x, y)
    if (outcome.isValid) {
      this.processPosition()
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
   * Process a new game position
   */
  processPosition() {

    //Check if path changed
    const path = this.game.getPath()
    const pathChanged = !path.isSameAs(this.path)

    //No change
    if (!pathChanged) {
      return
    }

    //Debug
    this.debug('path changed')

    //Get node and position
    const position = this.game.getPosition()
    const node = this.game.getCurrentNode()

    //Update board
    this.updateBoard(position)

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
   * Game handling
   ***/

  /**
   * Start a new game
   */
  newGame() {
    this.game = new Game()
    this.processPosition()
  }

  /**
   * Score the current game position
   */
  scoreGame() {

    //Get game and create new came scorer
    const {game} = this
    const scorer = new GameScorer(game)

    //Calculate score
    scorer.calculate()

    //Get score, points and captures
    const score = scorer.getScore()
    const points = scorer.getPoints()
    const captures = scorer.getCaptures()

    //Remove all markup, and set captures and points
    this.board.layers.markup.removeAll()
    this.board.layers.score.setAll(points, captures)

    //Broadcast score
    this.triggerEvent('score', {score})
  }

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

    //Process position
    this.processPosition()
  }

  /**
   * Update the board
   */
  updateBoard(position) {
    const {board} = this
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
  bootstrap(element) {

    //Already bootstrapped
    if (this.element) {
      throw new Error(`Player has already been bootstrapped!`)
    }

    //Link element and apply classes
    this.linkElement(element)
    this.addClass('seki-player')

    //Create audio elements
    this.createAudioElements()

    //Setup listeners
    this.setupDocumentListeners()
    this.setupElementListeners()

    //Bootstrap board
    this.bootstrapBoard(element)
  }

  /**
   * Bootstrap board
   */
  bootstrapBoard() {

    //Get player element
    const {element} = this
    const boardElement = element.children[0]

    //No board element
    if (!boardElement) {
      return
    }

    //Create board
    const board = new Board()

    //Bootstrap it and link it to the player
    board.bootstrap(boardElement, element)
    board.linkPlayer(this)

    //Set board
    this.setBoard(board)
  }

  /**
   * Link the player to a HTML element
   */
  linkElement(element) {
    this.element = element
  }

  /**
   * Create audio elements
   */
  createAudioElements() {

    //Get audio config
    const audio = this.getConfig('audio')
    const {element} = this

    //Create audio elements
    for (const key in audio) {
      if (!audio[key]) {
        continue
      }
      const audioElement = document.createElement('audio')
      audioElement.src = audio[key]
      element.appendChild(audioElement)
      this.audioElements[key] = audioElement
    }
  }

  /**
   * Play sound
   */
  playSound(type) {
    const audioElement = this.audioElements[type]
    if (audioElement) {
      audioElement.play()
    }
  }

  /**
   * Add class to player
   */
  addClass(className) {
    addClass(this.element, className)
  }

  /**
   * Remove class from player
   */
  removeClass(className) {
    removeClass(this.element, className)
  }

  /**************************************************************************
   * Event handling
   ***/

  /**
   * Setup document listeners
   */
  setupDocumentListeners() {

    //Get event types
    const eventTypes = [
      'keydown',
    ]

    //Create event handler
    this.documentEventHandler = new EventHandler(document)

    //Setup listeners
    for (const type of eventTypes) {
      this.documentEventHandler.on(type, (event) => {
        this.triggerEvent(type, {nativeEvent: event})
      })
    }
  }

  /**
   * Setup element listeners
   */
  setupElementListeners() {

    //Get element
    const {element} = this
    const eventTypes = [
      'click',
      'wheel',
      'mousedown',
      'mouseup',
      'mousemove',
      'mouseout',
    ]

    //Create event handler
    this.elementEventHandler = new EventHandler(element)

    //Setup listeners
    for (const type of eventTypes) {
      this.elementEventHandler.on(type, (event) => {
        this.triggerEvent(type, {nativeEvent: event})
      })
    }
  }

  /**
   * Get action for given key code
   */
  getActionForKeyCode(keyCode) {
    const keyBindings = this.getConfig('keyBindings')
    return keyBindings[keyCode]
  }

  /**
   * Get action for given mouse event
   */
  getActionForMouseEvent(mouseEvent) {
    const mouseBindings = this.getConfig('mouseBindings')
    return mouseBindings[mouseEvent]
  }

  /**
   * Trigger an event
   */
  triggerEvent(type, detail) {

    //Append grid coordinates for mouse events
    if (type && detail && type.match(/^mouse|click|hover/)) {
      this.appendCoordinatesToEvent(detail)
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
    const {mouse} = this
    const {lastX, lastY} = mouse
    const {x, y} = detail

    //Last coordinates are the same? Ignore
    if (lastX === x && lastY === y) {
      return
    }

    //Remember last coordinates
    mouse.lastX = x
    mouse.lastY = y

    //Trigger grid leave event
    this.triggerEvent('gridLeave', Object.assign({}, detail, {
      x: lastX,
      y: lastY,
    }))

    //Trigger grid entry event
    this.triggerEvent('gridEnter', detail)
  }

  /**
   * Helper to append coordinates to a mouse event
   */
  appendCoordinatesToEvent(detail) {

    //Get board
    const {board} = this
    const {nativeEvent} = detail

    //Can only do this with a board and mouse event
    if (!board || !nativeEvent) {
      detail.x = -1
      detail.y = -1
      return
    }

    //Get data
    const {offsetX, offsetY} = nativeEvent
    const pixelRatio = getPixelRatio()

    //Apply pixel ratio factor
    const absX = offsetX * pixelRatio
    const absY = offsetY * pixelRatio

    //Append coords
    detail.x = board.getGridX(absX)
    detail.y = board.getGridY(absY)

    //Did we drag?
    if (nativeEvent.drag) {
      detail.drag = nativeEvent.drag
    }
  }
}
