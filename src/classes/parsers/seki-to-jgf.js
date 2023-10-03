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
 * Parser to convert JGF to Seki format
 */
export default class SekiToJgf {

  /**
   * Convert Seki game object into JGF
   */
  convert(seki) {

    //Initialize
    const jgf = {}

    //Copy over relevant keys
    for (const key of copyKeys) {
      jgf[key] = JSON.parse(JSON.stringify(seki[key]))
    }

    //Create tree
    jgf.tree = []

    //Add root node
    this.addNodeToContainer(seki.root, jgf.tree)

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
    const jgfNode = this.convertNodeToJgf(node)
    container.push(jgfNode)

    //Process next child
    if (node.children.length === 1) {
      this.addNodeToContainer(node.children[0], container)
    }
  }

  /**************************************************************************
   * Conversion helpers
   ***/

  /**
   * Check if a node is a variations node
   */
  isVariationNode(node) {
    return (node && node.children.length > 1)
  }

  /**
   * Convert node to JGF format
   */
  convertNodeToJgf(node) {

    //Create JGF node
    const jgfNode = {}

    //Copy over relevant node keys
    for (const key of copyNodeKeys) {
      jgfNode[key] = JSON.parse(JSON.stringify(node[key]))
    }

    //Move
    if (node.move) {
      jgfNode.move = this.convertNodeObjectToJgf(node.move)
    }

    //Turn indicataor
    if (node.turn) {
      jgfNode.turn = this.convertColorToJgf(node.turn)
    }

    //Setup instructions
    if (Array.isArray(node.setup)) {
      jgfNode.setup = node.setup.map(this.convertNodeObjectToJgf)
    }

    //Markup
    if (Array.isArray(node.markup)) {
      jgfNode.markup = node.markup.map(this.convertNodeObjectToJgf)
    }
  }

  /**
   * Convert node object to JGF format
   */
  convertNodeObjectToJgf(move) {

    //Determine color
    const color = this.convertColorToJgf(move.color)
    if (typeof color === 'undefined') {
      return
    }

    //Get rest of node properties
    const {x, y, pass, type, text} = move
    return {color, x, y, pass, type, text}
  }

  /**
   * Convert a numeric color value (color constant) to a string
   */
  convertColorToJgf(color) {
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
