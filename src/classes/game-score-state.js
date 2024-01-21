import {stoneColors} from '../constants/stone.js'
import {scoreStates} from '../constants/score.js'

/**
 * Stores the state of the game score
 */
export default class GameScoreState {

  /**
   * Constructor
   */
  constructor(game) {

    //Set game and initialise
    this.game = game
    this.states = game.position.stones.clone()
  }

  /**
   * Mark stones as dead
   */
  markDead(x, y) {

    //Get color of original position
    const {game} = this
    const color = game.position.stones.get(x, y)

    //Was white, mark it and any territory it's in as black's
    if (color === stoneColors.WHITE) {
      this.territorySet(
        x, y, scoreStates.BLACK_CANDIDATE, scoreStates.BLACK_STONE,
      )
    }

    //Was black, mark it and any territory it's in as white's
    else if (color === stoneColors.BLACK) {
      this.territorySet(
        x, y, scoreStates.WHITE_CANDIDATE, scoreStates.WHITE_STONE,
      )
    }
  }

  /**
   * Toggle stones dead or alive
   */
  toggle(x, y) {

    //Get data
    const {states, game} = this

    //Get color of original position and scoring state
    const color = game.position.stones.get(x, y)
    const state = states.get(x, y)

    //White stone
    if (color === stoneColors.WHITE) {

      //Was white, mark it and any territory it's in as black's
      if (state === scoreStates.WHITE_STONE) {
        this.territorySet(
          x, y, scoreStates.BLACK_CANDIDATE, scoreStates.BLACK_STONE,
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
      if (state === scoreStates.BLACK_STONE) {
        this.territorySet(
          x, y, scoreStates.WHITE_CANDIDATE, scoreStates.WHITE_STONE,
        )
      }

      //Was marked as not black, reset the territory
      else {
        this.territoryReset(x, y)
      }
    }
  }

  /**
   * Convert stone color to score state color
   */
  getCandidateState(color) {
    switch (color) {
      case stoneColors.BLACK:
        return scoreStates.BLACK_CANDIDATE;
      case stoneColors.WHITE:
        return scoreStates.WHITE_CANDIDATE;
    }
  }

  /**************************************************************************
   * Helpers
   ***/

  /**
   * Helper to set territory
   */
  territorySet(x, y, candidateState, boundaryState) {

    //Not on grid
    const {states, game} = this
    if (!states.isOnGrid(x, y)) {
      return
    }

    //Get state at given position and original color
    const state = states.get(x, y)
    const color = game.position.stones.get(x, y)

    //Position is already in the candidate or boundary state
    if (state === candidateState || state === boundaryState) {
      return
    }

    //Don't turn stones which are already in the candidate state into candidates
    //Instead, reset their state to what they were
    if (this.getCandidateState(color) === candidateState) {
      states.set(x, y, color)
    }

    //Otherwise, mark as candidate
    else {
      states.set(x, y, candidateState)
    }

    //Set adjacent squares
    this.territorySet(x - 1, y, candidateState, boundaryState)
    this.territorySet(x, y - 1, candidateState, boundaryState)
    this.territorySet(x + 1, y, candidateState, boundaryState)
    this.territorySet(x, y + 1, candidateState, boundaryState)
  }

  /**
   * Helper to reset territory
   */
  territoryReset(x, y) {

    //Not on grid
    const {states, game} = this
    if (!states.isOnGrid(x, y)) {
      return
    }

    //Check if already this color
    const color = game.position.stones.get(x, y)
    if (states.get(x, y) === color) {
      return
    }

    //Reset the color
    states.set(x, y, color)

    //Set adjacent squares
    this.territoryReset(x - 1, y)
    this.territoryReset(x, y - 1)
    this.territoryReset(x + 1, y)
    this.territoryReset(x, y + 1)
  }

  /**
   * Helper to determine the states grid
   */
  determineStatesGrid() {

    //Get data
    const {states} = this

    //Initialize vars
    let change = true
    let curState, newState, adjacent, b, w, a, x, y

    //Loop while there is change
    while (change) {

      //Set to false
      change = false

      //Go through the whole position
      for (x = 0; x < states.width; x++) {
        for (y = 0; y < states.height; y++) {

          //Get current state at position
          curState = states.get(x, y)

          //Unknown or candiates?
          if (
            !curState ||
            curState === scoreStates.BLACK_CANDIDATE ||
            curState === scoreStates.WHITE_CANDIDATE
          ) {

            //Get state in adjacent positions
            adjacent = [
              states.get(x - 1, y),
              states.get(x, y - 1),
              states.get(x + 1, y),
              states.get(x, y + 1),
            ]

            //Reset
            b = w = false

            //Loop adjacent squares
            for (a = 0; a < 4; a++) {
              if (
                adjacent[a] === scoreStates.BLACK_STONE ||
                adjacent[a] === scoreStates.BLACK_CANDIDATE
              ) {
                b = true
              }
              else if (
                adjacent[a] === scoreStates.WHITE_STONE ||
                adjacent[a] === scoreStates.WHITE_CANDIDATE
              ) {
                w = true
              }
              else if (adjacent[a] === scoreStates.NEUTRAL) {
                b = w = true
              }
            }

            //Determine new state
            if (b && w) {
              newState = scoreStates.NEUTRAL
            }
            else if (b) {
              newState = scoreStates.BLACK_CANDIDATE
            }
            else if (w) {
              newState = scoreStates.WHITE_CANDIDATE
            }
            else {
              newState = false
            }

            //Change?
            if (newState !== false && newState !== curState) {
              change = true
              states.set(x, y, newState)
            }
          }
        }
      }
    }

    //Return the states grid
    return states
  }
}
