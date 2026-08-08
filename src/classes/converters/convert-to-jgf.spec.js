import {describe, it, expect} from 'vitest'
import Game from '../game.js'
import GameNode from '../game-node.js'
import ConvertToJgf from './convert-to-jgf.js'
import {stoneColors} from '../../constants/stone.js'

/**
 * Build a game whose root leads to a move that then forks into two
 * variations, each two moves deep:
 *
 *   root -> A(3,3) -+-> B(15,15) -> C(16,16)
 *                   `-> D(15,3)  -> E(16,3)
 */
const createForkedGame = () => {

  const game = new Game()

  game.playMove(3, 3)
  const fork = game.getCurrentNode()
  fork.setComments('Fork point')

  game.playMove(15, 15)
  game.playMove(16, 16)

  game.goToNode(fork)
  const d = new GameNode({move: {x: 15, y: 3, color: stoneColors.WHITE}})
  d.appendToParent(fork)
  const e = new GameNode({move: {x: 16, y: 3, color: stoneColors.BLACK}})
  e.appendToParent(d)

  return {game, fork}
}

const toJgf = game => new ConvertToJgf().convert(game, {rawJs: true})
describe('ConvertToJgf', () => {

  it('keeps the move of a node that forks', () => {
    const {game} = createForkedGame()
    const {tree} = toJgf(game)
    const moves = JSON.stringify(tree)
    expect(moves).toContain('"x":3')
    expect(moves).toContain('"y":3')
  })

  it('keeps the comments of a node that forks', () => {
    const {game} = createForkedGame()
    const {tree} = toJgf(game)
    expect(JSON.stringify(tree)).toContain('Fork point')
  })

  it('emits each variation as its own container of nodes', () => {
    const {game} = createForkedGame()
    const {tree} = toJgf(game)
    const variationsNode = tree.find(node => node.variations)

    expect(variationsNode).toBeDefined()
    expect(variationsNode.variations).toHaveLength(2)
    for (const variation of variationsNode.variations) {
      expect(Array.isArray(variation)).toBe(true)
      expect(variation).toHaveLength(2)
    }
  })

  it('places the variations node after the node that forks', () => {
    const {game} = createForkedGame()
    const {tree} = toJgf(game)
    const forkIndex = tree.findIndex(node => node.move?.x === 3 && node.move?.y === 3)
    const variationsIndex = tree.findIndex(node => node.variations)

    expect(forkIndex).toBeGreaterThanOrEqual(0)
    expect(variationsIndex).toBe(forkIndex + 1)
  })

  it('does not emit node keys that have no content', () => {
    const game = new Game()
    game.playMove(3, 3)
    const {tree} = toJgf(game)

    for (const node of tree) {
      expect(Object.keys(node)).not.toContain('name')
      expect(Object.keys(node)).not.toContain('comments')
    }
  })

  it('handles a linear game with no variations', () => {
    const game = new Game()
    game.playMove(3, 3)
    game.playMove(15, 15)
    const {tree} = toJgf(game)

    expect(tree.some(node => node.variations)).toBe(false)
    expect(tree).toHaveLength(3)
  })

  it('returns a JSON string unless rawJs is requested', () => {
    const game = new Game()
    game.playMove(3, 3)
    expect(new ConvertToJgf().convert(game)).toBeTypeOf('string')
  })

  it('rejects anything that is not a game instance', () => {
    expect(() => new ConvertToJgf().convert({})).toThrow('Not a game instance')
  })
})
