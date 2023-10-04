import GamePath from './game-path.js'
import GameNode from './game-node.js'
import GamePosition from './game-position.js'
import KifuParser from './kifu-parser.js'
import KifuFactory from './kifu-factory.js'
import {set, get} from '../helpers/object.js'
import {defaultGameConfig, checkRepeatTypes} from '../constants/game.js'
import {stoneColors} from '../constants/stone.js'

/**
 * Game :: This class represents a game record or a game that is being played/edited. The class
 * traverses the move tree nodes and keeps track of the changes between the previous and new game
 * positions. These changes can then be fed to the board, to add or remove stones and markup.
 * The class also keeps a stack of all board positions in memory and can validate moves to make
 * sure they are not repeating or suicide.
 */
export default class Game {

  /**
   * Constructor
   */
  constructor(data, config) {

    //Set config
    if (config) {
      this.setConfig(config)
    }

    //Load data
    if (data) {
      this.load(data)
    }
    else {
      this.init()
    }
  }

  /**
   * Initialize
   */
  init() {

    //Info properties
    this.info = {}

    //The rood node and pointer to the current node
    this.root = null
    this.node = null

    //Game path
    this.path = new GamePath()

    //JGF record we loaded from
    this.jgf = null

    //Positions history stack
    this.history = []

    //Config
    this.defaultSize = 0
    this.defaultKomi = 0
    this.defaultHandicap = 0
    this.rememberPath = true
    this.checkRepeat = checkRepeatTypes.KO
    this.allowSuicide = false
  }

  /**
   * Load game record data
   */
  load(data) {

    //Initialize
    this.init()

    //Try to load game record data
    try {
      this.fromData(data)
    }
    catch (error) {

      //Just initialize our history with a blank position
      this.initializeHistory()

      //Re-throw error
      throw error
    }

    //Go to the first move
    this.first()
  }

  /**
   * Reload game record
   */
  reload() {
    if (this.jgf) {
      this.load(this.jgf)
    }
  }

  /**
   * Check if we managed to load a valid game record
   */
  isLoaded() {
    return this.root !== null
  }

  /**************************************************************************
   * Virtuals
   ***/

  /**
   * Getter returns the last position from the stack
   */
  get position() {
    return this.history[this.history.length - 1]
  }

  /**
   * Setter adds a new position to the stack
   */
  set position(newPosition) {
    this.history[this.history.length] = newPosition
  }

  /*****************************************************************************
   * Game cloning and conversion
   ***/

  /**
   * Clone this game
   */
  clone() {

    //Create new kifu object and get properties
    const clone = new Game()
    const props = Object.getOwnPropertyNames(this)

    //Copy all properties
    for (const prop of props) {
      clone[prop] = JSON.parse(JSON.stringify(this[prop]))
    }

    //Return clone
    return clone
  }

  /**
   * Load from an unknown data source
   */
  fromData(data) {

    //No data, can't do much
    if (!data) {
      throw new Error(`No data`)
    }

    //String given, could be stringified JGF, an SGF or GIB file
    if (typeof data === 'string') {
      let c = data.charAt(0)
      if (c === '(') {
        return this.fromSgf(data)
      }
      else if (c === '{' || c === '[') {
        return this.fromJS(data)
      }
      else if (c === '\\') {
        return this.fromGib(data)
      }
      else {
        throw new Error(`Unknown data`)
      }
    }

    //Object given? Probably a JGF object
    else if (typeof data === 'object') {
      this.fromJS(data)
    }

    //Something else?
    else {
      throw new Error(`Unknown data`)
    }
  }

  /**
   * Load from GIB data
   */
  fromGib(gib) {

    //Use the kifu parser
    const jgf = KifuParser.gibToJgf(gib)
    if (!jgf) {
      throw new Error(`Unable to parse GIB data`)
    }

    //Now load JGF
    this.fromJgf(jgf)
  }

  /**
   * Load from SGF data
   */
  fromSgf(sgf) {

    //Use the kifu parser
    const jgf = KifuParser.sgfToJgf(sgf)
    if (!jgf) {
      throw new Error(`Unable to parse SGF data`)
    }

    //Now load JGF
    this.fromJgf(jgf)
  }

  /**
   * From JSON
   */
  fromJSON(json) {

    //Use the kifu parser
    const jgf = KifuParser.jsonToJgf(json)
    if (!jgf) {
      throw new Error(`Unable to parse JSON data`)
    }

    //Now load JGF
    this.fromJgf(jgf)
  }

  /**
   * Load from JGF
   */
  fromJgf(jgf) {

    //Copy all properties except moves tree
    Object
      .keys(jgf)
      .filter(key => key !== 'tree')
      .forEach(key => this.info[key] = JSON.parse(JSON.stringify(jgf[key])))

    //Validate info
    this.validateInfo()

    //Create root node
    this.root = new GameNode()

    //Tree given? Load all the moves
    if (jgf.tree) {
      this.root.fromJS(jgf.tree)
    }

    //Remember JGF
    this.jgf = jgf
  }

  /**
   * Convert to SGF
   */
  toSgf() {
    const jgf = this.toJgf()
    return KifuParser.jgf2sgf(jgf)
  }

  /**
   * Convert to JGF (optionally stringified)
   */
  toJgf(stringify) {

    //Initialize JGF and get properties
    const jgf = KifuFactory.blankJgf()
    const props = Object.getOwnPropertyNames(this)

    //Copy properties
    for (const prop of props) {

      //Skip root
      if (prop === 'root') {
        continue
      }

      //Already present on JGF object? Extend
      if (jgf[prop]) {
        jgf[prop] = Object.assign(jgf[prop], this[prop])
      }

      //Otherwise copy
      else {
        jgf[prop] = JSON.parse(JSON.stringify(this[prop]))
      }
    }

    //Build tree
    jgf.tree = this.root.toJgf()

    //Return
    return stringify ? JSON.parse(jgf) : jgf
  }

  /**************************************************************************
   * Game information & rules getters/setters
   ***/

  /**
   * Get a generic game info property
   */
  getInfo(path, defaultValue) {
    return get(this.info, path, defaultValue)
  }

  /**
   * Set a generic game info property
   */
  setInfo(path, value) {
    set(this.info, path, value)
  }

  /**
   * Get the game komi
   */
  getKomi() {
    const {defaultKomi} = this.config
    const komi = this.getInfo('rules.komi', defaultKomi)
    return parseFloat(komi)
  }

  /**
   * Set the game komi
   */
  setKomi(komi) {
    this.setInfo('rules.komi', parseFloat(komi))
  }

  /**
   * Get the game handicap
   */
  getHandicap() {
    const handicap = this.getInfo('rules.handicap', 0)
    return parseInt(handicap)
  }

  /**
   * Set the game handicap
   */
  setHandicap(handicap) {
    this.setInfo('rules.handicap', parseInt(handicap))
  }

  /**
   * Get the game name
   */
  getName() {
    return this.getInfo('game.name', '')
  }

  /**
   * Set the game name
   */
  setName(name) {
    this.setInfo('game.name', String(name).trim())
  }

  /**
   * Get the game result
   */
  getResult() {
    return this.getInfo('game.result', '')
  }

  /*****************************************************************************
   * Node and position getters
   ***/

  /**
   * Get current node
   */
  getNode() {
    return this.node
  }

  /**
   * Get nodes array for currently remembered path
   */
  getNodes() {

    //Initialize node to process
    let node = this.root
    let nodes = [node]

    //Process children
    while (node) {
      node = node.getChild(node.rememberedPath)
      if (node) {
        nodes.push(node)
      }
    }

    //Return nodes
    return nodes
  }

  /**
   * Get node for a certain move
   */
  getMoveNode(move) {
    let nodes = this.getMoveNodes(move, move)
    return nodes.length ? nodes[0] : null
  }

  /**
   * Get move nodes restricted by given move numbers
   */
  getMoveNodes(fromMove, toMove) {

    //Get all nodes for the current path
    let nodes = this.getNodes()

    //Use sensible defaults if no from/to moves given
    fromMove = fromMove || 1
    toMove = toMove || nodes.length

    //Filter
    return nodes.filter(function(node) {
      if (node.isMove()) {
        let move = node.getMoveNumber()
        return (move >= fromMove && move <= toMove)
      }
      return false
    })
  }

  /**
   * Get current move number
   */
  getMove() {
    if (this.node) {
      return this.node.getMoveNumber()
    }
    return 0
  }

  /**
   * Get the number of moves in the main branch
   */
  getMoveCount() {
    let moveNodes = this.getMoveNodes()
    return moveNodes.length
  }

  /**
   * Get the move variation for given coordinates
   */
  getMoveVariation(x, y) {
    if (this.node) {
      return this.node.getMoveVariation(x, y)
    }
    return -1
  }

  /**
   * Get the current game position
   */
  getPosition() {
    return this.position
  }

  /**
   * Get the game path
   */
  getPath(clone) {
    if (clone) {
      return this.path.clone()
    }
    return this.path
  }

  /**
   * Clone the current game path
   */
  clonePath() {
    return this.path.clone()
  }

  /**
   * Get the game path to a certain named node
   */
  getPathToNode(nodeName) {
    return GamePath.findNode(nodeName, this.root)
  }

  /**
   * Get the player turn for this position
   */
  getTurn() {

    //Must have a position
    if (!this.history.length) {
      return stoneColors.BLACK
    }

    //Get from position
    return this.position.getTurn()
  }

  /**
   * Set the player turn for the current position
   */
  setTurn(color) {

    //Must have a position
    if (!this.history.length) {
      return
    }

    //Set in position
    this.position.setTurn(color)
  }

  /**
   * Get the total capture count up to the current position
   */
  getCaptureCount() {

    //Initialize
    let captures = {}
    captures[stoneColors.BLACK] = 0
    captures[stoneColors.WHITE] = 0

    //Loop all positions and increment capture count
    for (let i = 0; i < this.history.length; i++) {
      captures[stoneColors.BLACK] +=
        this.history[i].getCaptureCount(stoneColors.BLACK)
      captures[stoneColors.WHITE] +=
        this.history[i].getCaptureCount(stoneColors.WHITE)
    }

    //Return
    return captures
  }

  /*****************************************************************************
   * Checkers
   ***/

  /**
   * Check if coordinates are on the board
   */
  isOnBoard(x, y) {
    return (
      x >= 0 &&
      y >= 0 &&
      x < this.info.board.width &&
      y < this.info.board.height
    )
  }

  /**
   * Check if given coordinates are one of the next child node coordinates
   */
  isMoveVariation(x, y) {
    if (this.node) {
      return this.node.isMoveVariation(x, y)
    }
    return false
  }

  /**
   * Check if a given position is repeating within this game
   */
  isRepeatingPosition(checkPosition) {

    //Init
    let stop

    //Check for ko only? (Last two positions)
    if (this.checkRepeat === 'KO' && (this.history.length - 2) >= 0) {
      stop = this.history.length - 2
    }

    //Check all history?
    else if (this.checkRepeat === 'ALL') {
      stop = 0
    }

    //Not repeating
    else {
      return false
    }

    //Loop history of positions to check
    for (let i = this.history.length - 2; i >= stop; i--) {
      if (checkPosition.isSameAs(this.history[i])) {
        return true
      }
    }

    //Not repeating
    return false
  }

  /**
   * Wrapper for validateMove() returning a boolean and catching any errors
   */
  isValidMove(x, y, color) {
    try {
      this.validateMove(x, y, color)
      return true
    }
    catch (error) {
      return false
    }
  }

  /**
   * Check if a move is valid. If valid, the new game position object is returned.
   * You can supply a pre-created position to use, or the current position is cloned.
   */
  validateMove(x, y, color, newPosition) {

    //Check coordinates validity
    if (!this.isOnBoard(x, y)) {
      throw new Error(`Position out of bounds: ${x}, ${y}, ${color}`)
    }

    //Something already here?
    if (this.position.stones.has(x, y)) {
      throw new Error(`Position already has a stone: ${x}, ${y}, ${color}`)
    }

    //Set color of move to make
    color = color || this.position.getTurn()

    //Determine position to use
    newPosition = newPosition || this.position.clone()

    //Place the stone
    newPosition.stones.set(x, y, color)

    //Capture adjacent stones if possible
    let captures = newPosition.captureAdjacent(x, y)

    //No captures occurred? Check if the move we're making is a suicide move
    if (!captures) {

      //No liberties for the group we've just created?
      if (!newPosition.hasLiberties(x, y)) {

        //Capture the group if it's allowed
        if (this.allowSuicide) {
          newPosition.captureGroup(x, y)
        }

        //Invalid move
        else {
          throw new Error(`Position is suicide: ${x}, ${y}, ${color}`)
        }
      }
    }

    //Check history for repeating moves
    if (this.checkRepeat && this.isRepeatingPosition(newPosition)) {
      throw new Error(`Position is repeating: ${x}, ${y}, ${color}`)
    }

    //Set proper turn
    newPosition.setTurn(-color)

    //Move is valid
    return newPosition
  }

  /**
   * Check if a stone (setup) placement is valid.
   */
  validatePlacement(x, y, color, position) {

    //Check coordinates validity
    if (!this.isOnBoard(x, y)) {
      throw new Error(`Position out of bounds: ${x}, ${y}, ${color}`)
    }

    //Place the stone
    position.stones.set(x, y, color)

    //Empty spot? Don't need to check for captures
    if (!color) {
      return
    }

    //Capture adjacent stones if possible
    let captures = position.captureAdjacent(x, y)

    //No captures occurred? Check if the move we're making is a suicide move
    if (!captures) {

      //No liberties for the group we've just created? Capture it
      if (!position.hasLiberties(x, y)) {
        position.captureGroup(x, y)
      }
    }
  }

  /*****************************************************************************
   * Stone and markup handling
   ***/

  /**
   * Add a stone
   */
  addStone(x, y, color) {

    //Check if there's anything to do at all
    if (this.position.stones.is(x, y, color)) {
      return
    }

    //Create temporary position
    let tempPosition = this.position.clone()

    //Validate placement on temp position
    this.validatePlacement(x, y, color, tempPosition)

    //No setup instructions container in this node?
    if (typeof this.node.setup === 'undefined') {

      //Is this a move node?
      if (this.node.isMove()) {

        //Clone our position
        this.pushPosition()

        //Create new node
        let node = new GameNode()

        //Append it to the current node and change the pointer
        let i = node.appendTo(this.node)
        this.node = node

        //Advance path to the added node index
        this.path.advance(i)
      }

      //Create setup container in this node
      this.node.setup = []
    }

    //Replace current position
    this.replacePosition(tempPosition)

    //Add setup instructions to node
    this.node.setup.push(this.position.stones.get(x, y))
  }

  /**
   * Add markup
   */
  addMarkup(x, y, markup) {

    //No markup instructions container in this node?
    if (typeof this.node.markup === 'undefined') {
      this.node.markup = []
    }

    //Add markup to game position
    this.position.markup.set(x, y, markup)

    //Add markup instructions to node
    this.node.markup.push(this.position.markup.get(x, y, 'type'))
  }

  /**
   * Remove a stone
   */
  removeStone(x, y) {

    //Remove from node setup instruction
    if (typeof this.node.setup !== 'undefined') {
      for (let i = 0; i < this.node.setup.length; i++) {
        if (x === this.node.setup[i].x && y === this.node.setup[i].y) {

          //Remove from node and unset in position
          this.node.setup.splice(i, 1)
          this.position.stones.unset(x, y)

          //Mark as found
          break
        }
      }
    }
  }

  /**
   * Remove markup
   */
  removeMarkup(x, y) {

    //Remove from node
    if (typeof this.node.markup !== 'undefined') {
      for (let i = 0; i < this.node.markup.length; i++) {
        if (x === this.node.markup[i].x && y === this.node.markup[i].y) {
          this.node.markup.splice(i, 1)
          this.position.markup.unset(x, y)
          break
        }
      }
    }
  }

  /**
   * Check if there is a stone at the given coordinates for the current position
   */
  hasStone(x, y, color) {
    if (typeof color !== 'undefined') {
      return this.position.stones.is(x, y, color)
    }
    return this.position.stones.has(x, y)
  }

  /**
   * Check if there is markup at the given coordinate for the current position
   */
  hasMarkup(x, y, type) {
    if (typeof type !== 'undefined') {
      return this.position.markup.is(x, y, type)
    }
    return this.position.markup.has(x, y)
  }

  /**
   * Get stone on coordinates
   */
  getStone(x, y) {
    return this.position.stones.get(x, y)
  }

  /**
   * Get markup on coordinates
   */
  getMarkup(x, y) {
    return this.position.markup.get(x, y)
  }

  /*****************************************************************************
   * Move handling
   ***/

  /**
   * Play move
   */
  play(x, y, color) {

    //Color defaults to current turn
    color = color || this.position.getTurn()

    //Validate move and get new position
    let newPosition = this.validateMove(x, y, color)

    //Push new position
    this.pushPosition(newPosition)

    //Create new move node
    let node = new GameNode({
      move: {x, y, color},
    })

    //Append it to the current node, remember the path, and change the pointer
    let i = node.appendTo(this.node)
    this.node.rememberedPath = i
    this.node = node

    //Advance path to the added node index
    this.path.advance(i)

    //Valid move
    return true
  }

  /**
   * Play pass
   */
  pass(color) {

    //Color defaults to current turn
    color = color || this.position.getTurn()

    //Initialize new position and switch the turn
    let newPosition = this.position.clone()
    newPosition.setTurn(-color)

    //Push new position
    this.pushPosition(newPosition)

    //Create new move node
    let node = new GameNode({
      move: {
        pass: true,
        color,
      },
    })

    //Append it to the current node, remember the path, and change the pointer
    let i = node.appendTo(this.node)
    this.node.rememberedPath = i
    this.node = node

    //Advance path to the added node index
    this.path.advance(i)
  }

  /*****************************************************************************
   * Game tree navigation
   ***/

  /**
   * Go to the next position
   */
  next(i) {

    //Object (node) given as parameter? Find index
    if (typeof i === 'object') {
      i = this.node.children.indexOf(i)
    }

    //Go to the next node
    if (this.nextNode(i)) {

      //If an invalid move is detected, we can't go on
      try {
        this.executeNode()
        return true
      }
      catch (error) {
        this.previousNode()
        throw error
      }
    }

    //Didn't go to next position
    return false
  }

  /**
   * Go to the previous position
   */
  previous() {

    //Go to the previous node
    if (this.previousNode()) {
      this.popPosition()
      return true
    }

    //Didn't go to previous position
    return false
  }

  /**
   * Go to the last position
   */
  last() {

    //Keep going to the next node until we reach the end
    while (this.nextNode()) {

      //If an invalid move is detected, we can't go on
      try {
        this.executeNode()
      }
      catch (error) {
        this.previousNode()
        throw error
      }
    }
  }

  /**
   * Go to the first position
   */
  first() {

    //Go to the first node
    this.firstNode()

    //Create the initial position, clone it and parse the current node
    this.initializeHistory()
    this.executeNode()
  }

  /**
   * Go to position specified by a path object, a numeric move numer, or a node name string
   */
  goto(target) {

    //Must have a tree
    if (this.root === null) {
      return
    }

    //Nothing given?
    if (typeof target === 'undefined') {
      return
    }

    //Function given? Call now
    if (typeof target === 'function') {
      target = this.target()
    }

    //Initialize path
    let path

    //Simple move number? Convert to path object
    if (typeof target === 'number') {
      path = this.path.clone()
      path.setMove(target)
    }

    //String? Named node
    else if (typeof target === 'string') {

      //Already here?
      if (this.node.name === target) {
        return
      }

      //Find path to node
      path = this.getPathToNode(target)
      if (path === null) {
        return
      }
    }

    //Otherwise assume path object
    else {
      path = target
    }

    //Already here?
    if (this.path.compare(path)) {
      return
    }

    //Go to the first node
    this.this.firstNode()

    //Create the initial position, clone it and parse the current node
    this.initializeHistory()
    this.pushPosition(this.executeNode())

    //Loop path
    let n = path.getMove()
    for (let i = 0; i < n; i++) {

      //Try going to the next node
      if (!this.nextNode(path.nodeAt(i))) {
        break
      }

      //If an invalid move is detected, we can't go on
      try {
        this.executeNode()
      }
      catch (error) {
        this.previousNode()
        throw error
      }
    }
  }

  /**
   * Go to the next fork
   */
  nextFork() {

    //Keep going to the next node until we reach one with multiple children
    while (this.nextNode()) {

      //If an invalid move is detected, we can't go on
      try {
        this.executeNode()
      }
      catch (error) {
        this.previousNode()
        throw error
      }

      //Have multiple children?
      if (this.node.children.length > 1) {
        break
      }
    }
  }

  /**
   * Go to the previous fork
   */
  previousFork() {

    //Loop until we find a node with more than one child
    while (this.previousNode()) {
      this.popPosition()
      if (this.node.children.length > 1) {
        break
      }
    }
  }

  /**
   * Go to the next move with comments
   */
  nextComment() {

    //Keep going to the next node until we find one with comments
    while (this.nextNode()) {

      //If an invalid move is detected, we can't go on
      try {
        this.executeNode()
      }
      catch (error) {
        this.previousNode()
        throw error
      }

      //Comments found?
      if (this.node.hasComments()) {
        break
      }
    }
  }

  /**
   * Go to the previous move with comments
   */
  previousComment() {

    //Go back until we find a node with comments
    while (this.previousNode()) {

      //Pop the position
      this.popPosition()

      //Comments found?
      if (this.node.hasComments()) {
        break
      }
    }
  }

  /*****************************************************************************
   * State handling
   ***/

  /**
   * Get the board state
   */
  getState() {

    //Can only create when we have a JGF and path
    if (!this.jgf || !this.path) {
      return null
    }

    //Create state
    let state = {
      jgf: this.jgf,
      path: this.path.clone(),
    }

    //Return
    return state
  }

  /**
   * Restore the game state
   */
  restoreState(state) {

    //Must have jgf and path
    if (!state || !state.jgf || !state.path) {
      return
    }

    //Restore state
    this.load(state.jgf)
    this.goto(state.path)
  }

  /**************************************************************************
   * Configuration
   ***/

  /**
   * Set config instructions in bulk
   */
  setConfig(config) {

    //Validate
    if (!config || typeof config !== 'object') {
      return
    }

    //Extend from default config
    config = Object.assign({}, defaultGameConfig, config)

    //Process config
    this.setDefaultSize(config.defaultSize)
    this.setDefaultKomi(config.defaultKomi)
    this.setDefaultHandicap(config.defaultHandicap)
    this.setRememberPath(config.rememberPath)
    this.setCheckRepeat(config.checkRepeat)
    this.setAllowSuicide(config.allowSuicide)
  }

  /**
   * Set default size
   */
  setDefaultSize(size) {
    this.defaultSize = size
  }

  /**
   * Set default komi
   */
  setDefaultKomi(komi) {
    this.defaultKomi = komi
  }

  /**
   * Set default handicap
   */
  setDefaultHandicap(handicap) {
    this.defaultHandicap = handicap
  }

  /**
   * Set remember path
   */
  setRememberPath(rememberPath) {
    this.rememberPath = rememberPath
  }

  /**
   * Set check repeat
   */
  setCheckRepeat(checkRepeat) {
    this.checkRepeat = checkRepeat
  }

  /**
   * Set allow suicide
   */
  setAllowSuicide(allowSuicide) {
    this.allowSuicide = allowSuicide
  }

  /*****************************************************************************
     * General helpers
     ***/

  /**
   * Validate the info we have to make sure the properties exist
   */
  validateInfo() {

    //Set board info if not set
    if (!this.info.board) {
      this.info.board = {}
    }

    //Set game info if not set
    if (!this.info.game) {
      this.info.game = {}
    }

    //Set defaults
    if (typeof this.info.board.width === 'undefined') {
      this.info.board.width = this.config.defaultSize
    }
    if (typeof this.info.board.height === 'undefined') {
      this.info.board.height = this.config.defaultSize
    }
    if (typeof this.info.game.komi === 'undefined') {
      this.info.game.komi = this.config.defaultKomi
    }
    if (typeof this.info.game.handicap === 'undefined') {
      this.info.game.handicap = this.config.defaultHandicap
    }
  }

  /*****************************************************************************
   * Node navigation helpers
   ***/

  /**
   * Navigate to the next node
   */
  nextNode(i) {

    //Check if we have children
    if (this.node.children.length === 0) {
      return false
    }

    //Remembered the path we took earlier?
    if (i === undefined) {
      i = this.node.rememberedPath
    }

    //Determine which child node to process
    i = i || 0
    if (i === -1) {
      i = 0
    }

    //Validate
    if (i >= this.node.children.length || !this.node.children[i]) {
      return false
    }

    //Advance path
    this.path.advance(i)

    //Set pointer of current node
    this.node = this.node.children[i]
    return true
  }

  /**
   * Navigate to the previous node
   */
  previousNode() {

    //No parent node?
    if (!this.node.parent) {
      return false
    }

    //Retreat path
    this.path.retreat()

    //Set pointer of current node
    this.node = this.node.parent
    return true
  }

  /**
   * Navigate to the first node
   */
  firstNode() {

    //Reset path
    this.path.reset()

    //Set node pointer back to root
    this.node = this.root

    //Determine initial turn based on handicap
    //Can be overwritten by game record instructions
    const turn = (this.info.game.handicap > 1) ?
      stoneColors.WHITE :
      stoneColors.BLACK

    //Set turn
    this.setTurn(turn)
  }

  /*****************************************************************************
   * Position history helpers
   ***/

  /**
   * Clear the position history and initialize with a blank position
   */
  initializeHistory() {

    //Already at beginning?
    if (this.history.length === 1) {
      return
    }

    //Create new blank game position
    const position = new GamePosition()

    //Clear positions stack push the position
    this.history = []
    this.history.push(position)

    //Set board size if we have the info
    if (this.info.board) {
      this.history[0].setSize(this.info.board.width, this.info.board.height)
    }
  }

  /**
   * Add position to stack. If position isn't specified current position is
   * cloned and stacked. Pointer of actual position is moved to the new position.
   */
  pushPosition(newPosition) {

    //Position not given?
    if (!newPosition) {
      newPosition = this.position.clone()
    }

    //Push
    this.history.push(newPosition)
    return newPosition
  }

  /**
   * Remove current position from stack
   */
  popPosition() {

    //Nothing left?
    if (this.history.length === 0) {
      return null
    }

    //Get old position
    return this.history.pop()
  }

  /**
   * Replace the current position in the stack
   */
  replacePosition(newPosition) {
    if (newPosition) {
      this.history.pop()
      this.history.push(newPosition)
    }
  }

  /*****************************************************************************
   * Execution helpers
   ***/

  /**
   * Execute the current node
   */
  executeNode() {

    //Remember last selected node if we have a parent
    if (this.node.parent) {
      this.node.parent.rememberedPath = this.node.parent.children
        .indexOf(this.node)
    }

    //Initialize new position
    const newPosition = this.position.clone()

    //Handle moves
    if (this.node.isMove()) {
      if (this.node.move.pass) {
        newPosition.setTurn(-this.node.move.color)
      }
      else {
        this.validateMove(
          this.node.move.x,
          this.node.move.y,
          this.node.move.color,
          newPosition,
        )
      }
    }

    //Handle turn instructions
    if (this.node.turn) {
      newPosition.setTurn(this.node.turn)
    }

    //Handle setup instructions
    if (this.node.setup) {
      for (const setup of this.node.setup) {
        newPosition.stones.set(
          setup.x, setup.y, setup.color,
        )
      }
    }

    //Handle markup
    if (this.node.markup) {
      for (const markup of this.node.markup) {
        newPosition.markup.set(
          markup.x, markup.y, markup,
        )
      }
    }

    //Push the new position into the history now
    this.pushPosition(newPosition)
  }
}
