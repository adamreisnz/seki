import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest'
import Player from './player.js'
import {defaultPlayerConfig} from '../constants/defaults.js'
import {playerModes} from '../constants/player.js'

describe('player config', () => {

  it('lets availableModes be narrowed', () => {
    const player = new Player({
      availableModes: [playerModes.REPLAY, playerModes.EDIT],
    })

    expect(player.getConfig('availableModes')).toEqual([
      playerModes.REPLAY, playerModes.EDIT,
    ])
  })

  it('actually restricts which modes can be activated', () => {
    const player = new Player({
      availableModes: [playerModes.REPLAY],
    })

    expect(player.isModeAvailable(playerModes.REPLAY)).toBe(true)
    expect(player.isModeAvailable(playerModes.EDIT)).toBe(false)

    player.setMode(playerModes.EDIT)
    expect(player.getActiveMode()).toBe(playerModes.REPLAY)
  })

  it('always allows static mode regardless of config', () => {
    const player = new Player({availableModes: [playerModes.REPLAY]})
    expect(player.isModeAvailable(playerModes.STATIC)).toBe(true)
  })

  it('lets mouse bindings be replaced rather than appended to', () => {
    const mouseBindings = [{mouseEvent: 'wheelup', action: 'goToNextPosition'}]
    const player = new Player({mouseBindings})

    expect(player.getConfig('mouseBindings')).toEqual(mouseBindings)
  })

  it('keeps the defaults when nothing is overridden', () => {
    const player = new Player()
    expect(player.getConfig('availableModes'))
      .toEqual(defaultPlayerConfig.availableModes)
    expect(player.getConfig('mouseBindings'))
      .toEqual(defaultPlayerConfig.mouseBindings)
  })

  it('does not mutate the shared default config object', () => {
    const before = [...defaultPlayerConfig.availableModes]
    new Player({availableModes: [playerModes.REPLAY]})
    expect(defaultPlayerConfig.availableModes).toEqual(before)
  })
})

describe('Player teardown', () => {

  let player

  beforeEach(() => {
    vi.useFakeTimers()
    player = new Player()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('cancels pending capture sound timeouts', () => {
    player.playCaptureSounds(5)
    expect(vi.getTimerCount()).toBe(5)

    player.teardown()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('caps the number of capture sounds', () => {
    player.playCaptureSounds(100)
    expect(vi.getTimerCount()).toBe(10)
  })

  it('tears down every mode handler, not just the active one', () => {
    const spies = Object
      .values(player.modeHandlers)
      .map(handler => vi.spyOn(handler, 'teardown'))

    player.teardown()

    expect(spies).not.toHaveLength(0)
    for (const spy of spies) {
      expect(spy).toHaveBeenCalled()
    }
  })

  it('destroys the board', () => {
    const spy = vi.spyOn(player.board, 'destroy')
    player.teardown()
    expect(spy).toHaveBeenCalled()
  })

  it('stops emitting events once torn down', () => {
    const listener = vi.fn()
    player.on('pathChange', listener)
    player.teardown()
    player.triggerEvent('pathChange', {})
    expect(listener).not.toHaveBeenCalled()
  })

  it('leaves no timers behind after teardown', () => {
    player.playCaptureSounds(3)
    player.teardown()
    expect(vi.getTimerCount()).toBe(0)
  })
})
