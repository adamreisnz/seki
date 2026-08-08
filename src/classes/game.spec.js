import {describe, it, expect} from 'vitest'
import Game from './game.js'
import GameNode from './game-node.js'
import {stoneColors} from '../constants/stone.js'

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
