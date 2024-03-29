import Converter from './converter.js'
import Game from '../game.js'
import {copy, get, set} from '../../helpers/object.js'
import {
  jgfVersion,
  jgfPaths,
  jgfNodePaths
} from '../../constants/jgf.js'

//Default options
const defaultOptions = {
  rawJs: false,
}

/**
 * Converter to JGF
 */
export default class ConvertToJgf extends Converter {

  /**
   * Convert Seki game object to JGF
   */
  convert(game, options = {}) {

    //Not a game instance
    if (!(game instanceof Game)) {
      throw new Error('Not a game instance')
    }

    //Get options
    const {
      rawJs,
    } = Object.assign({}, defaultOptions, options || {})

    //Get game info and initialize JGF object
    const info = game.getInfo()
    const jgf = {}

    //Copy over relevant game info
    for (const path of jgfPaths) {
      const value = get(info, path)
      if (value !== undefined && value !== null && value !== '') {
        set(jgf, path, copy(value))
      }
    }

    //Create tree
    jgf.tree = []

    //Add root node and append generator data
    this.addNodeToContainer(game.root, jgf.tree)
    this.appendGenerator(jgf)

    //Raw JS?
    if (rawJs) {
      return jgf
    }

    //Return JGF
    return JSON.stringify(jgf, null, 2)
  }

  /**
   * Append generator data
   */
  appendGenerator(jgf) {
    jgf.record = jgf.record || {}
    jgf.record.format = 'JGF'
    jgf.record.version = jgfVersion
    jgf.record.charset = 'UTF-8'
    jgf.record.generator = this.getGeneratorSignature()
  }

  /**
   * Add node to container
   */
  addNodeToContainer(node, container) {

    //Variations node
    if (node.hasMultipleChildren()) {

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
      set(jgfNode, path, copy(node[path]))
    }

    //Move
    if (node.move) {
      jgfNode.move = copy(node.move)
    }

    //Turn indicataor
    if (node.turn) {
      jgfNode.turn = copy(node.turn)
    }

    //Setup instructions
    if (Array.isArray(node.setup)) {
      jgfNode.setup = node.setup.map(entry => copy(entry))
    }

    //Markup
    if (Array.isArray(node.markup)) {
      jgfNode.markup = node.markup.map(entry => copy(entry))
    }

    //Score
    if (Array.isArray(node.score)) {
      jgfNode.score = node.score.map(entry => copy(entry))
    }

    //Return node
    return jgfNode
  }
}
