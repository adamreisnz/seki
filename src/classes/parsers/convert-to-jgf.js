import KifuFactory from '../kifu-factory.js'
import {copy, set} from '../../helpers/object.js'
import {
  jgfPaths,
  jgfNodePaths,
  jgfNodeObjectPaths,
} from '../../constants/jgf.js'

/**
 * Converter to JGF
 */
export default class ConvertToJgf {

  /**
   * Convert Seki game object to JGF
   */
  convert(game) {

    //Initialize
    const jgf = KifuFactory.blankJgf()

    //Copy over relevant paths
    for (const path of jgfPaths) {
      set(jgf, path, copy(game.getInfo(path)))
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

    //Copy over relevant node paths
    for (const path of jgfNodePaths) {
      set(jgfNode, path, copy(node, path))
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
   * Parse node object
   */
  parseNodeObject(obj) {

    //Instantiate
    const jgfNodeObject = {}

    //Copy over relevant node object paths
    for (const path of jgfNodeObjectPaths) {
      set(jgfNodeObject, path, copy(obj, path))
    }

    //Return
    return jgfNodeObject
  }

  /**
   * Check if a node is a variations node
   */
  isVariationNode(node) {
    return (node && node.children.length > 1)
  }
}
