import {describe, it, expect, vi} from 'vitest'
import Player from '../player.js'
import Game from '../game.js'
import {playerModes} from '../../constants/player.js'
import {stoneColors} from '../../constants/stone.js'

const {BLACK} = stoneColors

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
