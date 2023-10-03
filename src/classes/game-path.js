
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
    this.move = 0
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

    //Different child variation chosen? Remember
    if (i > 0) {
      this.path[this.move] = 1
      this.branches++
    }

    //Increment move
    this.move++
  }

  /**
   * Retreat a move
   */
  retreat() {

    //At start?
    if (this.move === 0) {
      return
    }

    //Delete path choice
    if (this.path[this.move]) {
      delete this.path[this.move]
      this.branches--
    }

    //Decrement move
    this.move--
  }

  /**
   * Go to a specific move number
   */
  setMove(no) {

    //Less than our current move? We need to erase any paths above the move number
    if (no < this.move) {
      for (let i in this.path) {
        if (i > no) {
          delete this.path[i]
          this.branches--
        }
      }
    }

    //Set move number
    this.move = no
  }

  /**
   * Get the move number
   */
  getMove() {
    return this.move
  }

  /**
   * Get the node choice at a specific move number
   */
  nodeAt(no) {
    return (typeof this.path[no] === 'undefined') ? 0 : this.path[no]
  }

  /**
   * Compare to another path
   */
  compare(otherPath) {

    //Invalid object?
    if (
      !otherPath ||
      typeof otherPath !== 'object' ||
      typeof otherPath.move === 'undefined'
    ) {
      return
    }

    //Different move number or path length?
    if (this.move !== otherPath.move || this.branches !== otherPath.branches) {
      return false
    }

    //Check path
    for (let i in this.path) {
      if (
        typeof otherPath.path[i] === 'undefined' ||
        this.path[i] !== otherPath.path[i]
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
    newPath.move = this.move
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

      //Advance path
      path.advance(i)

      //Found in child node?
      if (this.findNodeName(node.children[i], nodeName, path)) {
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
    let path = new GamePath()

    //Find the node name
    if (this.findNodeName(rootNode, nodeName, path)) {
      return path
    }

    //Not found
    return null
  }
}
