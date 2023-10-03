import GameNode from '../game-node.js'
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
export default class JgfToSeki {

  /**
   * Convert JGF object into a Seki consumable format
   */
  convert(jgf) {

    //Initialize
    const seki = {}

    //Copy over relevant keys
    for (const key of copyKeys) {
      seki[key] = JSON.parse(JSON.stringify(jgf[key]))
    }

    //Create root node
    seki.root = new GameNode()

    //Convert tree
    this.convertTree(jgf.tree, seki.root)

    //Return object
    return seki
  }

  /**
   * Convert tree
   */
  convertTree(jgfTree, parentNode) {

    //Loop items in the tree
    jgfTree.forEach(jgfNode => {

      //Variation node
      if (this.isVariationNode(jgfNode)) {
        for (const jgfVariationTree of jgfNode.variations) {
          this.convertTree(jgfVariationTree, parentNode)
        }
      }

      //Regular node
      else {

        //Convert
        const node = this.convertNodeFromJgf(jgfNode)

        //Append to parent node
        parentNode.appendChild(node)
        parentNode = node
      }
    })
  }

  /**************************************************************************
   * Conversion helpers
   ***/

  /**
   * Check if a JGF node is a variation node
   */
  isVariationNode(jgfNode) {
    return (jgfNode && jgfNode.variations)
  }

  /**
   * Convert node from JGF format
   */
  convertNodeFromJgf(jgfNode) {

    //Create new node
    const node = new GameNode()

    //Copy over relevant node keys
    for (const key of copyNodeKeys) {
      node[key] = jgfNode[key]
    }

    //Move
    if (jgfNode.move) {
      node.move = this.convertNodeObjectFromJgf(jgfNode.move)
    }

    //Turn indicataor
    if (jgfNode.turn) {
      node.turn = this.convertColorFromJgf(jgfNode.turn)
    }

    //Setup instructions
    if (Array.isArray(jgfNode.setup)) {
      node.setup = jgfNode.setup.map(this.convertNodeObjectFromJgf)
    }

    //Markup
    if (Array.isArray(jgfNode.markup)) {
      node.markup = jgfNode.markup.map(this.convertNodeObjectFromJgf)
    }
  }

  /**
   * Convert node object from JGF format
   */
  convertNodeObjectFromJgf(move) {

    //Determine color
    const color = this.convertColorFromJgf(move.color)
    if (typeof color === 'undefined') {
      return
    }

    //Get rest of node properties
    const {x, y, pass, type, text} = move
    return {color, x, y, pass, type, text}
  }

  /**
   * Convert a string color value to a numeric color value
   */
  convertColorFromJgf(color) {
    if (color === stoneColorsJgf.BLACK) {
      return stoneColors.BLACK
    }
    else if (color === stoneColorsJgf.WHITE) {
      return stoneColors.WHITE
    }
    else if (color === stoneColorsJgf.EMPTY) {
      return stoneColors.EMPTY
    }
  }
}
