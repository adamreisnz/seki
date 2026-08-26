import {describe, it, expect, vi} from 'vitest'
import Player from '../player.js'
import Game from '../game.js'
import {boardLayerTypes} from '../../constants/board.js'
import {markupTypes} from '../../constants/markup.js'
import {playerModes} from '../../constants/player.js'
import {scoringMethods} from '../../constants/score.js'
import {stoneColors} from '../../constants/stone.js'

const {BLACK, WHITE} = stoneColors
const {AREA} = scoringMethods

/**
 * A player in score mode, on a game with a couple of moves to navigate
 */
const createScoringPlayer = () => {

  const player = new Player()
  const game = new Game({board: {size: 9}})

  game.playMove(2, 2)
  game.playMove(6, 6)

  //Loading rewinds to the first position, so play forward again to get the
  //stones back on the board before scoring starts
  player.board.createLayers()
  player.loadGame(game)
  player.goToLastPosition()
  player.setMode(playerModes.SCORE)

  return {player, game, score: player.getModeHandler(playerModes.SCORE)}
}

describe('Score mode state', () => {

  it('builds a score state on activation', () => {
    const {score} = createScoringPlayer()
    expect(score.scoreState).toBeDefined()
  })

  it('starts from the stones in the current position', () => {
    const {score} = createScoringPlayer()
    expect(score.scoreState.states.get(2, 2)).toBe(BLACK)
  })

  it('rebuilds the state when the position changes', () => {

    //NOTE: the state used to be built once on activation and never again, so
    //navigating left it describing a position that was no longer on the board
    const {player, score} = createScoringPlayer()
    const before = score.scoreState

    player.goToPreviousPosition()

    expect(score.scoreState).not.toBe(before)
    expect(score.scoreState.states.get(6, 6)).toBeUndefined()
  })

  it('clears any displayed score when the position changes', () => {
    const {player, score} = createScoringPlayer()
    const spy = vi.spyOn(score, 'clearScore')

    player.goToPreviousPosition()
    expect(spy).toHaveBeenCalled()
  })

  it('stops rebuilding once the mode is left', () => {
    const {player, score} = createScoringPlayer()
    player.setMode(playerModes.REPLAY)

    const after = score.scoreState
    player.goToPreviousPosition()
    expect(score.scoreState).toBe(after)
  })
})

describe('Score mode activation', () => {

  it('takes the record markup off the board while scoring', () => {

    //Territory and dead stone marks are what the board says during scoring,
    //so the record's own markup would only compete with them
    const {player} = createScoringPlayer()
    const board = player.board

    board.add(boardLayerTypes.MARKUP, 1, 1, {type: markupTypes.TRIANGLE})
    player.setMode(playerModes.REPLAY)
    player.setMode(playerModes.SCORE)

    expect(board.has(boardLayerTypes.MARKUP, 1, 1)).toBe(false)
  })

  it('clears the score on the way out', () => {
    const {player, score} = createScoringPlayer()
    score.calculateScore()

    player.setMode(playerModes.REPLAY)

    expect(player.board.getLayer(boardLayerTypes.SCORE).territory).toBeNull()
  })

  it('says the score is gone on the way out', () => {
    const {player} = createScoringPlayer()
    const listener = vi.fn()
    player.on('score', listener)

    player.setMode(playerModes.REPLAY)

    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener.mock.calls[0][0].detail).toBeNull()
  })
})

describe('Score mode dead stones', () => {

  it('marks a stone dead and takes its point for the other player', () => {
    const {player, score} = createScoringPlayer()

    score.toggleDeadStone(2, 2)
    const {score: result} = score.calculateScore()

    expect(result.getTotal(WHITE, AREA)).toBeGreaterThan(0)
  })

  it('brings it back to life when toggled again', () => {
    const {score} = createScoringPlayer()

    score.toggleDeadStone(2, 2)
    const dead = score.calculateScore().score.getTotal(BLACK, AREA)
    score.toggleDeadStone(2, 2)
    const alive = score.calculateScore().score.getTotal(BLACK, AREA)

    expect(alive).toBeGreaterThan(dead)
  })

  it('takes a list of dead stones as objects', () => {
    const {score} = createScoringPlayer()

    score.setDeadStones([{x: 2, y: 2}])
    const {captures} = score.calculateScore()

    expect(captures.has(2, 2)).toBe(true)
  })

  it('takes a list of dead stones as coordinate pairs', () => {

    //Sabaki's deadstones library reports them as [x, y] pairs, so both
    //shapes have to be accepted
    const {score} = createScoringPlayer()

    score.setDeadStones([[2, 2]])
    const {captures} = score.calculateScore()

    expect(captures.has(2, 2)).toBe(true)
  })

  it('takes them through calculateScore as well', () => {
    const {score} = createScoringPlayer()
    const {captures} = score.calculateScore([{x: 2, y: 2}])

    expect(captures.has(2, 2)).toBe(true)
  })

  it('reaches the mode through the player', () => {
    const {player} = createScoringPlayer()

    player.toggleDeadStone(2, 2)
    const {captures} = player.calculateScore()

    expect(captures.has(2, 2)).toBe(true)
  })
})

describe('Score mode clicks', () => {

  it('marks the stone that was clicked dead and rescores', () => {
    const {player, score} = createScoringPlayer()
    const listener = vi.fn()
    player.on('score', listener)

    score.onClick({detail: {x: 2, y: 2}})

    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener.mock.calls[0][0].detail.captures.has(2, 2)).toBe(true)
  })

  it('ignores a click that landed off the board', () => {
    const {player, score} = createScoringPlayer()
    const listener = vi.fn()
    player.on('score', listener)

    score.onClick({detail: {x: -1, y: -1}})

    expect(listener).not.toHaveBeenCalled()
  })
})

describe('Score mode display', () => {

  it('puts the territory and captures onto the score layer', () => {
    const {player, score} = createScoringPlayer()
    score.calculateScore([{x: 2, y: 2}])

    const layer = player.board.getLayer(boardLayerTypes.SCORE)
    expect(layer.territory).toBeTruthy()
    expect(layer.captures.has(2, 2)).toBe(true)
  })

  it('takes the record markup off when it shows a score', () => {
    const {player, score} = createScoringPlayer()
    player.board.add(boardLayerTypes.MARKUP, 1, 1, {type: markupTypes.TRIANGLE})

    score.calculateScore()

    expect(player.board.has(boardLayerTypes.MARKUP, 1, 1)).toBe(false)
  })

  it('lifts a dead stone off the board and puts it back when cleared', () => {
    const {player, score} = createScoringPlayer()

    score.calculateScore([{x: 2, y: 2}])
    expect(player.board.has(boardLayerTypes.STONES, 2, 2)).toBe(false)

    score.clearScore()
    expect(player.board.has(boardLayerTypes.STONES, 2, 2)).toBe(true)
  })
})

describe('Score mode estimating', () => {

  //A probability map as Sabaki's deadstones library reports one, indexed by
  //row and then column, running from -1 for certainly white to 1 for black
  const probabilityMap = (entries = []) => {
    const map = Array.from({length: 9}, () => new Array(9).fill(0))
    for (const [x, y, probability] of entries) {
      map[y][x] = probability
    }
    return map
  }

  it('reads a point as territory for whoever is likelier to hold it', () => {
    const {score} = createScoringPlayer()
    const {territory} = score.estimateScore(probabilityMap([
      [1, 1, 0.9],
      [7, 7, -0.9],
    ]))

    expect(territory.get(1, 1)).toEqual({color: BLACK, probability: 0.9})
    expect(territory.get(7, 7)).toEqual({color: WHITE, probability: -0.9})
  })

  it('ignores a point it is not sure enough about', () => {
    const {score} = createScoringPlayer()
    const {territory} = score.estimateScore(probabilityMap([[1, 1, 0.2]]))

    expect(territory.has(1, 1)).toBe(false)
  })

  it('takes the threshold it is given', () => {
    const {score} = createScoringPlayer()
    const {territory} = score.estimateScore(probabilityMap([[1, 1, 0.2]]), 0.1)

    expect(territory.has(1, 1)).toBe(true)
  })

  it('counts a stone standing where its own colour is likely', () => {
    const {score} = createScoringPlayer()
    const {stones, territory} = score.estimateScore(probabilityMap([
      [2, 2, 0.9],
    ]))

    expect(stones.get(2, 2)).toEqual({color: BLACK})
    expect(territory.has(2, 2)).toBe(false)
  })

  it('counts a stone standing where the other colour is likely as dead', () => {
    const {score} = createScoringPlayer()
    const {captures, territory} = score.estimateScore(probabilityMap([
      [2, 2, -0.9],
    ]))

    expect(captures.get(2, 2)).toEqual({color: BLACK})
    expect(territory.get(2, 2).color).toBe(WHITE)
  })

  it('says what it estimated', () => {
    const {player, score} = createScoringPlayer()
    const listener = vi.fn()
    player.on('score', listener)

    const result = score.estimateScore(probabilityMap([[1, 1, 0.9]]))

    expect(listener.mock.calls[0][0].detail).toBe(result)
  })

  it('reaches the mode through the player', () => {
    const {player} = createScoringPlayer()
    const {territory} = player.estimateScore(probabilityMap([[1, 1, 0.9]]))

    expect(territory.has(1, 1)).toBe(true)
  })
})
