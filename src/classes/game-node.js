
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
  parent
  children = []

  /**
   * Constructor
   */
  constructor(data) {
    if (data) {
      for (const key in data) {
        this[key] = data[key]
      }
    }
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
  detach() {
    const {parent} = this
    if (parent) {
      parent.removeChild(this)
    }
  }

  /**
   * Append this node to another node
   */
  appendTo(node) {
    this.detach()
    this.setParent(node)
    return node.addChild(this)
  }

  /**
   * Append child node to this node.
   */
  appendChild(node) {
    node.detach()
    node.setParent(this)
    return this.addChild(node)
  }

  /**
   * Move the node up in the parent's child tree
   * NOTE: Not currently in use
   */
  moveUp() {
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
  moveDown() {
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
   * Check if this is a move node
   */
  isMove() {
    const {move} = this
    return Boolean(move)
  }

  /**
   * Check if we have a move at given coordinates
   */
  hasMove(x, y) {
    const {move} = this
    return Boolean(move && move.x === x && move.y === y)
  }

  /**
   * Check if this is a pass move node
   */
  isPass() {
    const {move} = this
    return Boolean(move && move.pass)
  }

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
   * Check if the node has more than one move variation
   */
  hasMoveVariations() {
    const {children} = this
    return children
      .filter(child => child.isMove())
      .length > 1
  }

  /**
   * Get all the move variation nodes
   */
  getMoveVariations() {
    const {children} = this
    return children
      .filter(child => child.isMove())
  }

  /**
   * Get the move variation for given coordinates
   */
  getMoveVariation(x, y) {
    const {children} = this
    return children
      .findIndex(child => child.hasMove(x, y))
  }

  /**
   * Check if given coordinates are one of the next child node coordinates
   */
  isMoveVariation(x, y) {
    const {children} = this
    return children
      .some(child => child.hasMove(x, y))
  }

  /**
   * Check if we have comments in this node
   */
  hasComments() {
    const {comments} = this
    return (comments && comments.length > 0)
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
      const i = node.appendTo(this)

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
