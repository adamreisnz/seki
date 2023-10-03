import {stoneColors} from '../constants/stone.js'

/**
 * A simple class that contains a game score
 */
export default class GameScore {

  /**
   * Constructor
   */
  constructor() {

    //Setup score containers
    this.black = {}
    this.white = {}

    //Initialize
    this.init()
  }

  /**
   * Initialise the game score
   */
  init() {

    //Get properties to loop
    const props =

    //Loop
    props.forEach(prop => {
      this.black[prop] = 0
      this.white[prop] = 0
    })
  }

  /**
   * Get the winner
   */
  winner() {

    //Get totals
    const b = this.calcTotal(this.black)
    const w = this.calcTotal(this.white)

    //Determine winner
    if (w > b) {
      return stoneColors.WHITE
    }
    else if (b > w) {
      return stoneColors.BLACK
    }
  }

  /**
   * Helper to calculate the total points
   */
  calcTotal(item) {
    return (
      parseInt(item.stones) +
      parseInt(item.territory) +
      parseInt(item.captures) +
      parseFloat(item.komi)
    )
  }
}
