import Game from './game.js'
import GameNode from './game-node.js'
import {copy} from '../helpers/object.js'
import {swapColor} from '../helpers/color.js'
import {
  parseTransformation,
  normalizeTransformation,
  transformBoardSize,
  transformBoardCutOff,
  transformCoordinates
} from '../helpers/transformation.js'
import {stoneColors} from '../constants/stone.js'

//Node properties that don't travel to the transformed node. The first five
//describe the tree itself, which is rebuilt as the transformed tree is put
//together. The last is an engine's analysis of the position as it stood: its
//coordinates point at that board, so carrying it over would put every
//candidate and expected move somewhere it was never suggested.
const uncopiedNodeProperties = [
  'root',
  'parent',
  'children',
  'variationRoot',
  'index',
  'analysis',
]

//A result that names a winning colour, e.g. B+3.5, B+R or a bare B. Anything
//else — a draw, an unknown result, a void game — says nothing about colour
const regexColoredResult = /^[BW](?=\+|$)/

/**
 * Transformer that produces a rotated, mirrored or colour inverted copy of a
 * game record
 *
 * This works on the record rather than on the board it is drawn on, so what
 * comes out is a game whose every move, setup stone, markup, line and
 * territory point has actually moved, across the whole tree and not only the
 * main line. That is what lets the eight symmetries of a problem be generated
 * and saved, and it leaves a display transform free to be built on top.
 *
 * See the transformation helpers for what a transformation string is made of.
 */
export default class GameTransformer {

  /**
   * Transform a game, returning a new game and leaving the given one alone
   */
  transform(game, transformation) {

    //Not a game instance
    if (!(game instanceof Game)) {
      throw new Error('Not a game instance')
    }

    //Normalise, so everything below works off the canonical form
    transformation = normalizeTransformation(transformation)

    //Build the transformed tree off the size the record has now
    const {width, height} = game.getBoardSize()
    const root = this.transformTree(game, width, height, transformation)

    //Set the info before the root node, the way the converters do: setting
    //the root node rewinds to the first position, which reads the board size
    //and the handicap off the game info
    const transformed = new Game()
    transformed.setInfo(this.transformInfo(game, transformation))
    transformed.setRootNode(root)

    //NOTE: the result is put on directly rather than through setGameResult(),
    //which runs it through the result parser on the way in. That parser
    //rewrites a drawn '0' to 'D', and the transform is meant to carry a result
    //it isn't swapping over exactly as it stands.
    transformed.gameResult = this.transformResult(game, transformation)

    //Pick up where the game being transformed had got to, rather than at the
    //start of the record. Setting the root node rewinds, and the tree is the
    //same shape as the one it was built from, so the same path leads to the
    //node that answers to the one the game is on.
    transformed.goToPath(game.getPath().clone())

    //Return
    return transformed
  }

  /**************************************************************************
   * Game info
   ***/

  /**
   * Transform the game info
   */
  transformInfo(game, transformation) {

    //Take a copy to work on, so the given game is left untouched
    const {isInverted} = parseTransformation(transformation)
    const info = copy(game.getInfo())

    //The board turns with its contents, cut off and all
    const {width, height} = game.getBoardSize()
    const size = transformBoardSize(width, height, transformation)
    const cutOff = transformBoardCutOff(game.getBoardCutOff(), transformation)
    Object.assign(info.board, size, cutOff)

    //The result is put on separately, see transformResult()
    delete info.game.result

    //Nothing else changes unless the colours do
    if (!isInverted) {
      return info
    }

    //The two players change sides, name, rank, team and all
    const {black, white} = info.players
    info.players = {
      [stoneColors.BLACK]: white,
      [stoneColors.WHITE]: black,
    }

    //Komi is the compensation white is given, expressed as a signed number:
    //a reverse komi game records it as a negative one. Swapping the colours
    //hands that compensation to the other player, so the sign flips with them.
    //NOTE: zero is written back as zero rather than as the negative zero the
    //arithmetic produces, which is not what a record should carry.
    info.rules.komi = info.rules.komi ? -info.rules.komi : info.rules.komi

    //NOTE: the handicap count is deliberately left as it is. Handicap stones
    //are black's by definition, so an inverted handicap game is an odd record
    //however it is written, and the choice is between saying how many stones
    //were placed at the start, which is still true, and losing that count for
    //good the first time a record is inverted. The stones themselves invert
    //along with everything else, and the turn the count would otherwise imply
    //is written out explicitly, see transformTree().

    //Return
    return info
  }

  /**
   * Transform the game result
   *
   * A result that names a winning colour changes hands, so B+3.5 becomes
   * W+3.5. A drawn result, spelled '0', says nothing about colour and passes
   * through untouched, as does an unknown or void one.
   */
  transformResult(game, transformation) {

    //Get the result
    const {isInverted} = parseTransformation(transformation)
    const result = game.getGameResult()

    //Nothing to swap
    if (!isInverted || typeof result !== 'string') {
      return result
    }

    //Swap the colour the result names
    return result
      .replace(regexColoredResult, color => (color === 'B' ? 'W' : 'B'))
  }

  /**************************************************************************
   * Game tree
   ***/

  /**
   * Transform the whole game tree, returning its new root node
   *
   * NOTE: walked with a stack rather than by recursion, as a game record's
   * main line is one long chain of single children: recursing puts a frame on
   * the stack per move played, which a long enough record overflows.
   */
  transformTree(game, width, height, transformation) {

    //Transform the root node and walk the tree from there
    const root = this.transformNode(game.getRootNode(), width, height, transformation)
    const stack = [[game.getRootNode(), root]]

    //Go over the tree
    while (stack.length > 0) {
      const [source, target] = stack.pop()
      for (const child of source.getChildren()) {
        const node = this.transformNode(child, width, height, transformation)
        target.addChild(node)
        stack.push([child, node])
      }
    }

    //A colour inversion swaps who is to play, which is the whole point of a
    //problem: black to play inverts into white to play. A node that says whose
    //turn it is has had it swapped already, but a record that leaves it to be
    //worked out from the handicap has to be told, as the handicap count does
    //not change with the colours (see the note on it in transformInfo()).
    const {isInverted} = parseTransformation(transformation)
    if (isInverted && !root.hasTurnInstructions()) {
      root.turn = swapColor(game.getHandicap() > 1 ?
        stoneColors.WHITE :
        stoneColors.BLACK)
    }

    //Return
    return root
  }

  /**
   * Transform a single node, without its children
   */
  transformNode(source, width, height, transformation) {

    //Copy over everything the node carries, bar the properties above
    const node = new GameNode()
    for (const key of Object.keys(source)) {
      if (!uncopiedNodeProperties.includes(key)) {
        node[key] = copy(source[key])
      }
    }

    //Move everything on the node that sits on the board
    this.transformMove(node, width, height, transformation)
    this.transformCoordinateEntries(node, width, height, transformation)
    this.transformLines(node, width, height, transformation)
    this.transformColors(node, transformation)

    //Return
    return node
  }

  /**
   * Transform a node's move
   */
  transformMove(node, width, height, transformation) {

    //No move, or a pass, which is played nowhere in particular
    const {move} = node
    if (!move || typeof move.x === 'undefined' || typeof move.y === 'undefined') {
      return
    }

    //Move it
    const {x, y} = move
    Object.assign(move, transformCoordinates(x, y, width, height, transformation))
  }

  /**
   * Transform a node's setup, markup and territory coordinates
   *
   * These are all lists of entries with a type or colour and a set of
   * coordinates. Only the coordinates move: a label's text in particular
   * belongs to the markup and not to the point it sits on.
   */
  transformCoordinateEntries(node, width, height, transformation) {
    for (const entries of [node.setup, node.markup, node.score]) {
      if (!Array.isArray(entries)) {
        continue
      }
      for (const entry of entries) {
        if (!Array.isArray(entry.coords)) {
          continue
        }
        for (const coord of entry.coords) {
          const {x, y} = coord
          Object.assign(coord, transformCoordinates(x, y, width, height, transformation))
        }
      }
    }
  }

  /**
   * Transform a node's lines
   *
   * A line is drawn from one point to another, so both of its ends move.
   * NOTE: the colour a line carries is the colour it is drawn in, not a stone
   * colour, so a colour inversion leaves it as it is.
   */
  transformLines(node, width, height, transformation) {

    //No lines
    if (!Array.isArray(node.lines)) {
      return
    }

    //Move both ends of each line, leaving whatever follows them alone
    node.lines = node.lines.map(([fromX, fromY, toX, toY, ...rest]) => {
      const from = transformCoordinates(fromX, fromY, width, height, transformation)
      const to = transformCoordinates(toX, toY, width, height, transformation)
      return [from.x, from.y, to.x, to.y, ...rest]
    })
  }

  /**
   * Swap the colours a node names
   *
   * Setup entries are typed by the colour of the stone they place, apart from
   * the clearing ones, which name no colour and are left alone. Territory
   * entries name the colour the points belong to.
   */
  transformColors(node, transformation) {

    //Colours aren't changing
    const {isInverted} = parseTransformation(transformation)
    if (!isInverted) {
      return
    }

    //The move that was played, and any instruction about whose turn it is
    if (node.move && node.move.color) {
      node.move.color = swapColor(node.move.color)
    }
    if (node.turn) {
      node.turn = swapColor(node.turn)
    }

    //Setup instructions
    for (const entry of node.setup || []) {
      entry.type = swapColor(entry.type) ?? entry.type
    }

    //Territory
    for (const entry of node.score || []) {
      entry.color = swapColor(entry.color) ?? entry.color
    }
  }
}
