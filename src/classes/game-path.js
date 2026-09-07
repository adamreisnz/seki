
/**
 * A simple class that keeps track of a path taken in a game
 *
 * A path is described by how many nodes deep into the tree it goes, and by
 * the child chosen at each fork along the way. NOTE: that depth is not the
 * number a move calls itself. A record carrying SGF MN properties renumbers
 * what GameNode.getMoveNumber() reports, and a node that isn't a move counts
 * towards the depth without being a move at all. Depth is what indexes the
 * choices below, so it stays a plain count of nodes.
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
    this.depth = 0
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
   * Remember the path choice made when stepping away from a given depth
   *
   * NOTE: a choice is stored against the depth it was made *at*, being the
   * step from that node to the next one. So reaching depth n is described by
   * the choices at 0 through n - 1.
   */
  rememberPathChoice(depth, i) {
    const {path} = this
    if (i > 0) {
      path[depth] = i
      this.branches++
    }
  }

  /**
   * Forget the path choice made at a given depth
   */
  forgetPathChoice(depth) {
    const {path} = this
    if (path[depth] > 0) {
      delete path[depth]
      this.branches--
    }
  }

  /**
   * Advance a node
   */
  advance(i) {

    //Remember the choice made at the node we're stepping away from
    this.rememberPathChoice(this.depth, i)

    //Increment depth
    this.depth++
  }

  /**
   * Retreat a node
   */
  retreat() {

    //At start?
    const {depth} = this
    if (depth === 0) {
      return
    }

    //Forget the choice that got us here, which was made one node back.
    //NOTE: this used to forget the choice at the current depth, which is one
    //too high, so stepping back out of a variation left the choice in place
    //and the path went on describing the variation.
    this.forgetPathChoice(depth - 1)

    //Decrement depth
    this.depth--
  }

  /**
   * Go to a specific depth
   */
  setDepth(no) {

    //Get data
    const {depth, path} = this

    //Less than our current depth? We need to erase any choices from the target
    //depth onwards. The choice stored at the target depth is the step away
    //from it, which is exactly what jumping back there undoes.
    if (no < depth) {
      for (const i in path) {
        if (Number(i) >= no) {
          delete path[i]
          this.branches--
        }
      }
    }

    //Set depth
    this.depth = no
  }

  /**
   * Get how many nodes deep the path is
   */
  getDepth() {
    return this.depth
  }

  /**
   * Get the current path index
   */
  currentIndex() {
    const {depth, path} = this
    return path[depth]
  }

  /**
   * Get the node choice at a specific depth
   */
  indexAtDepth(depth) {
    const {path} = this
    if (typeof path[depth] !== 'undefined') {
      return path[depth]
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
    const {path, depth, branches} = this

    //Different depth or path length?
    if (depth !== other.depth || branches !== other.branches) {
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
      depth: this.depth,
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

    //Set vars. NOTE: seki 6 called the depth moveNo, so a path serialised by
    //one of those is read back through the old key. Without that it would
    //arrive with no depth at all, walk no nodes, resolve to the root and
    //rewind the board to the start without a word.
    path.depth = obj.depth ?? obj.moveNo
    path.branches = obj.branches
    path.path = JSON.parse(JSON.stringify(obj.path))

    //Return
    return path
  }
}
