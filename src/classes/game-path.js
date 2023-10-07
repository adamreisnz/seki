
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
  compare(otherPath) {

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

  /**
   * Static helper to find node name recursively
   */
  static findNodeName(node, nodeName, path) {

    //Found in this node?
    if (node.name && node.name === nodeName) {
      return true
    }

    //Loop children
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i]

      //Advance path
      path.advance(i)

      //Found in child node?
      if (this.findNodeName(child, nodeName, path)) {
        return true
      }

      //Not found in this child node, retreat path
      path.retreat()
    }

    //Not found
    return false
  }

  /**
   * Static helper to create a path object to reach a certain node
   */
  static findNode(nodeName, rootNode) {

    //Create new instance
    const path = new GamePath()

    //Find the node name
    if (this.findNodeName(rootNode, nodeName, path)) {
      return path
    }

    //Not found
    return null
  }
}
