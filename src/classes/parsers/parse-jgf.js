import Game from '../game.js'
import GameNode from '../game-node.js'
import {
  jgfKeys,
  jgfNodeKeys,
  jgfNodeObjectKeys,
} from '../../constants/jgf.js'

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
    for (const key of jgfKeys) {
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
    for (const key of jgfNodeKeys) {
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
  parseNodeObject(jgfNodeObject) {

    //Instantiate
    const obj = {}

    //Copy over relevant node object keys
    for (const key of jgfNodeObjectKeys) {
      obj[key] = jgfNodeObject[key]
    }

    //Return
    return obj
  }

  /**
   * Check if a JGF node is a variation node
   */
  isVariationNode(jgfNode) {
    return (jgfNode && jgfNode.variations)
  }
}
