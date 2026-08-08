import {describe, it, expect} from 'vitest'
import Game from '../src/classes/game.js'
import GameScore, {GameColorScore} from '../src/classes/game-score.js'
import GameScoreState from '../src/classes/game-score-state.js'
import GameScoreEstimator from '../src/classes/game-score-estimator.js'
import {stoneColors} from '../src/constants/stone.js'
import {scoringMethods, scoreStates} from '../src/constants/score.js'

const {BLACK, WHITE} = stoneColors
const {AREA, TERRITORY} = scoringMethods

describe('GameColorScore', () => {

  it('counts stones, territory and komi under area scoring', () => {
    const score = new GameColorScore(BLACK)
    score.stones = 30
    score.territory = 12
    score.captures = 5
    score.komi = 0

    expect(score.getTotal(AREA)).toBe(42)
  })

  it('counts territory, captures and komi under territory scoring', () => {
    const score = new GameColorScore(WHITE)
    score.stones = 30
    score.territory = 12
    score.captures = 5
    score.komi = 6.5

    expect(score.getTotal(TERRITORY)).toBe(23.5)
  })

  it('has no total for an unknown method', () => {
    expect(new GameColorScore(BLACK).getTotal('nonsense')).toBeUndefined()
  })
})

describe('GameScore', () => {

  it('starts both colors at zero', () => {
    const score = new GameScore()
    expect(score.getTotal(BLACK, TERRITORY)).toBe(0)
    expect(score.getTotal(WHITE, TERRITORY)).toBe(0)
  })

  it('accumulates stones, territory and captures', () => {
    const score = new GameScore()
    score.addStone(BLACK)
    score.addStone(BLACK)
    score.addTerritory(BLACK)
    score.addCapture(BLACK)

    expect(score.getTotal(BLACK, AREA)).toBe(3)
    expect(score.getTotal(BLACK, TERRITORY)).toBe(2)
  })

  it('sets captures in bulk', () => {
    const score = new GameScore()
    score.setCaptures(BLACK, 7)
    expect(score.getTotal(BLACK, TERRITORY)).toBe(7)
  })

  it('names the winner', () => {
    const score = new GameScore()
    score.setCaptures(BLACK, 10)
    expect(score.getWinningColor(TERRITORY)).toBe(BLACK)

    score.setCaptures(WHITE, 20)
    expect(score.getWinningColor(TERRITORY)).toBe(WHITE)
  })

  it('has no winner on a tie', () => {
    const score = new GameScore()
    expect(score.getWinningColor(TERRITORY)).toBeUndefined()
    expect(score.getResult(TERRITORY)).toBe('?')
  })

  it('formats the result with the margin', () => {
    const score = new GameScore()
    score.setCaptures(BLACK, 10)
    score.setKomi(6.5)

    expect(score.getResult(TERRITORY)).toBe('B+3.5')
  })

  it('resets back to zero', () => {
    const score = new GameScore()
    score.addStone(BLACK)
    score.reset()
    expect(score.getTotal(BLACK, AREA)).toBe(0)
  })
})

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

describe('GameScoreEstimator', () => {

  const createSplitBoard = () => {
    const game = new Game({board: {size: 5}})
    for (let y = 0; y < 5; y++) {
      game.addStone(1, y, BLACK)
      game.addStone(3, y, WHITE)
    }
    return game
  }

  it('turns a score state into territory and stones', () => {
    const game = createSplitBoard()
    const estimator = new GameScoreEstimator(game)
    estimator.useGameScoreState(new GameScoreState(game))

    const {score, territory, stones} = estimator.estimate()

    //Column 0 is black's, column 4 is white's
    expect(territory.get(0, 0)).toMatchObject({color: BLACK})
    expect(territory.get(4, 0)).toMatchObject({color: WHITE})
    expect(stones.get(1, 0)).toMatchObject({color: BLACK})
    expect(score.getTotal(BLACK, AREA)).toBe(10)
    expect(score.getTotal(WHITE, AREA)).toBe(10)
  })

  it('reads a probability map', () => {
    const game = new Game({board: {size: 3}})
    game.addStone(0, 0, BLACK)

    const estimator = new GameScoreEstimator(game)

    //Rows of the map are indexed by y, columns by x
    estimator.useProbabilityMap([
      [1, 1, 0],
      [0, 0, 0],
      [0, -1, -1],
    ])

    const {territory, stones} = estimator.estimate()
    expect(stones.get(0, 0)).toMatchObject({color: BLACK})
    expect(territory.get(1, 0)).toMatchObject({color: BLACK})
    expect(territory.get(1, 2)).toMatchObject({color: WHITE})
    expect(territory.get(2, 1)).toBeUndefined()
  })

  it('ignores anything under the threshold', () => {
    const game = new Game({board: {size: 2}})
    const estimator = new GameScoreEstimator(game)

    estimator.useProbabilityMap([[0.1, 0.1], [0.1, 0.1]], 0.5)
    expect(estimator.estimate().territory.isEmpty()).toBe(true)
  })

  it('counts a stone sitting in enemy territory as a capture', () => {
    const game = new Game({board: {size: 3}})
    game.addStone(0, 0, WHITE)

    const estimator = new GameScoreEstimator(game)
    estimator.useProbabilityMap([
      [1, 1, 1],
      [1, 1, 1],
      [1, 1, 1],
    ])

    const {captures} = estimator.estimate()
    expect(captures.get(0, 0)).toMatchObject({color: WHITE})
  })
})
