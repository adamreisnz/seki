import {describe, it, expect} from 'vitest'
import Game from './game.js'
import GameScoreState from './game-score-state.js'
import GameScoreEstimator from './game-score-estimator.js'
import {stoneColors} from '../constants/stone.js'
import {scoringMethods} from '../constants/score.js'

const {BLACK, WHITE} = stoneColors
const {AREA} = scoringMethods

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
