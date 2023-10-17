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
    this.error = 0
    this.width = 0
    this.height = 0
    this.stones = new Grid()
    this.markup = new Grid()
    this.turn = stoneColors.BLACK

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
  }

  /**
   * Sets stone color at given coordinates
   */
  setStone(x, y, color) {
    this.stones.set(x, y, color)
  }

  /**
   * Sets markup type at given coordinates
   */
  setMarkup(x, y, markup) {
    this.markup.set(x, y, markup)
  }

  /*****************************************************************************
   * Liberties and capturing
   ***/

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
   * Clones the whole position except turn and captures
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
