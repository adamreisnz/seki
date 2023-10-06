import Base from './base.js'
import Board from './board.js'
import Game from './game.js'
import GameScorer from './game-scorer.js'
import EventHandler from './event-handler.js'
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
export default class Player extends Base {

  //Props
  board
  modeHandlers = {}
  availableTools = []
  activeMode
  activeTool

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

    //Go to first move
    game.first()

    //Reset board
    board.reset()
    board.loadConfigFromGame(game)
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

    //Get initial mode and tool
    const {initialMode, initialTool} = this.config

    //Switch to the configured mode and tool
    this.switchMode(initialMode)
    this.switchTool(initialTool)
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
   * Mode and tool handling
   ***/

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
   * Get active tool
   */
  getActiveTool() {
    return this.activeTool
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
    this.triggerEvent('mode', {mode})
  }

  /**
   * Switch the active player tool
   */
  switchTool(tool) {

    //Already active
    if (this.isToolActive(tool)) {
      this.debug(`${tool} tool is already active`)
      return
    }

    //Validate
    if (!this.isToolAvailable(tool)) {
      this.debug(`${tool} tool is not available`)
      return
    }

    //Set active tool
    this.activeTool = tool
    this.debug(`${tool} tool activated`)
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

    //Set
    this.game = game
    this.path = null

    //Load game config and trigger event
    this.loadConfigFromGame(game)
    this.triggerEvent('game', {game})

    //Go to first move
    game.first()

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
  next(i) {

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
    this.game.last()
    this.processPosition()
  }

  /**
   * Go to the first position
   */
  first() {
    this.game.first()
    this.processPosition()
  }

  /**
   * Go to a specific move number, tree path or named node
   */
  goto(target) {

    //Must have target
    if (!target) {
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
    this.game.previousFork()
    this.processPosition()
  }

  /**
   * Go to the next fork
   */
  nextFork() {
    this.game.nextFork()
    this.processPosition()
  }

  /**
   * Go to the next position with a comment
   */
  nextComment() {

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

    //At restricted start node
    if (this.isAtRestrictedStartNode()) {
      return
    }

    //Go to previous commented position
    this.game.previousComment()
    this.processPosition()
  }

  /**
   * Play a move
   */
  play(x, y) {
    if (this.game.play(x, y)) {
      this.processPosition()
    }
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

    //Get current node and game position
    const node = this.game.getNode()
    const path = this.game.getPath()
    const position = this.game.getPosition()
    const pathChanged = !path.compare(this.path)

    //Update board
    this.updateBoard(position, pathChanged)

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
  updateBoard(position, pathChanged) {

    //Get board
    const {board} = this
    if (!board) {
      return
    }

    //Update board with new position
    board.updatePosition(position, pathChanged)
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
