import {describe, it, expect} from 'vitest'
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
