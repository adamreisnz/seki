import PlayerMode from './player-mode.js'
import GameScoreState from '../game-score-state.js'
import GameScoreEstimator from '../game-score-estimator.js'
import {boardLayerTypes} from '../../constants/board.js'
import {playerModes} from '../../constants/player.js'
import {normalizeCoordinatesObject} from '../../helpers/coordinates.js'

/**
 * Scoring mode
 */
export default class PlayerModeScore extends PlayerMode {

  //Mode type
  mode = playerModes.SCORE

  /**
   * Initialise
   */
  init() {

    //Extend player
    this.extendPlayer()

    //Create bound event listeners
    this.createBoundListeners({
      click: 'onClick',
    })
  }

  /**
   * Extend the player with new methods
   */
  extendPlayer() {

    //Get data
    const {player, mode} = this

    //Extend player
    player.extend('estimateScore', mode)
    player.extend('calculateScore', mode)
    player.extend('setDeadStones', mode)
    player.extend('toggleDeadStone', mode)
  }

  /**
   * Activate this mode
   */
  activate() {

    //Get data
    const {board, game} = this

    //Initialise dead stones grid and score state
    this.scoreState = new GameScoreState(game)

    //Call parent method and remove all markup from the board
    super.activate()
    board.removeAll(boardLayerTypes.MARKUP)
  }

  /**
   * Deactivate this mode
   */
  deactivate() {

    //Get player
    const {player} = this

    //Parent method
    super.deactivate()

    //Clear the score
    player.triggerEvent('score', null)
    this.clearScore()
  }

  /**************************************************************************
   * Event listeners
   ***/

  /**
   * Click handler
   */
  onClick(event) {

    //Check if valid coordinates
    if (!this.hasValidCoordinates(event)) {
      return
    }

    //Get data
    const {x, y} = event.detail

    //Toggle dead stone on these coordinates and re-calculate score
    this.toggleDeadStone(x, y)
    this.calculateScore()
  }

  /**************************************************************************
   * Scoring
   ***/

  /**
   * Estimate score based on probability map
   *
   * Probability map is an array of arrays of numbers between -1 and 1, as per
   * the output of Sabaki's deadstones library.
   */
  estimateScore(probabilityMap, threshold) {

    //Get board and game and initialise estimator
    const {player, game} = this
    const estimator = new GameScoreEstimator(game)

    //Use probability map
    estimator.useProbabilityMap(probabilityMap, threshold)

    //Estimate score
    const result = estimator.estimate()

    //Display score and return the result
    this.displayScore(result)
    player.triggerEvent('score', result)
    return result
  }

  /**
   * Calculate score based on given dead stones
   */
  calculateScore(deadStones) {

    //Get board and game and initialise estimator
    const {player, game, scoreState} = this
    const estimator = new GameScoreEstimator(game)

    //Any dead stones passed?
    if (deadStones) {
      this.setDeadStones(deadStones)
    }

    //Feed state to estimator
    estimator.useGameScoreState(scoreState)

    //Estimate score
    const result = estimator.estimate()

    //Display score and return the result
    this.displayScore(result)
    player.triggerEvent('score', result)
    return result
  }

  /**
   * Display territory and captures on the scoring layer of the board
   * based on the output of a score estimate or calculation
   */
  displayScore(result) {

    //Get data
    const {board} = this
    const {territory, captures} = result

    //Remove markup and setup score layer
    board.removeAll(boardLayerTypes.MARKUP)
    board.setAll(boardLayerTypes.SCORE, territory, captures)
    board.redraw()
  }

  /**
   * Clear the scoring layer
   */
  clearScore() {

    //Get board and game
    const {board} = this

    //Remove all scoring
    board.removeAll(boardLayerTypes.SCORE)
    board.redraw()
  }

  /**************************************************************************
   * Helpers
   ***/

  /**
   * Set dead stones
   */
  setDeadStones(deadStones) {
    for (const entry of deadStones) {
      const {x, y} = normalizeCoordinatesObject(entry)
      this.scoreState.markDead(x, y)
    }
  }

  /**
   * Toggle dead stones
   */
  toggleDeadStone(x, y) {
    this.scoreState.toggle(x, y)
  }
}
