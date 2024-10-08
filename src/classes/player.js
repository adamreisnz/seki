import Base from './base.js'
import Board from './board.js'
import Game from './game.js'
import EventHandler from './event-handler.js'
import PlayerModeFactory from './player-mode-factory.js'
import {playerModes} from '../constants/player.js'
import {defaultPlayerConfig} from '../constants/defaults.js'
import {lowercase} from '../helpers/coordinates.js'
import {
  addClass,
  randomInt,
  getPixelRatio,
  isKeyDownEvent,
  isMouseEvent
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

  //Bootstrapped state
  isBootstrapped = false

  /**
   * Constructor
   */
  constructor(config) {

    //Parent constructor
    super()

    //Create mode handlers
    this.createModeHandlers()

    //Initialise
    this.initBoard(config?.board, config?.theme)
    this.initGame(null, config?.game)
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
      playerModes.SCORE,
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
      this.triggerEvent('info', event.detail)
    })
    this.game.on('positionChange', event => {
      this.triggerEvent('positionChange', event.detail)
    })
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
      `extending with ${method} method for ${mode} mode`
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

    //Debug
    this.debug('processing loaded game')

    //Load game config and trigger event
    this.loadConfigFromGame(game)
    this.triggerEvent('gameLoad', {game})

    //Check handicap
    const handicap = game.getHandicap()
    const hasStones = game.position.hasStones()

    //Go to first position
    game.goToFirstPosition()

    //Place handicap stones if specified in rules and no positions yet
    if (handicap > 1 && !hasStones) {
      game.placeDefaultHandicapStones()
    }

    //Board present
    if (board) {

      //Reset board
      board.removeAll()
      board.loadConfigFromGame(game)

      //Recalculate draw size in case cut-off changed
      board.recalculateDrawSize()

      //Process path change and update board position
      this.processPathChange(true)
      this.updateBoardPosition()
    }
  }

  /*****************************************************************************
   * Navigation
   ***/

  /**
   * Check if we're at a certain node
   */
  isAtNode(node) {
    return this.game.isCurrentNode(node)
  }

  /**
   * Go to the next position
   */
  goToNextPosition() {

    //No next position
    if (!this.game.hasNextPosition()) {
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
   * Go to the previous variation
   */
  goToPreviousVariation() {
    this.game.goToPreviousVariation()
    this.processPathChange()
  }

  /**
   * Go to the next variation
   */
  goToNextVariation() {
    this.game.goToNextVariation()
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
   * Go to a move number
   */
  goToMoveNumber(number) {
    this.game.goToMoveNumber(number)
    this.processPathChange()
  }

  /**
   * Go to a path
   */
  goToPath(path) {
    this.game.goToPath(path)
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
   * Make a node the main variation
   */
  makeMainVariation(node) {
    this.game.makeMainVariation(node)
    this.triggerEvent('variationChange')
  }

  /**
   * Remove a node
   */
  removeNode(node) {
    this.game.removeNode(node)
    this.triggerEvent('edit')
    this.processPathChange()
  }

  /**
   * Play a move
   */
  playMove(x, y, triggerEvent = true) {

    //Play move
    const {game} = this
    const color = game.getTurn()
    const outcome = game.playMove(x, y)

    //Valid outcome
    if (outcome.isValid) {

      //Trigger event
      if (triggerEvent) {
        const str = `${lowercase(x)}${lowercase(y)}`
        this.triggerEvent('move', {color, x, y, str})
      }

      //Play sound
      this.playSound('move')

      //Play capture sounds
      if (game.position.hasCaptures()) {
        const num = Math.min(game.position.getTotalCaptureCount(), 10)
        for (let i = 0; i < num; i++) {
          setTimeout(() => {
            this.stopSound('capture')
            this.playSound('capture')
          }, 150 + randomInt(30, 90) * i)
        }
      }

      //Process path change
      this.processPathChange()
    }

    //Pass on outcome
    return outcome
  }

  /**
   * Play a pass move
   */
  passMove() {

    //Get outcome
    const {game} = this
    const outcome = game.passMove()

    //Valid outcome
    if (outcome.isValid) {

      //Trigger pass event and play sound
      this.triggerEvent('pass')
      this.playSound('pass')

      //Process path change
      this.processPathChange()
    }

    //Pass on outcome
    return outcome
  }

  /**
   * Process path change
   */
  processPathChange(isGameLoad = false) {

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

    //Copy new path
    this.path = path.clone()

    //Trigger path change event if this was not a game load
    if (!isGameLoad) {
      this.triggerEvent('pathChange', {node, path: this.path})
    }

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

    //Debug
    this.debug('🏗️ bootstrapping...')

    //Setup container element
    this.setupContainerElement(container)

    //Create audio elements
    this.createAudioElements()

    //Bootstrap board
    this.bootstrapBoard()

    //Remove any old listeners
    this.teardownDocumentListeners()
    this.teardownElementListeners()

    //Setup listeners
    this.setupDocumentListeners()
    this.setupElementListeners()

    //Emit event
    this.isBootstrapped = true
    this.debug('🏠 bootstrapped!')
    this.triggerEvent('bootstrapped')
  }

  /**
   * Tear down
   */
  teardown() {

    //Debug
    this.debug('🧨 tearing down')

    //Flag as torn down
    this.isTornDown = true

    //Deactivate current mode
    const currentHandler = this.getCurrentModeHandler()
    if (currentHandler) {
      currentHandler.deactivate()
    }

    //Remove listeners
    this.teardownDocumentListeners()
    this.teardownElementListeners()
  }

  /**
   * Setup the container element
   */
  setupContainerElement(container) {
    this.elements.container = container
    container.tabIndex = -1 //To allow it to receive focus
    addClass(container, 'seki-board-container')
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
    const sounds = this.getConfig('sounds')
    const {container} = this.elements

    //Create audio elements
    for (const key in sounds) {
      if (!sounds[key]) {
        continue
      }
      const audioElement = document.createElement('audio')
      audioElement.src = sounds[key]
      container.appendChild(audioElement)
      this.audioElements[key] = audioElement
    }
  }

  /**
   * Play sound
   */
  async playSound(type) {

    //Check if enabled
    if (!this.getConfig('playSounds')) {
      return
    }

    //Get audio element
    const audioElement = this.audioElements[type]
    if (!audioElement) {
      return
    }

    //Get volume and play sound
    const volume = this.getConfig('soundVolume')
    try {
      audioElement.volume = volume
      await audioElement.play()
    }
    catch {
      //Fall through
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
      catch {
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

    //Not needed
    if (!this.getConfig('applyDocumentListeners')) {
      return
    }

    //Create event handler
    this.documentEventHandler = new EventHandler(document)

    //Propagate keydown events
    this.documentEventHandler.on('keydown', event => {
      this.triggerEvent('keydown', {nativeEvent: event})
    })

    //Handle mouse up events that occurred outside of the board element
    this.documentEventHandler.on('mousedown', event => {
      if (event.button === 0) {
        this.isMouseDown = true
      }
    })
    this.documentEventHandler.on('mousemove', event => {
      if (event.button === 0) {
        if (this.isMouseDown) {
          this.isDragging = true
        }
      }
    })
    this.documentEventHandler.on('mouseup', event => {
      if (event.button === 0) {
        this.isMouseDown = false
        this.isDragging = false
      }
    })
    this.documentEventHandler.on('click', event => {
      if (event.button === 0) {
        this.isMouseDown = false
        this.isDragging = false
      }
    })
  }

  /**
   * Tear down document listeners
   */
  teardownDocumentListeners() {
    if (this.documentEventHandler) {
      this.documentEventHandler.removeAllEventListeners()
    }
  }

  /**
   * Setup element listeners
   */
  setupElementListeners() {

    //Not needed
    if (!this.getConfig('applyElementListeners')) {
      return
    }

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
   * Tear down element listeners
   */
  teardownElementListeners() {
    if (this.elementEventHandler) {
      this.elementEventHandler.removeAllEventListeners()
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

    //Torn down?
    if (this.isTornDown) {
      return
    }

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
