import {
  jgfKeys,
  jgfNodeKeys,
  jgfNodeObjectKeys,
} from '../../constants/jgf.js'

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
    for (const key of jgfKeys) {
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
    for (const key of jgfNodeKeys) {
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
   * Parse node object
   */
  parseNodeObject(obj) {

    //Instantiate
    const jgfNodeObject = {}

    //Copy over relevant node object keys
    for (const key of jgfNodeObjectKeys) {
      jgfNodeObject[key] = obj[key]
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
