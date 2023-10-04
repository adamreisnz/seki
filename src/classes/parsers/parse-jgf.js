import Game from '../game.js'
import GameNode from '../game-node.js'
import {copy, set} from '../../helpers/object.js'
import {
  jgfPaths,
  jgfNodePaths,
  jgfNodeObjectPaths,
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

    //Copy over relevant paths
    for (const path of jgfPaths) {
      game.setInfo(path, copy(jgf, path))
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

    //Copy over relevant node paths
    for (const path of jgfNodePaths) {
      set(node, path, copy(jgfNode, path))
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

    //Copy over relevant node object paths
    for (const path of jgfNodeObjectPaths) {
      set(obj, path, copy(jgfNodeObject, path))
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
