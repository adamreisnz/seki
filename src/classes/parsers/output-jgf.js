import {stoneColors} from '../../constants/stone.js'
import {stoneColors as stoneColorsJgf} from '../../constants/jgf.js'

//Top level record keys to copy over
const copyKeys = [
  'record',
  'source',
  'game',
  'players',
  'event',
  'rules',
  'board',
  'meta',
]

//Node keys to copy over
const copyNodeKeys = [
  'name',
  'solution',
  'comments',
]

/**
 * Parser to output JGF
 */
export default class OutputJgf {

  /**
   * Convert Seki game object to JGF
   */
  parse(game) {

    //Initialize
    const jgf = {}

    //Copy over relevant keys
    for (const key of copyKeys) {
      jgf[key] = JSON.parse(JSON.stringify(game[key]))
    }

    //Create tree
    jgf.tree = []

    //Add root node
    this.addNodeToContainer(game.root, jgf.tree)

    //Return JGF
    return jgf
  }

  /**
   * Add node to container
   */
  addNodeToContainer(node, container) {

    //Variations node
    if (this.isVariationNode(node)) {

      //Create variations node and add to container
      const jgfVariationsNode = {variations: []}
      container.push(jgfVariationsNode)

      //Loop child (variation) nodes
      for (const child of node.children) {
        this.addNodeToContainer(child, jgfVariationsNode.variations)
      }

      //Done
      return
    }

    //Convert node and add to container
    const jgfNode = this.parseNode(node)
    container.push(jgfNode)

    //Process next child
    if (node.children.length === 1) {
      this.addNodeToContainer(node.children[0], container)
    }
  }

  /**
   * Convert node to JGF format
   */
  parseNode(node) {

    //Create JGF node
    const jgfNode = {}

    //Copy over relevant node keys
    for (const key of copyNodeKeys) {
      jgfNode[key] = JSON.parse(JSON.stringify(node[key]))
    }

    //Move
    if (node.move) {
      jgfNode.move = this.parseNodeObject(node.move)
    }

    //Turn indicataor
    if (node.turn) {
      jgfNode.turn = this.convertColor(node.turn)
    }

    //Setup instructions
    if (Array.isArray(node.setup)) {
      jgfNode.setup = node.setup.map(this.parseNodeObject)
    }

    //Markup
    if (Array.isArray(node.markup)) {
      jgfNode.markup = node.markup.map(this.parseNodeObject)
    }
  }

  /**
   * Convert node object to JGF format
   */
  parseNodeObject(move) {

    //Determine color
    const color = this.convertColor(move.color)
    if (typeof color === 'undefined') {
      return
    }

    //Get rest of node properties
    const {x, y, pass, type, text} = move
    return {color, x, y, pass, type, text}
  }

  /**
   * Check if a node is a variations node
   */
  isVariationNode(node) {
    return (node && node.children.length > 1)
  }

  /**************************************************************************
   * Conversion helpers
   ***/

  /**
   * Convert a numeric color value (color constant) to a string
   */
  convertColor(color) {
    if (color === stoneColors.BLACK) {
      return stoneColorsJgf.BLACK
    }
    else if (color === stoneColors.WHITE) {
      return stoneColorsJgf.WHITE
    }
    else if (color === stoneColors.EMPTY) {
      return stoneColorsJgf.EMPTY
    }
  }
}
