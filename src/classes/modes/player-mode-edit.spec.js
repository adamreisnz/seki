import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest'
import Player from '../player.js'
import {playerModes} from '../../constants/player.js'

describe('Edit mode teardown', () => {

  let player
  let edit

  beforeEach(() => {
    vi.useFakeTimers()
    player = new Player()
    edit = player.getModeHandler(playerModes.EDIT)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('flushes buffered free draw lines rather than dropping them', () => {
    const listener = vi.fn()
    player.on('edit', listener)

    edit.triggerAddLineEvent(0, 0, 1, 1, '#fff')
    expect(listener).not.toHaveBeenCalled()

    edit.teardown()
    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener.mock.calls[0][0].detail.action).toBe('addLines')
  })

  it('clears the buffer timeout', () => {
    edit.triggerAddLineEvent(0, 0, 1, 1, '#fff')
    expect(vi.getTimerCount()).toBe(1)

    edit.teardown()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('does nothing when there is nothing buffered', () => {
    expect(() => edit.teardown()).not.toThrow()
  })
})
