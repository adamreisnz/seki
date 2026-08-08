import {describe, it, expect, vi} from 'vitest'
import PlayerMode from './player-mode.js'
import Player from '../player.js'
import {playerModes, playerActions} from '../../constants/player.js'

/**
 * A mode that records the events it was handed
 */
class TestMode extends PlayerMode {

  mode = 'test'
  seen = []

  constructor(player) {
    super(player)
    this.createBoundListeners({
      pathChange: 'onPathChange',
      modeChange: 'onPathChange',
    })
  }

  onPathChange(event) {
    this.seen.push(event.type)
  }
}

const createMode = () => {
  const player = new Player()
  return {player, mode: new TestMode(player)}
}

describe('PlayerMode shortcuts', () => {

  it('reads the game and board off the player', () => {
    const {player, mode} = createMode()
    expect(mode.game).toBe(player.game)
    expect(mode.board).toBe(player.board)
  })

  it('follows the player when the game is replaced', () => {
    const {player, mode} = createMode()
    player.newGame()
    expect(mode.game).toBe(player.game)
  })

  it('knows whether it is the active mode', () => {
    const {player, mode} = createMode()
    expect(mode.isActive).toBe(false)

    player.activeMode = 'test'
    expect(mode.isActive).toBe(true)
  })
})

describe('PlayerMode event listeners', () => {

  it('hears nothing before it is activated', () => {
    const {player, mode} = createMode()
    player.triggerEvent('pathChange', {})
    expect(mode.seen).toEqual([])
  })

  it('hears the events in its map once activated', () => {
    const {player, mode} = createMode()
    mode.activate()

    player.triggerEvent('pathChange', {})
    player.triggerEvent('modeChange', {})

    expect(mode.seen).toEqual(['pathChange', 'modeChange'])
  })

  it('stops hearing them once deactivated', () => {
    const {player, mode} = createMode()
    mode.activate()
    mode.deactivate()

    player.triggerEvent('pathChange', {})
    expect(mode.seen).toEqual([])
  })

  it('stops hearing them once torn down', () => {
    const {player, mode} = createMode()
    mode.activate()
    mode.teardown()

    player.triggerEvent('pathChange', {})
    expect(mode.seen).toEqual([])
  })

  it('registers one listener per event, not per activation', () => {
    const {player, mode} = createMode()
    mode.activate()
    mode.deactivate()
    mode.activate()

    player.triggerEvent('pathChange', {})
    expect(mode.seen).toEqual(['pathChange'])
  })

  it('copes with a mode that has no listeners at all', () => {
    const player = new Player()
    const mode = new PlayerMode(player)

    expect(() => mode.activate()).not.toThrow()
    expect(() => mode.deactivate()).not.toThrow()
    expect(() => mode.teardown()).not.toThrow()
  })
})

describe('PlayerMode.processAction()', () => {

  const createActiveMode = () => {
    const player = new Player()
    const mode = new PlayerMode(player)
    return {player, mode}
  }

  it('reports an action it does not know', () => {
    const {mode} = createActiveMode()
    expect(mode.processAction('somethingElse')).toBe(false)
  })

  it('switches the player mode', () => {
    const {player, mode} = createActiveMode()
    expect(mode.processAction(playerActions.SET_MODE_EDIT)).toBe(true)
    expect(player.getActiveMode()).toBe(playerModes.EDIT)
  })

  it('navigates the game', () => {
    const {player, mode} = createActiveMode()
    player.game.playMove(3, 3)
    player.game.playMove(15, 15)
    player.goToFirstPosition()

    expect(mode.processAction(playerActions.GO_TO_NEXT_POSITION)).toBe(true)
    expect(player.game.getCurrentMoveNumber()).toBe(1)

    expect(mode.processAction(playerActions.GO_TO_LAST_POSITION)).toBe(true)
    expect(player.game.getCurrentMoveNumber()).toBe(2)

    expect(mode.processAction(playerActions.GO_TO_FIRST_POSITION)).toBe(true)
    expect(player.game.getCurrentMoveNumber()).toBe(0)
  })

  it('toggles board config', () => {
    const {player, mode} = createActiveMode()
    const before = player.getConfig('showCoordinates')

    mode.processAction(playerActions.TOGGLE_COORDINATES)
    expect(player.getConfig('showCoordinates')).toBe(!before)
  })

  it('prevents the default on the native event', () => {
    const {mode} = createActiveMode()
    const preventDefault = vi.fn()

    mode.processAction('somethingElse', {detail: {nativeEvent: {preventDefault}}})
    expect(preventDefault).toHaveBeenCalled()
  })
})

describe('PlayerMode.hasValidCoordinates()', () => {

  it('rejects an event with nothing in it', () => {
    const {mode} = createMode()
    expect(mode.hasValidCoordinates()).toBe(false)
    expect(mode.hasValidCoordinates({})).toBe(false)
  })

  it('accepts coordinates on the board', () => {
    const {mode} = createMode()
    expect(mode.hasValidCoordinates({detail: {x: 3, y: 3}})).toBe(true)
  })

  it('rejects coordinates off the board', () => {
    const {mode} = createMode()
    expect(mode.hasValidCoordinates({detail: {x: -1, y: 3}})).toBe(false)
    expect(mode.hasValidCoordinates({detail: {x: 19, y: 3}})).toBe(false)
  })
})
