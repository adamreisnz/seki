import Game from '../game.js'
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
 * Parse JGF data into a seki game object
 */
export default class ParseJgf {

  /**
   * Convert JGF object into a Seki consumable format
   */
  parse(jgf) {

    //Initialize
    const game = new Game()

    //Copy over relevant keys
    for (const key of copyKeys) {
      game[key] = JSON.parse(JSON.stringify(jgf[key]))
    }

    //Create root node
    game.root = new GameNode()

    //Parse tree
    this.parseTree(jgf.tree, game.root)

    //Return object
    return game
  }

  /**
   * Parse tree
   */
  parseTree(jgfTree, parentNode) {

    //Loop items in the tree
    jgfTree.forEach(jgfNode => {

      //Variation node
      if (this.isVariationNode(jgfNode)) {
        for (const jgfVariationTree of jgfNode.variations) {
          this.parseTree(jgfVariationTree, parentNode)
        }
      }

      //Regular node
      else {

        //Parse
        const node = this.parseNode(jgfNode)

        //Append to parent node
        parentNode.appendChild(node)
        parentNode = node
      }
    })
  }

  /**
   * Parse a node
   */
  parseNode(jgfNode) {

    //Create new node
    const node = new GameNode()

    //Copy over relevant node keys
    for (const key of copyNodeKeys) {
      node[key] = jgfNode[key]
    }

    //Move
    if (jgfNode.move) {
      node.move = this.parseNodeObject(jgfNode.move)
    }

    //Turn indicataor
    if (jgfNode.turn) {
      node.turn = this.convertColor(jgfNode.turn)
    }

    //Setup instructions
    if (Array.isArray(jgfNode.setup)) {
      node.setup = jgfNode.setup.map(this.parseNodeObject)
    }

    //Markup
    if (Array.isArray(jgfNode.markup)) {
      node.markup = jgfNode.markup.map(this.parseNodeObject)
    }
  }

  /**
   * Parse node object
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
   * Check if a JGF node is a variation node
   */
  isVariationNode(jgfNode) {
    return (jgfNode && jgfNode.variations)
  }

  /**************************************************************************
   * Parsing helpers
   ***/

  /**
   * Convert a string color value to a numeric color value
   */
  convertColor(color) {
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
