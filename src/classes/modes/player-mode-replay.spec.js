import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest'
import Player from '../player.js'
import {playerModes} from '../../constants/player.js'

describe('Replay mode config listener', () => {

  let player
  let replay

  beforeEach(() => {
    vi.useFakeTimers()
    player = new Player()
    replay = player.getModeHandler(playerModes.REPLAY)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('re-queues auto play when the delay changes mid-play', () => {
    const spy = vi.spyOn(replay, 'queueNextAutoPlay')
    replay.isAutoPlaying = true

    player.setConfig('autoPlayDelay', 500)
    expect(spy).toHaveBeenCalled()
  })

  it('ignores the delay change when not auto playing', () => {
    const spy = vi.spyOn(replay, 'queueNextAutoPlay')
    replay.isAutoPlaying = false

    player.setConfig('autoPlayDelay', 500)
    expect(spy).not.toHaveBeenCalled()
  })

  it('stops responding to config changes once torn down', () => {
    const spy = vi.spyOn(replay, 'queueNextAutoPlay')
    replay.isAutoPlaying = true

    //The delay handling used to sit on a second listener registered outside
    //the event listeners map, which teardown had no way of removing
    player.teardown()
    replay.isAutoPlaying = true
    player.setConfig('autoPlayDelay', 750)

    expect(spy).not.toHaveBeenCalled()
  })

  it('clears the auto play timeout on teardown', () => {
    replay.isAutoPlaying = true
    replay.queueNextAutoPlay()
    expect(vi.getTimerCount()).toBeGreaterThan(0)

    replay.teardown()
    expect(vi.getTimerCount()).toBe(0)
  })
})
