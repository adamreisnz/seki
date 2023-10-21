import Base from './base.js'
import {ErrorOutcome, ValidOutcome} from './outcomes.js'
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
import {set, get, merge} from '../helpers/object.js'
import {isValidColor} from '../helpers/color.js'
import {stoneColors} from '../constants/stone.js'
import {kifuFormats} from '../constants/app.js'
import {setupTypes} from '../constants/setup.js'
import {checkRepeatTypes} from '../constants/game.js'
import {defaultGameInfo} from '../constants/defaults.js'

/**
 * This class represents a game record or a game that is being played/edited. The class
 * traverses the move tree nodes and keeps track of the changes between the previous and new game
 * positions. These changes can then be fed to the board, to add or remove stones and markup.
 * The class also keeps a stack of all board positions in memory and can validate moves to make
 * sure they are not repeating or suicide.
 *
 * - A game position is a snapshot of stones and markup on the board at a point in time
 * - The position stack is an array of all traversed game positions
 * - The game path is a simple record of which variation was selected at each fork,
 *   and what move we're at
 * - The current node points at the current node in the game tree
 */
export default class Game extends Base {

  //Positions stack
  positions = []

  /**
   * Constructor
   */
  constructor(info) {
    super()
    this.init(info)
  }

  /**
   * Initialize
   */
  init(info) {

    //Info properties
    this.info = merge(defaultGameInfo, info || {})

    //The rood node and pointer to the current node
    this.root = new GameNode()
    this.path = new GamePath()
    this.node = this.root

    //Settings
    this.allowSuicide = false
    this.checkRepeat = checkRepeatTypes.KO

    //Initialize position stack
    this.initialisePositionStack()
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
   * Game information & rules getters/setters
   ***/

  /**
   * Set a generic game info property
   */
  setInfo(path, value) {
    set(this.info, path, value)
  }

  /**
   * Get a generic game info property
   */
  getInfo(path, defaultValue) {
    return get(this.info, path, defaultValue)
  }

  /**
   * Set the grid size
   */
  setGridSize(width, height) {
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
  getGridSize() {

    //Get from game info
    const size = this.getInfo('board.size')
    const width = this.getInfo('board.width')
    const height = this.getInfo('board.height')

    //Check available dimensions
    if (width && height) {
      return {width, height}
    }
    else if (size) {
      return {width: size, height: size}
    }
    return {width: 19, height: 19}
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
    const {defaultKomi} = defaultGameInfo
    return this.getInfo('rules.komi', defaultKomi)
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
    return this.getInfo('rules.handicap', 0)
  }

  /**
   * Set the game result
   */
  setResult(result) {
    const match = result
      .toUpperCase()
      .match(/^((B|W)\+([0-9]+(\.[0-9]+)?|R|T|F))/)
    this.setInfo('game.result', match ? match[1] : '?')
  }

  /**
   * Get the game result
   */
  getResult() {
    return this.getInfo('game.result')
  }

  /**
   * Set dates
   */
  setDates(dates) {
    this.setInfo('game.dates', dates)
  }

  /**
   * Get dates
   */
  getDates() {
    return this.getInfo('game.dates')
  }

  /**
   * Set the game date
   */
  setDate(date) {
    this.setInfo('game.dates', [date])
  }

  /**
   * Get the game date
   */
  getDate() {
    const dates = this.getInfo('game.dates')
    if (Array.isArray(dates) && dates.length > 0) {
      return dates[0]
    }
    return ''
  }

  /**
   * Get the black player
   */
  getBlackPlayer() {
    const players = this.getInfo('players')
    return players.find(player => player.color === stoneColors.BLACK)
  }

  /**
   * Get the white player
   */
  getWhitePlayer() {
    const players = this.getInfo('players')
    return players.find(player => player.color === stoneColors.WHITE)
  }

  /**
   * Set allow suicide
   */
  setAllowSuicide(allowSuicide) {
    this.allowSuicide = allowSuicide
  }

  /**
   * Set check repeat
   */
  setCheckRepeat(checkRepeat) {
    this.checkRepeat = checkRepeat
  }

  /**************************************************************************
   * Turn and capture count
   ***/

  /**
   * Set the player turn for the current position
   */
  setTurn(color) {
    const {position} = this
    if (position) {
      position.setTurn(color)
    }
  }

  /**
   * Get the player turn for this position
   */
  getTurn() {
    const {position} = this
    if (position) {
      return position.getTurn()
    }
    return stoneColors.BLACK
  }

  /**
   * Get the total capture count up to the current position
   */
  getCaptureCount() {

    //Initialize
    const {positions} = this
    const captures = {}
    const colors = [
      stoneColors.BLACK,
      stoneColors.WHITE,
    ]

    //Loop all positions
    for (const position of positions) {
      for (const color of colors) {
        captures[color] ??= 0
        captures[color] += position.getCaptureCount(color)
      }
    }

    //Return
    return captures
  }

  /**
   * Get time left
   */
  getTimeLeft(color) {

    //Get node
    let {node} = this

    //Root node? Return main time
    if (node.isRoot()) {
      return this.getInfo('rules.mainTime')
    }

    //Not a move node
    if (!node.isMove()) {
      return
    }

    //Check previous node if it's not this player's turn
    if (node.getMoveColor() !== color) {
      node = node.getPreviousMove()
      if (!node) {
        return this.getInfo('rules.mainTime')
      }
    }

    //Return time left
    return node.move.timeLeft
  }

  /**
   * Get periods left
   */
  getPeriodsLeft(color) {

    //Get node
    let {node} = this
    if (!node.isMove()) {
      return
    }

    //Check previous node if it's not this player's turn
    if (node.getMoveColor() !== color) {
      node = node.getPreviousMove()
      if (!node) {
        return
      }
    }

    //Return info
    return node.move.periodsLeft
  }

  /*****************************************************************************
   * Position handling
   ***/

  /**
   * Getter returns the last position from the stack
   */
  get position() {
    const {positions} = this
    return positions[positions.length - 1]
  }

  /**
   * Setter adds a new position to the stack
   */
  set position(newPosition) {
    const {positions} = this
    positions[positions.length] = newPosition
  }

  /**
   * Initialise the position stack
   */
  initialisePositionStack() {

    //Create new blank game position
    const {positions} = this
    const {width, height} = this.getGridSize()
    const position = new GamePosition(width, height)

    //Debug
    this.debug(`initialising position stack at ${width}x${height}`)

    //Clear positions stack push the position
    positions.length = 0
    positions.push(position)
  }

  /**
   * Add position to stack
   */
  addPositionToStack(newPosition) {
    this.positions.push(newPosition)
  }

  /**
   * Remove last position from stack
   */
  removeLastPositionFromStack() {
    if (this.positions.length > 0) {
      return this.positions.pop()
    }
  }

  /**
   * Replace the current position in the stack
   */
  replaceLastPositionInStack(newPosition) {
    if (newPosition) {
      this.positions.pop()
      this.positions.push(newPosition)
    }
  }

  /**
   * Clear the position stack
   */
  clearPositionStack() {
    this.positions = []
  }

  /**
   * Check if a given position is repeating within this game
   */
  isRepeatingPosition(checkPosition) {

    //Get data
    const {checkRepeat, positions} = this
    let stop

    //Check for ko only? (Last two positions)
    if (checkRepeat === checkRepeatTypes.KO && (positions.length - 2) >= 0) {
      stop = positions.length - 2
    }

    //Check all positions?
    else if (checkRepeat === checkRepeatTypes.ALL) {
      stop = 0
    }

    //Not repeating
    else {
      return false
    }

    //Loop positions to check
    for (let i = positions.length - 2; i >= stop; i--) {
      if (checkPosition.isSameAs(positions[i])) {
        return true
      }
    }

    //Not repeating
    return false
  }

  /*****************************************************************************
   * Node and position handling
   ***/

  /**
   * Get the current node
   */
  getCurrentNode() {
    return this.node
  }

  /**
   * Check if a node is the current node
   */
  isCurrentNode(node) {
    return this.node === node
  }

  /**
   * Get root node
   */
  getRootNode() {
    return this.root
  }

  /**
   * Check if a node is the root node
   */
  isRootNode(node) {
    return this.root === node
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
  getPath() {
    return this.path
  }

  /**
   * Find a node by name
   */
  findNodeByName(name) {
    return this.root.findNodeByName(name)
  }

  /**
   * Get the game path to a certain named node
   */
  getPathToNode(nodeName) {
    return GamePath.findNode(nodeName, this.root)
  }

  /**************************************************************************
   * Move number and named node handling
   ***/

  /**
   * Get current move number
   */
  getCurrentMoveNumber() {
    this.node.getMoveNumber()
  }

  /**
   * Get path index of current node
   */
  getCurrentPathIndex() {
    return this.node.getPathIndex()
  }

  /**
   * Get current node name
   */
  getCurrentNodeName() {
    return this.node.name
  }

  /**
   * Get the number of moves in the main branch
   */
  getTotalNumberOfMoves() {
    let node = this.root
    let m = 0
    while (node) {
      if (node.isMove()) {
        m++
      }
      node = node.getPathNode()
    }
    return m
  }

  /**
   * Get node for a certain move number
   */
  findNodeForMoveNumber(number) {
    let node = this.root
    let m = 0
    while (node) {
      if (node.isMove()) {
        m++
        if (m === number) {
          return node
        }
      }
      node = node.getPathNode()
    }
  }

  /**
   * Find named node
   */
  findNamedNode(name) {
    return this.root.findNamedNode(name)
  }

  /**
   * Get game path to a given move number
   */
  getPathToMoveNumber(number) {
    const path = new GamePath()
    path.setMove(number)
    return path
  }

  /**
   * Get path to named node
   */
  getPathToNamedNode(name) {
    const {root} = this
    const path = new GamePath()
    const node = root.findNamedNode(name, path)
    return node ? path : null
  }

  /*****************************************************************************
   * Coordinate checkers
   ***/

  /**
   * Check if coordinates are valid
   *
   * NOTE: This checks against game info, as opposed to an actual board object,
   * because this class can be used independently of the board class.
   */
  isValidCoordinate(x, y) {
    const {width, height} = this.getGridSize()
    return (x >= 0 && y >= 0 && x < width && y < height)
  }

  /**
   * Check if given coordinates are one of the next child node coordinates
   */
  isMoveVariation(x, y) {
    this.node.isMoveVariation(x, y)
  }

  /**
   * Get move variation index
   */
  getMoveVariationIndex(x, y) {
    return this.node.getMoveVariationIndex(x, y)
  }

  /**************************************************************************
   * Move and setup placement validation
   ***/

  /**
   * Wrapper for validateMove() returning a boolean and catching any errors
   */
  isValidMove(x, y, color) {
    const position = this.position.clone()
    const [isValid] = this.validateMove(position, x, y, color)
    return isValid
  }

  /**
   * Check if a move is valid against a given position
   */
  validateMove(position, x, y, color) {

    //Get data
    const {allowSuicide, checkRepeat} = this

    //Check coordinates validity
    if (!this.isValidCoordinate(x, y)) {
      return new ErrorOutcome(`Position (${x},${y}) is out of bounds`)
    }

    //Something already here?
    if (position.stones.has(x, y)) {
      return new ErrorOutcome(`Position (${x},${y}) already has a stone`)
    }

    //Set color of move to make
    if (typeof color === 'undefined') {
      color = position.getTurn()
    }

    //Place the new stone
    position.stones.set(x, y, color)

    //Capture adjacent stones if possible
    const hadCaptures = position.captureAdjacent(x, y)

    //No captures occurred? Check if the move we're making is a suicide move
    if (!hadCaptures) {
      if (!position.hasLiberties(x, y)) {
        if (allowSuicide) {
          position.captureGroup(x, y)
        }
        else {
          return new ErrorOutcome(`Move on (${x},${y}) is suicide`)
        }
      }
    }

    //Check position stack for repeating moves
    if (checkRepeat && this.isRepeatingPosition(position)) {
      return new ErrorOutcome(`Move on (${x},${y}) creates a repeating position`)
    }

    //Switch turn
    position.switchTurn()
    return new ValidOutcome()
  }

  /**
   * Check if a setup placement is valid.
   */
  validateSetupPlacement(x, y, color, newPosition) {

    //Get data
    const {position} = this

    //Check coordinates validity
    if (!this.isValidCoordinate(x, y)) {
      return [null, `Position (${x},${y}) is out of bounds`]
    }

    //Create position
    newPosition = newPosition || position.clone()
    newPosition.stones.set(x, y, color)

    //Capture adjacent stones if possible
    const hadCaptures = newPosition.captureAdjacent(x, y)

    //No captures occurred? Check if the move we're making is a suicide move
    if (!hadCaptures) {

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
   * Check if we have markup in a given area
   */
  hasMarkupInArea(area) {
    return area.some(({x, y}) => {
      return this.hasMarkup(x, y)
    })
  }

  /**
   * Add markup
   */
  addMarkup(x, y, markup) {

    //No markup here
    if (this.hasMarkup(x, y, markup)) {
      this.debug(`already has markup of type ${markup.type} on (${x},${y})`)
      return
    }

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

    //Remove
    const {position, node} = this
    node.removeMarkup(x, y)
    position.markup.delete(x, y)
  }

  /**
   * Remove markup from area
   */
  removeMarkupFromArea(area) {
    for (const {x, y} of area) {
      if (this.hasMarkup(x, y)) {
        this.removeMarkup(x, y)
      }
    }
  }

  /**
   * Remove all markup from position
   */
  removeAllMarkup() {

    //Remove all markup
    const {position, node} = this
    node.removeAllMarkupInstructions()
    position.markup.clear()
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
   * Check if we have one or more stones in a given area
   */
  hasStonesInArea(area) {
    return area.some(({x, y}) => this.hasStone(x, y))
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
      this.warn(reason)
      return
    }

    //Add to node as a setup instruction
    const newNodeIndex = node.addSetup(x, y, {type: color})

    //Replace the position if a new node was created
    if (typeof newNodeIndex !== 'undefined') {
      this.debug(`new node was created with index ${newNodeIndex}`)
      this.handleNewSetupNodeCreation(newNodeIndex)
      this.replaceLastPositionInStack(newPosition)
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
    this.replaceLastPositionInStack(newPosition)
  }

  /**
   * Remove stones from area
   */
  removeStonesFromArea(area) {
    for (const {x, y} of area) {
      if (this.hasStone(x, y)) {
        this.removeStone(x, y)
      }
    }
  }

  /**
   * Helper to handle the creation of a new setup node
   */
  handleNewSetupNodeCreation(i) {

    //Nothing to do
    if (typeof i === 'undefined') {
      return
    }

    //Advance path to the added node index
    this.node = this.node.getChild(i)
    this.path.advance(i)

    //Clone our position
    const position = this.position.clone()
    this.addPositionToStack(position)
  }

  /*****************************************************************************
   * Playing a move or passing
   ***/

  /**
   * Play a move
   */
  playMove(x, y) {

    //Get color
    const color = this.position.getTurn()

    //Already have a variation here? Just advance position
    if (this.node.hasMoveVariation(x, y)) {
      const i = this.node.getMoveVariationIndex(x, y)
      return this.goToNextPosition(i)
    }

    //Validate move and get new position
    const newPosition = this.position.clone()
    const outcome = this.validateMove(newPosition, x, y, color)

    //Invalid move
    if (!outcome.isValid) {
      this.warn(outcome.reason)
      return outcome
    }

    //Create new move node
    const node = new GameNode({
      move: {x, y, color},
    })

    //Append it to the current node, remember the variation, and change the pointer
    const parent = this.node
    const i = node.appendToParent(parent)
    parent.setPathIndex(i)

    //Advance path to the added node index
    this.node = node
    this.path.advance(i)

    //Valid move
    this.addPositionToStack(newPosition)
    return new ValidOutcome()
  }

  /**
   * Pass move
   */
  passMove() {

    //Get color
    const color = this.position.getTurn()

    //Initialize new position and switch the turn
    const newPosition = this.position.clone()
    newPosition.switchTurn()

    //Create new move node
    const node = new GameNode({
      move: {
        color,
        pass: true,
      },
    })

    //Append it to the current node, remember the path
    const parent = this.node
    const i = node.appendToParent(parent)
    parent.setPathIndex(i)

    //Advance path to the added node index
    this.node = node
    this.path.advance(i)

    //Add new position to stack
    this.addPositionToStack(newPosition)
    return new ValidOutcome()
  }

  /*****************************************************************************
   * Game tree navigation
   ***/

  /**
   * Check if there is a next position
   */
  hasNextPosition() {
    const {node} = this
    return node.hasChildren()
  }

  /**
   * Check if there is a previous position
   */
  hasPreviousPosition() {
    const {root, node} = this
    return (root !== node)
  }

  /**
   * Is at first position
   */
  isAtFirstPosition() {
    return !this.hasPreviousPosition()
  }

  /**
   * Is at last position
   */
  isAtLastPosition() {
    return !this.hasNextPosition()
  }

  /**
   * Go to the next position
   */
  goToNextPosition(i) {
    if (this.goToNextNode(i)) {
      return this.processCurrentNode()
    }
    return new ErrorOutcome(`No next position`)
  }

  /**
   * Go to the previous position
   */
  goToPreviousPosition() {
    if (this.goToPreviousNode()) {
      return new ValidOutcome()
    }
    return new ErrorOutcome(`No previous position`)
  }

  /**
   * Go to the last position
   */
  goToLastPosition() {
    while (this.goToNextNode()) {
      this.processCurrentNode()
    }
  }

  /**
   * Go to the first position
   */
  goToFirstPosition() {
    this.goToFirstNode()
    this.processCurrentNode()
  }

  /**
   * Go to specific move number
   */
  goToMoveNumber(number) {

    //Already here
    if (this.getCurrentMoveNumber() === number) {
      return
    }

    //Get path to the named node
    const path = this.getPathToMoveNumber(name)
    this.goToPath(path)
  }

  /**
   * Go to specific named node
   */
  goToNamedNode(name) {

    //Already here
    if (this.getCurrentNodeName() === name) {
      return
    }

    //Get path to the named node
    const path = this.getPathToNamedNode(name)
    this.goToPath(path)
  }

  /**
   * Go to position indicated by given path
   */
  goToPath(path) {

    //No path or already here?
    if (!path || this.path.isSameAs(path)) {
      return
    }

    //Go to the first position
    this.goToFirstPosition()

    //Loop path
    const n = path.getMoveNumber()
    for (let m = 0; m < n; m++) {

      //Try going to the next node
      const i = path.indexAtMove(m)
      if (!this.goToNextNode(i)) {
        break
      }

      //Execute node and break if invalid
      const outcome = this.processCurrentNode()
      if (!outcome.isValid) {
        break
      }
    }
  }

  /**
   * Go to the next fork
   */
  goToNextFork() {
    while (this.goToNextNode()) {
      const outcome = this.processCurrentNode()
      if (!outcome.isValid) {
        break
      }
      if (this.node.hasMultipleChildren()) {
        break
      }
    }
  }

  /**
   * Go to the previous fork
   */
  goToPreviousFork() {
    while (this.goToPreviousNode()) {
      if (this.node.hasMultipleChildren()) {
        break
      }
    }
  }

  /**
   * Go to the next move with comments
   */
  goToNextComment() {
    while (this.goToNextNode()) {
      const outcome = this.processCurrentNode()
      if (!outcome.isValid) {
        break
      }
      if (this.node.hasComments()) {
        break
      }
    }
  }

  /**
   * Go to the previous move with comments
   */
  goToPreviousComment() {
    while (this.goToPreviousNode()) {
      if (this.node.hasComments()) {
        break
      }
    }
  }

  /**
   * Go forward a number of positions
   */
  goForwardNumPositions(num) {
    for (let i = 0; i < num; i++) {
      if (!this.goToNextPosition()) {
        return
      }
    }
  }

  /**
   * Go backward a number of positions
   */
  goBackNumPositions(num) {
    for (let i = 0; i < num; i++) {
      if (!this.goToPreviousPosition()) {
        return
      }
    }
  }

  /*****************************************************************************
   * Node navigation helpers
   ***/

  /**
   * Select next variation
   */
  selectNextVariation() {
    this.node.incrementPathIndex()
  }

  /**
   * Select previous variation
   */
  selectPreviousVariation() {
    this.node.decrementPathIndex()
  }

  /**
   * Go to the next node
   */
  goToNextNode(i) {

    //Get data
    const {node} = this

    //Check if we have children
    if (!node.hasChildren()) {
      return false
    }

    //Validate index
    if (!node.isValidPathIndex(i)) {
      i = 0
    }

    //Advance path and set pointer of current node
    //TODO create helper for this as it's repeated often
    this.path.advance(i)
    this.node = node.getChild(i)
    return true
  }

  /**
   * Go to the previous node
   */
  goToPreviousNode() {

    //Get data
    const {node} = this

    //No parent node?
    if (!node.hasParent()) {
      return false
    }

    //Retreat path and set pointer to current node
    this.path.retreat()
    this.node = node.getParent()

    //Remove last position from stack
    this.removeLastPositionFromStack()
    return true
  }

  /**
   * Go to the first node
   */
  goToFirstNode() {

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
    this.initialisePositionStack()
  }

  /**
   * Execute the current node
   */
  processCurrentNode(revertPositionOnFail = true) {

    //Get data
    const {node, position} = this

    //Make this node the path node on its parent
    node.setAsParentPathNode()

    //Initialize new position
    const newPosition = position.clone()

    //Pass move
    if (node.isPassMove()) {
      newPosition.switchTurn()
    }

    //Play move
    if (node.isPlayMove()) {
      const {x, y, color} = node.move
      const outcome = this.validateMove(newPosition, x, y, color)

      //New position is not valid
      if (!outcome.isValid) {

        //Revert position on failure?
        if (revertPositionOnFail) {
          this.goToPreviousNode()
        }

        //Return failure reason
        this.warn(outcome.reason)
        return outcome
      }
    }

    //Handle turn instructions
    if (node.hasTurnIndicator()) {
      newPosition.setTurn(node.turn)
    }

    //Handle setup instructions
    if (node.hasSetupInstructions()) {
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
    if (node.hasMarkupInstructions()) {
      for (const markup of node.markup) {
        const {type, coords} = markup
        for (const coord of coords) {
          const {x, y, text} = coord
          newPosition.markup.set(x, y, {type, text})
        }
      }
    }

    //Add position to stack
    this.addPositionToStack(newPosition)
    return new ValidOutcome()
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

  /**
   * Convert file to given format
   */
  toData(format) {

    //Use appropriate converter
    switch (format) {
      case kifuFormats.SGF:
        return this.toSgf()
      case kifuFormats.JGF:
        return this.toJgf()
      case kifuFormats.JSON:
        return this.toJson()
      default:
        throw new Error(`Unsupported data format`)
    }
  }

  /**
   * Generate file name from game info
   */
  getFileName() {

    //Get info
    const dates = this.getInfo('game.dates')
    const players = this.getInfo('players')
    const numMoves = this.getTotalNumberOfMoves()

    //Ensure correct order of players
    const black = players.find(player => player.color === stoneColors.BLACK)
    const white = players.find(player => player.color === stoneColors.WHITE)

    //Parse players
    const playerInfo = [black, white]
      .map(player => {
        const {name, rank} = player
        if (rank) {
          return `${name} [${rank}]`
        }
        return name
      })
      .join(' vs ')

    //Return filename
    return `${dates[0]} ${numMoves > 0 ? `- ${numMoves}` : ''} - ${playerInfo}`
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
        throw new Error(`Unsupported data format`)
    }
  }
}
