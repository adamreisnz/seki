
/**
 * This class represents a single node in the game moves tree. It contains
 * properties like the x and y grid coordinates, the move played, board setup
 * instructions, markup, player turn and comments. The moves tree in the game
 * record is represented by a string of GameNodes, each with pointers to their
 * parent and children. Each node can have multiple children (move variations),
 * but only one parent.
 */
export default class GameNode {

  /**
   * Constructor
   */
  constructor(data, parent) {

    //Set parent and children
    this.parent = parent || null
    this.children = []

    //Save properties
    if (data) {
      for (const key in data) {
        this[key] = data[key]
      }
    }
  }

  /**
   * Get node's child specified by index or null if doesn't exist
   */
  getChild(i) {
    i = i || 0
    if (this.children[i]) {
      return this.children[i]
    }
    return null
  }

  /**
   * Get all the children
   */
  getChildren() {
    return this.children
  }

  /**
   * Check if the node has any chilren
   */
  hasChildren() {
    return (this.children.length > 0)
  }

  /**
   * Get parent node
   */
  getParent() {
    return this.parent
  }

  /**
   * Check if the node has more than one move variation
   */
  hasMoveVariations() {

    //Less than two child nodes?
    if (this.children.length <= 1) {
      return false
    }

    //Loop children
    let moveVariations = 0
    for (let i = 0; i < this.children.length; i++) {

      //Is this a move node?
      if (this.children[i].isMove()) {
        moveVariations++
      }

      //More than one move node present?
      if (moveVariations > 1) {
        return true
      }
    }

    //No move variations
    return false
  }

  /**
   * Get all the move variation nodes
   */
  getMoveVariations() {

    //No child nodes?
    if (this.children.length === 0) {
      return false
    }

    //Initialize
    let moveVariations = []

    //Loop child nodes
    for (let i = 0; i < this.children.length; i++) {

      //Is this a move node?
      if (this.children[i].isMove()) {
        moveVariations.push(this.children[i])
      }
    }

    //Return
    return moveVariations
  }

  /**
   * Get the move variation for given coordinates
   */
  getMoveVariation(x, y) {

    //Get children
    const {children} = this

    //Loop the child nodes
    for (let i = 0; i < children.length; i++) {
      const child = children[i]
      if (child.move && child.move.x === x && child.move.y === y) {
        return i
      }
    }

    //Not found
    return -1
  }

  /**
   * Check if given coordinates are one of the next child node coordinates
   */
  isMoveVariation(x, y) {

    //Get children
    const {children} = this

    //Loop the child nodes
    for (let i = 0; i < children.length; i++) {
      const child = children[i]
      if (child.move && child.move.x === x && child.move.y === y) {
        return true
      }
    }

    //Not found
    return false
  }

  /**
   * Check if we have comments in this node
   */
  hasComments() {
    return (this.comments && this.comments.length > 0)
  }

  /**
   * Check if this is a move node
   */
  isMove() {
    return Boolean(this.move)
  }

  /**
   * Check if this is a pass move node
   */
  isPass() {
    return Boolean(this.move && this.move.pass)
  }

  /**
   * Get move number
   */
  getMoveNumber() {

    //Move node?
    if (this.move) {
      if (this.parent) {
        return this.parent.getMoveNumber() + 1
      }
      return 1
    }

    //Use parent move number if we have one
    if (this.parent) {
      return this.parent.getMoveNumber()
    }

    //No parent
    return 0
  }

  /*****************************************************************************
   * Node manipulation
   ***/

  /**
   * Remove this node from its parent
   */
  remove() {

    //Can't remove if no parent
    if (!this.parent) {
      return
    }

    //Find the index of this node, and if found remove it
    const i = this.parent.children.indexOf(this)
    if (i !== -1) {
      this.parent.children.splice(i, 1)
    }

    //Clear parent reference
    this.parent = null
  }

  /**
   * Move the node up in the parent's child tree
   */
  moveUp() {

    //Can't move if no parent
    if (!this.parent) {
      return
    }

    //Find the index of this node, and if found swap the nodes from position
    const i = this.parent.children.indexOf(this)
    if (i > 0) {
      let temp = this.parent.children[i - 1]
      this.parent.children[i - 1] = this
      this.parent.children[i] = temp
    }
  }

  /**
   * Move the node down in the parent's child tree
   */
  moveDown() {

    //Can't move if no parent
    if (!this.parent) {
      return
    }

    //Find the index of this node, and if found swap the nodes from position
    const i = this.parent.children.indexOf(this)
    if (i !== -1 && i < (this.parent.children.length - 1)) {
      const temp = this.parent.children[i + 1]
      this.parent.children[i + 1] = this
      this.parent.children[i] = temp
    }
  }

  /**
   * Append this node to another node
   */
  appendTo(node) {

    //Remove from existing parent
    this.remove()

    //Set new parent
    this.parent = node
    node.children.push(this)
    return node.children.length - 1
  }

  /**
   * Append child node to this node.
   */
  appendChild(node) {
    node.parent = this
    this.children.push(node)
    return this.children.length - 1
  }

  /**
   * Insert another node after this one
   */
  insertNode(node) {

    //Loop our children and change parent node
    for (let i = 0; i < this.children.length; i++) {
      this.children[i].parent = node
    }

    //Merge children, set this node as the parent of given node
    node.children = node.children.concat(this.children)
    node.parent = this

    //Set given node as the child of this node
    this.children = [node]
  }

  /**************************************************************************
   * Convenience helpers
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
    const entry = markup
      .find(entry => entry.type === type)

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
}
