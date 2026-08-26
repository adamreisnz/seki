import {describe, it, expect} from 'vitest'
import Game from './game.js'
import GameTransformer from './game-transformer.js'
import {reverseTransformation} from '../helpers/transformation.js'
import {boardSymmetries, boardTransformations} from '../constants/transformation.js'
import {stoneColors} from '../constants/stone.js'
import {markupTypes} from '../constants/markup.js'
import {setupTypes} from '../constants/setup.js'

//Every transformation there is, being the eight symmetries with and without
//a colour inversion on top
const allTransformations = [
  ...boardSymmetries,
  ...boardSymmetries.map(symmetry => `${symmetry}i`),
]

//Everything a record carries on a node, gathered up so that two trees can be
//compared in full rather than only down their main line
const describeNode = node => ({
  name: node.name,
  move: node.move,
  turn: node.turn,
  setup: node.setup,
  markup: node.markup,
  score: node.score,
  lines: node.lines,
  comments: node.comments,
  children: node.getChildren().map(describeNode),
})

//The whole of a record, info and tree together
const describeGame = game => ({
  info: game.getInfo(),
  tree: describeNode(game.getRootNode()),
})

//The coordinates of a node's setup stones of a given type
const setupCoords = (node, type = setupTypes.BLACK) => node.setup
  .find(entry => entry.type === type)
  .coords
  .map(({x, y}) => [x, y])

describe('game transformer', () => {

  describe('the eight symmetries', () => {

    //Two black stones in the top left corner of a 3x3 board, which is
    //asymmetric enough that no two symmetries leave it looking the same
    const sgf = '(;FF[4]SZ[3]AB[aa][ba])'

    //Where those two stones end up under each of the eight
    const expected = {
      NONE: [[0, 0], [1, 0]],
      ROTATE_90: [[2, 0], [2, 1]],
      ROTATE_180: [[2, 2], [1, 2]],
      ROTATE_270: [[0, 2], [0, 1]],
      FLIP_HORIZONTAL: [[2, 0], [1, 0]],
      FLIP_VERTICAL: [[0, 2], [1, 2]],
      FLIP_DIAGONAL: [[0, 0], [0, 1]],
      FLIP_ANTI_DIAGONAL: [[2, 2], [2, 1]],
    }

    for (const [name, coords] of Object.entries(expected)) {
      it(`moves the stones for ${name}`, () => {
        const game = Game.fromSgf(sgf)
        const transformed = game.transform(boardTransformations[name])
        expect(setupCoords(transformed.getRootNode())).toEqual(coords)
      })
    }

    it('gives a different position for each of them', () => {
      const game = Game.fromSgf(sgf)
      const positions = boardSymmetries
        .map(symmetry => JSON.stringify(setupCoords(game.transform(symmetry).getRootNode())))
      expect(new Set(positions).size).toBe(8)
    })
  })

  describe('reversing a transformation', () => {

    //A record with something of everything in it: two players, a result, a
    //komi, markup carrying text, setup stones, territory, a variation, a
    //comment, and a turn instruction so that nothing has to be inferred
    const sgf = `(;FF[4]SZ[5]KM[6.5]HA[0]RE[B+3.5]
      PB[Alice]BR[5d]PW[Bob]WR[4d]PL[B]
      AB[aa][ba]AW[ce]AE[dd]
      LB[bb:A][cc:B]TR[ab]
      TB[ee]TW[ea]
      C[Something to say]
      ;B[cb];W[db](;B[ec])(;B[eb]C[Or this]))`

    //A game with a line drawn on the root node as well, which no format
    //carries but a record in memory does
    const makeGame = () => {
      const game = Game.fromSgf(sgf)
      game.getRootNode().addLine(0, 4, 4, 0, '#ff0000')
      return game
    }

    for (const transformation of allTransformations) {
      it(`puts everything back for '${transformation || 'nothing'}'`, () => {
        const game = makeGame()
        const before = describeGame(game)
        const back = game
          .transform(transformation)
          .transform(reverseTransformation(transformation))
        expect(describeGame(back)).toEqual(before)
      })
    }

    it('leaves the game it transformed exactly as it was', () => {
      const game = makeGame()
      const before = describeGame(game)
      game.transform('rfi')
      expect(describeGame(game)).toEqual(before)
    })

    it('composes to the same thing as transforming twice', () => {
      const game = makeGame()
      const once = game.transform('rrf')
      const twice = game.transform('rr').transform('f')
      expect(describeGame(twice)).toEqual(describeGame(once))
    })
  })

  describe('non square boards', () => {

    const sgf = '(;FF[4]SZ[5:9]AB[aa];B[ai])'

    it('swaps the dimensions on a quarter turn', () => {
      const game = Game.fromSgf(sgf)
      expect(game.getBoardSize()).toEqual({width: 5, height: 9})
      expect(game.transform('r').getBoardSize()).toEqual({width: 9, height: 5})
      expect(game.transform('rrr').getBoardSize()).toEqual({width: 9, height: 5})
    })

    it('leaves the dimensions alone on a half turn', () => {
      const game = Game.fromSgf(sgf)
      expect(game.transform('rr').getBoardSize()).toEqual({width: 5, height: 9})
      expect(game.transform('f').getBoardSize()).toEqual({width: 5, height: 9})
    })

    it('moves the coordinates across the size they land on', () => {
      const game = Game.fromSgf(sgf)
      const transformed = game.transform('r')

      //The stone in the top left corner goes to the top right one, which on
      //a board turned on its side is x = 8 rather than x = 4
      expect(setupCoords(transformed.getRootNode())).toEqual([[8, 0]])

      //And the move in the bottom left corner goes to the top left one
      expect(transformed.getRootNode().getChild(0).move)
        .toEqual({color: stoneColors.BLACK, x: 0, y: 0})
    })
  })

  describe('cropped boards', () => {

    const makeGame = () => {
      const game = new Game()
      game.setBoardSize(19, 19)
      game.setBoardCutOff(2, 0, 5, 0)
      return game
    }

    it('carries the cut off round with the board', () => {
      const game = makeGame()
      expect(game.transform('r').getBoardCutOff()).toEqual({
        cutOffLeft: 0,
        cutOffRight: 5,
        cutOffTop: 2,
        cutOffBottom: 0,
      })
    })

    it('swaps left and right on a horizontal flip', () => {
      const game = makeGame()
      expect(game.transform('f').getBoardCutOff()).toEqual({
        cutOffLeft: 0,
        cutOffRight: 2,
        cutOffTop: 5,
        cutOffBottom: 0,
      })
    })

    it('keeps the cut off pointing at the same lines', () => {

      //A stone on the first line the crop leaves visible should still be on
      //it after the board is turned
      const game = makeGame()
      game.getRootNode().addSetup(2, 5, {type: setupTypes.BLACK})

      const transformed = game.transform('r')
      const {cutOffTop, cutOffRight} = transformed.getBoardCutOff()
      const [[x, y]] = setupCoords(transformed.getRootNode())
      expect(y).toBe(cutOffTop)
      expect(x).toBe(19 - 1 - cutOffRight)
    })
  })

  describe('colour inversion', () => {

    //Black takes a white stone in the corner, and wins by three and a half
    const sgf = `(;FF[4]SZ[5]KM[6.5]RE[B+3.5]
      PB[Alice]BR[5d]BT[Team One]PW[Bob]WR[4d]BT[Team Two]
      AB[cc]AW[dd]AE[ee]
      TB[ba]TW[bb]
      ;W[aa];B[ba];W[ce];B[ab])`

    it('swaps the stones, setup and territory', () => {
      const game = Game.fromSgf(sgf)
      const inverted = game.transform('i')
      const root = inverted.getRootNode()

      //Setup stones change colour, clearing instructions do not
      expect(root.setup).toEqual([
        {type: setupTypes.WHITE, coords: [{x: 2, y: 2}]},
        {type: setupTypes.BLACK, coords: [{x: 3, y: 3}]},
        {type: setupTypes.CLEAR, coords: [{x: 4, y: 4}]},
      ])

      //Territory changes hands
      expect(root.score).toEqual([
        {color: stoneColors.WHITE, coords: [{x: 1, y: 0}]},
        {color: stoneColors.BLACK, coords: [{x: 1, y: 1}]},
      ])

      //And so does every move
      expect(root.getChild(0).move.color).toBe(stoneColors.BLACK)
      expect(root.getChild(0).getChild(0).move.color).toBe(stoneColors.WHITE)
    })

    it('leaves every coordinate where it was', () => {
      const game = Game.fromSgf(sgf)
      const inverted = game.transform('i')
      expect(inverted.getRootNode().getChild(0).move)
        .toEqual({color: stoneColors.BLACK, x: 0, y: 0})
    })

    it('swaps the players, name, rank and team together', () => {
      const game = Game.fromSgf(sgf)
      const inverted = game.transform('i')
      expect(inverted.getPlayer(stoneColors.BLACK))
        .toEqual(game.getPlayer(stoneColors.WHITE))
      expect(inverted.getPlayer(stoneColors.WHITE))
        .toEqual(game.getPlayer(stoneColors.BLACK))
    })

    it('swaps the colour the result names', () => {
      const game = Game.fromSgf(sgf)
      expect(game.transform('i').getGameResult()).toBe('W+3.5')
      expect(game.transform('ii').getGameResult()).toBe('B+3.5')
    })

    it('leaves a result that names no colour alone', () => {
      for (const result of ['0', 'D', '?', 'VOID']) {
        const game = Game.fromSgf('(;FF[4]SZ[5])')
        game.gameResult = result
        expect(game.transform('i').getGameResult()).toBe(result)
        expect(game.transform('rfi').getGameResult()).toBe(result)
      }
    })

    it('hands the komi to the other player', () => {
      const game = Game.fromSgf(sgf)
      expect(game.transform('i').getKomi()).toBe(-6.5)
      expect(game.transform('ii').getKomi()).toBe(6.5)
    })

    it('leaves a komi of zero as zero rather than minus zero', () => {
      const game = Game.fromSgf('(;FF[4]SZ[5]KM[0])')
      expect(Object.is(game.transform('i').getKomi(), 0)).toBe(true)
    })

    it('swaps who made the captures', () => {
      const game = Game.fromSgf(sgf)
      game.goToLastPosition()
      expect(game.getCaptureCount()).toEqual({black: 1, white: 0})

      const inverted = game.transform('i')
      inverted.goToLastPosition()
      expect(inverted.getCaptureCount()).toEqual({black: 0, white: 1})
    })

    it('swaps a turn instruction', () => {
      const game = Game.fromSgf('(;FF[4]SZ[5]PL[W]AB[aa])')
      expect(game.getTurn()).toBe(stoneColors.WHITE)
      expect(game.transform('i').getTurn()).toBe(stoneColors.BLACK)
    })

    it('spells out the turn a record left to be inferred', () => {

      //A black to play problem inverts into a white to play one, which the
      //record has to say outright now that the colours no longer imply it
      const game = Game.fromSgf('(;FF[4]SZ[5]AB[aa])')
      expect(game.getTurn()).toBe(stoneColors.BLACK)

      const inverted = game.transform('i')
      expect(inverted.getRootNode().turn).toBe(stoneColors.WHITE)
      expect(inverted.getTurn()).toBe(stoneColors.WHITE)
    })

    it('spells out the turn a handicap game left to be inferred', () => {

      //The handicap count is kept, as it still says how many stones were
      //placed, so the turn it would otherwise imply is written out instead
      const game = Game.fromSgf('(;FF[4]SZ[9]HA[2]AB[cg][gc])')
      expect(game.getTurn()).toBe(stoneColors.WHITE)

      const inverted = game.transform('i')
      expect(inverted.getHandicap()).toBe(2)
      expect(inverted.getTurn()).toBe(stoneColors.BLACK)
    })

    it('leaves everything but the colours where it was', () => {
      const game = Game.fromSgf(sgf)
      const inverted = game.transform('i')
      expect(inverted.getBoardSize()).toEqual(game.getBoardSize())
      expect(inverted.getGameDate()).toBe(game.getGameDate())
    })
  })

  describe('markup', () => {

    const sgf = '(;FF[4]SZ[5]LB[aa:A][be:B]TR[ea])'

    it('moves a label without touching its text', () => {
      const game = Game.fromSgf(sgf)
      const {markup} = game.transform('r').getRootNode()
      const labels = markup.find(entry => entry.type === markupTypes.LABEL)
      expect(labels.coords).toEqual([
        {x: 4, y: 0, text: 'A'},
        {x: 0, y: 1, text: 'B'},
      ])
    })

    it('moves the other markup with it', () => {
      const game = Game.fromSgf(sgf)
      const {markup} = game.transform('r').getRootNode()
      const triangles = markup.find(entry => entry.type === markupTypes.TRIANGLE)
      expect(triangles.coords).toEqual([{x: 4, y: 4, text: undefined}])
    })

    it('leaves markup alone on a colour inversion', () => {
      const game = Game.fromSgf(sgf)
      expect(game.transform('i').getRootNode().markup)
        .toEqual(game.getRootNode().markup)
    })
  })

  describe('lines', () => {

    it('moves both ends of a line', () => {
      const game = Game.fromSgf('(;FF[4]SZ[5])')
      game.getRootNode().addLine(0, 0, 4, 1, '#ff0000')
      const {lines} = game.transform('r').getRootNode()
      expect(lines).toEqual([[4, 0, 3, 4, '#ff0000']])
    })

    it('leaves the colour a line is drawn in alone', () => {
      const game = Game.fromSgf('(;FF[4]SZ[5])')
      game.getRootNode().addLine(0, 0, 4, 1, '#ff0000')
      const {lines} = game.transform('i').getRootNode()
      expect(lines).toEqual([[0, 0, 4, 1, '#ff0000']])
    })
  })

  describe('the whole tree', () => {

    it('transforms every variation, not only the main line', () => {
      const game = Game.fromSgf('(;FF[4]SZ[5];B[aa](;W[ba])(;W[ab];B[bb]))')
      const root = game.transform('rr').getRootNode()

      expect(root.getChild(0).move).toEqual({color: stoneColors.BLACK, x: 4, y: 4})
      expect(root.getChild(0).getChild(0).move)
        .toEqual({color: stoneColors.WHITE, x: 3, y: 4})
      expect(root.getChild(0).getChild(1).move)
        .toEqual({color: stoneColors.WHITE, x: 4, y: 3})
      expect(root.getChild(0).getChild(1).getChild(0).move)
        .toEqual({color: stoneColors.BLACK, x: 3, y: 3})
    })

    it('carries on from where the game it transformed had got to', () => {
      const game = Game.fromSgf('(;FF[4]SZ[5];B[aa];W[ba](;B[ab])(;B[bb]))')
      game.goToLastPosition()
      game.goToNextVariation()

      const transformed = game.transform('r')
      expect(transformed.getCurrentMoveNumber()).toBe(game.getCurrentMoveNumber())
      expect(transformed.getPath().isSameAs(game.getPath())).toBe(true)
      expect(transformed.getCurrentNode().move)
        .toEqual({color: stoneColors.BLACK, x: 3, y: 1})
    })

    it('rebuilds the tree rather than sharing it', () => {
      const game = Game.fromSgf('(;FF[4]SZ[5];B[aa])')
      const transformed = game.transform('')
      expect(transformed.getRootNode()).not.toBe(game.getRootNode())
      expect(transformed.getRootNode().getChild(0).move)
        .not.toBe(game.getRootNode().getChild(0).move)
      expect(transformed.getRootNode().getChild(0).getParent())
        .toBe(transformed.getRootNode())
      expect(transformed.getRootNode().getChild(0).getRoot())
        .toBe(transformed.getRootNode())
    })

    it('leaves an engine analysis behind', () => {

      //An analysis describes the position as the engine saw it, coordinates
      //and all, so it does not survive the board being turned
      const game = Game.fromSgf('(;FF[4]SZ[5];B[aa])')
      game.getRootNode().analysis = {
        candidates: [{move: {x: 0, y: 0, color: stoneColors.BLACK}}],
      }
      expect(game.transform('r').getRootNode().analysis).toBeUndefined()
    })

    it('leaves a pass where it is', () => {
      const game = Game.fromSgf('(;FF[4]SZ[5];B[];W[aa])')
      const root = game.transform('r').getRootNode()
      expect(root.getChild(0).move).toEqual({color: stoneColors.BLACK, pass: true})
      expect(root.getChild(0).getChild(0).move)
        .toEqual({color: stoneColors.WHITE, x: 4, y: 0})
    })
  })

  describe('saving and reloading', () => {

    const sgf = `(;FF[4]SZ[5:9]KM[6.5]RE[B+3.5]
      PB[Alice]BR[5d]PW[Bob]WR[4d]PL[B]
      AB[aa][ba]AW[ce]LB[bb:A]
      ;B[cb];W[db])`

    it('survives a round trip through SGF', () => {
      const game = Game.fromSgf(sgf)
      const transformed = game.transform('rfi')
      const reloaded = Game.fromSgf(transformed.toSgf())

      expect(reloaded.getBoardSize()).toEqual(transformed.getBoardSize())
      expect(describeNode(reloaded.getRootNode()))
        .toEqual(describeNode(transformed.getRootNode()))
      expect(reloaded.getGameResult()).toBe('W+3.5')
      expect(reloaded.getKomi()).toBe(-6.5)
      expect(reloaded.getPlayer(stoneColors.BLACK).name).toBe('Bob')
    })

    it('can be reloaded and transformed back', () => {
      const game = Game.fromSgf(sgf)
      const reloaded = Game.fromSgf(game.transform('rfi').toSgf())
      const back = reloaded.transform(reverseTransformation('rfi'))

      expect(describeNode(back.getRootNode()))
        .toEqual(describeNode(game.getRootNode()))
      expect(back.getBoardSize()).toEqual(game.getBoardSize())
      expect(back.getKomi()).toBe(6.5)
      expect(back.getGameResult()).toBe('B+3.5')
    })
  })

  describe('validation', () => {

    it('refuses anything that is not a game', () => {
      const transformer = new GameTransformer()
      expect(() => transformer.transform({}, 'r')).toThrow(/not a game/i)
    })

    it('refuses an operation it does not know', () => {
      const game = Game.fromSgf('(;FF[4]SZ[5])')
      expect(() => game.transform('rx')).toThrow(/invalid transformation/i)
    })

    it('treats no transformation at all as a copy', () => {
      const game = Game.fromSgf('(;FF[4]SZ[5];B[aa])')
      expect(describeGame(game.transform())).toEqual(describeGame(game))
    })
  })
})
