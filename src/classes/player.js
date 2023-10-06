import Board from './board.js'
import Game from './game.js'
import GameScorer from './game-scorer.js'
import EventHandler from './event-handler.js'
import MarkupFactory from './markup-factory.js'
import PlayerModeFactory from './player-mode-factory.js'
import {boardLayerTypes} from '../constants/board.js'
import {markupTypes} from '../constants/markup.js'
import {
  playerTools,
  playerModes,
  defaultPlayerConfig,
} from '../constants/player.js'

/**
 * This class brings the board to life and allows a user to interact with it.
 * It handles user input, controls objects going to the board, can load game
 * records, and allows the user to manipulate the board according to the current
 * player mode. Unless you want to display static positions, this is the class
 * you'd use by default.
 */
export default class Player extends EventTarget {

  /**
   * Constructor
   */
  constructor(config) {

    //Parent constructor
    super()

    //Initialise
    this.init()

    //Initialize config
    this.initConfig(config)
  }

  /**
   * Initialization
   */
  init() {

    //Unlink board instance, create new game
    this.board = null
    this.game = new Game()

    //Reset path
    this.path = null

    //Available tools and instantiated mode handlers
    this.availableTools = []
    this.modeHandlers = {}

    //Active player mode and tool
    this.activeMode = undefined
    this.activeTool = undefined

    //Restricted nodes
    this.restrictedStartNode = null
    this.restrictedEndNode = null
  }

  /*****************************************************************************
   * Configuration
   ***/

  /**
   * Initialise configuration
   */
  initConfig(config) {

    //Extend from default config
    config = Object.assign({}, defaultPlayerConfig, config || {})

    //Store config
    this.config = config

    //Get initial mode and tool
    const {initialMode, initialTool} = config

    //Switch to the configured mode and tool
    this.switchMode(initialMode)
    this.switchTool(initialTool)
  }

  /**
   * Get a config flag
   */
  getConfig(key, defaultValue) {
    if (this.config[key] === undefined) {
      return defaultValue
    }
    return this.config[key]
  }

  /**
   * Set a config flag
   */
  setConfig(key, value) {
    this.config[key] = value
  }

  /**
   * Load configuration from a game if allowed
   */
  loadGameConfig() {

    //No game
    const {game} = this
    if (!game) {
      return
    }

    //Check if allowed
    if (!this.getConfig('allowPlayerConfig')) {
      return
    }

    //No settings
    const settings = game.getInfo('settings')
    if (!settings) {
      return
    }

    //Set config
    for (const key in settings) {
      this.setConfig(key, settings[key])
    }
  }

  /*****************************************************************************
   * Mode and tool handling
   ***/

  /**
   * Virtual mode shortcut
   */
  get mode() {
    return this.getCurrentModeHandler()
  }

  /**
   * Set available tools
   *
   * NOTE: This is usually set by the mode handler, and not directly
   * configured on the player itself
   */
  setAvailableTools(tools) {

    //Ensure array
    if (!Array.isArray(tools)) {
      tools = tools ? [tools] : []
    }

    //Must include NONE tool
    if (!tools.includes(playerTools.NONE)) {
      tools.push(playerTools.NONE)
    }

    //Set available tools
    this.availableTools = tools

    //Reset active tool if invalid
    if (tools.includes(this.tool)) {
      this.switchTool(tools[0])
    }
  }

  /**
   * Check if a specific player mode is available
   */
  isModeAvailable(mode) {
    if (mode === playerModes.NONE) {
      return true
    }
    const availableModes = this.getConfig('availableModes', [])
    return availableModes.includes(mode)
  }

  /**
   * Check if we have a player tool available
   */
  isToolAvailable(tool) {
    return this.availableTools.includes(tool)
  }

  /**
   * Check if a specific player mode is active
   */
  isModeActive(mode) {
    return (this.activeMode === mode)
  }

  /**
   * Check if a specific player tool is active
   */
  isToolActive(tool) {
    return (this.activeTool === tool)
  }

  /**
   * Get mode handler for a given mode
   */
  getModeHandler(mode) {

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
      return
    }

    //Check if available
    if (!this.isModeAvailable(mode)) {
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
    this.triggerEvent('mode', {mode})
  }

  /**
   * Switch the active player tool
   */
  switchTool(tool) {

    //Already active
    if (this.isToolActive(tool)) {
      return
    }

    //Validate
    if (!this.isToolAvailable(tool)) {
      return
    }

    //Set active tool
    this.activeTool = tool
    this.triggerEvent('tool', {tool})
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
      mode, tool,
      restrictedStartNode, restrictedEndNode,
    } = this.playerState

    //Restore
    this.switchMode(mode)
    this.switchTool(tool)
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
    const {board} = this

    //Set
    this.game = game
    this.path = null

    //Load game config and trigger event
    this.loadGameConfig()
    this.triggerEvent('game', {game})

    //Go to first move
    game.first()

    //Board present?
    if (board) {
      const boardConfig = game.getInfo('board')
      board.removeAll()
      board.setConfig(boardConfig)
      this.processPosition()
    }
  }

  /**
   * Save the current state
   */
  saveGameState() {
    if (this.game && this.game.isLoaded) {
      this.gameState = this.game.getState()
    }
  }

  /**
   * Restore to the saved state
   */
  restoreGameState() {

    //Must have game and saved state
    if (!this.game || !this.gameState) {
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
  next(i) {

    //Must have game
    if (!this.game || !this.game.isLoaded) {
      return
    }

    //At restricted end node
    if (this.isAtRestrictedEndNode()) {
      return
    }

    //Go to next position
    this.game.next(i)
    this.processPosition()
  }

  /**
   * Go back to the previous position
   */
  previous() {

    //Must have game
    if (!this.game || !this.game.isLoaded) {
      return
    }

    //At restricted start node
    if (this.isAtRestrictedStartNode()) {
      return
    }

    //Go to previous position
    this.game.previous()
    this.processPosition()
  }

  /**
   * Go to the last position
   */
  last() {

    //Must have game
    if (!this.game || !this.game.isLoaded) {
      return
    }

    //Go to last position
    this.game.last()
    this.processPosition()
  }

  /**
   * Go to the first position
   */
  first() {

    //Must have game
    if (!this.game || !this.game.isLoaded) {
      return
    }

    //Go to first position
    this.game.first()
    this.processPosition()
  }

  /**
   * Go to a specific move number, tree path or named node
   */
  goto(target) {

    //Must have game and target
    if (!this.game || !this.game.isLoaded || !target) {
      return
    }

    //Go to target
    this.game.goto(target)
    this.processPosition()
  }

  /**
   * Go to the previous fork
   */
  previousFork() {

    //Must have game
    if (!this.game || !this.game.isLoaded) {
      return
    }

    //Go to previous fork
    this.game.previousFork()
    this.processPosition()
  }

  /**
   * Go to the next fork
   */
  nextFork() {

    //Must have game
    if (!this.game || !this.game.isLoaded) {
      return
    }

    //Go to next fork
    this.game.nextFork()
    this.processPosition()
  }

  /**
   * Go to the next position with a comment
   */
  nextComment() {

    //Must have game
    if (!this.game || !this.game.isLoaded) {
      return
    }

    //At restricted end node
    if (this.isAtRestrictedEndNode()) {
      return
    }

    //Go to next commented position
    this.game.nextComment()
    this.processPosition()
  }

  /**
   * Go back to the previous position with a comment
   */
  previousComment() {

    //Must have game
    if (!this.game || !this.game.isLoaded) {
      return
    }

    //At restricted start node
    if (this.isAtRestrictedStartNode()) {
      return
    }

    //Go to previous commented position
    this.game.previousComment()
    this.processPosition()
  }

  /**
   * Set the current node as restricted start node
   */
  setRestrictedStartNode() {
    const {game} = this
    if (game && game.isLoaded && game.node) {
      this.restrictedStartNode = game.node
    }
  }

  /**
   * Set the current node as restricted end node
   */
  setRestrictedEndNode() {
    const {game} = this
    if (game && game.isLoaded && game.node) {
      this.restrictedEndNode = game.node
    }
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

    //No game?
    if (!this.game || !this.game.isLoaded) {
      return
    }

    //Get current node and game position
    const node = this.game.getNode()
    const path = this.game.getPath()
    const position = this.game.getPosition()
    const pathChanged = !path.compare(this.path)

    //Update board
    this.updateBoard(node, position, pathChanged)

    //Path change?
    if (pathChanged) {

      //Copy new path and triggerEvent path change
      this.path = path.clone()
      this.triggerEvent('pathChange', {node})

      //Named node reached? Broadcast event
      if (node.name) {
        this.triggerEvent(`nodeReached.${node.name}`, {node})
      }
    }

    //Passed?
    if (node.move && node.move.pass) {
      this.triggerEvent('pass', {node})
    }
  }

  /**
   * Show move numbers
   */
  showMoveNumbers(fromMove, toMove) {

    //No game?
    if (!this.game || !this.game.isLoaded) {
      return
    }

    //Use sensible defaults if no from/to moves given
    fromMove = fromMove || 1
    toMove = toMove || this.game.getMove()

    //Get nodes for these moves
    let nodes = this.game.getMoveNodes(fromMove, toMove)
    let move = fromMove

    //Loop nodes
    for (const node of nodes) {
      this.board.add(boardLayerTypes.MARKUP, node.move.x, node.move.y, {
        type: markupTypes.LABEL,
        text: move++,
      })
    }

    //Redraw board markup
    this.board.redraw(boardLayerTypes.MARKUP)
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
  setBoard(Board) {

    //Set the board
    this.board = Board

    //If a game has been loaded already, parse config and update the board
    if (this.game && this.game.isLoaded) {
      this.board.removeAll()
      this.board.setConfig(this.game.getInfo('board'))
      this.processPosition()
    }
  }

  /**
   * Update the board
   */
  updateBoard(node, position, pathChanged) {

    //Get board
    const {board} = this
    if (!board) {
      return
    }

    //Update board with new position
    board.updatePosition(position, pathChanged)

    //Get settings
    const markupType = this.getConfig('lastMoveMarkupType')

    //Mark last move
    if (markupType && node.move && !node.move.pass) {
      const {x, y} = node.move
      const marker = MarkupFactory.create(markupType)
      board.add(boardLayerTypes.MARKUP, x, y, marker)
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
    this.applyClasses(element)

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

    //Bootstrap it
    board.bootstrap(boardElement, element)

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
   * Apply classes
   */
  applyClasses() {
    if (this.element) {
      this.element.classList.add('seki-player')
    }
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
   * Bind event listener to player
   */
  on(type, listener) {
    this.addEventListener(type, listener)
  }

  /**
   * Remove event listener from player
   */
  off(type, listener) {
    this.removeEventListener(type, listener)
  }

  /**
   * Trigger an event
   */
  triggerEvent(type, detail) {

    //Must have type
    if (!type) {
      return
    }

    //Append grid coordinates for mouse events
    if (type.match(/^mouse|click|hover/) && detail) {
      this.appendCoordinatesToEvent(detail)
    }

    //Create new event
    const event = new CustomEvent(type, {detail})

    //Dispatch
    this.dispatchEvent(event)
  }

  /**
   * Helper to append coordinates to a mouse event
   */
  appendCoordinatesToEvent(detail) {

    //Get board
    const {board} = this
    const {nativeEvent: mouseEvent} = detail

    //Can only do this with a board and mouse event
    if (!board || !mouseEvent) {
      detail.x = -1
      detail.y = -1
      return
    }

    //Init
    let x = 0
    let y = 0

    //Set x
    if (typeof mouseEvent.offsetX !== 'undefined') {
      x = mouseEvent.offsetX
    }
    else if (
      mouseEvent.originalEvent &&
      typeof mouseEvent.originalEvent.offsetX !== 'undefined'
    ) {
      x = mouseEvent.originalEvent.offsetX
    }
    else if (
      mouseEvent.originalEvent &&
      typeof mouseEvent.originalEvent.layerX !== 'undefined'
    ) {
      x = mouseEvent.originalEvent.layerX
    }

    //Set y
    if (typeof mouseEvent.offsetY !== 'undefined') {
      y = mouseEvent.offsetY
    }
    else if (
      mouseEvent.originalEvent &&
      typeof mouseEvent.originalEvent.offsetY !== 'undefined'
    ) {
      y = mouseEvent.originalEvent.offsetY
    }
    else if (
      mouseEvent.originalEvent &&
      typeof mouseEvent.originalEvent.layerY !== 'undefined'
    ) {
      y = mouseEvent.originalEvent.layerY
    }

    //Apply pixel ratio factor
    x *= (window.devicePixelRatio || 1)
    y *= (window.devicePixelRatio || 1)

    //Append coords
    detail.x = board.getGridX(x)
    detail.y = board.getGridY(y)

    //Did we drag?
    if (mouseEvent.drag) {
      detail.drag = mouseEvent.drag
    }
  }
}
