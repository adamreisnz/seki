import merge from 'deepmerge'
import Base from './base.js'
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
import {isValidColor} from '../helpers/stone.js'
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
export default class Game extends Base {

  /**
   * Constructor
   */
  constructor() {

    //Parent
    super()

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
    this.root = new GameNode()
    this.node = this.root

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
   * Reset
   */
  reset() {
    this.init()
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
   * Set the board size
   */
  setBoardSize(width, height) {
    if (width && height && width !== height) {
      this.setInfo('board.width', parseInt(width))
      this.setInfo('board.height', parseInt(height))
    }
    else if (width) {
      this.setInfo('board.size', parseInt(width))
    }
  }

  /**
   * Get the board size
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
   * Set the game komi
   */
  setKomi(komi) {
    this.setInfo('rules.komi', parseFloat(komi))
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
   * Set the game handicap
   */
  setHandicap(handicap) {
    this.setInfo('rules.handicap', parseInt(handicap))
  }

  /**
   * Get the game handicap
   */
  getHandicap() {
    const handicap = this.getInfo('rules.handicap', 0)
    return parseInt(handicap)
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
    const nodes = [node]

    //Process children
    while (node) {
      node = node.getRememberedChild()
      if (node) {
        nodes.push(node)
      }
    }

    //Return nodes
    return nodes
  }

  /**
   * Check if a node is the root node
   */
  isRootNode(node) {
    return this.root === node
  }

  /**
   * Check if a node is the current node
   */
  isCurrentNode(node) {
    return this.node === node
  }

  /**
   * Get the root node
   */
  getRootNode() {
    return this.root
  }

  /**
   * Get the current node
   */
  getCurrentNode() {
    return this.node
  }

  /**
   * Get node for a certain move
   */
  getMoveNode(move) {
    const nodes = this.getMoveNodes(move, move)
    return nodes.length ? nodes[0] : null
  }

  /**
   * Get move nodes restricted by given move numbers
   */
  getMoveNodes(fromMove, toMove) {

    //Get all nodes for the current path
    const nodes = this.getNodes()

    //Use sensible defaults if no from/to moves given
    fromMove = fromMove || 1
    toMove = toMove || nodes.length

    //Filter
    return nodes.filter(function(node) {
      if (node.isMove()) {
        const move = node.getMoveNumber()
        return (move >= fromMove && move <= toMove)
      }
      return false
    })
  }

  /**
   * Get current move number
   */
  getMoveNumber() {
    if (this.node) {
      return this.node.getMoveNumber()
    }
    return 0
  }

  /**
   * Get the number of moves in the main branch
   */
  getMoveCount() {
    const moveNodes = this.getMoveNodes()
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
    const {width, height} = this.getBoardSize()
    return (x >= 0 && y >= 0 && x < width && y < height)
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

    //Get data
    const {checkRepeat, history} = this
    let stop

    //Check for ko only? (Last two positions)
    if (checkRepeat === checkRepeatTypes.KO && (history.length - 2) >= 0) {
      stop = history.length - 2
    }

    //Check all history?
    else if (checkRepeat === checkRepeatTypes.ALL) {
      stop = 0
    }

    //Not repeating
    else {
      return false
    }

    //Loop history of positions to check
    for (let i = history.length - 2; i >= stop; i--) {
      if (checkPosition.isSameAs(history[i])) {
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
    const [newPosition] = this.validateMove(x, y, color)
    return !!newPosition
  }

  /**
   * Check if a move is valid. If valid, the new game position object is returned.
   * You can supply a pre-created position to use, or the current position is cloned.
   */
  validateMove(x, y, color, newPosition) {

    //Get data
    const {position, allowSuicide, checkRepeat} = this

    //Check coordinates validity
    if (!this.isOnBoard(x, y)) {
      return [null, `Position (${x},${y}) is out of bounds`]
    }

    //Something already here?
    if (position.stones.has(x, y)) {
      return [null, `Position (${x},${y}) already has a stone`]
    }

    //Set color of move to make
    color = color || position.getTurn()

    //Determine position to use and place the new stone
    newPosition = newPosition || position.clone()
    newPosition.stones.set(x, y, color)

    //Capture adjacent stones if possible
    const captures = newPosition.captureAdjacent(x, y)

    //No captures occurred? Check if the move we're making is a suicide move
    if (!captures) {

      //No liberties for the group we've just created?
      if (!newPosition.hasLiberties(x, y)) {

        //Capture the group if it's allowed
        if (allowSuicide) {
          newPosition.captureGroup(x, y)
        }

        //Invalid move
        else {
          return [null, `Move on (${x},${y}) is suicide`]
        }
      }
    }

    //Check history for repeating moves
    if (checkRepeat && this.isRepeatingPosition(newPosition)) {
      return [null, `Move on (${x},${y}) creates a repeating position`]
    }

    //Switch turn
    newPosition.switchTurn()

    //Move is valid
    return [newPosition]
  }

  /**
   * Check if a setup placement is valid.
   */
  validateSetupPlacement(x, y, color, newPosition) {

    //Get data
    const {position} = this

    //Check coordinates validity
    if (!this.isOnBoard(x, y)) {
      return [null, `Position (${x},${y}) is out of bounds`]
    }

    //Create position
    newPosition = newPosition || position.clone()
    newPosition.stones.set(x, y, color)

    //Capture adjacent stones if possible
    const captures = newPosition.captureAdjacent(x, y)

    //No captures occurred? Check if the move we're making is a suicide move
    if (!captures) {

      //No liberties for the group we've just created? Capture it
      if (!newPosition.hasLiberties(x, y)) {
        newPosition.captureGroup(x, y)
      }
    }

    //Return position
    return [newPosition]
  }

  /*****************************************************************************
   * Markup and setup stones handling
   ***/

  /**
   * Add markup
   */
  addMarkup(x, y, markup) {

    //No markup here
    if (this.hasMarkup(x, y, markup)) {
      this.debug(`already has markup of type ${markup.type} on (${x},${y})`)
      return
    }

    //Debug
    this.debug(`adding ${markup.type} markup to (${x},${y})`)

    //Add
    const {position, node} = this
    position.markup.set(x, y, markup)
    node.addMarkup(x, y, markup)
  }

  /**
   * Remove markup
   */
  removeMarkup(x, y) {

    //No markup here
    if (!this.hasMarkup(x, y)) {
      this.debug(`no markup present on (${x},${y})`)
      return
    }

    //Debug
    this.debug(`removing markup from (${x},${y})`)

    //Remove
    const {position, node} = this
    node.removeMarkup(x, y)
    position.markup.delete(x, y)
  }

  /**
   * Get markup on coordinates
   */
  getMarkup(x, y) {
    const {position} = this
    return position.markup.get(x, y)
  }

  /**
   * Check if there is markup at the given coordinate for the current position
   */
  hasMarkup(x, y, markup) {
    const {position} = this
    if (typeof markup === 'undefined') {
      return position.markup.has(x, y)
    }
    return position.markup.is(x, y, markup)
  }

  /**
   * Add a stone
   */
  addStone(x, y, color) {

    //Validate color
    if (!isValidColor(color)) {
      this.warn(`invalid color ${color}`)
      return
    }

    //Already have stone of this color
    if (this.hasStone(x, y, color)) {
      this.debug(`already has stone of color ${color} on (${x},${y})`)
      return
    }

    //Debug
    this.debug(`adding ${color} stone at (${x},${y})`)

    //Get data and validate placement
    const {position, node} = this
    const [newPosition, reason] = this.validateSetupPlacement(x, y, color)

    //Invalid placement
    if (!newPosition) {
      this.debug.warn(reason)
      return
    }

    //Add to node as a setup instruction
    const newNodeIndex = node.addSetup(x, y, {type: color})

    //Replace the position if a new node was created
    if (typeof newNodeIndex !== 'undefined') {
      this.debug(`new node was created with index ${newNodeIndex}`)
      this.handleNewSetupNodeCreation(newNodeIndex)
      this.replacePosition(newPosition)
      return
    }

    //Just set stone on current position
    position.stones.set(x, y, color)
  }

  /**
   * Remove a stone
   */
  removeStone(x, y) {

    //No stone on this position
    if (!this.hasStone(x, y)) {
      this.debug(`no stone present on (${x},${y})`)
      return
    }

    //Debug
    this.debug(`removing stone from (${x},${y})`)

    //Get data
    const {position, node} = this

    //Check if stone is present in setup instructions
    //If so, just remove it from the setup
    if (node.hasSetup(x, y)) {
      node.removeSetup(x, y)
      position.stones.delete(x, y)
      return
    }

    //Not present, so it was added on the board previously,
    //either by another setup instruction or by a move
    //We have to clear it using a new setup instruction and
    //this also creates a new position
    const newPosition = position.clone()
    newPosition.stones.delete(x, y)

    //Add setup instruction
    const newNodeIndex = node.addSetup(x, y, {type: setupTypes.CLEAR})

    //Replace current position
    this.handleNewSetupNodeCreation(newNodeIndex)
    this.replacePosition(newPosition)
  }

  /**
   * Get stone on coordinates
   */
  getStone(x, y) {
    const {position} = this
    return position.stones.get(x, y)
  }

  /**
   * Check if there is a stone at given coordinates
   */
  hasStone(x, y, color) {
    const {position} = this
    if (typeof color === 'undefined') {
      return position.stones.has(x, y)
    }
    return position.stones.is(x, y, color)
  }

  /**
   * Helper to handle the creation of a new setup node
   */
  handleNewSetupNodeCreation(i) {

    //Nothing to do
    if (typeof i === 'undefined') {
      return
    }

    //Clone our position
    this.pushPosition()

    //Advance path to the added node index
    this.node = this.node.getChild(i)
    this.path.advance(i)
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
    const [newPosition, reason] = this.validateMove(x, y, color)

    //Invalid move
    if (!newPosition) {
      this.warn(reason)
      return false
    }

    //Push new position
    this.pushPosition(newPosition)

    //Create new move node
    const node = new GameNode({
      move: {x, y, color},
    })

    //Append it to the current node, remember the path, and change the pointer
    const i = node.appendTo(this.node)
    this.node.rememberPath(i)
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
    const newPosition = this.position.clone()
    newPosition.switchTurn()

    //Push new position
    this.pushPosition(newPosition)

    //Create new move node
    const node = new GameNode({
      move: {
        pass: true,
        color,
      },
    })

    //Append it to the current node, remember the path, and change the pointer
    const i = node.appendTo(this.node)
    this.node.rememberPath(i)
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
      i = this.node.getChild(i)
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
   * Skip forward a number of positions
   */
  skipForward(num) {
    for (let i = 0; i < num; i++) {
      if (!this.next()) {
        return
      }
    }
  }

  /**
   * Skip backwards a number of positions
   */
  skipBack(num) {
    for (let i = 0; i < num; i++) {
      if (!this.previous()) {
        return
      }
    }
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
    const n = path.getMoveNumber()
    for (let m = 0; m < n; m++) {

      //Try going to the next node
      const i = path.indexAtMove(m)
      if (!this.nextNode(i)) {
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
   * Select next variation
   */
  selectNextVariation() {
    const {node} = this
    node.selectNextPath()
  }

  /**
   * Select previous variation
   */
  selectPreviousVariation() {
    const {node} = this
    node.selectPreviousPath()
  }

  /**
   * Navigate to the next node
   */
  nextNode(variationIndex) {

    //Get data
    const {node} = this

    //Check if we have children
    if (!node.hasChildren()) {
      return false
    }

    //Get the remembered path, or preferred path if it's valid
    const i = node.getRememberedPath(variationIndex)

    //Advance path and set pointer of current node
    this.path.advance(i)
    this.node = node.getChild(i)
    return true
  }

  /**
   * Navigate to the previous node
   */
  previousNode() {

    //Get data
    const {node} = this

    //No parent node?
    if (!node.hasParent()) {
      return false
    }

    //Retreat path and set pointer to current node
    this.path.retreat()
    this.node = node.getParent()
    return true
  }

  /**
   * Navigate to the first node
   */
  firstNode() {

    //Reset path and point to root
    this.path.reset()
    this.node = this.root

    //Determine initial turn based on handicap
    //Can be overwritten by game record instructions
    const handicap = this.getHandicap()
    const turn = (handicap > 1) ?
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

    //Get data
    const {node, position} = this

    //Remember selected node on parent
    node.setRememberedPathOnParent()

    //Initialize new position
    const newPosition = position.clone()

    //Handle moves
    if (node.isMove()) {
      if (node.move.pass) {
        newPosition.setTurn(-node.move.color)
      }
      else {
        this.validateMove(
          node.move.x,
          node.move.y,
          node.move.color,
          newPosition,
        )
      }
    }

    //Handle turn instructions
    if (node.turn) {
      newPosition.setTurn(node.turn)
    }

    //Handle setup instructions
    if (node.setup) {
      for (const setup of node.setup) {
        const {type, coords} = setup
        for (const coord of coords) {
          const {x, y} = coord
          if (type === setupTypes.CLEAR) {
            newPosition.stones.delete(x, y)
          }
          else {
            newPosition.stones.set(x, y, type)
          }
        }
      }
    }

    //Handle markup
    if (node.markup) {
      for (const markup of node.markup) {
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
