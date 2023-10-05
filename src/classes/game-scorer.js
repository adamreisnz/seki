import Grid from './grid.js'
import GameScore from './game-score.js'
import {stoneColors} from '../constants/stone.js'
import {scoreState} from '../constants/game.js'

/**
 * This class is used to determine the score of a certain game position.
 * It also provides handling of manual adjustment of dead / living groups.
 */
export default class GameScorer {

  /**
   * Constructor
   */
  constructor(game) {

    //Create copy of stones grid
    const stones = game.position.stones.clone()
    const captures = new Grid(stones.width, stones.height)
    const points = new Grid(stones.width, stones.height)

    //Set game and score
    this.game = game
    this.score = new GameScore()

    //Set stones, captures and points grids
    this.stones = stones
    this.captures = captures
    this.points = points
  }

  /**
   * Get the calculated score
   */
  getScore() {
    return this.score
  }

  /**
   * Get the points grid
   */
  getPoints() {
    return this.points
  }

  /**
   * Get the captures grid
   */
  getCaptures() {
    return this.captures
  }

  /**
   * Run score calculation routine
   */
  calculate() {

    //Get data
    const {stones, points, captures, score, game} = this

    //Clear grids
    points.clear()
    captures.clear()

    //Determine score state
    this.determineScoreState()

    //Get komi and captures
    const komi = game.getKomi()
    const numCaptures = game.getCaptureCount()

    //Reset score
    score.reset()

    //Set captures and komi
    score.black.numCaptures = numCaptures[stoneColors.BLACK]
    score.white.numCaptures = numCaptures[stoneColors.WHITE]
    score.black.komi = komi < 0 ? komi : 0
    score.white.komi = komi > 0 ? komi : 0

    //Init helper vars
    let x, y, state, color

    //Loop position
    for (x = 0; x < stones.width; x++) {
      for (y = 0; y < stones.height; y++) {

        //Get state and color on original position
        state = stones.get(x, y)
        color = game.position.stones.get(x, y)

        //Black stone
        if (state === scoreState.BLACK_STONE && color === stoneColors.BLACK) {
          score.black.stones++
          continue
        }

        //White stone
        if (state === scoreState.WHITE_STONE && color === stoneColors.WHITE) {
          score.white.stones++
          continue
        }

        //Black candidate
        if (state === scoreState.BLACK_CANDIDATE) {
          score.black.territory++
          points.set(x, y, stoneColors.BLACK)

          //White stone underneath?
          if (color === stoneColors.WHITE) {
            score.black.captures++
            captures.set(x, y, stoneColors.WHITE)
          }
          continue
        }

        //White candidate
        if (state === scoreState.WHITE_CANDIDATE) {
          score.white.territory++
          points.set(x, y, stoneColors.WHITE)

          //Black stone underneath?
          if (color === stoneColors.BLACK) {
            score.white.captures++
            captures.set(x, y, stoneColors.BLACK)
          }
          continue
        }
      }
    }
  }

  /**
   * Mark stones dead or alive
   */
  mark(x, y) {

    //Get data
    const {stones, game} = this

    //Get color of original position and state of the count position
    let color = game.position.stones.get(x, y)
    let state = stones.get(x, y)

    //White stone
    if (color === stoneColors.WHITE) {

      //Was white, mark it and any territory it's in as black's
      if (state === scoreState.WHITE_STONE) {
        this.territorySet(
          x, y, scoreState.BLACK_CANDIDATE, scoreState.BLACK_STONE,
        )
      }

      //Was marked as not white, reset the territory
      else {
        this.territoryReset(x, y)
      }
    }

    //Black stone
    else if (color === stoneColors.BLACK) {

      //Was black, mark it and any territory it's in as white's
      if (state === scoreState.BLACK_STONE) {
        this.territorySet(
          x, y, scoreState.WHITE_CANDIDATE, scoreState.WHITE_STONE,
        )
      }

      //Was marked as not black, reset the territory
      else {
        this.territoryReset(x, y)
      }
    }
  }

  /**************************************************************************
   * Helpers
   ***/

  /**
   * Helper to set territory
   */
  territorySet(x, y, candidateColor, boundaryColor) {

    //Get color at given position
    let posColor = this.stones.get(x, y)
    let origColor = this.game.position.stones.get(x, y)

    //If border reached, or a position which is already this color, or boundary color, can't set
    if (
      !this.stones.isOnGrid(x, y) ||
      posColor === candidateColor ||
      posColor === boundaryColor
    ) {
      return
    }

    //Don't turn stones which are already this color into candidates, instead
    //reset their color to what they were
    if (origColor * 2 === candidateColor) {
      this.stones.set(x, y, origColor)
    }

    //Otherwise, mark as candidate
    else {
      this.stones.set(x, y, candidateColor)
    }

    //Set adjacent squares
    this.territorySet(x - 1, y, candidateColor, boundaryColor)
    this.territorySet(x, y - 1, candidateColor, boundaryColor)
    this.territorySet(x + 1, y, candidateColor, boundaryColor)
    this.territorySet(x, y + 1, candidateColor, boundaryColor)
  }

  /**
   * Helper to reset territory
   */
  territoryReset(x, y) {

    //Get original color from this position
    let origColor = this.game.position.stones.get(x, y)

    //Not on grid, or already this color?
    if (!this.stones.isOnGrid(x, y) || this.stones.get(x, y) === origColor) {
      return
    }

    //Reset the color
    this.stones.set(x, y, origColor)

    //Set adjacent squares
    this.territoryReset(x - 1, y)
    this.territoryReset(x, y - 1)
    this.territoryReset(x + 1, y)
    this.territoryReset(x, y + 1)
  }

  /**
   * Helper to determine score state
   */
  determineScoreState() {

    //Initialize vars
    let change = true
    let curState, newState, adjacent, b, w, a, x, y

    //Loop while there is change
    while (change) {

      //Set to false
      change = false

      //Go through the whole position
      for (x = 0; x < this.stones.width; x++) {
        for (y = 0; y < this.stones.height; y++) {

          //Get current state at position
          curState = this.stones.get(x, y)

          //Unknown or candiates?
          if (
            curState === scoreState.UNKNOWN ||
            curState === scoreState.BLACK_CANDIDATE ||
            curState === scoreState.WHITE_CANDIDATE
          ) {

            //Get state in adjacent positions
            adjacent = [
              this.stones.get(x - 1, y),
              this.stones.get(x, y - 1),
              this.stones.get(x + 1, y),
              this.stones.get(x, y + 1),
            ]

            //Reset
            b = w = false

            //Loop adjacent squares
            for (a = 0; a < 4; a++) {
              if (
                adjacent[a] === scoreState.BLACK_STONE ||
                adjacent[a] === scoreState.BLACK_CANDIDATE
              ) {
                b = true
              }
              else if (
                adjacent[a] === scoreState.WHITE_STONE ||
                adjacent[a] === scoreState.WHITE_CANDIDATE
              ) {
                w = true
              }
              else if (adjacent[a] === scoreState.NEUTRAL) {
                b = w = true
              }
            }

            //Determine new state
            if (b && w) {
              newState = scoreState.NEUTRAL
            }
            else if (b) {
              newState = scoreState.BLACK_CANDIDATE
            }
            else if (w) {
              newState = scoreState.WHITE_CANDIDATE
            }
            else {
              newState = false
            }

            //Change?
            if (newState !== false && newState !== curState) {
              change = true
              this.stones.set(x, y, newState)
            }
          }
        }
      }
    }
  }
}
