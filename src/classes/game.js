import merge from 'deepmerge'
import GamePath from './game-path.js'
import GameNode from './game-node.js'
import GamePosition from './game-position.js'
import ConvertFromJgf from './converters/convert-from-jgf.js'
import ConvertFromJson from './converters/convert-from-json.js'
import ConvertFromSgf from './converters/convert-from-sgf.js'
import ConvertFromGib from './converters/convert-from-gib.js'
import ConvertToJgf from './converters/convert-to-jgf.js'
import ConvertToJson from './converters/convert-to-json.js'
import ConvertToSgf from './converters/convert-to-sgf.js'
import {set, get} from '../helpers/object.js'
import {stoneColors} from '../constants/stone.js'
import {kifuFormats} from '../constants/app.js'
import {setupTypes} from '../constants/setup.js'
import {
  defaultGameInfo,
  checkRepeatTypes,
} from '../constants/game.js'

/**
 * This class represents a game record or a game that is being played/edited. The class
 * traverses the move tree nodes and keeps track of the changes between the previous and new game
 * positions. These changes can then be fed to the board, to add or remove stones and markup.
 * The class also keeps a stack of all board positions in memory and can validate moves to make
 * sure they are not repeating or suicide.
 */
export default class Game {

  /**
   * Constructor
   */
  constructor() {

    //Init
    this.init()
  }

  /**
   * Initialize
   */
  init() {

    //Info properties
    this.info = merge.all([defaultGameInfo, {}])

    //The rood node and pointer to the current node
    this.root = null
    this.node = null

    //Game path
    this.path = new GamePath()

    //Positions history stack
    this.history = []

    //Settings
    this.allowSuicide = false
    this.rememberPath = true
    this.checkRepeat = checkRepeatTypes.KO

    //Initialize history
    this.initializeHistory()
  }

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

  /**************************************************************************
   * Virtuals
   ***/

  /**
   * Check if we managed to load a valid game record
   */
  get isLoaded() {
    return this.root !== null
  }

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
   * Get the configured board size
   */
  getBoardSize() {
    const size = this.getInfo('board.size')
    const width = this.getInfo('board.width')
    const height = this.getInfo('board.height')
    if (width && height) {
      return {width, height}
    }
    return {width: size, height: size}
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
   * Get stone on coordinates
   */
  getStone(x, y) {
    return this.position.stones.get(x, y)
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
   * Get markup on coordinates
   */
  getMarkup(x, y) {
    return this.position.markup.get(x, y)
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
    this.firstNode()

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
   * State handling TODO
   ***/

  /**
   * Get the game position state
   */
  getState() {

    //Can only create when we have a path
    if (!this.path) {
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
    // this.load(state.jgf)
    //TODO load doesn't exist anymore
    this.goto(state.path)
  }

  /**************************************************************************
   * Configuration
   ***/

  /**
   * Set allow suicide
   */
  setAllowSuicide(allowSuicide) {
    this.allowSuicide = allowSuicide
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

  /*****************************************************************************
   * Node navigation helpers
   ***/

  /**
   * Navigate to the next node
   */
  nextNode(i) {

    //Get data
    const {children, rememberedPath} = this.node

    //Check if we have children
    if (children.length === 0) {
      return false
    }

    //Remembered the path we took earlier?
    if (i === undefined) {
      i = rememberedPath
    }

    //Determine which child node to process
    i = i || 0
    if (i === -1) {
      i = 0
    }

    //Validate
    if (i >= children.length || !children[i]) {
      return false
    }

    //Advance path
    this.path.advance(i)

    //Set pointer of current node
    this.node = children[i]
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
    const {width, height} = this.getBoardSize()
    if (width && height) {
      this.history[0].setSize(width, height)
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
        const {type, coords} = setup
        for (const coord of coords) {
          const {x, y} = coord
          if (type === setupTypes.EMPTY) {
            newPosition.stones.delete(x, y)
          }
          else {
            newPosition.stones.set(x, y, type)
          }
        }
      }
    }

    //Handle markup
    if (this.node.markup) {
      for (const markup of this.node.markup) {
        const {type, coords} = markup
        for (const coord of coords) {
          const {x, y, text} = coord
          newPosition.markup.set(x, y, {type, text})
        }
      }
    }

    //Push the new position into the history now
    this.pushPosition(newPosition)
  }

  /**************************************************************************
   * Conversion helpers to convert this game into different formats
   ***/

  /**
   * Convert to JGF
   */
  toJgf() {
    const converter = new ConvertToJgf()
    return converter.convert(this)
  }

  /**
   * Convert to JGF JSON
   */
  toJson() {
    const converter = new ConvertToJson()
    return converter.convert(this)
  }

  /**
   * Convert to SGF
   */
  toSgf() {
    const converter = new ConvertToSgf()
    return converter.convert(this)
  }

  /**************************************************************************
   * Static helpers to create game instances from different formats
   ***/

  /**
   * Load from SGF data
   */
  static fromJson(json) {

    //Create converter
    const converter = new ConvertFromJson()
    const game = converter.convert(json)
    if (!game) {
      throw new Error(`Unable to parse JSON data`)
    }

    //Return game
    return game
  }

  /**
   * Load from JGF data
   */
  static fromJgf(jgf) {

    //Create converter
    const converter = new ConvertFromJgf()
    const game = converter.convert(jgf)
    if (!game) {
      throw new Error(`Unable to parse JGF data`)
    }

    //Return game
    return game
  }

  /**
   * Load from SGF data
   */
  static fromSgf(sgf) {

    //Create converter
    const converter = new ConvertFromSgf()
    const game = converter.convert(sgf)
    if (!game) {
      throw new Error(`Unable to parse SGF data`)
    }

    //Return game
    return game
  }

  /**
   * Load from GIB data
   */
  static fromGib(gib) {

    //Create converter
    const converter = new ConvertFromGib()
    const game = converter.convert(gib)
    if (!game) {
      throw new Error(`Unable to parse GIB data`)
    }

    //Return game
    return game
  }

  /**
   * Detect format
   */
  static detectFormat(data) {

    //No data, can't do much
    if (!data) {
      throw new Error(`No data`)
    }

    //Object given? Probably a JGF object
    if (typeof data === 'object') {
      return kifuFormats.JGF
    }

    //String given, could be stringified JGF, an SGF or GIB file
    if (typeof data === 'string') {
      const c = data.charAt(0)
      if (c === '(') {
        return kifuFormats.SGF
      }
      else if (c === '{' || c === '[') {
        return kifuFormats.JSON
      }
      else if (c === '\\') {
        return kifuFormats.GIB
      }
    }

    //Unknown
    throw new Error(`Unknown data format`)
  }

  /**
   * Load from an unknown/generic data source
   * This will try to auto detect the data format
   */
  static fromData(data) {

    //Detect format
    const format = this.detectFormat(data)

    //Use appropriate parser
    switch (format) {
      case kifuFormats.JGF:
        return this.fromJgf(data)
      case kifuFormats.SGF:
        return this.fromSgf(data)
      case kifuFormats.JSON:
        return this.fromJson(data)
      case kifuFormats.GIB:
        return this.fromGib(data)
      default:
        throw new Error(`Unknown data format`)
    }
  }
}
