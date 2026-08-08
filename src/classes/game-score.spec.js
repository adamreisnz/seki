import {describe, it, expect} from 'vitest'
import GameScore, {GameColorScore} from './game-score.js'
import {stoneColors} from '../constants/stone.js'
import {scoringMethods} from '../constants/score.js'

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
  })

  it('reports a tie as a draw', () => {
    const score = new GameScore()
    score.setCaptures(BLACK, 10)
    score.setCaptures(WHITE, 10)
    expect(score.getResult(TERRITORY)).toBe('D')
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

describe('GameScore komi', () => {

  it('awards regular komi to white', () => {
    const score = new GameScore()
    score.setKomi(6.5)
    expect(score.getTotal(stoneColors.WHITE, scoringMethods.TERRITORY)).toBe(6.5)
    expect(score.getTotal(stoneColors.BLACK, scoringMethods.TERRITORY)).toBe(0)
  })

  it('awards reverse komi to black as points in their favour', () => {
    const score = new GameScore()
    score.setKomi(-5.5)
    expect(score.getTotal(stoneColors.BLACK, scoringMethods.TERRITORY)).toBe(5.5)
    expect(score.getResult(scoringMethods.TERRITORY)).toBe('B+5.5')
  })
})
