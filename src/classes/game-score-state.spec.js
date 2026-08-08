import {describe, it, expect} from 'vitest'
import Game from './game.js'
import GameScoreState from './game-score-state.js'
import {stoneColors} from '../constants/stone.js'
import {scoreStates} from '../constants/score.js'

const {BLACK, WHITE} = stoneColors

describe('GameScoreState', () => {

  /**
   * A 5x5 board split down the middle, black on the left, white on the right,
   * with a lone white stone sitting inside black's area
   */
  const createSplitBoard = () => {
    const game = new Game({board: {size: 5}})

    for (let y = 0; y < 5; y++) {
      game.addStone(1, y, BLACK)
      game.addStone(3, y, WHITE)
    }
    game.addStone(0, 2, WHITE)

    return game
  }

  it('starts from the stones on the board', () => {
    const game = createSplitBoard()
    const state = new GameScoreState(game)

    expect(state.states.get(1, 0)).toBe(BLACK)
    expect(state.states.get(3, 0)).toBe(WHITE)
  })

  it('marks a stone dead and claims its area', () => {
    const game = createSplitBoard()
    const state = new GameScoreState(game)

    state.markDead(0, 2)
    expect(state.states.get(0, 2)).toBe(scoreStates.BLACK_CANDIDATE)
  })

  it('does not leak past the wall of live stones', () => {
    const game = createSplitBoard()
    const state = new GameScoreState(game)

    state.markDead(0, 2)
    expect(state.states.get(3, 2)).toBe(WHITE)
  })

  it('toggles a dead stone back to alive', () => {
    const game = createSplitBoard()
    const state = new GameScoreState(game)

    state.toggle(0, 2)
    expect(state.states.get(0, 2)).toBe(scoreStates.BLACK_CANDIDATE)

    state.toggle(0, 2)
    expect(state.states.get(0, 2)).toBe(WHITE)
  })

  it('settles into a stable grid', () => {
    const game = createSplitBoard()
    const state = new GameScoreState(game)
    state.markDead(0, 2)

    const grid = state.determineStatesGrid()
    expect(grid.get(0, 0)).toBe(scoreStates.BLACK_CANDIDATE)
    expect(grid.get(4, 0)).toBe(scoreStates.WHITE_CANDIDATE)
  })
})
