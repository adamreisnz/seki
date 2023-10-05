import Stone from './stone.js'

/**
 * Special stone class to indicate a clear setup instruction
 */
export default class StoneEmpty extends Stone {

  /**
   * Constructor
   */
  constructor(board) {

    //Parent constructor
    super(board)

    //Set empty
    this.isEmpty = true
  }
}
