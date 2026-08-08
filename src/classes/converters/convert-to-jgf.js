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

    //Convert this node and add it to the container. This happens for every
    //node, including ones that fork, otherwise a forking node's own move,
    //markup and comments are dropped from the output.
    container.push(this.parseNode(node))

    //Get children
    const {children} = node

    //Single child, it simply continues the current sequence
    if (children.length === 1) {
      this.addNodeToContainer(children[0], container)
      return
    }

    //No children, we're at the end of this sequence
    if (children.length === 0) {
      return
    }

    //Multiple children, so a variations node is appended to the sequence.
    //Each variation is its own container of nodes, per the JGF spec, and not
    //a bare node, otherwise the result cannot be parsed back in.
    const jgfVariationsNode = {variations: []}
    container.push(jgfVariationsNode)

    //Loop child (variation) nodes
    for (const child of children) {
      const variation = []
      jgfVariationsNode.variations.push(variation)
      this.addNodeToContainer(child, variation)
    }
  }

  /**
   * Convert node to JGF format
   */
  parseNode(node) {

    //Create JGF node
    const jgfNode = {}

    //Copy over relevant node paths. Empty values are skipped so that nodes
    //don't end up carrying keys with no content, which mirrors what the
    //reverse converter does when reading them back in.
    for (const path of jgfNodePaths) {
      const value = get(node, path)
      if (value !== undefined && value !== null && value !== '') {
        set(jgfNode, path, copy(value))
      }
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
