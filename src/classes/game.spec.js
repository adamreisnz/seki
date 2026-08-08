import {describe, it, expect} from 'vitest'
import Game from './game.js'
import GameNode from './game-node.js'
import {stoneColors} from '../constants/stone.js'
import {setupTypes} from '../constants/setup.js'
import {kifuFormats} from '../constants/app.js'
import {defaultGameInfo} from '../constants/defaults.js'
import {dateString} from '../helpers/util.js'

const {BLACK, WHITE} = stoneColors

/**
 * Play a list of [x, y] moves in turn
 */
const playMoves = (game, moves) => {
  for (const [x, y] of moves) {
    game.playMove(x, y)
  }
  return game
}

/**
 * Build root -> A(3,3), where A forks into B(15,15) on the main line and
 * C(15,3) as a variation
 */
const createForkedGame = () => {

  const game = new Game()
  game.playMove(3, 3)

  const fork = game.getCurrentNode()
  game.playMove(15, 15)
  game.goToNode(fork)

  const variation = new GameNode({move: {x: 15, y: 3, color: WHITE}})
  variation.appendToParent(fork)

  return {game, fork, variation}
}

describe('Game rules', () => {

  describe('playing moves', () => {

    it('alternates turn', () => {
      const game = new Game()
      expect(game.getTurn()).toBe(BLACK)

      game.playMove(3, 3)
      expect(game.getTurn()).toBe(WHITE)

      game.playMove(15, 15)
      expect(game.getTurn()).toBe(BLACK)
    })

    it('places the stone and records the move', () => {
      const game = new Game()
      game.playMove(3, 3)

      expect(game.hasStone(3, 3, BLACK)).toBe(true)
      expect(game.getCurrentMoveNumber()).toBe(1)
      expect(game.getCurrentMoveColor()).toBe(BLACK)
    })

    it('refuses to play on an occupied intersection', () => {
      const game = new Game()
      game.playMove(3, 3)

      const outcome = game.playMove(3, 3)
      expect(outcome.isValid).toBe(false)
      expect(outcome.reason).toMatch(/already has a stone/)
    })

    it('refuses to play off the board', () => {
      const outcome = new Game().playMove(19, 0)
      expect(outcome.isValid).toBe(false)
      expect(outcome.reason).toMatch(/out of bounds/)
    })

    it('passing keeps the position but switches the turn', () => {
      const game = new Game()
      game.passMove()

      expect(game.getTurn()).toBe(WHITE)
      expect(game.getCurrentNode().isPassMove()).toBe(true)
      expect(game.getPosition().hasStones()).toBe(false)
    })
  })

  describe('captures', () => {

    it('takes a surrounded stone off the board', () => {
      const game = new Game()

      //Black surrounds a white stone in the corner
      playMoves(game, [[0, 1], [0, 0], [1, 0]])

      expect(game.hasStone(0, 0)).toBe(false)
      expect(game.getCaptureCount()[BLACK]).toBe(1)
    })

    it('leaves a group with a liberty in place', () => {
      const game = new Game()
      playMoves(game, [[0, 1], [0, 0]])

      expect(game.hasStone(0, 0, WHITE)).toBe(true)
    })
  })

  describe('suicide', () => {

    it('rejects a move that fills its own last liberty', () => {
      const game = new Game()

      //White walls off the corner, black tries to play into it
      playMoves(game, [[5, 5], [0, 1], [6, 6], [1, 0]])

      const outcome = game.playMove(0, 0)
      expect(outcome.isValid).toBe(false)
      expect(outcome.reason).toMatch(/suicide/)
    })

    it('allows it when the ruleset says so', () => {
      const game = new Game({rules: {allowSuicide: true}})
      playMoves(game, [[5, 5], [0, 1], [6, 6], [1, 0]])

      expect(game.playMove(0, 0).isValid).toBe(true)
      expect(game.hasStone(0, 0)).toBe(false)
    })

    it('is not suicide when the move captures', () => {
      const game = new Game()

      //Black plays the move that takes the white stone at (0,0), which would
      //otherwise be a self capture
      playMoves(game, [[0, 1], [0, 0], [1, 0]])
      expect(game.hasStone(1, 0, BLACK)).toBe(true)
    })
  })

  describe('ko', () => {

    /**
     * Set up a ko: white's stone at (4,3) is surrounded by black on three
     * sides, black's capturing stone at (3,3) will be surrounded by white on
     * three sides, so either side can take the other but not twice running.
     */
    const createKo = () => playMoves(new Game(), [
      [5, 3], [4, 3],
      [4, 2], [2, 3],
      [4, 4], [3, 2],
      [10, 10], [3, 4],
    ])

    it('rejects an immediate recapture', () => {
      const game = createKo()

      //Black takes the ko
      expect(game.playMove(3, 3).isValid).toBe(true)
      expect(game.hasStone(4, 3)).toBe(false)

      //White taking it straight back repeats the previous position
      const outcome = game.playMove(4, 3)
      expect(outcome.isValid).toBe(false)
      expect(outcome.reason).toMatch(/repeating position/)
    })

    it('allows the recapture after a move elsewhere', () => {
      const game = createKo()
      game.playMove(3, 3)

      //White plays elsewhere, black answers, then white takes the ko back
      playMoves(game, [[11, 11], [12, 12]])
      expect(game.playMove(4, 3).isValid).toBe(true)
    })
  })

  describe('validation without playing', () => {

    it('reports validity without changing the game', () => {
      const game = new Game()
      game.playMove(3, 3)

      expect(game.isValidMove(3, 3, WHITE)).toBe(false)
      expect(game.isValidMove(4, 4, WHITE)).toBe(true)
      expect(game.getCurrentMoveNumber()).toBe(1)
    })

    it('validates coordinates against the board size', () => {
      const game = new Game({board: {size: 9}})
      expect(game.isValidCoordinate(8, 8)).toBe(true)
      expect(game.isValidCoordinate(9, 0)).toBe(false)
      expect(game.isValidCoordinate(-1, 0)).toBe(false)
    })
  })
})

describe('Game tree navigation', () => {

  const createLinearGame = () => playMoves(new Game(), [[3, 3], [15, 15], [3, 15]])

  it('walks backwards and forwards', () => {
    const game = createLinearGame()
    expect(game.getCurrentMoveNumber()).toBe(3)

    game.goToPreviousPosition()
    expect(game.getCurrentMoveNumber()).toBe(2)
    expect(game.hasStone(3, 15)).toBe(false)

    game.goToNextPosition()
    expect(game.getCurrentMoveNumber()).toBe(3)
    expect(game.hasStone(3, 15, BLACK)).toBe(true)
  })

  it('jumps to the first and last position', () => {
    const game = createLinearGame()

    game.goToFirstPosition()
    expect(game.isAtFirstPosition()).toBe(true)
    expect(game.getPosition().hasStones()).toBe(false)

    game.goToLastPosition()
    expect(game.isAtLastPosition()).toBe(true)
    expect(game.getCurrentMoveNumber()).toBe(3)
  })

  it('reports whether there is anywhere to go', () => {
    const game = createLinearGame()
    expect(game.hasNextPosition()).toBe(false)
    expect(game.hasPreviousPosition()).toBe(true)

    game.goToFirstPosition()
    expect(game.hasNextPosition()).toBe(true)
    expect(game.hasPreviousPosition()).toBe(false)
  })

  it('refuses to move past either end', () => {
    const game = createLinearGame()
    expect(game.goToNextPosition().isValid).toBe(false)

    game.goToFirstPosition()
    expect(game.goToPreviousPosition().isValid).toBe(false)
  })

  it('jumps a number of positions, stopping at the end', () => {
    const game = createLinearGame()

    game.goToFirstPosition()
    game.goForwardNumPositions(2)
    expect(game.getCurrentMoveNumber()).toBe(2)

    game.goForwardNumPositions(10)
    expect(game.getCurrentMoveNumber()).toBe(3)

    game.goBackNumPositions(10)
    expect(game.getCurrentMoveNumber()).toBe(0)
  })

  it('goes to a move number', () => {
    const game = createLinearGame()
    game.goToMoveNumber(2)
    expect(game.getCurrentMoveNumber()).toBe(2)
  })

  it('counts the moves in the main branch', () => {
    expect(createLinearGame().getTotalNumberOfMoves()).toBe(3)
  })

  it('finds the node for a move number', () => {
    const game = createLinearGame()
    const node = game.findNodeForMoveNumber(2)
    expect(node.move).toMatchObject({x: 15, y: 15})
  })

  it('goes to a named node', () => {
    const game = createLinearGame()
    game.goToMoveNumber(2)
    game.getCurrentNode().name = 'Interesting'

    game.goToFirstPosition()
    game.goToNamedNode('Interesting')
    expect(game.getCurrentMoveNumber()).toBe(2)
  })

  it('goes to a node by reference', () => {
    const game = createLinearGame()
    const target = game.findNodeForMoveNumber(1)

    game.goToNode(target)
    expect(game.getCurrentNode()).toBe(target)
  })

  it('finds the next comment', () => {
    const game = createLinearGame()
    game.goToMoveNumber(2)
    game.setComments('Look here')
    game.goToFirstPosition()

    game.goToNextComment()
    expect(game.getCurrentMoveNumber()).toBe(2)
  })
})

describe('Game variations', () => {
  it('sees the fork', () => {
    const {game, fork} = createForkedGame()
    expect(game.getCurrentNode()).toBe(fork)
    expect(fork.hasMultipleMoveVariations()).toBe(true)
  })

  it('takes the variation asked for', () => {
    const {game, variation} = createForkedGame()
    game.goToNextPosition(1)
    expect(game.getCurrentNode()).toBe(variation)
    expect(game.hasStone(15, 3, WHITE)).toBe(true)
  })

  it('finds the next fork', () => {
    const {game, fork} = createForkedGame()
    game.goToFirstPosition()
    game.goToNextFork()
    expect(game.getCurrentNode()).toBe(fork)
  })

  it('switches between sibling variations', () => {
    const {game, variation} = createForkedGame()
    game.goToNextPosition(0)

    game.goToNextVariation()
    expect(game.getCurrentNode()).toBe(variation)

    game.goToPreviousVariation()
    expect(game.getCurrentNode().move).toMatchObject({x: 15, y: 15})
  })

  it('makes a variation the main line', () => {
    const {game, fork, variation} = createForkedGame()
    game.makeMainVariation(variation)
    expect(fork.getChild(0)).toBe(variation)
  })

  it('refuses to promote a node that is already on the main line', () => {
    const {game, fork} = createForkedGame()
    expect(() => game.makeMainVariation(fork.getChild(0)))
      .toThrow('Node is not a variation branch')
  })

  it('removes a node from the tree', () => {
    const {game, fork, variation} = createForkedGame()
    game.removeNode(variation)
    expect(fork.children).toHaveLength(1)
  })

  it('refuses to remove the root', () => {
    const {game} = createForkedGame()
    expect(() => game.removeNode(game.getRootNode()))
      .toThrow('Cannot remove root node')
  })

  it('walks back to the parent when the current node is removed', () => {
    const {game, fork, variation} = createForkedGame()
    game.goToNextPosition(1)

    game.removeNode(variation)
    expect(game.getCurrentNode()).toBe(fork)
  })

  it('resolves a path back to the node it describes', () => {
    const {game, variation} = createForkedGame()
    const path = game.getPathToNode(variation)
    expect(game.findNodeForPath(path)).toBe(variation)
  })

  it('has no path for a node outside the tree', () => {
    const {game} = createForkedGame()
    expect(game.getPathToNode(new GameNode())).toBe(null)
  })
})

describe('Game setup and markup', () => {

  it('adds and removes setup stones', () => {
    const game = new Game()

    game.addStone(3, 3, BLACK)
    expect(game.hasStone(3, 3, BLACK)).toBe(true)
    expect(game.getRootNode().setup).toEqual([
      {type: BLACK, coords: [{x: 3, y: 3}]},
    ])

    game.removeStone(3, 3)
    expect(game.hasStone(3, 3)).toBe(false)
  })

  it('rejects an invalid stone color', () => {
    const game = new Game()
    game.addStone(3, 3, 'green')
    expect(game.hasStone(3, 3)).toBe(false)
  })

  it('clears a stone placed by a move using a clear instruction', () => {
    const game = new Game()
    game.playMove(3, 3)
    game.removeStone(3, 3)

    expect(game.hasStone(3, 3)).toBe(false)
    expect(game.getCurrentNode().setup).toEqual([
      {type: setupTypes.CLEAR, coords: [{x: 3, y: 3}]},
    ])
  })

  it('adds and removes markup', () => {
    const game = new Game()

    game.addMarkup(3, 3, {type: 'circle'})
    expect(game.hasMarkup(3, 3)).toBe(true)
    expect(game.hasMarkup(3, 3, 'circle')).toBe(true)

    game.removeMarkup(3, 3)
    expect(game.hasMarkup(3, 3)).toBe(false)
  })

  it('clears all markup at once', () => {
    const game = new Game()
    game.addMarkup(3, 3, {type: 'circle'})
    game.addMarkup(4, 4, {type: 'square'})

    game.removeAllMarkup()
    expect(game.hasMarkup(3, 3)).toBe(false)
    expect(game.hasMarkup(4, 4)).toBe(false)
  })

  it('reports markup and stones over an area', () => {
    const game = new Game()
    game.addStone(3, 3, BLACK)
    game.addMarkup(4, 4, {type: 'circle'})

    const area = [{x: 3, y: 3}, {x: 4, y: 4}]
    expect(game.hasStonesInArea(area)).toBe(true)
    expect(game.hasMarkupInArea(area)).toBe(true)
    expect(game.hasStonesInArea([{x: 9, y: 9}])).toBe(false)
  })
})

describe('Game info', () => {

  it('takes info through the constructor', () => {
    const game = new Game({
      game: {name: 'Test', result: 'W+Resign'},
      rules: {komi: 6.5, handicap: 2},
      players: {black: {name: 'B', rank: '1d'}},
    })

    expect(game.getGameName()).toBe('Test')
    expect(game.getGameResult()).toBe('W+R')
    expect(game.getKomi()).toBe(6.5)
    expect(game.getHandicap()).toBe(2)
    expect(game.getPlayer(BLACK).name).toBe('B')
  })

  it('defaults to a 19x19 board', () => {
    expect(new Game().getBoardSize()).toEqual({width: 19, height: 19})
  })

  it('takes a square size', () => {
    expect(new Game({board: {size: 9}}).getBoardSize())
      .toEqual({width: 9, height: 9})
  })

  it('takes a rectangular size', () => {
    expect(new Game({board: {width: 19, height: 13}}).getBoardSize())
      .toEqual({width: 19, height: 13})
  })

  it('trims a game date down to a date', () => {
    const game = new Game()
    game.setGameDate('2024-03-09 and later')
    expect(game.getGameDate()).toBe('2024-03-09')
  })

  it('pulls a URL out of a source name', () => {
    const game = new Game()
    game.setSourceName('Some Source: https://example.com')
    expect(game.getSourceUrl()).toBe('https://example.com')
    expect(game.getSourceName()).toBe('Some Source')
  })

  it('emits an info event when something changes', () => {
    const game = new Game()
    let detail = null
    game.on('info', event => detail = event.detail)

    game.setGameName('Changed')
    expect(detail).toEqual({gameName: 'Changed'})
  })

  it('updates a single player field without clearing the rest', () => {
    const game = new Game({players: {black: {name: 'B', rank: '1d'}}})
    game.updatePlayer(BLACK, {rank: '2d'})

    expect(game.getPlayer(BLACK)).toMatchObject({name: 'B', rank: '2d'})
  })
})

describe('Game handicap', () => {

  it('places the standard stones and gives white the move', () => {
    const game = new Game({rules: {handicap: 4}})
    game.placeDefaultHandicapStones()

    expect(game.hasStone(3, 3, BLACK)).toBe(true)
    expect(game.hasStone(15, 15, BLACK)).toBe(true)
    expect(game.getTurn()).toBe(WHITE)
  })

  it('does nothing below two stones', () => {
    const game = new Game({rules: {handicap: 1}})
    game.placeDefaultHandicapStones()
    expect(game.getPosition().hasStones()).toBe(false)
  })

  it('does nothing for a board size it has no placements for', () => {
    const game = new Game({board: {size: 12}, rules: {handicap: 4}})
    game.placeDefaultHandicapStones()
    expect(game.getPosition().hasStones()).toBe(false)
  })

  //NOTE: the turn on a handicap game at the first position is covered in
  //game-handicap-turn.spec.js, alongside the fix for it
})

describe('Game format detection', () => {

  it('recognises SGF, JGF and GIB', () => {
    expect(Game.detectFormat('(;FF[4])')).toBe(kifuFormats.SGF)
    expect(Game.detectFormat('{"tree":[]}')).toBe(kifuFormats.JGF)
    expect(Game.detectFormat({tree: []})).toBe(kifuFormats.JGF)
    expect(Game.detectFormat('\\HS')).toBe(kifuFormats.GIB)
  })

  it('rejects nothing and nonsense', () => {
    expect(() => Game.detectFormat('')).toThrow('No data')
    expect(() => Game.detectFormat('hello')).toThrow('Unknown data format')
  })

  it('looks past leading whitespace and a byte order mark', () => {

    //NOTE: this used to read the very first character of the raw string, so a
    //file starting with a blank line or a BOM, which is most of them, was
    //rejected as an unknown format
    expect(Game.detectFormat('\n(;FF[4])')).toBe(kifuFormats.SGF)
    expect(Game.detectFormat('  \t(;FF[4])')).toBe(kifuFormats.SGF)
    expect(Game.detectFormat('﻿(;FF[4])')).toBe(kifuFormats.SGF)
    expect(Game.detectFormat('\n{"tree":[{}]}')).toBe(kifuFormats.JGF)
    expect(Game.detectFormat('﻿\\HS')).toBe(kifuFormats.GIB)
  })

  it('loads a record that starts with whitespace', () => {
    const game = Game.fromData('\n\n(;GM[1]FF[4]SZ[19];B[dd])')
    expect(game.getRootNode().hasChildren()).toBe(true)
  })

  it('rejects an unsupported output format', () => {
    expect(() => new Game().toData('pdf')).toThrow('Unsupported data format')
  })
})

describe('Game reset', () => {

  it('clears the tree and position', () => {
    const game = playMoves(new Game(), [[3, 3], [15, 15]])
    game.reset()

    expect(game.getCurrentMoveNumber()).toBe(0)
    expect(game.getPosition().hasStones()).toBe(false)
    expect(game.getRootNode().hasChildren()).toBe(false)
  })

  it('keeps the game info, as the name says', () => {

    //NOTE: this used to run init() on its own, which wipes the info along with
    //the tree, so a reset also threw away the board size, players and rules
    const game = new Game({board: {size: 9}})
    game.setGameName('A game')
    game.setKomi(6.5)
    game.setPlayer(BLACK, {name: 'Black player', rank: '1d'})
    playMoves(game, [[2, 2]])

    game.reset()

    expect(game.getGameName()).toBe('A game')
    expect(game.getKomi()).toBe(6.5)
    expect(game.getPlayer(BLACK).name).toBe('Black player')
    expect(game.getBoardSize()).toEqual({width: 9, height: 9})
  })

  it('resizes the position to the board size it kept', () => {
    const game = new Game({board: {size: 9}})
    game.reset()
    expect(game.getPosition().width).toBe(9)
  })
})

describe('Game.isMoveVariation()', () => {

  it('reports coordinates that a child move node plays on', () => {
    const game = new Game()
    game.playMove(3, 3)
    game.goToPreviousPosition()
    expect(game.isMoveVariation(3, 3)).toBe(true)
    expect(game.isMoveVariation(4, 4)).toBe(false)
  })
})

describe('Game event location', () => {

  it('keeps a plain location that contains no URL', () => {
    const game = new Game()
    game.setEventLocation('Amsterdam')
    expect(game.getEventLocation()).toBe('Amsterdam')
  })

  it('still splits a location that carries a URL', () => {
    const game = new Game()
    game.setEventLocation('Amsterdam at https://example.com')
    expect(game.getEventLocation()).toBe('https://example.com')
  })
})

describe('Game overtime', () => {

  it('does not throw on a null value', () => {
    const game = new Game()
    expect(() => game.setOvertime(null)).not.toThrow()
    expect(game.getOvertime()).toBeFalsy()
  })

  it('still parses periods out of a byo-yomi string', () => {
    const game = new Game()
    game.setOvertime('5x30 byo-yomi')
    expect(game.getNumberOfPeriods()).toBe(5)
    expect(game.getTimePerPeriod()).toBe(30)
  })
})

describe('Setup instructions on a move node', () => {

  it('does not leave an empty setup array behind on the move node', () => {
    const game = new Game()
    game.playMove(3, 3)
    const moveNode = game.getCurrentNode()
    game.addStone(5, 5, stoneColors.WHITE)
    expect(moveNode.hasSetupInstructions()).toBe(false)
    expect(moveNode.setup).toBeUndefined()
  })

  it('puts the setup on a newly created child node', () => {
    const game = new Game()
    game.playMove(3, 3)
    const moveNode = game.getCurrentNode()
    game.addStone(5, 5, stoneColors.WHITE)
    expect(game.getCurrentNode()).not.toBe(moveNode)
    expect(game.getCurrentNode().hasSetupInstructions()).toBe(true)
    expect(game.hasStone(5, 5, stoneColors.WHITE)).toBe(true)
  })
})

describe('Game.hasStone()', () => {

  it('matches a stone of the given color', () => {
    const game = new Game()
    game.playMove(3, 3)
    expect(game.hasStone(3, 3)).toBe(true)
    expect(game.hasStone(3, 3, stoneColors.BLACK)).toBe(true)
    expect(game.hasStone(3, 3, stoneColors.WHITE)).toBe(false)
  })

  it('is false on an empty intersection', () => {
    const game = new Game()
    expect(game.hasStone(3, 3)).toBe(false)
    expect(game.hasStone(3, 3, stoneColors.BLACK)).toBe(false)
  })

  it('lets addStone bail out when the stone is already there', () => {
    const game = new Game()
    game.addStone(5, 5, stoneColors.WHITE)
    const node = game.getCurrentNode()
    game.addStone(5, 5, stoneColors.WHITE)
    expect(game.getCurrentNode()).toBe(node)
  })
})

describe('Game.hasMarkup()', () => {

  it('matches markup of the given type', () => {
    const game = new Game()
    game.addMarkup(3, 3, {type: 'circle'})
    expect(game.hasMarkup(3, 3)).toBe(true)
    expect(game.hasMarkup(3, 3, 'circle')).toBe(true)
    expect(game.hasMarkup(3, 3, 'square')).toBe(false)
  })
})

describe('Path reported while navigating a variation', () => {

  it('describes the variation while in it', () => {
    const {game} = createForkedGame()
    game.goToPath({moveNo: 2, branches: 1, path: {1: 1}})

    expect(game.getCurrentNode().move).toMatchObject({x: 15, y: 3})
    expect(game.getPathObject()).toEqual({moveNo: 2, branches: 1, path: {1: 1}})
  })

  it('drops the variation choice on stepping back out of it', () => {
    const {game} = createForkedGame()
    game.goToPath({moveNo: 2, branches: 1, path: {1: 1}})
    game.goToPreviousPosition()

    expect(game.getPathObject()).toEqual({moveNo: 1, branches: 0, path: {}})
  })

  it('describes the main line after stepping back and taking it', () => {
    const {game} = createForkedGame()

    //Into the variation, back one move, then down the main line
    game.goToPath({moveNo: 2, branches: 1, path: {1: 1}})
    game.goToPreviousPosition()
    game.goToNextPosition(0)

    expect(game.getCurrentNode().move).toMatchObject({x: 15, y: 15})
    expect(game.getPathObject()).toEqual({moveNo: 2, branches: 0, path: {}})
  })

  it('resolves its own reported path back to the node it is on', () => {
    const {game} = createForkedGame()

    game.goToPath({moveNo: 2, branches: 1, path: {1: 1}})
    game.goToPreviousPosition()
    game.goToNextPosition(0)

    //This is what makes the path usable for synchronising another instance:
    //the path a player reports has to lead back to the node it is actually on
    const resolved = game.findNodeForPath(game.getPath())
    expect(resolved).toBe(game.getCurrentNode())
  })

  it('round trips the path of every node in the tree', () => {
    const {game, fork, variation} = createForkedGame()
    const mainLine = fork.getChild(0)

    for (const node of [fork, mainLine, variation]) {
      const path = game.getPathToNode(node)
      expect(game.findNodeForPath(path)).toBe(node)
    }
  })
})

describe('Turn at the first position', () => {

  it('is black on an even game', () => {
    const game = new Game()
    game.goToFirstPosition()
    expect(game.getTurn()).toBe(BLACK)
  })

  it('is white on a handicap game', () => {
    const game = new Game({rules: {handicap: 2}})
    game.goToFirstPosition()
    expect(game.getTurn()).toBe(WHITE)
  })

  it('is white for larger handicaps too', () => {
    const game = new Game({rules: {handicap: 9}})
    game.goToFirstPosition()
    expect(game.getTurn()).toBe(WHITE)
  })

  it('is black for a handicap of one, which is really an even game', () => {
    const game = new Game({rules: {handicap: 1}})
    game.goToFirstPosition()
    expect(game.getTurn()).toBe(BLACK)
  })

  it('survives navigating away and back', () => {
    const game = new Game({rules: {handicap: 2}})
    game.playMove(3, 3)
    game.goToFirstPosition()
    expect(game.getTurn()).toBe(WHITE)
  })
})

describe('Handicap records loaded from SGF', () => {

  it('gives white the move when the stones come in as setup', () => {

    //This is how a real handicap record is written: HA for the count, and the
    //stones themselves as setup instructions on the root node
    const game = Game.fromSgf('(;FF[4]SZ[19]HA[2]KM[0.5]AB[pd][dp])')
    game.goToFirstPosition()

    expect(game.getHandicap()).toBe(2)
    expect(game.getTurn()).toBe(WHITE)
  })

  it('still lets the record override the turn explicitly', () => {

    //PL on the root node says whose turn it is, and has to win
    const game = Game.fromSgf('(;FF[4]SZ[19]HA[2]AB[pd][dp]PL[B])')
    game.goToFirstPosition()
    game.processCurrentNode()

    expect(game.getTurn()).toBe(BLACK)
  })

  it('leaves an even game with black to play', () => {
    const game = Game.fromSgf('(;FF[4]SZ[19]KM[6.5])')
    game.goToFirstPosition()
    expect(game.getTurn()).toBe(BLACK)
  })
})

describe('Default handicap stone placement', () => {

  it('places the stones and leaves white to play', () => {
    const game = new Game({rules: {handicap: 4}})
    game.goToFirstPosition()
    game.placeDefaultHandicapStones()

    expect(game.getStone(3, 3)).toBe(BLACK)
    expect(game.getStone(15, 15)).toBe(BLACK)
    expect(game.getTurn()).toBe(WHITE)
  })
})

describe('Default game date', () => {

  it('is today, not the day the module was first imported', () => {

    //NOTE: this used to be a plain value computed at import time, so a page
    //left open across midnight went on stamping the previous day's date
    const descriptor = Object.getOwnPropertyDescriptor(
      defaultGameInfo.game, 'date'
    )
    expect(descriptor.get).toBeTypeOf('function')
    expect(new Game().getGameDate()).toBe(dateString())
  })

  it('is still overridden by a date given in the info', () => {
    expect(new Game({game: {date: '2020-01-02'}}).getGameDate()).toBe('2020-01-02')
  })

  it('re-evaluates for each game created', () => {
    const first = new Game().getGameDate()
    const second = new Game().getGameDate()
    expect(first).toBe(second)
    expect(first).toBe(dateString())
  })
})

describe('Game loaded from a converter', () => {

  const sgf = '(;GM[1]FF[4]SZ[19];B[dd];W[pp];B[dp])'

  it('points at the root of the tree it was given', () => {

    //NOTE: setRootNode used to swap the tree without moving the current node,
    //which was left pointing at the empty root the constructor made. The game
    //then reported no next position at all and refused to navigate anywhere
    const game = Game.fromSgf(sgf)
    expect(game.isRootNode(game.getCurrentNode())).toBe(true)
    expect(game.hasNextPosition()).toBe(true)
  })

  it('can be navigated straight away', () => {
    const game = Game.fromSgf(sgf)
    game.goToLastPosition()
    expect(game.getCurrentMoveNumber()).toBe(3)
    expect(game.hasStone(3, 3, BLACK)).toBe(true)
    expect(game.hasStone(15, 15, WHITE)).toBe(true)
  })

  it('sizes the position to the board in the record', () => {
    const game = Game.fromSgf('(;GM[1]FF[4]SZ[9];B[cc])')
    expect(game.getPosition().width).toBe(9)
    expect(game.getPosition().height).toBe(9)
  })

  it('applies the root setup instructions', () => {
    const game = Game.fromSgf('(;GM[1]FF[4]SZ[19]AB[dd][pp]AW[dp];B[pd])')
    expect(game.hasStone(3, 3, BLACK)).toBe(true)
    expect(game.hasStone(15, 15, BLACK)).toBe(true)
    expect(game.hasStone(3, 15, WHITE)).toBe(true)
  })

  it('starts with a clean path', () => {
    const game = Game.fromSgf(sgf)
    expect(game.getPathObject()).toEqual({moveNo: 0, branches: 0, path: {}})
  })
})

describe('Game navigation over an illegal move', () => {

  /**
   * A record whose second move is played on the point the first one occupies,
   * which no amount of navigating can make legal
   */
  const createBrokenGame = () => {
    const game = new Game()
    const root = game.getRootNode()
    const first = new GameNode({move: {x: 3, y: 3, color: BLACK}})
    const second = new GameNode({move: {x: 3, y: 3, color: WHITE}})
    first.appendToParent(root)
    second.appendToParent(first)
    game.goToFirstPosition()
    return game
  }

  it('refuses to advance onto it', () => {
    const game = createBrokenGame()
    game.goToNextPosition()
    expect(game.goToNextPosition().isValid).toBe(false)
  })

  it('stays on the node it was on', () => {
    const game = createBrokenGame()
    game.goToNextPosition()
    game.goToNextPosition()
    expect(game.getCurrentMoveNumber()).toBe(1)
  })

  it('leaves the position stack matching the node', () => {

    //NOTE: reverting used to go through goToPreviousNode(), which pops a
    //position. Nothing had been pushed for the node being reverted, so what
    //came off was the position of the node being returned to, and the first
    //move vanished from the board while the game still said it was on it
    const game = createBrokenGame()
    game.goToNextPosition()
    const positions = game.positions.length

    game.goToNextPosition()

    expect(game.positions.length).toBe(positions)
    expect(game.hasStone(3, 3, BLACK)).toBe(true)
  })

  it('can still be navigated afterwards', () => {
    const game = createBrokenGame()
    game.goToNextPosition()
    game.goToNextPosition()
    game.goToPreviousPosition()
    expect(game.getCurrentMoveNumber()).toBe(0)
    expect(game.getPosition().hasStones()).toBe(false)
  })

  it('stops there when running to the last position', () => {
    const game = createBrokenGame()
    game.goToLastPosition()
    expect(game.getCurrentMoveNumber()).toBe(1)
    expect(game.hasStone(3, 3, BLACK)).toBe(true)
  })
})

describe('Game.removeNode()', () => {

  it('refuses to remove the root', () => {
    const game = new Game()
    expect(() => game.removeNode(game.getRootNode()))
      .toThrow('Cannot remove root node')
  })

  it('steps back to the parent when removing the node we are on', () => {
    const game = playMoves(new Game(), [[3, 3], [15, 15]])
    game.removeNode(game.getCurrentNode())
    expect(game.getCurrentMoveNumber()).toBe(1)
  })

  it('steps back when removing an ancestor of the node we are on', () => {

    //NOTE: this used to only check for the current node itself, so removing
    //anything above it left the game standing in a subtree that had just been
    //cut off from the tree, with a move number counted through detached nodes
    const game = playMoves(new Game(), [[3, 3], [15, 15], [3, 15]])
    game.goToFirstPosition()
    game.goToNextPosition()
    const ancestor = game.getCurrentNode()
    game.goToLastPosition()

    game.removeNode(ancestor)

    expect(game.isRootNode(game.getCurrentNode())).toBe(true)
    expect(game.getCurrentMoveNumber()).toBe(0)
    expect(game.getPosition().hasStones()).toBe(false)
  })

  it('leaves the current node alone when removing a different branch', () => {
    const game = new Game()
    game.playMove(3, 3)
    game.goToPreviousPosition()
    game.playMove(15, 15)
    const variation = game.getCurrentNode()
    game.goToPreviousPosition()
    game.goToNextPosition(0)
    const current = game.getCurrentNode()

    game.removeNode(variation)

    expect(game.isCurrentNode(current)).toBe(true)
    expect(game.getCurrentMoveNumber()).toBe(1)
  })
})

describe('Position change events for setup edits', () => {

  it('reports the position the stone was added to', () => {

    //NOTE: the event used to carry the position captured before the change,
    //which for a new setup node is not the one left on the stack, so a
    //listener rendering event.detail.position drew a board without the stone
    const game = playMoves(new Game(), [[3, 3]])
    const seen = []
    game.on('positionChange', event => seen.push(event.detail.position))

    game.addStone(5, 5, WHITE)

    expect(seen).toHaveLength(1)
    expect(seen[0].stones.has(5, 5)).toBe(true)
    expect(seen[0]).toBe(game.getPosition())
  })

  it('reports the position the stone was removed from', () => {
    const game = playMoves(new Game(), [[3, 3]])
    const seen = []
    game.on('positionChange', event => seen.push(event.detail.position))

    game.removeStone(3, 3)

    expect(seen).toHaveLength(1)
    expect(seen[0].stones.has(3, 3)).toBe(false)
    expect(seen[0]).toBe(game.getPosition())
  })

  it('fires when removing a stone the current node set up', () => {

    //NOTE: this branch returned without an event at all, so undoing a setup
    //stone left it drawn on the board
    const game = new Game()
    game.addStone(5, 5, WHITE)
    const seen = []
    game.on('positionChange', event => seen.push(event.detail.position))

    game.removeStone(5, 5)

    expect(seen).toHaveLength(1)
    expect(seen[0].stones.has(5, 5)).toBe(false)
  })
})

describe('Game.addMarkup()', () => {

  it('ignores a second add of the same type on the same point', () => {

    //NOTE: the guard used to hand the whole markup object to hasMarkup() where
    //a type is expected, so it compared a type against an object and the
    //early return never happened
    const game = new Game()
    game.addMarkup(3, 3, {type: 'label', text: 'A'})
    game.addMarkup(3, 3, {type: 'label', text: 'B'})

    expect(game.getMarkup(3, 3).text).toBe('A')
    expect(game.getCurrentNode().markup).toEqual([
      {type: 'label', coords: [{x: 3, y: 3, text: 'A'}]},
    ])
  })

  it('still replaces markup of a different type', () => {
    const game = new Game()
    game.addMarkup(3, 3, {type: 'circle'})
    game.addMarkup(3, 3, {type: 'square'})
    expect(game.getMarkup(3, 3).type).toBe('square')
  })
})

describe('Byo-yomi periods in the game info', () => {

  it('comes back out of getInfo', () => {

    //NOTE: setInfo reads these two but getInfo never wrote them, so a record
    //with byo-yomi periods lost them on every save and reload
    const game = new Game()
    game.setNumberOfPeriods(5)
    game.setTimePerPeriod(30)

    const info = game.getInfo()

    expect(info.rules.numberOfPeriods).toBe(5)
    expect(info.rules.timePerPeriod).toBe(30)
  })

  it('survives a round trip through the info', () => {
    const game = new Game()
    game.setNumberOfPeriods(3)
    game.setTimePerPeriod(60)

    const copy = new Game(game.getInfo())

    expect(copy.getNumberOfPeriods()).toBe(3)
    expect(copy.getTimePerPeriod()).toBe(60)
    expect(copy.getOvertime()).toBe('3x60 byo-yomi')
  })

  it('survives a round trip through SGF', () => {
    const game = new Game()
    game.setNumberOfPeriods(3)
    game.setTimePerPeriod(60)

    const copy = Game.fromSgf(game.toSgf())

    expect(copy.getNumberOfPeriods()).toBe(3)
    expect(copy.getTimePerPeriod()).toBe(60)
  })

  it('survives a round trip through JGF', () => {
    const game = new Game()
    game.setNumberOfPeriods(3)
    game.setTimePerPeriod(60)
    game.playMove(3, 3)

    const copy = Game.fromJgf(game.toJgf())

    expect(copy.getNumberOfPeriods()).toBe(3)
    expect(copy.getTimePerPeriod()).toBe(60)
  })

  it('stays out of the SGF when there are none', () => {
    expect(new Game().toSgf()).not.toMatch(/TC\[|TT\[/)
  })
})

describe('Marking the path after a pass', () => {

  it('marks the path the same way a played move does', () => {

    //NOTE: playMove marked the path but passMove did not, so passing into a
    //variation left the path flags describing the branch that was not taken
    const game = new Game()
    game.playMove(3, 3)
    game.goToPreviousPosition()
    game.passMove()

    const [played, passed] = game.getRootNode().getChildren()
    expect(passed.isPath).toBe(true)
    expect(played.isPath).toBe(false)
  })
})

describe('Game.resetCurrentPathIndex()', () => {

  it('sends the next step back to the main variation', () => {
    const game = new Game()
    game.playMove(3, 3)
    game.goToPreviousPosition()
    game.playMove(15, 15)
    game.goToPreviousPosition()

    expect(game.getCurrentPathIndex()).toBe(1)
    game.resetCurrentPathIndex()
    expect(game.getCurrentPathIndex()).toBe(0)

    game.goToNextPosition(game.getCurrentPathIndex())
    expect(game.hasStone(3, 3, BLACK)).toBe(true)
  })

  it('leaves the choices that describe where we are in place', () => {
    const game = new Game()
    game.playMove(3, 3)
    game.goToPreviousPosition()
    game.playMove(15, 15)

    game.resetCurrentPathIndex()

    expect(game.getPathObject().path).toEqual({0: 1})
  })
})
