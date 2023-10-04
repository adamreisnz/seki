import Game from './game.js'
import GameScorer from './game-scorer.js'
import EventHandler from './event-handler.js'
import {playerTools, defaultPlayerConfig} from '../constants/player.js'
import {boardLayerTypes} from '../constants/board.js'
import {markupTypes} from '../constants/markup.js'

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

    //Set config
    if (config) {
      this.setConfig(config)
    }
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

    //Player mode and active tool
    this.mode = ''
    this.tool = ''

    //Arrow keys / scroll wheel navigation
    this.arrowKeysNavigation = false
    this.scrollWheelNavigation = false

    //Last move marker
    this.lastMoveMarker = ''

    //Variation markup
    this.variationMarkup = false
    this.variationChildren = false
    this.variationSiblings = false

    //Restricted nodes
    this.restrictNodeStart = null
    this.restrictNodeEnd = null
  }

  /*****************************************************************************
   * Configuration
   ***/

  /**
   * Set configuration
   */
  setConfig(config) {

    //Validate
    if (!config || typeof config !== 'object') {
      return
    }

    //Extend from default config
    config = Object.assign({}, defaultPlayerConfig, config)

    //Process settings
    this.switchMode(config.mode)
    this.switchTool(config.tool)
    this.setArrowKeysNavigation(config.arrowKeysNavigation)
    this.setScrollWheelNavigation(config.scrollWheelNavigation)
    this.setLastMoveMarker(config.lastMoveMarker)
    this.setVariationMarkup(
      config.variationMarkup,
      config.variationChildren,
      config.variationSiblings,
    )

    //Let the modes set their own config
    for (const mode of this.modes) {
      mode.setConfig(config)
    }
  }

  /**
   * Set arrow keys navigation
   */
  setArrowKeysNavigation(arrowKeys) {
    if (arrowKeys !== this.arrowKeysNavigation) {
      this.arrowKeysNavigation = arrowKeys
      this.triggerEvent('settingChange', 'arrowKeysNavigation')
    }
  }

  /**
   * Set scroll wheel navigation
   */
  setScrollWheelNavigation(scrollWheel) {
    if (scrollWheel !== this.scrollWheelNavigation) {
      this.scrollWheelNavigation = scrollWheel
      this.triggerEvent('settingChange', 'scrollWheelNavigation')
    }
  }

  /**
   * Set the last move marker
   */
  setLastMoveMarker(lastMoveMarker) {
    if (lastMoveMarker !== this.lastMoveMarker) {
      this.lastMoveMarker = lastMoveMarker
      this.triggerEvent('settingChange', 'lastMoveMarker')
    }
  }

  /**
   * Set variation markup on the board
   */
  setVariationMarkup(variationMarkup, variationChildren, variationSiblings) {

    //One change event for these three settings
    let change = false

    //Markup setting change?
    if (variationMarkup !== this.variationMarkup) {
      this.variationMarkup = variationMarkup
      change = true
    }

    //Children setting change?
    if (
      typeof variationChildren !== 'undefined' &&
      variationChildren !== this.variationChildren
    ) {
      this.variationChildren = variationChildren
      change = true
    }

    //Siblings setting change?
    if (
      typeof variationSiblings !== 'undefined' &&
      variationSiblings !== this.variationSiblings
    ) {
      this.variationSiblings = variationSiblings
      change = true
    }

    //Did anything change?
    if (change) {
      this.triggerEvent('settingChange', 'variationMarkup')
    }
  }

  /*****************************************************************************
   * Mode and tool handling
   ***/

  /**
   * Register a player mode
   */
  registerMode(mode, PlayerMode) {

    //Register the mode and let it parse the configuration
    this.modes[mode] = PlayerMode

    //Parse config if we have a handler
    if (this.modes[mode].parseConfig) {
      this.modes[mode].parseConfig.call(this, this.config)
    }

    //Force switch the mode now, if it matches the initial mode
    if (this.mode === mode) {
      this.switchMode(this.mode, true)
      this.switchTool(this.tool, true)
    }
  }

  /**
   * Set available tools
   */
  setTools(tools) {
    this.tools = tools || [playerTools.NONE]
  }

  /**
   * Check if we have a player mode
   */
  hasMode(mode) {
    return this.modes[mode] ? true : false
  }

  /**
   * Check if we have a player tool
   */
  hasTool(tool) {
    return (this.tools.indexOf(tool) !== -1)
  }

  /**
   * Switch player mode
   */
  switchMode(mode, force) {

    //No change?
    if (!force && (!mode || this.mode === mode)) {
      return false
    }

    //Broadcast mode exit
    if (this.mode) {
      this.triggerEvent('modeExit', this.mode)
    }

    //Set mode, reset tools and active tool
    this.mode = mode
    this.tools = []
    this.tool = playerTools.NONE

    //Broadcast mode entry
    this.triggerEvent('modeEnter', this.mode)
    return true
  }

  /**
   * Switch player tool
   */
  switchTool(tool, force) {

    //No change?
    if (!force && (!tool || this.tool === tool)) {
      return false
    }

    //Validate tool switch (only when there is a mode)
    if (this.mode && this.modes[this.mode] && this.tools.indexOf(tool) === -1) {
      return false
    }

    //Change tool
    this.tool = tool
    this.triggerEvent('toolSwitch', this.tool)
    return true
  }

  /**
   * Save the full player state
   */
  saveState() {

    //Save player state
    this.playerState = {
      mode: this.mode,
      tool: this.tool,
      restrictNodeStart: this.restrictNodeStart,
      restrictNodeEnd: this.restrictNodeEnd,
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

    //Restore
    this.switchMode(this.playerState.mode)
    this.switchTool(this.playerState.tool)
    this.restrictNodeStart = this.playerState.restrictNodeStart
    this.restrictNodeEnd = this.playerState.restrictNodeEnd

    //Restore game state
    this.restoreGameState()
  }

  /*****************************************************************************
   * Game record handling
   ***/

  /**
   * Load game record
   */
  load(data, allowPlayerConfig) {

    //Try to load the game record data
    this.game.load(data)

    //Reset path
    this.path = null

    //Parse configuration from JGF if allowed
    if (allowPlayerConfig || typeof allowPlayerConfig === 'undefined') {
      this.parseConfig(this.game.getInfo('settings'))
    }

    //Dispatch game loaded event
    this.triggerEvent('gameLoaded', this.game)

    //Board present?
    if (this.board) {
      this.board.removeAll()
      this.board.parseConfig(this.game.getInfo('board'))
      this.processPosition()
    }

    //Loaded ok
    return true
  }

  /**
   * Reload the existing game record
   */
  reload() {

    //Must have game
    if (!this.game || !this.game.isLoaded) {
      return
    }

    //Reload game
    this.game.reload()

    //Update board
    if (this.board) {
      this.board.removeAll()
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
    if (this.game && this.game.node !== this.restrictNodeEnd) {
      this.game.next(i)
      this.processPosition()
    }
  }

  /**
   * Go back to the previous position
   */
  previous() {
    if (this.game && this.game.node !== this.restrictNodeStart) {
      this.game.previous()
      this.processPosition()
    }
  }

  /**
   * Go to the last position
   */
  last() {
    if (this.game) {
      this.game.last()
      this.processPosition()
    }
  }

  /**
   * Go to the first position
   */
  first() {
    if (this.game) {
      this.game.first()
      this.processPosition()
    }
  }

  /**
   * Go to a specific move number, tree path or named node
   */
  goto(target) {
    if (this.game && target) {
      this.game.goto(target)
      this.processPosition()
    }
  }

  /**
   * Go to the previous fork
   */
  previousFork() {
    if (this.game) {
      this.game.previousFork()
      this.processPosition()
    }
  }

  /**
   * Go to the next fork
   */
  nextFork() {
    if (this.game) {
      this.game.nextFork()
      this.processPosition()
    }
  }

  /**
   * Go to the next position with a comment
   */
  nextComment() {
    if (this.game && this.game.node !== this.restrictNodeEnd) {
      this.game.nextComment()
      this.processPosition()
    }
  }

  /**
   * Go back to the previous position with a comment
   */
  previousComment() {
    if (this.game && this.game.node !== this.restrictNodeStart) {
      this.game.previousComment()
      this.processPosition()
    }
  }

  /**
   * Restrict navigation to the current node
   */
  restrictNode(end) {

    //Must have game and node
    if (!this.game || !this.game.node) {
      return
    }

    //Restrict to current node
    if (end) {
      this.restrictNodeEnd = this.game.node
    }
    else {
      this.restrictNodeStart = this.game.node
    }
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
    let node = this.game.getNode()
    let path = this.game.getPath()
    let position = this.game.getPosition()
    let pathChanged = !path.compare(this.path)

    //Update board
    this.updateBoard(node, position, pathChanged)

    //Path change?
    if (pathChanged) {

      //Copy new path and triggerEvent path change
      this.path = path.clone()
      this.triggerEvent('pathChange', node)

      //Named node reached? Broadcast event
      if (node.name) {
        this.triggerEvent('reachedNode.' + node.name, node)
      }
    }

    //Passed?
    if (node.move && node.move.pass) {
      this.triggerEvent('movePassed', node)
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
    this.triggerEvent('scoreCalculated', score)
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

    //Get data
    const {board, lastMoveMarker} = this

    //Must have board
    if (!board) {
      return
    }

    //Update board with new position
    board.updatePosition(position, pathChanged)

    //Mark last move
    if (lastMoveMarker && node.move && !node.move.pass) {
      board
        .add(boardLayerTypes.MARKUP, node.move.x, node.move.y, lastMoveMarker)
    }

    //Broadcast board update event
    this.triggerEvent('boardUpdate', node)
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

    //Setup document listeners
    this.setupDocumentListeners()
    this.setupElementListeners()
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
  applyClasses(element) {
    element.classList.add('seki-player')
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
        this.triggerEvent(type, {originalEvent: event})
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
        this.triggerEvent(type, {originalEvent: event})
      })
    }
  }

  /**
   * Bind event listener to player
   */
  on(type, listener) {

    //Must have valid listener
    if (typeof listener !== 'function') {
      throw new Error(`Invalid listener provided: ${listener}`)
    }

    //Array of event types
    const types = type.split(' ')

    //Apply
    for (const type of types) {
      this.addEventListener(`seki.${type}`, (event) => {

        //Dragging? Prevent click events from firing
        if (this.preventClickEvent && type === 'click') {
          this.preventClickEvent = false
          return
        }
        else if (type === 'mousedrag') {
          this.preventClickEvent = true
        }

        //Call listener
        listener(event)
      })
    }
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
    const event = new CustomEvent(`seki.${type}`, {detail})

    //Dispatch
    this.dispatchEvent(event)
  }

  /**
   * Helper to append coordinates to a mouse event
   */
  appendCoordinatesToEvent(detail) {

    //Get board
    const {board} = this
    const {originalEvent: mouseEvent} = detail

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
