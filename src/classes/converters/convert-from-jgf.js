import Converter from './converter.js'
import Game from '../game.js'
import GameNode from '../game-node.js'
import {copy, get, set} from '../../helpers/object.js'
import {
  jgfPaths,
  jgfNodePaths,
} from '../../constants/jgf.js'

//Skip these paths as this is handled separately
const skipPaths = [
  'board.size',
  'board.width',
  'board.height',
  'game.date',
  'game.result',
  'rules.komi',
  'rules.handicap',
  'rules.mainTime',
  'players',
]

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

    //Determine some properties manually
    this.extractBoardSize(game, jgf)
    this.extractKomi(game, jgf)
    this.extractHandicap(game, jgf)
    this.extractDate(game, jgf)
    this.extractResult(game, jgf)
    this.extractMainTime(game, jgf)
    this.extractPlayers(game, jgf)

    //Copy over rest of relevant paths
    for (const path of jgfPaths) {
      if (!skipPaths.includes(path)) {
        game.setInfo(path, copy(get(jgf, path)))
      }
    }

    //Parse tree and obtain root node
    game.root = this.parseTree(jgf.tree)

    //Return object
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

  /**
   * Extract board size
   */
  extractBoardSize(game, jgf) {

    //Get board size properties
    const size = get(jgf, 'board.size')
    const width = get(jgf, 'board.width')
    const height = get(jgf, 'board.height')

    //Set grid size
    game.setGridSize(width || size, height)
  }

  /**
   * Extract komi
   */
  extractKomi(game, jgf) {
    const komi = get(jgf, 'rules.komi')
    game.setKomi(komi)
  }

  /**
   * Extract handicap
   */
  extractHandicap(game, jgf) {
    const handicap = get(jgf, 'rules.handicap')
    game.setHandicap(handicap)
  }

  /**
   * Extract result
   */
  extractResult(game, jgf) {
    const result = get(jgf, 'game.result')
    game.setResult(result)
  }

  /**
   * Extract main time
   */
  extractMainTime(game, jgf) {
    const time = get(jgf, 'rules.mainTime')
    game.setMainTime(time)
  }

  /**
   * Extract date
   */
  extractDate(game, jgf) {
    const dates = get(jgf, 'game.dates')
    const date = get(jgf, 'game.date')
    if (Array.isArray(dates) && dates.length > 0) {
      game.setDate(dates[0])
    }
    else if (date) {
      game.setDate(date)
    }
  }

  /**
   * Extract players
   */
  extractPlayers(game, jgf) {
    const players = get(jgf, 'players')
    for (const player of players) {
      const {color, name, rank, team} = player
      game.setInfo(`players.${color}`, {name, rank, team})
    }
  }
}
