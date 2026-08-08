import {describe, it, expect} from 'vitest'
import Game from './game.js'
import GameNode from './game-node.js'
import {stoneColors} from '../constants/stone.js'

const {BLACK, WHITE} = stoneColors

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

  const variation = new GameNode({
    move: {x: 15, y: 3, color: stoneColors.WHITE},
  })
  variation.appendToParent(fork)

  return {game, fork, variation}
}

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
