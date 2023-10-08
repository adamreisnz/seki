
/**
 * This class represents a single node in the game moves tree. It contains
 * properties like the x and y grid coordinates, the move played, board setup
 * instructions, markup, player turn and comments. The moves tree in the game
 * record is represented by a string of GameNodes, each with pointers to their
 * parent and children. Each node can have multiple children (move variations),
 * but only one parent.
 */
export default class GameNode {

  //Parent and children
  root
  parent
  children = []

  //The selected path index (for navigating variations)
  index = 0

  /**
   * Constructor
   */
  constructor(data) {
    if (data) {
      for (const key in data) {
        this[key] = data[key]
      }
    }

    //Root node is ourselves unless we get attached to a parent
    this.root = this
  }

  /**************************************************************************
   * Child and parent controls
   ***/

  /**
   * Check if the node has any chilren
   */
  hasChildren() {
    return (this.children.length > 0)
  }

  /**
   * Check if the node has more than one child
   */
  hasMultipleChildren() {
    return (this.children.length > 1)
  }

  /**
   * Get all the children
   */
  getChildren() {
    return this.children
  }

  /**
   * Set all the children
   */
  setChildren(children) {
    this.children = children
  }

  /**
   * Merge children
   */
  mergeChildren(children) {
    this.children = this.children.concat(children)
  }

  /**
   * Get node's child specified by index
   */
  getChild(i = 0) {
    return this.children[i]
  }

  /**
   * Find the index of a child node
   */
  indexOf(child) {
    return this.children.indexOf(child)
  }

  /**
   * Add a child (returns the index of the newly added child)
   */
  addChild(child) {
    this.children.push(child)
    return this.children.length - 1
  }

  /**
   * Remove a child node, either by instance or given index
   */
  removeChild(child) {

    //Game node instance given
    if (child instanceof GameNode) {
      const i = this.indexOf(child)
      return this.removeChild(i)
    }

    //Index given
    const i = child
    if (i !== -1 && this.children[i]) {
      this.children[i].removeParent()
      this.children.splice(i, 1)
    }
  }

  /**
   * Move a child to a different index
   */
  moveChild(child, newIndex) {

    //Validate index
    const {children} = this
    if (newIndex < 0 || newIndex >= children.length) {
      return
    }

    //Not found
    const currentIndex = this.indexOf(child)
    if (currentIndex === -1) {
      return
    }

    //Get
    const existing = children[newIndex]

    //Swap
    children[newIndex] = child
    children[currentIndex] = existing
  }

  /**
   * Check if the node has a parent
   */
  hasParent() {
    return Boolean(this.parent)
  }

  /**
   * Get parent node
   */
  getParent() {
    return this.parent
  }

  /**
   * Set parent node
   */
  setParent(parent) {
    this.parent = parent
    this.root = parent.root
  }

  /**
   * Remove parent
   */
  removeParent() {
    this.parent = null
  }

  /*****************************************************************************
   * Node manipulation
   ***/

  /**
   * Detach this node from its parent
   */
  detachFromParent() {
    const {parent} = this
    if (parent) {
      parent.removeChild(this)
      this.parent = null
      this.root = this
    }
  }

  /**
   * Append this node to a parent node
   */
  appendToParent(node) {
    this.detachFromParent()
    this.setParent(node)
    return node.addChild(this)
  }

  /**
   * Append child node to this node.
   */
  appendChild(node) {
    node.detachFromParent()
    node.setParent(this)
    return this.addChild(node)
  }

  /**
   * Move the node up in the parent's child tree
   * NOTE: Not currently in use
   */
  moveUpInParent() {
    const {parent} = this
    if (parent) {
      const i = parent.indexOf(this)
      parent.moveChild(this, i - 1)
    }
  }

  /**
   * Move the node down in the parent's child tree
   * NOTE: Not currently in use
   */
  moveDownInParent() {
    const {parent} = this
    if (parent) {
      const i = parent.indexOf(this)
      parent.moveChild(this, i + 1)
    }
  }

  /**
   * Insert another node after this one
   */
  insertNode(node) {

    //Change parent node on children
    const {children} = this
    for (const child of children) {
      child.setParent(node)
    }

    //Merge children, set this node as the parent of given node
    node.mergeChildren(children)
    node.setParent(this)

    //Set given node as the child of this node
    this.setChildren([node])
  }

  /**************************************************************************
   * Move handling
   ***/

  /**
   * Get move number
   */
  getMoveNumber() {
    const {parent, move} = this
    const n = move ? 1 : 0
    const p = parent ? parent.getMoveNumber() : 0
    return n + p
  }

  /**
   * Get the move number since we
   */
  getVariationMoveNumber() {
    const {parent, move} = this
    if (!this.isVariationBranch()) {
      return 0
    }
    const n = move ? 1 : 0
    const p = parent ? parent.getVariationMoveNumber() : 0
    return n + p
  }

  /**
   * Check if we're on a variation branch
   */
  isVariationBranch() {

    //Get parent
    const {parent} = this

    //If no parent, we're the root node of the main branch
    if (!parent) {
      return false
    }

    //If the parent is on a variation branch, we are too
    if (parent.isVariationBranch()) {
      return true
    }

    //Get our child index – if not zero, we're a variation branch
    return parent.indexOf(this) > 0
  }

  /**
   * Check if this is a move node
   */
  isMove() {
    const {move} = this
    return Boolean(move)
  }

  /**
   * Check if this is a non-pass move
   */
  isPlayMove() {
    const {move} = this
    return Boolean(move && !move.pass)
  }

  /**
   * Check if this is a pass move
   */
  isPassMove() {
    const {move} = this
    return Boolean(move && move.pass)
  }

  /**
   * Check if we have a move at given coordinates
   */
  hasMove(x, y) {
    const {move} = this
    return Boolean(move && move.x === x && move.y === y)
  }

  /**
   * Check if there is a move variation at the given coordinates
   */
  hasMoveVariation(x, y) {
    const {children} = this
    return children.some(child => child.hasMove(x, y))
  }

  /**
   * Get the move child node for the given coordinates
   */
  getMoveVariation(x, y) {
    const {children} = this
    return children
      .findIndex(child => child.hasMove(x, y))
  }

  /**
   * Check if given coordinates are from one of the next child move nodes
   */
  isMoveVariation(x, y) {
    const {children} = this
    return children
      .some(child => child.hasMove(x, y))
  }

  /**
   * Check if the node has any move variation
   */
  hasMoveVariations() {
    const {children} = this
    return children
      .filter(child => child.isMove())
      .length > 0
  }

  /**
   * Check if the node has more than one move variation
   */
  hasMultipleMoveVariations() {
    const {children} = this
    return children
      .filter(child => child.isMove())
      .length > 1
  }

  /**
   * Get all the child nodes that are moves
   */
  getMoveVariations() {
    const {children} = this
    return children
      .filter(child => child.isMove())
  }

  /**
   * Check if we have comments in this node
   */
  hasComments() {
    const {comments} = this
    return (comments && comments.length > 0)
  }

  /**************************************************************************
   * Path helpers
   ***/

  /**
   * Set the path index if valid
   */
  setPathIndex(i) {
    if (this.isValidPathIndex(i)) {
      this.index = i
    }
  }

  /**
   * Get active path index
   */
  getPathIndex() {
    return this.index
  }

  /**
   * Check if an index is a valid path index
   */
  isValidPathIndex(i) {
    const {children} = this
    if (typeof i === 'undefined' || i < 0) {
      return false
    }
    return (typeof children[i] !== 'undefined')
  }

  /**
   * Is main path
   */
  isMainPath() {
    return (this.index === 0)
  }

  /**
   * Set the path to point to the given node
   */
  setPathNode(child) {
    const i = this.indexOf(child)
    this.setPathIndex(i)
  }

  /**
   * Get node on path index
   */
  getPathNode() {
    const {children, index} = this
    return children[index]
  }

  /**
   * Make this node the path node on its parent
   */
  setAsParentPathNode() {
    const {parent} = this
    if (parent) {
      parent.setPathNode(this)
    }
  }

  /**
   * Check if a node is the selected path
   */
  isSelectedPath(child) {
    const {children, index} = this
    return (child === children[index])
  }

  /**
   * Select next path if possible
   */
  selectNextPath() {
    const {children, index} = this
    const next = index + 1
    if (next < children.length && children[next]) {
      this.index = next
    }
  }

  /**
   * Select previous path if possible
   */
  selectPreviousPath() {
    const {children, index} = this
    const prev = index - 1
    if (prev >= 0 && children[prev]) {
      this.index = prev
    }
  }

  /**************************************************************************
   * Markup helpers
   ***/

  /**
   * Add markup
   */
  addMarkup(x, y, data) {

    //Remove existing markup on same coords first
    this.removeMarkup(x, y)

    //No markup instructions container in this node?
    if (typeof this.markup === 'undefined') {
      this.markup = []
    }

    //Find entry for this type
    const {markup} = this
    const {type, text} = data
    const entry = markup.find(entry => entry.type === type)

    //No entry yet?
    if (!entry) {
      markup.push({
        type,
        coords: [{x, y, text}],
      })
      return
    }

    //Add to existing entry
    entry.coords.push({x, y})
  }

  /**
   * Remove markup
   */
  removeMarkup(x, y) {

    //No markup instructions container in this node?
    const {markup} = this
    if (typeof markup === 'undefined') {
      return
    }

    //Go over markup and remove
    markup.forEach(entry => {
      const i = entry.coords.findIndex(coord => coord.x === x && coord.y === y)
      if (i !== -1) {
        entry.coords.splice(i, 1)
      }
    })

    //Remove empty entries
    this.markup = markup.filter(entry => entry.coords.length > 0)
  }

  /**
   * Check if we have markup for certain coords in this node
   */
  hasMarkup(x, y) {

    //No markup instructions container in this node?
    const {markup} = this
    if (typeof markup === 'undefined') {
      return
    }

    //Go over markup and check
    return markup
      .some(entry => entry.coords
        .some(coord => coord.x === x && coord.y === y))
  }

  /**************************************************************************
   * Setup helpers
   ***/

  /**
   * Add setup instruction
   */
  addSetup(x, y, data) {

    //Remove existing setup on same coords first
    this.removeSetup(x, y)

    //No setup instructions container in this node?
    if (typeof this.setup === 'undefined') {
      this.setup = []
    }

    //Is this a move node?
    if (this.isMove()) {

      //Create a new node
      const node = new GameNode()
      const i = node.appendToParent(this)

      //Add the setup instruction to this node
      node.addSetup(x, y, data)

      //Return the newly created node index
      return i
    }

    //Find entry for this type
    const {setup} = this
    const {type} = data
    const entry = setup.find(entry => entry.type === type)

    //No entry yet?
    if (!entry) {
      setup.push({
        type,
        coords: [{x, y}],
      })
      return
    }

    //Add to existing entry
    entry.coords.push({x, y})
  }

  /**
   * Remove setup
   */
  removeSetup(x, y) {

    //No setup instructions container in this node?
    const {setup} = this
    if (typeof setup === 'undefined') {
      return
    }

    //Go over setup and remove
    setup.forEach(entry => {
      const i = entry.coords.findIndex(coord => coord.x === x && coord.y === y)
      if (i !== -1) {
        entry.coords.splice(i, 1)
      }
    })

    //Remove empty entries
    this.setup = setup.filter(entry => entry.coords.length > 0)
  }

  /**
   * Check if we have setup for certain coords in this node
   */
  hasSetup(x, y) {

    //No setup instructions container in this node?
    const {setup} = this
    if (typeof setup === 'undefined') {
      return
    }

    //Go over setup and check
    return setup
      .some(entry => entry.coords
        .some(coord => coord.x === x && coord.y === y))
  }
}
