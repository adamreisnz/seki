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

describe('Player method extension', () => {

  it('dispatches to the active mode that provides the method', () => {
    const player = new Player()
    const replay = player.getModeHandler(playerModes.REPLAY)

    player.setMode(playerModes.REPLAY)
    replay.toggleAutoPlay = vi.fn()
    player.toggleAutoPlay()

    expect(replay.toggleAutoPlay).toHaveBeenCalled()
  })

  it('does nothing when no mode providing the method is active', () => {
    const player = new Player()
    const replay = player.getModeHandler(playerModes.REPLAY)
    replay.toggleAutoPlay = vi.fn()

    player.setMode(playerModes.SCORE)
    player.toggleAutoPlay()

    expect(replay.toggleAutoPlay).not.toHaveBeenCalled()
  })

  it('lets a second mode provide the same method', () => {

    //NOTE: extend used to bail out on the second registration, leaving the
    //method bound to whichever mode asked for it first, so calling it while
    //the other mode was active did nothing
    const player = new Player()
    const replay = player.getModeHandler(playerModes.REPLAY)
    const edit = player.getModeHandler(playerModes.EDIT)

    player.extend('sharedThing', playerModes.REPLAY)
    player.extend('sharedThing', playerModes.EDIT)

    replay.sharedThing = vi.fn(() => 'from replay')
    edit.sharedThing = vi.fn(() => 'from edit')

    player.setMode(playerModes.REPLAY)
    expect(player.sharedThing()).toBe('from replay')

    player.setMode(playerModes.EDIT)
    expect(player.sharedThing()).toBe('from edit')
  })

  it('passes arguments and returns the result through', () => {
    const player = new Player()
    const edit = player.getModeHandler(playerModes.EDIT)

    player.setMode(playerModes.EDIT)
    edit.getEditTool = vi.fn(() => 'tool')

    expect(player.getEditTool()).toBe('tool')
  })

  it('refuses to shadow a method the player already has', () => {
    const player = new Player()
    const original = player.playMove

    player.extend('playMove', playerModes.EDIT)
    expect(player.playMove).toBe(original)
  })
})
