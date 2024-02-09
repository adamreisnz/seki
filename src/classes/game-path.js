
/**
 * A simple class that keeps track of a path taken in a game
 */
export default class GamePath {

  /**
   * Constructor
   */
  constructor() {

    //Initialize
    this.init()
  }

  /**
   * Init
   */
  init() {
    this.moveNo = 0
    this.path = {}
    this.branches = 0
  }

  /**
   * Reset
   */
  reset() {
    this.init()
  }

  /**
   * Remember path choice at current move number
   */
  rememberPathChoice(i) {
    const {moveNo, path} = this
    if (i > 0) {
      path[moveNo] = i
      this.branches++
    }
  }

  /**
   * Forget path choice at current move number
   */
  forgetPathChoice() {
    const {moveNo, path} = this
    if (path[moveNo] > 0) {
      delete path[moveNo]
      this.branches--
    }
  }

  /**
   * Advance a move
   */
  advance(i) {

    //Remember path choice
    this.rememberPathChoice(i)

    //Increment move no
    this.moveNo++
  }

  /**
   * Retreat a move
   */
  retreat() {

    //At start?
    const {moveNo} = this
    if (moveNo === 0) {
      return
    }

    //Forget path choice
    this.forgetPathChoice()

    //Decrement move
    this.moveNo--
  }

  /**
   * Go to a specific move number
   */
  setMove(no) {

    //Get data
    const {moveNo, path} = this

    //Less than our current move? We need to erase any paths above the move number
    if (no < moveNo) {
      for (const i in path) {
        if (i > no) {
          delete path[i]
          this.branches--
        }
      }
    }

    //Set move number
    this.moveNo = no
  }

  /**
   * Get the move number
   */
  getMoveNumber() {
    return this.moveNo
  }

  /**
   * Get the current path index
   */
  currentIndex() {
    const {moveNo, path} = this
    return path[moveNo]
  }

  /**
   * Get the node choice at a specific move number
   */
  indexAtMove(moveNo) {
    const {path} = this
    if (typeof path[moveNo] !== 'undefined') {
      return path[moveNo]
    }
    return 0
  }

  /**
   * Compare to another path
   */
  isSameAs(other) {

    //No other path
    if (!other) {
      return false
    }

    //Invalid object?
    if (!(other instanceof GamePath)) {
      throw new Error(`Not a GamePath object`)
    }

    //Get data
    const {path, moveNo, branches} = this

    //Different move number or path length?
    if (moveNo !== other.moveNo || branches !== other.branches) {
      return false
    }

    //Check path
    for (const i in path) {
      if (
        typeof other.path[i] === 'undefined' ||
        path[i] !== other.path[i]
      ) {
        return false
      }
    }

    //Same path!
    return true
  }

  /**
   * Clone
   */
  clone() {
    return GamePath.fromObject(this)
  }

  /**
   * Convert to plain object
   */
  toObject() {
    return {
      moveNo: this.moveNo,
      branches: this.branches,
      path: JSON.parse(JSON.stringify(this.path)),
    }
  }

  /**
   * Convert plain object into a game path
   */
  static fromObject(obj) {

    //Create new instance
    const path = new GamePath()

    //Set vars
    path.moveNo = obj.moveNo
    path.branches = obj.branches
    path.path = JSON.parse(JSON.stringify(obj.path))

    //Return
    return path
  }
}
