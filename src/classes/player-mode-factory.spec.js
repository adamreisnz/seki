import {describe, it, expect} from 'vitest'
import Player from './player.js'
import PlayerModeFactory from './player-mode-factory.js'
import PlayerMode from './modes/player-mode.js'
import {playerModes} from '../constants/player.js'

describe('PlayerModeFactory', () => {

  const player = new Player()

  it('builds a handler for each mode, tagged with that mode', () => {
    for (const mode of Object.values(playerModes)) {
      const handler = PlayerModeFactory.create(mode, player)
      expect(handler).toBeInstanceOf(PlayerMode)
      expect(handler.mode).toBe(mode)
    }
  })

  it('rejects an unknown mode', () => {
    expect(() => PlayerModeFactory.create('nonsense', player))
      .toThrow('Unrecognized player mode')
  })

  it('initialises the handler it builds', () => {
    const handler = PlayerModeFactory.create(playerModes.REPLAY, player)
    expect(handler.eventListenersMap).toBeDefined()
    expect(handler.bound).toBeDefined()
  })
})
