
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
   * Advance a move
   */
  advance(i) {

    //Get data
    const {moveNo, path} = this

    //Different child variation chosen? Remember
    if (i > 0) {
      path[moveNo] = i
      this.branches++
    }

    //Increment move no
    this.moveNo++
  }

  /**
   * Retreat a move
   */
  retreat() {

    //Get data
    const {moveNo, path} = this

    //At start?
    if (moveNo === 0) {
      return
    }

    //Delete path choice
    if (path[moveNo] > 0) {
      delete path[moveNo]
      this.branches--
    }

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
  isSameAs(otherPath) {

    //Invalid object?
    if (
      !otherPath ||
      typeof otherPath !== 'object' ||
      typeof otherPath.moveNo === 'undefined'
    ) {
      return
    }

    //Get data
    const {path, moveNo, branches} = this

    //Different move number or path length?
    if (moveNo !== otherPath.moveNo || branches !== otherPath.branches) {
      return false
    }

    //Check path
    for (const i in path) {
      if (
        typeof otherPath.path[i] === 'undefined' ||
        path[i] !== otherPath.path[i]
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

    //Create new instance
    const newPath = new GamePath()

    //Set vars
    newPath.moveNo = this.moveNo
    newPath.branches = this.branches
    newPath.path = JSON.parse(JSON.stringify(this.path))

    //Return
    return newPath
  }
}
