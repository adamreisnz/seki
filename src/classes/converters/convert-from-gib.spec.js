import {describe, it, expect} from 'vitest'
import Game from '../game.js'
import ConvertFromGib from './convert-from-gib.js'
import {stoneColors} from '../../constants/stone.js'

const {BLACK, WHITE} = stoneColors

const header = [
  '\\ [GAMEWHITENAME=Alice (1D)]',
  '[GAMEBLACKNAME=Bob (2D)]',
  '[GAMEGONGJE=65]',
].join(' ')

//STO 0 <moveNo> <color> <x> <y>, where colour 1 is black and 2 is white
const moves = 'STO 0 2 1 3 3 STO 0 3 2 15 3 STO 0 4 1 3 15'

const parse = gib => new ConvertFromGib().convert(gib)

describe('ConvertFromGib', () => {

  it('rejects empty input', () => {
    expect(() => parse('')).toThrow('No GIB data supplied')
  })

  it('reads player names and ranks', () => {
    const game = parse(`${header} ${moves}`)
    expect(game.getPlayer(BLACK)).toMatchObject({name: 'Bob', rank: '2D'})
    expect(game.getPlayer(WHITE)).toMatchObject({name: 'Alice', rank: '1D'})
  })

  it('reads komi, which is stored ten times over', () => {
    expect(parse(`${header} ${moves}`).getKomi()).toBe(6.5)
  })

  it('reads the moves in order, alternating colour', () => {
    const game = parse(`${header} ${moves}`)

    const first = game.getRootNode().getChild(0)
    expect(first.move).toMatchObject({x: 3, y: 3, color: BLACK})

    const second = first.getChild(0)
    expect(second.move).toMatchObject({x: 15, y: 3, color: WHITE})

    const third = second.getChild(0)
    expect(third.move).toMatchObject({x: 3, y: 15, color: BLACK})
    expect(third.hasChildren()).toBe(false)
  })

  it('reads a result with a margin', () => {
    const game = parse(`${header} [GAMERESULT=white 13.5 win] ${moves}`)
    expect(game.getGameResult()).toBe('W+13.5')
  })

  it('reads a result by resignation', () => {
    const game = parse(`${header} [GAMERESULT=black wins by resignation] ${moves}`)
    expect(game.getGameResult()).toBe('B+R')
  })

  it('reads a date without throwing', () => {

    //NOTE: this used to call game.setDate, which does not exist, so any
    //record carrying a date threw "game.setDate is not a function"
    const game = parse(`${header} [GAMEDATE=2024- 3- 9] ${moves}`)
    expect(game.getGameDate()).toBe('2024-03-09')
  })

  it('handles a record with no date at all', () => {
    const game = parse(`${header} ${moves}`)
    expect(() => game.getGameDate()).not.toThrow()
  })

  it('parses a second record without state carried over from the first', () => {

    //The module level regexes used to be global and run through a single
    //exec, so their lastIndex survived into the next file and everything
    //after the first record came back empty
    parse(`${header} [GAMERESULT=white 13.5 win] [GAMEDATE=2024- 3- 9] ${moves}`)
    const second = parse(`${header} [GAMERESULT=black 5.5 win] [GAMEDATE=2023- 1- 2] ${moves}`)

    expect(second.getKomi()).toBe(6.5)
    expect(second.getGameResult()).toBe('B+5.5')
    expect(second.getGameDate()).toBe('2023-01-02')
    expect(second.getPlayer(BLACK).name).toBe('Bob')
    expect(second.getRootNode().getChild(0).move).toMatchObject({x: 3, y: 3})
  })

  it('is reachable through the generic loader', () => {
    const game = Game.fromGib(`${header} [GAMEDATE=2024- 3- 9] ${moves}`)
    expect(game.getRootNode().getChild(0).move).toMatchObject({x: 3, y: 3})
  })

  it('is picked up by format detection', () => {
    const gib = `${header} ${moves}`
    const game = Game.fromData(gib)
    expect(game.getPlayer(BLACK).name).toBe('Bob')
  })
})
