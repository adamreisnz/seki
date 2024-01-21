import Grid from './grid.js'
import GameScore from './game-score.js'
import {stoneColors} from '../constants/stone.js'
import {scoreStates} from '../constants/score.js'
import {swapColor} from '../helpers/color.js'

/**
 * Helper class to estimate the game score
 */
export default class GameScoreEstimator {

  /**
   * Constructor
   */
  constructor(game) {

    //Set game and initialise
    this.game = game
    this.init()
  }

  /**
   * Initialise
   */
  init() {

    //Get data
    const {game} = this
    const {width, height} = game.getBoardSize()

    //Initialise grids
    this.territory = new Grid(width, height)
    this.captures = new Grid(width, height)
    this.stones = new Grid(width, height)
  }

  /**
   * Use game score state
   */
  useGameScoreState(state) {

    //Get data
    const {game, territory, captures, stones} = this
    const {width, height} = game.getBoardSize()
    const states = state.determineStatesGrid()

    //Loop position
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {

        //Get state and color on original position
        const state = states.get(x, y)
        const candidateColor = this.getCandidateColorFromState(state)
        const actualColor = game.position.stones.get(x, y)

        //Stone of given color
        if (actualColor && state === actualColor) {
          stones.set(x, y, {color: actualColor})
        }

        //Candidate
        else if (candidateColor) {
          territory.set(x, y, {color: candidateColor, probability: 1})
          if (actualColor && actualColor !== candidateColor) {
            captures.set(x, y, {color: actualColor})
          }
        }
      }
    }
  }

  /**
   * Use probability map
   */
  useProbabilityMap(probabilityMap, threshold = 0.333) {

    //Get data
    const {game, territory, captures, stones} = this
    const {width, height} = game.getBoardSize()

    //Iterate over propability map
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {

        //Get probability and ignore if under threshold
        const probability = probabilityMap[y][x]
        if (Math.abs(probability) < threshold) {
          continue
        }

        //Get actual and likely color
        const actualColor = game.position.stones.get(x, y)
        const likelyColor = probability > 0 ? stoneColors.BLACK : stoneColors.WHITE

        //If a stone of the same color is here, add stone
        if (actualColor === likelyColor) {
          stones.set(x, y, {color: actualColor})
          continue
        }

        //If a stone of the opposite color is here, create it as a capture
        else if (actualColor) {
          captures.set(x, y, {color: actualColor})
        }

        //Set as territory
        territory.set(x, y, {color: likelyColor, probability})
      }
    }
  }

  /**
   * Estimate score based on what has been set as territory, captures and stones
   */
  estimate() {

    //Get data
    const {game, territory, captures, stones} = this
    const {width, height} = game.getBoardSize()

    //Initialise score
    const score = new GameScore()

    //Get komi and captures
    const komi = game.getKomi()
    const caps = game.getCaptureCount()

    //Set in score
    score.setCaptures(stoneColors.BLACK, caps[stoneColors.BLACK])
    score.setCaptures(stoneColors.WHITE, caps[stoneColors.WHITE])
    score.setKomi(komi)

    //Iterate over propability map
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {

        //Check what's here
        const stone = stones.get(x, y)
        const capture = captures.get(x, y)
        const point = territory.get(x, y)

        //Stone present
        if (stone) {
          score.addStone(stone.color)
        }

        //Capture
        if (capture) {
          score.addCapture(swapColor(capture.color))
        }

        //Point
        if (point) {
          score.addTerritory(point.color)
        }
      }
    }

    //Return data
    return {score, territory, captures, stones}
  }

  /**
   * Get color based on state
   */
  getCandidateColorFromState(state) {
    switch (state) {
      case scoreStates.BLACK_CANDIDATE:
        return stoneColors.BLACK
      case scoreStates.WHITE_CANDIDATE:
        return stoneColors.WHITE
    }
  }
}
