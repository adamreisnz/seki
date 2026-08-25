import Grid from './grid.js'
import {stoneColors} from '../constants/stone.js'
import {swapColor, isValidColor} from '../helpers/color.js'

/**
 * This class represents a single game position. It keeps track of the stones
 * and markup on the board in this position, as well as any captures that were
 * made and which player's turn it is. The class is also equipped with helpers
 * to check for liberties, capture stones, and compare changes to other positions.
 */
export default class GamePosition {

  /**
   * Constructor
   */
  constructor(width, height) {

    //Initialize
    this.width = 0
    this.height = 0
    this.stones = new Grid()
    this.markup = new Grid()
    this.lines = []
    this.turn = stoneColors.BLACK
    this.koPoint = null

    //Initialize captures
    this.captures = {
      [stoneColors.BLACK]: [],
      [stoneColors.WHITE]: [],
    }

    //Set size
    if (width || height) {
      this.setSize(width, height)
    }
  }

  /**
   * Set the grid size
   */
  setSize(width, height) {

    //Check what's given
    width = width || height || 0
    height = height || width || 0

    //Set
    this.width = parseInt(width)
    this.height = parseInt(height)

    //Set in grids
    this.stones.setSize(width, height)
    this.markup.setSize(width, height)

    //Clear the position
    this.clear()
  }

  /**
   * Clear the whole position
   */
  clear() {
    this.stones.clear()
    this.markup.clear()
    this.lines = []
  }

  /**
   * Sets stone color at given coordinates
   */
  setStone(x, y, color) {
    this.stones.set(x, y, color)
  }

  /**
   * Remove stone at given coordinates
   */
  removeStone(x, y) {
    this.stones.delete(x, y)
  }

  /**
   * Has stones check
   */
  hasStones() {
    return !this.stones.isEmpty()
  }

  /**
   * Sets markup type at given coordinates
   */
  setMarkup(x, y, markup) {
    this.markup.set(x, y, markup)
  }

  /**
   * Remove markup at given coordinates
   */
  removeMarkup(x, y) {
    this.markup.delete(x, y)
  }

  /**
   * Has markup check
   */
  hasMarkup() {
    return !this.markup.isEmpty()
  }

  /**
   * Add line
   */
  addLine(fromX, fromY, toX, toY, color) {
    this.lines.push([fromX, fromY, toX, toY, color])
  }

  /**
   * Set lines
   */
  setLines(lines) {
    this.lines = lines
  }

  /**
   * Has lines check
   */
  hasLines() {
    return this.lines.length > 0
  }

  /**
   * Get lines
   */
  getLines() {
    return this.lines
  }

  /**
   * Remove lines
   */
  removeLines() {
    this.lines = []
  }

  /*****************************************************************************
   * Liberties and capturing
   ***/

  /**
   * Get the coordinates adjacent to the given ones which are on the board
   */
  getNeighbours(x, y) {
    return [
      {x, y: y - 1},
      {x, y: y + 1},
      {x: x - 1, y},
      {x: x + 1, y},
    ].filter(({x, y}) => this.stones.isOnGrid(x, y))
  }

  /**
   * Check if a group of given color has liberties, starting at the given coordinates
   */
  hasLiberties(x, y, groupColor, tested) {

    //Out of bounds? No liberties outside of the board
    if (!this.stones.isOnGrid(x, y)) {
      return false
    }

    //Initialize tested grid if needed
    tested = tested || new Grid(this.width, this.height)

    //See what color is present on the coordinates
    const color = this.stones.get(x, y)

    //If no group color was given, use what's on the position
    groupColor = groupColor || color
    const enemyColor = swapColor(groupColor)

    //Already tested
    if (tested.get(x, y) === true) {
      return false
    }

    //Enemy stone, not giving liberties
    if (color === enemyColor) {
      return false
    }

    //Empty? That's a liberty
    if (!color) {
      return true
    }

    //Mark this position as tested now
    tested.set(x, y, true)

    //Ok, so we're looking at a stone of our own color.
    //Test adjacent positions. If we get at least one true, we have a liberty
    return (
      this.hasLiberties(x, y - 1, groupColor, tested) ||
      this.hasLiberties(x, y + 1, groupColor, tested) ||
      this.hasLiberties(x - 1, y, groupColor, tested) ||
      this.hasLiberties(x + 1, y, groupColor, tested)
    )
  }

  /**
   * Helper to capture adjacent groups
   */
  captureAdjacent(x, y, friendlyColor) {

    //Validate color
    if (friendlyColor && !isValidColor(friendlyColor)) {
      throw new Error(`Invalid color: ${friendlyColor}`)
    }

    //Validate boundaries
    if (!this.stones.isOnGrid(x, y)) {
      return false
    }

    //Use color of stone present if none given
    if (typeof friendlyColor === 'undefined') {
      friendlyColor = this.stones.get(x, y)
    }

    //Can't capture empty spots
    if (!friendlyColor) {
      return false
    }

    //Get enemy color
    const enemyColor = swapColor(friendlyColor)

    //Remember how many enemy stones are already off the board, so that we can
    //tell afterwards which of them this stone took
    const numCaptured = this.captures[enemyColor].length

    //Flag to see if we captured stuff
    let captured = false

    //Check adjacent positions now, capturing stones in the process if possible
    if (this.canCapture(x, y - 1, enemyColor, true)) {
      captured = true
    }
    if (this.canCapture(x, y + 1, enemyColor, true)) {
      captured = true
    }
    if (this.canCapture(x - 1, y, enemyColor, true)) {
      captured = true
    }
    if (this.canCapture(x + 1, y, enemyColor, true)) {
      captured = true
    }

    //Work out whether what just happened was a ko
    this.determineKoPoint(
      x, y, friendlyColor, this.captures[enemyColor].slice(numCaptured)
    )

    //Return
    return captured
  }

  /**
   * Helper if we can capture a certain group
   */
  canCapture(x, y, enemyColor, doCapture) {

    //Out of bounds? Nothing to capture
    if (!this.stones.isOnGrid(x, y)) {
      return false
    }

    //Get color
    const color = this.stones.get(x, y)

    //Empty spot? Can't capture
    if (!color) {
      return false
    }

    //Use color of stone present if none given
    enemyColor = enemyColor || color

    //We need to have a stone of matching group color in order to be able to capture it
    if (color !== enemyColor) {
      return false
    }

    //There is a capturable stone, let's see if it has any liberties left
    if (this.hasLiberties(x, y, enemyColor)) {
      return false
    }

    //No liberties left, the group is capturable. Capture if we want to
    if (doCapture) {
      this.captureGroup(x, y, enemyColor)
    }

    //Capturable
    return true
  }

  /**
   * Capture a group of certain color, starting at the given coordinates
   */
  captureGroup(x, y, enemyColor) {

    //Validate color
    if (enemyColor && !isValidColor(enemyColor)) {
      throw new Error(`Invalid color: ${enemyColor}`)
    }

    //Validate boundaries
    if (!this.stones.isOnGrid(x, y)) {
      return false
    }

    //If no group color was given, use what's on the position
    if (typeof enemyColor === 'undefined') {
      enemyColor = this.stones.get(x, y)
    }

    //Stone at position does not match the given group color? Can't capture it
    if (this.stones.get(x, y) !== enemyColor) {
      return false
    }

    //Capture the stone
    this.captureStone(x, y)

    //Capture the rest of the group
    this.captureGroup(x, y - 1, enemyColor)
    this.captureGroup(x, y + 1, enemyColor)
    this.captureGroup(x - 1, y, enemyColor)
    this.captureGroup(x + 1, y, enemyColor)

    //At least one stone was captured
    return true
  }

  /**
   * Capture a stone at given coordinates
   */
  captureStone(x, y) {

    //Validate boundaries
    if (!this.stones.isOnGrid(x, y)) {
      return
    }

    //Get color
    const color = this.stones.get(x, y)
    if (!color) {
      return
    }

    //Ok, stone present, capture it
    this.stones.delete(x, y)
    this.captures[color].push({x, y})
  }

  /**
   * Check if captures occurred in this position
   */
  hasCaptures() {
    return (
      this.captures[stoneColors.BLACK].length > 0 ||
      this.captures[stoneColors.WHITE].length > 0
    )
  }

  /**
   * Set captures for a color (expects array with capture object coordinates)
   */
  setCaptures(color, captures) {
    if (!isValidColor(color)) {
      throw new Error(`Invalid color: ${color}`)
    }
    this.captures[color] = captures
  }

  /**
   * Get captures for a color
   */
  getCaptures(color) {
    if (!isValidColor(color)) {
      throw new Error(`Invalid color: ${color}`)
    }
    return this.captures[color] || []
  }

  /**
   * Get the capture count for a color (= the number of captures of the enemy color)
   */
  getCaptureCount(color) {
    if (!isValidColor(color)) {
      throw new Error(`Invalid color: ${color}`)
    }
    const otherColor = swapColor(color)
    return this.captures[otherColor].length
  }

  /**
   * Get total capture count for this position
   */
  getTotalCaptureCount() {
    return (
      this.captures[stoneColors.BLACK].length +
      this.captures[stoneColors.WHITE].length
    )
  }

  /*****************************************************************************
   * Ko point
   ***/

  /**
   * Determine the ko point after a stone of the given color was played on the
   * given coordinates, having taken the given stones off the board
   *
   * A simple ko is the one shape where a single stone can be taken straight
   * back, recreating the position that was just left behind. It is recognised
   * here the way Sabaki's go-board does it, from the move that just happened
   * rather than by searching the position stack: exactly one stone came off,
   * no neighbour of the played stone is friendly, and the only liberty the
   * played stone has left is the point that stone came off.
   *
   * Those last two conditions are what rule out every other shape. Taking a
   * stone off the end of a chain leaves a chain behind rather than a lone
   * stone, and a snapback leaves the capturing stone with somewhere else to
   * breathe. With no friendly neighbour the played stone is a group of one,
   * so its liberties are simply its empty neighbours and no walk of the group
   * is needed to count them.
   */
  determineKoPoint(x, y, color, captures) {

    //Whatever ko was here belongs to the position this one was cloned from
    this.koPoint = null

    //A ko takes exactly one stone
    if (captures.length !== 1) {
      return
    }

    //Get the neighbouring points that are on the board
    const neighbours = this.getNeighbours(x, y)

    //A friendly neighbour means the played stone is part of a bigger group,
    //which no single move can take back
    if (neighbours.some(({x, y}) => this.stones.get(x, y) === color)) {
      return
    }

    //The played stone must have exactly one liberty left
    const liberties = neighbours.filter(({x, y}) => !this.stones.has(x, y))
    if (liberties.length !== 1) {
      return
    }

    //And it must be the point the captured stone came off
    const [capture] = captures
    const [liberty] = liberties
    if (liberty.x !== capture.x || liberty.y !== capture.y) {
      return
    }

    //Genuine simple ko. The color recorded is the one that may not play there,
    //being the player who just lost the stone. It is kept alongside the point
    //rather than read off the turn, because a record is free to set the turn
    //to whatever it likes after a move.
    this.koPoint = {
      x: capture.x,
      y: capture.y,
      color: swapColor(color),
    }
  }

  /**
   * Get the ko point for this position, if any
   */
  getKoPoint() {
    return this.koPoint
  }

  /**
   * Check if this position has a ko point
   */
  hasKoPoint() {
    return (this.koPoint !== null)
  }

  /**
   * Check if the given coordinates are the ko point of this position,
   * optionally for a specific color
   */
  isKoPoint(x, y, color) {

    //Get data
    const {koPoint} = this

    //No ko point, or not this point
    if (!koPoint || koPoint.x !== x || koPoint.y !== y) {
      return false
    }

    //Asked about a specific color? Only the one that lost the stone is barred
    if (typeof color !== 'undefined' && koPoint.color !== color) {
      return false
    }

    //It's the ko point
    return true
  }

  /**
   * Clear the ko point
   */
  clearKoPoint() {
    this.koPoint = null
  }

  /*****************************************************************************
   * Turn control
   ***/

  /**
   * Set color for whose move it is at this position
   */
  setTurn(color) {
    if (!isValidColor(color)) {
      throw new Error(`Invalid color: ${color}`)
    }
    this.turn = color
  }

  /**
   * Get color for whose move it is at this position
   */
  getTurn() {
    return this.turn
  }

  /**
   * Switch the player turn on this position
   */
  switchTurn() {
    this.turn = swapColor(this.turn)
  }

  /*****************************************************************************
   * Cloning and comparison
   ***/

  /**
   * Clones the whole position except the captures and the ko point
   *
   * NOTE: the ko point is deliberately left behind. It describes what the move
   * that produced this position did, not what the next move may do, so a clone
   * starts without one and only gets one again if the move played onto it
   * creates a ko of its own. That is what expires a ko after a move elsewhere,
   * a pass, or a setup instruction, without any of them having to remember to
   * clear it.
   */
  clone(withMarkup = false) {

    //Create a new position
    const newPosition = new GamePosition()
    const {turn, width, height, stones, markup} = this

    //Set vars
    newPosition.turn = turn
    newPosition.width = width
    newPosition.height = height
    newPosition.stones = stones.clone()

    //With markup?
    if (withMarkup) {
      newPosition.markup = markup.clone()
    }
    else {
      newPosition.markup = new Grid(width, height)
    }

    //Return
    return newPosition
  }

  /**
   * Checks if a given position is the same as the current position
   *
   * NOTE: only the size and the stones are compared, deliberately. This is
   * what the repeat scan asks to decide whether a move is legal, and a repeat
   * is a repeat of the stones on the board. Comparing the ko point as well
   * would break the very thing it describes: a candidate position that takes
   * a ko back carries a ko point of its own while the position it repeats
   * carries none, so the two would never match and the recapture the scan
   * exists to reject would be let through.
   */
  isSameAs(newPosition) {

    //Get data
    const {stones, width, height} = this

    //Must have the same size
    if (width !== newPosition.width || height !== newPosition.height) {
      return false
    }

    //Compare the grids
    return stones.isSameAs(newPosition.stones)
  }
}
