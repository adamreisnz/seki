import {stoneColors} from '../constants/stone.js'

/**
   * Helper to construct a coordinates base object
   */
function coordinatesObject(coords, baseObject) {
  baseObject = baseObject || {}
  if (coords === '' || coords === 'pass') {
    baseObject.pass = true
  }
  else {
    baseObject.x = Number(coords[0])
    baseObject.y = Number(coords[1])
  }
  return baseObject
}

/**
   * Convert a numeric color value (color constant) to a string
   */
function toStringColor(color) {
  if (color === stoneColors.BLACK) {
    return 'black'
  }
  else if (color === stoneColors.WHITE) {
    return 'white'
  }
  return ''
}

/**
   * Convert a string color value to a numeric color constant
   */
function toColorConstant(color) {
  if (color === 'black') {
    return stoneColors.BLACK
  }
  else if (color === 'white') {
    return stoneColors.WHITE
  }
  return undefined
}

/*****************************************************************************
   * Helpers for conversion between JGF / KIFU format
   ***/

/**
   * Convert move object to JGF format
   */
function convertMoveToJgf(move) {

  //Initialize JGF move object and determine color
  let jgfMove = angular.copy(move)
  let color = toStringColor(move.color)

  //No color?
  if (color === '') {
    return null
  }

  //Pass move?
  if (move.pass === true) {
    jgfMove[color] = 'pass'
  }

  //Regular move
  else {
    jgfMove[color] = [move.x, move.y]
  }

  //Delete coordinates and color
  delete jgfMove.x
  delete jgfMove.y
  delete jgfMove.color

  //Return move
  return jgfMove
}

/**
   * Convert move from JGF format
   */
function convertMoveFromJgf(move) {

  //Prepare color, coordinates
  let color, coords

  //Check whose move it was
  if (move.W) {
    color = 'W'
    coords = move.W
  }
  else if (move.B) {
    color = 'B'
    coords = move.B
  }

  //No coordinates?
  if (!coords) {
    return null
  }

  //Return coordinates object
  return coordinatesObject(coords, {
    color: toColorConstant(color),
  })
}

/**
   * Convert setup object to JGF format
   */
function convertSetupToJgf(setup) {

  //Initialize variables
  let i, color
  let jgfSetup = {}

  //Loop setup objects
  for (i in setup) {
    if (setup.hasOwnProperty(i)) {

      //Get color
      color = toStringColor(setup[i].color) || 'E'

      //Initialize array
      if (typeof jgfSetup[color] === 'undefined') {
        jgfSetup[color] = []
      }

      //Add coordinates
      jgfSetup[color].push([setup[i].x, setup[i].y])
    }
  }

  //Return
  return jgfSetup
}

/**
   * Convert setup from JGF format
   */
function convertSetupFromJgf(setup) {

  //Initialize variables
  let c, key, color
  let gameSetup = []

  //Loop setup
  for (key in setup) {
    if (setup.hasOwnProperty(key)) {

      //Get color constant
      color = toColorConstant(key)

      //Loop coordinates
      for (c in setup[key]) {
        if (setup[key].hasOwnProperty(c)) {
          gameSetup.push(coordinatesObject(setup[key][c], {
            color: color,
          }))
        }
      }
    }
  }

  //Return
  return gameSetup
}

/**
   * Convert markup object to JGF format
   */
function convertMarkupToJgf(markup) {

  //Initialize variables
  let i, type
  let jgfMarkup = {}

  //Loop setup objects
  for (i in markup) {
    if (markup.hasOwnProperty(i)) {

      //Get type
      type = markup[i].type

      //Initialize array
      if (typeof jgfMarkup[type] === 'undefined') {
        jgfMarkup[type] = []
      }

      //Label?
      if (type === 'label') {
        jgfMarkup[type].push([markup[i].x, markup[i].y, markup[i].text])
      }
      else {
        jgfMarkup[type].push([markup[i].x, markup[i].y])
      }
    }
  }

  //Return
  return jgfMarkup
}

/**
   * Convert markup from JGF format
   */
function convertMarkupFromJgf(markup) {

  //Initialize variables
  let l, type
  let gameMarkup = []

  //Loop markup types
  for (type in markup) {
    if (markup.hasOwnProperty(type)) {

      //Label?
      if (type === 'label') {
        for (l = 0; l < markup[type].length; l++) {

          //Validate
          if (!angular.isArray(markup[type][l])) {
            continue
          }

          //SGF type coordinates?
          if (markup[type][l].length === 2 && typeof markup[type][l][0] === 'string') {
            let text = markup[type][l][1]
            markup[type][l] = convertCoordinates(markup[type][l][0])
            markup[type][l].push(text)
          }

          //Validate length
          if (markup[type][l].length < 3) {
            continue
          }

          //Add to stack
          gameMarkup.push(coordinatesObject(markup[type][l], {
            type: type,
            text: markup[type][l][2],
          }))
        }
      }
      else {

        //Loop coordinates
        for (l in markup[type]) {
          if (markup[type].hasOwnProperty(l)) {
            gameMarkup.push(coordinatesObject(markup[type][l], {
              type: type,
            }))
          }
        }
      }
    }
  }

  //Return
  return gameMarkup
}

/**
   * Convert turn object to JGF format
   */
function convertTurnToJgf(turn) {
  switch (turn) {
    case stoneColors.W:
      return 'W'
    case stoneColors.B:
      return 'B'
    default:
      return ''
  }
}

/**
   * Convert turn from JGF format
   */
function convertTurnFromJgf(turn) {
  switch (turn) {
    case 'W':
      return stoneColors.W
    case 'B':
      return stoneColors.B
    default:
      return stoneColors.EMPTY
  }
}

/**
   * Conversions map
   */
const conversionMap = {
  toJgf: {
    move: convertMoveToJgf,
    setup: convertSetupToJgf,
    markup: convertMarkupToJgf,
    turn: convertTurnToJgf,
  },
  fromJgf: {
    move: convertMoveFromJgf,
    setup: convertSetupFromJgf,
    markup: convertMarkupFromJgf,
    turn: convertTurnFromJgf,
  },
}

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
  constructor(properties, parent) {

    //Set parent and children
    this.parent = parent || null
    this.children = []

    //Save properties
    if (properties) {
      for (let key in properties) {
        if (properties.hasOwnProperty(key)) {
          this[key] = properties[key]
        }
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

    //Loop the child nodes
    for (let i = 0; i < this.children.length; i++) {
      if (this.children[i].move && this.children[i].move.x === x && this.children[i].move.y === y) {
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

    //Loop the child nodes
    for (let i = 0; i < this.children.length; i++) {
      if (this.children[i].move && this.children[i].move.x === x && this.children[i].move.y === y) {
        return true
      }
    }

    //Not found
    return false
  }

  /**
   * Check if we have comments
   */
  hasComments() {
    return (this.comments && this.comments.length > 0)
  }

  /**
   * Check if this is a move node
   */
  isMove() {
    return !!this.move
  }

  /**
   * Get move number
   */
  getMoveNumber() {

    //Move node?
    if (this.isMove()) {
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
    let i = this.parent.children.indexOf(this)
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
    let i = this.parent.children.indexOf(this)
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
    let i = this.parent.children.indexOf(this)
    if (i !== -1 && i < (this.parent.children.length - 1)) {
      let temp = this.parent.children[i + 1]
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

  /*****************************************************************************
   * JGF conversion
   ***/

  /**
   * Build a Game Node from a given JGF tree
   */
  fromJgf(jgf, gameNode) {

    //Root JGF file given?
    if (typeof jgf.tree !== 'undefined') {
      return GameNode.fromJgf(jgf.tree, gameNode)
    }

    //Initialize helper vars
    let variationNode, nextNode, i, j

    //Node to work with given? Otherwise, work with ourselves
    gameNode = gameNode || this

    //Loop moves in the JGF tree
    for (i = 0; i < jgf.length; i++) {

      //Array? That means a variation branch
      if (angular.isArray(jgf[i])) {

        //Loop variation stacks
        for (j = 0; j < jgf[i].length; j++) {

          //Build the variation node
          variationNode = new GameNode()
          variationNode.fromJgf(jgf[i][j])

          //Append to working node
          gameNode.appendChild(variationNode)
        }
      }

      //Regular node
      else {

        //Get properties to copy
        let properties = Object.getOwnPropertyNames(jgf[i])

        //Copy node properties
        for (let key in properties) {
          if (properties.hasOwnProperty(key)) {
            let prop = properties[key]

            //Conversion function present?
            if (typeof conversionMap.fromJgf[prop] !== 'undefined') {
              gameNode[prop] = conversionMap.fromJgf[prop](jgf[i][prop])
            }
            else if (typeof jgf[i][prop] === 'object') {
              gameNode[prop] = angular.copy(jgf[i][prop])
            }
            else {
              gameNode[prop] = jgf[i][prop]
            }
          }
        }
      }

      //Next element is a regular node? Prepare new working node
      //Otherwise, if there are no more nodes or if the next element is
      //an array (e.g. variations), we keep our working node as the current one
      if ((i + 1) < jgf.length && !angular.isArray(jgf[i + 1])) {
        nextNode = new GameNode()
        gameNode.appendChild(nextNode)
        gameNode = nextNode
      }
    }
  }

  /**
   * Convert this node to a JGF node container
   */
  toJgf(container) {

    //Initialize container to add nodes to
    container = container || []

    //Initialize node and get properties
    let node = {}
    let properties = Object.getOwnPropertyNames(this)

    //Copy node properties
    for (let key in properties) {
      if (properties.hasOwnProperty(key)) {
        let prop = properties[key]

        //Skip some properties
        if (prop === 'parent' || prop === 'children') {
          continue
        }

        //Conversion function present?
        if (typeof conversionMap.toJgf[prop] !== 'undefined') {
          node[prop] = conversionMap.toJgf[prop](this[prop])
        }
        else if (typeof this[prop] === 'object') {
          node[prop] = angular.copy(this[prop])
        }
        else {
          node[prop] = this[prop]
        }
      }
    }

    //Add node to container
    container.push(node)

    //Variations present?
    if (this.children.length > 1) {

      //Create variations container
      let variationsContainer = []
      container.push(variationsContainer)

      //Loop child (variation) nodes
      for (let i = 0; i < this.children.length; i++) {

        //Create container for this variation
        let variationContainer = []
        variationsContainer.push(variationContainer)

        //Call child node converter
        this.children[i].toJgf(variationContainer)
      }
    }

    //Just one child?
    else if (this.children.length === 1) {
      this.children[0].toJgf(container)
    }

    //Return container
    return container
  }
}
