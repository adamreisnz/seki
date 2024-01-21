import {stoneColors} from '../constants/stone.js'
import {scoringMethods} from '../constants/score.js'

/**
 * Game color score
 */
export class GameColorScore {

  /**
   * Constructor
   */
  constructor(color) {
    this.color = color
    this.stones = 0
    this.territory = 0
    this.captures = 0
    this.komi = 0
  }

  /**
   * Get total points for a given scoring method
   */
  getTotal(method) {
    switch (method) {
      case scoringMethods.AREA:
        return this.getAreaScoringTotal()
      case scoringMethods.TERRITORY:
        return this.getTerritoryScoringTotal()
    }
  }

  /**
   * Area scoring total
   */
  getAreaScoringTotal() {
    return (
      this.stones +
      this.territory +
      this.komi
    )
  }

  /**
   * Territory scoring total
   */
  getTerritoryScoringTotal() {
    return (
      this.territory +
      this.captures +
      this.komi
    )
  }
}

/**
 * A simple class that contains a game score
 */
export default class GameScore {

  /**
   * Constructor
   */
  constructor() {
    this.reset()
  }

  /**
   * Reset score
   */
  reset() {
    this[stoneColors.BLACK] = new GameColorScore(stoneColors.BLACK)
    this[stoneColors.WHITE] = new GameColorScore(stoneColors.WHITE)
  }

  /**
   * Set komi
   */
  setKomi(komi) {
    if (komi > 0) {
      this[stoneColors.WHITE].komi = komi
    }
    else if (komi < 0) {
      this[stoneColors.BLACK].komi = komi
    }
  }

  /**
   * Set captures
   */
  setCaptures(color, captures) {
    this[color].captures = captures
  }

  /**
   * Add capture
   */
  addCapture(color) {
    this[color].captures++
  }

  /**
   * Add stone
   */
  addStone(color) {
    this[color].stones++
  }

  /**
   * Add territory
   */
  addTerritory(color) {
    this[color].territory++
  }

  /**
   * Get the winning color
   */
  getWinningColor(method = scoringMethods.TERRITORY) {

    //Get totals
    const b = this.getTotal(stoneColors.BLACK, method)
    const w = this.getTotal(stoneColors.WHITE, method)

    //Determine winner
    if (w > b) {
      return stoneColors.WHITE
    }
    else if (b > w) {
      return stoneColors.BLACK
    }
  }

  /**
   * Get result string
   */
  getResult(method = scoringMethods.TERRITORY) {

    //Get totals
    const b = this.getTotal(stoneColors.BLACK, method)
    const w = this.getTotal(stoneColors.WHITE, method)

    //Determine winner
    if (w > b) {
      return `W+${w - b}`
    }
    else if (b > w) {
      return `B+${b - w}`
    }
    else {
      return '?'
    }
  }

  /**
   * Get total points for a given color for the current method
   */
  getTotal(color, method = scoringMethods.TERRITORY) {
    return this[color].getTotal(method)
  }
}
