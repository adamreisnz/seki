import {describe, it, expect} from 'vitest'
import Game from './game.js'
import {stoneColors} from '../constants/stone.js'

const {BLACK, WHITE} = stoneColors

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
