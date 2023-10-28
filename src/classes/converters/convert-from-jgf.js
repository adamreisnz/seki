import Converter from './converter.js'
import Game from '../game.js'
import GameNode from '../game-node.js'
import {copy, get, set} from '../../helpers/object.js'
import {jgfNodePaths} from '../../constants/jgf.js'

/**
 * Convert JGF data into a seki game object
 */
export default class ConvertFromJgf extends Converter {

  /**
   * Convert JGF object into a Seki consumable format
   */
  convert(jgf) {

    //Initialize
    const game = new Game()
    const root = this.parseTree(jgf.tree)

    //Extract game info and set root node
    game.setInfo(jgf)
    game.setRootNode(root)

    //Return game
    return game
  }

  /**
   * Parse tree
   */
  parseTree(jgfTree, parentNode) {

    //Nothing to do
    if (jgfTree.length === 0) {
      return
    }

    //Instantiate root node
    let rootNode

    //Loop items in the tree
    for (const jgfNode of jgfTree) {

      //Create root node
      if (!parentNode) {
        rootNode = this.parseNode(jgfNode)
        parentNode = rootNode
        continue
      }

      //Variation node
      if (this.isVariationNode(jgfNode)) {
        for (const jgfVariationTree of jgfNode.variations) {
          this.parseTree(jgfVariationTree, parentNode)
        }
        continue
      }

      //Regular node
      const node = this.parseNode(jgfNode)
      parentNode.appendChild(node)
      parentNode = node
    }

    //Return root node
    return rootNode
  }

  /**
   * Parse a node
   */
  parseNode(jgfNode) {

    //Create new node
    const node = new GameNode()

    //Copy over relevant node paths
    for (const path of jgfNodePaths) {
      set(node, path, copy(get(jgfNode, path)))
    }

    //Move
    if (jgfNode.move) {
      node.move = copy(jgfNode.move)
    }

    //Turn indicataor
    if (jgfNode.turn) {
      node.turn = copy(jgfNode.turn)
    }

    //Setup instructions
    if (Array.isArray(jgfNode.setup)) {
      node.setup = jgfNode.setup.map(entry => copy(entry))
    }

    //Markup
    if (Array.isArray(jgfNode.markup)) {
      node.markup = jgfNode.markup.map(entry => copy(entry))
    }

    //Score
    if (Array.isArray(jgfNode.score)) {
      node.score = jgfNode.score.map(entry => copy(entry))
    }

    //Return the node
    return node
  }

  /**
   * Check if a JGF node is a variation node
   */
  isVariationNode(jgfNode) {
    return (jgfNode && Array.isArray(jgfNode.variations))
  }
}
