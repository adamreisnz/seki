import Base from './base.js'
import Board from './board.js'
import Game from './game.js'
import EventHandler from './event-handler.js'
import PlayerModeFactory from './player-mode-factory.js'
import {playerModes, maxAnalysisSequenceLength} from '../constants/player.js'
import {defaultPlayerConfig} from '../constants/defaults.js'
import {lowercase} from '../helpers/coordinates.js'
import {swapColor} from '../helpers/color.js'
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
  soundTimeouts = []
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
   * Get the mode handler for a given mode, whether or not it is active
   *
   * Most callers want getMode() instead, which only hands back a handler for
   * the mode that is actually active. This one is for reaching a mode before
   * it has been switched to.
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
   * Get the active mode handler
   *
   * This is the supported way to reach the methods a mode provides, as in
   * player.getMode(playerModes.EDIT)?.setEditTool(tool). Pass a mode to ask
   * for that one specifically and get null back unless it is the active one;
   * call it without an argument for whichever mode is active.
   *
   * NOTE: null rather than a warning, because the caller is the one that
   * knows what to do when the mode it needs isn't active. See getActiveMode()
   * for the name of the active mode, as opposed to the handler itself.
   */
  getMode(mode) {

    //No mode active at all
    const {activeMode} = this
    if (!activeMode) {
      return null
    }

    //Asked for a specific mode that isn't the active one
    if (mode && mode !== activeMode) {
      return null
    }

    //Hand back the active handler
    return this.getModeHandler(activeMode)
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
    const currentHandler = this.getMode()
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

    //Go to first position
    game.goToFirstPosition()

    //Check handicap. NOTE: this is read after rewinding, because that is what
    //applies the root node's setup instructions. Reading it before meant the
    //record's own handicap stones were never seen, and a record with freely
    //placed handicap stones had the default star points added on top of them.
    const handicap = game.getHandicap()
    const hasStones = game.position.hasStones()

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
    this.triggerSelectVariationEvent()
  }

  /**
   * Select the next variation
   */
  selectPreviousVariation() {
    this.game.selectPreviousVariation()
    this.triggerSelectVariationEvent()
  }

  /**
   * Make a node the main variation
   */
  makeMainVariation(node) {

    //The path has to be captured before the tree is restructured, because the
    //child indices it consists of only address this node in the current shape
    //of the tree
    const path = this.game.getPathToNode(node)

    //Restructure and trigger event
    this.game.makeMainVariation(node)
    this.triggerEvent('variationChange', {
      action: 'makeMainVariation',
      args: [path ? path.toObject() : null],
    })
  }

  /**
   * Remove a node
   */
  removeNode(node) {

    //Same as above, but more so, as a detached node can no longer be located
    //in the tree at all
    const path = this.game.getPathToNode(node)

    //Remove and trigger event
    this.game.removeNode(node)
    this.triggerEvent('edit', {
      action: 'removeNode',
      args: [path ? path.toObject() : null],
    })
    this.processPathChange()
  }

  /**
   * Trigger a variation change event for the current node
   *
   * The path identifies the node whose selected variation changed, which is
   * what makes this event usable for synchronising other instances of the
   * same game.
   */
  triggerSelectVariationEvent() {
    const {game} = this
    this.triggerEvent('variationChange', {
      action: 'selectVariation',
      args: [game.getPathObject(), game.getCurrentPathIndex()],
    })
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
        this.playCaptureSounds(game.position.getTotalCaptureCount())
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

    //Derive analysis for a node that has none of its own, before anything
    //renders or reads it, so the expected line of play keeps showing while
    //the user explores it
    this.deriveNodeAnalysis(node)

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
   * Analysis handling
   ***/

  /**
   * Set AI analysis data on the game's main line
   *
   * The given array is indexed by move number, so entry 0 belongs to the root
   * node, being the position before any move was made, entry 1 to the node
   * after the first move, and so on. Nodes the array doesn't reach are left
   * without analysis.
   *
   * Each entry describes the position at its node, apart from its loss and
   * quality, which describe the move that reached it. Variations are not
   * covered, as the array can only address the main line.
   */
  setAnalysis(moves) {

    //Get data
    const {game} = this

    //Take existing analysis off the entire tree first — variation branches
    //and derived entries included — so a new review never sits on top of
    //remnants of the one before it
    this.removeAnalysisFromTree(game.getRootNode())

    //Walk the main line, assigning each entry to the node at that move number
    if (moves) {
      let node = game.getRootNode()
      let i = 0
      while (node) {
        if (moves[i]) {
          node.analysis = moves[i]
        }
        node = node.getChild(0)
        i++
      }
    }

    //Derive analysis for the current node, in case we are sitting on a
    //variation the new data has an expected line for
    this.deriveNodeAnalysis(game.getCurrentNode())

    //Trigger event, so the active mode can render it
    this.triggerEvent('analysisChange', {hasAnalysis: Boolean(moves)})
  }

  /**
   * Set or clear AI analysis data on a single node, main line or variation
   *
   * This is how an analysis obtained for a variation position is attached,
   * as the array form above can only address the main line. Passing no
   * analysis takes it off the node again, derived or not.
   */
  setNodeAnalysis(node, analysis = null) {

    //Nothing to work with
    if (!node) {
      return
    }

    //Anything derived below this node came from what was here before, so it
    //goes with it. Without this, a node whose analysis is replaced or taken
    //away leaves its expected line cached on every node the user had already
    //explored, and those keep showing the superseded values.
    this.removeAnalysisFromTree(node)

    //Set it
    if (analysis) {
      node.analysis = analysis
    }

    //Derive analysis for the current node, in case we are sitting further
    //along a line this node now has an expectation for
    this.deriveNodeAnalysis(this.game.getCurrentNode())

    //Trigger event, so the active mode can render it
    this.triggerEvent('analysisChange', {hasAnalysis: Boolean(analysis), node})
  }

  /**
   * Clear any AI analysis data from the game
   */
  clearAnalysis() {
    this.setAnalysis(null)
  }

  /**
   * Remove analysis data from a node and everything below it
   *
   * NOTE: walked with a stack rather than by recursion, as a game record's
   * main line is one long chain of single children: recursing puts a frame on
   * the stack per move played, which a long enough record overflows.
   */
  removeAnalysisFromTree(node) {
    const stack = [node]
    while (stack.length > 0) {
      const next = stack.pop()
      delete next.analysis
      stack.push(...next.getChildren())
    }
  }

  /**
   * Derive analysis for a node that has none of its own, from the nearest
   * ancestor that was actually analysed
   *
   * When the moves entered since that ancestor are a prefix of one of its
   * candidates' expected lines, the node takes on that line's value for the
   * whole position — the candidate's win rate, score lead and visits, all
   * from Black's point of view — and the remainder of the line becomes a
   * sequence of expected follow-up moves to draw on the board. The entry is
   * flagged as derived, so consumers can tell it from an analysis an engine
   * produced for this very position, and carries no candidates: nothing
   * searched this position itself.
   */
  deriveNodeAnalysis(node) {

    //No node, or it has an analysis already
    if (!node || node.analysis) {
      return
    }

    //Walk up to the nearest node carrying a real analysis, collecting the
    //moves that were entered on the way. Derived entries are walked through,
    //as they carry no candidates of their own: the moves that produced them
    //become part of the prefix instead. Anything that is not a plain move
    //cannot be part of an engine line, so it ends the search.
    //
    //The walk is bounded by the longest line an engine reports, as more moves
    //than that cannot be the start of any of them. That is what keeps this
    //off the whole game tree on every step taken through a record that has no
    //analysis on it at all.
    const entered = []
    let ancestor = node
    while (ancestor && entered.length <= maxAnalysisSequenceLength) {
      const {analysis} = ancestor
      if (analysis && !analysis.derived) {
        break
      }
      if (!ancestor.isMove() || ancestor.hasSetupInstructions()) {
        return
      }
      entered.unshift(ancestor.move)
      ancestor = ancestor.parent
    }

    //No analysed ancestor within reach
    if (!ancestor || !ancestor.analysis) {
      return
    }

    //Find the candidate whose expected line the entered moves follow, and
    //derive the node's analysis from it
    const candidate = this.findMatchingCandidate(ancestor, entered)
    if (candidate) {
      node.analysis = this.createDerivedAnalysis(node, candidate, entered)
    }
  }

  /**
   * Find the candidate at an analysed node whose expected line starts with
   * the given entered moves
   */
  findMatchingCandidate(node, entered) {

    //Get candidates
    const candidates = node.analysis.candidates || []

    //Determine the player to move at the analysed position, which the
    //entered colors must alternate from. Turn instructions say it outright
    //and the move that reached the position implies it; a bare root node
    //determines nothing, and the first entered color is taken as read.
    const toMove = node.turn ??
      (node.isMove() ? swapColor(node.getMoveColor()) : entered[0].color)

    //Find the first candidate whose line the entered moves are a prefix of.
    //Candidates without a line are skipped: the move actually played gets
    //appended to a stored analysis as one of those. A line shorter than what
    //was entered cannot match either, which is also what bounds how far back
    //the derivation reaches.
    return candidates.find(candidate => {
      const {pv} = candidate
      if (!Array.isArray(pv) || pv.length < entered.length) {
        return false
      }
      return entered.every((move, i) => {
        const color = (i % 2 === 0) ? toMove : swapColor(toMove)
        if (move.color !== color) {
          return false
        }
        if (move.pass) {
          return Boolean(pv[i].pass)
        }
        return !pv[i].pass && pv[i].x === move.x && pv[i].y === move.y
      })
    })
  }

  /**
   * Create a derived analysis entry for a node from a matched candidate and
   * the moves that were entered
   */
  createDerivedAnalysis(node, candidate, entered) {

    //Get data
    const {winrate, scoreLead, visits, pv} = candidate

    //The sequence numbering continues the variation move numbering already on
    //the board, which is the same set of nodes the board numbers 1 upwards.
    //Off a variation branch there are none of those, so the expected line
    //numbers itself from 1.
    const offset = node.getVariationMoveNodes().length

    //The remainder of the line becomes the expected follow-up sequence, with
    //the colors alternating onward from the last entered move
    let color = entered[entered.length - 1].color
    const sequence = pv.slice(entered.length).map((move, i) => {
      color = swapColor(color)
      const number = offset + i + 1
      if (move.pass) {
        return {pass: true, color, number}
      }
      return {x: move.x, y: move.y, color, number}
    })

    //The win rate, score lead and visits are the matched candidate's own,
    //being the value of the whole line from Black's point of view
    return {
      derived: true,
      isVariation: true,
      winrate,
      scoreLead,
      visits,
      candidates: [],
      sequence,
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
    const currentHandler = this.getMode()
    if (currentHandler) {
      currentHandler.deactivate()
    }

    //Tear down every mode handler, not just the active one. Handlers are
    //created up front and can hold timers and listeners of their own,
    //regardless of whether they were ever activated.
    for (const mode in this.modeHandlers) {
      this.modeHandlers[mode].teardown()
    }

    //Remove listeners
    this.teardownDocumentListeners()
    this.teardownElementListeners()

    //Cancel pending sounds and release the audio elements
    this.clearSoundTimeouts()
    this.removeAudioElements()

    //Destroy the board, which disconnects its resize observer
    if (this.board) {
      this.board.destroy()
    }

    //Flag as no longer bootstrapped
    this.isBootstrapped = false
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

    //Remove any existing elements first, so re-bootstrapping doesn't leave
    //orphaned audio elements behind in the container
    this.removeAudioElements()

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
   * Play a staggered run of capture sounds
   *
   * The timeouts are tracked so they can be cancelled on teardown, otherwise
   * they fire against a player that is no longer on the page.
   */
  playCaptureSounds(count) {
    const num = Math.min(count, 10)
    for (let i = 0; i < num; i++) {
      const timeout = setTimeout(() => {
        this.stopSound('capture')
        this.playSound('capture')
      }, 150 + randomInt(30, 90) * i)
      this.soundTimeouts.push(timeout)
    }
  }

  /**
   * Clear any pending sound timeouts
   */
  clearSoundTimeouts() {
    this.soundTimeouts.forEach(timeout => clearTimeout(timeout))
    this.soundTimeouts = []
  }

  /**
   * Remove the audio elements from the container
   */
  removeAudioElements() {
    for (const key in this.audioElements) {
      const audioElement = this.audioElements[key]
      audioElement.pause()
      audioElement.remove()
    }
    this.audioElements = {}
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
      .getMode()
      ?.processAction(action)
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
