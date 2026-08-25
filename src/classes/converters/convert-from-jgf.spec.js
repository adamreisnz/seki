import {describe, it, expect} from 'vitest'
import Game from '../game.js'
import GameNode from '../game-node.js'
import ConvertToJgf from './convert-to-jgf.js'
import ConvertFromJgf from './convert-from-jgf.js'
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
describe('JGF round trip', () => {

  it('re-imports an exported game with variations', () => {
    const {game} = createForkedGame()
    const jgf = toJgf(game)
    const reloaded = new ConvertFromJgf().convert(jgf)

    expect(reloaded.root.children).toHaveLength(1)
  })

  it('preserves the full tree shape', () => {
    const {game} = createForkedGame()
    const reloaded = new ConvertFromJgf().convert(toJgf(game))

    //root -> A, which forks into two branches of one further move each
    const a = reloaded.root.getChild(0)
    expect(a.move).toEqual({x: 3, y: 3, color: stoneColors.BLACK})
    expect(a.children).toHaveLength(2)
    expect(a.getChild(0).move).toMatchObject({x: 15, y: 15})
    expect(a.getChild(0).getChild(0).move).toMatchObject({x: 16, y: 16})
    expect(a.getChild(1).move).toMatchObject({x: 15, y: 3})
    expect(a.getChild(1).getChild(0).move).toMatchObject({x: 16, y: 3})
  })

  it('preserves comments on the forking node', () => {
    const {game} = createForkedGame()
    const reloaded = new ConvertFromJgf().convert(toJgf(game))
    expect(reloaded.root.getChild(0).getComments()).toEqual(['Fork point'])
  })

  it('survives a second round trip unchanged', () => {
    const {game} = createForkedGame()
    const once = toJgf(game)
    const twice = toJgf(new ConvertFromJgf().convert(once))
    expect(twice.tree).toEqual(once.tree)
  })

  it('preserves markup and setup instructions', () => {
    const game = new Game()
    game.addStone(3, 3, stoneColors.BLACK)
    game.addMarkup(4, 4, {type: 'triangle'})

    const reloaded = new ConvertFromJgf().convert(toJgf(game))
    expect(reloaded.root.setup).toEqual([
      {type: stoneColors.BLACK, coords: [{x: 3, y: 3}]},
    ])
    expect(reloaded.root.markup).toEqual([
      {type: 'triangle', coords: [{x: 4, y: 4, text: undefined}]},
    ])
  })

  it('preserves game info', () => {
    const game = new Game({
      game: {name: 'Test game'},
      rules: {komi: 6.5, handicap: 2, ruleset: 'japanese'},
      players: {black: {name: 'Black player', rank: '5d'}},
    })

    const reloaded = new ConvertFromJgf().convert(toJgf(game))
    expect(reloaded.getGameName()).toBe('Test game')
    expect(reloaded.getKomi()).toBe(6.5)
    expect(reloaded.getHandicap()).toBe(2)
    expect(reloaded.getRuleset()).toBe('japanese')
    expect(reloaded.getPlayer(stoneColors.BLACK)).toMatchObject({
      name: 'Black player', rank: '5d',
    })
  })
})

describe('Problem records', () => {

  it('round trips the solution flag', () => {

    //NOTE: solution was missing from jgfNodePaths, so a problem record lost
    //which of its branches were the correct ones on a round trip
    const jgf = {
      tree: [
        {},
        {move: {x: 3, y: 3, color: stoneColors.BLACK}, solution: true},
      ],
    }

    const game = new ConvertFromJgf().convert(jgf)
    expect(game.root.getChild(0).solution).toBe(true)

    const out = new ConvertToJgf().convert(game, {rawJs: true})
    expect(out.tree[1].solution).toBe(true)
  })

  it('leaves nodes without the flag alone', () => {
    const game = new ConvertFromJgf().convert({
      tree: [{}, {move: {x: 3, y: 3, color: stoneColors.BLACK}}],
    })
    const out = new ConvertToJgf().convert(game, {rawJs: true})
    expect('solution' in out.tree[1]).toBe(false)
  })
})

describe('ConvertFromJgf, game information', () => {

  it('reads a record with no date as having no date', () => {

    //NOTE: this used to read as today, a game having been born dated. A
    //record that doesn't carry a date now reads as not carrying one.
    const jgf = {tree: [{root: true}, {move: {B: 'dd'}}]}
    expect(new ConvertFromJgf().convert(jgf).getGameDate()).toBe('')
  })
})

describe('ConvertFromJgf, invalid input', () => {

  it('rejects a record with no tree', () => {

    //NOTE: this used to read the length of undefined and surface as a
    //TypeError, which tells a caller nothing about what was wrong with it
    expect(() => new ConvertFromJgf().convert({game: {name: 'A game'}}))
      .toThrow('no game tree found')
  })

  it('rejects a record with an empty tree', () => {
    expect(() => new ConvertFromJgf().convert({tree: []}))
      .toThrow('no game tree found')
  })

  it('rejects a tree that is not an array', () => {
    expect(() => new ConvertFromJgf().convert({tree: {}}))
      .toThrow('no game tree found')
  })

  it('still rejects nothing at all', () => {
    expect(() => new ConvertFromJgf().convert()).toThrow('No JGF data supplied')
  })

  it('still rejects unparseable JSON', () => {
    expect(() => new ConvertFromJgf().convert('{')).toThrow('Unable to parse JSON')
  })

  it('parses a string starting with a byte order mark', () => {

    //NOTE: JSON.parse accepts leading whitespace but not a BOM, so this
    //failed even though format detection had just looked past it
    const game = new ConvertFromJgf().convert('﻿{"tree":[{"root":true},{"move":{"B":"dd"}}]}')
    expect(game.getRootNode().hasChildren()).toBe(true)
  })
})
