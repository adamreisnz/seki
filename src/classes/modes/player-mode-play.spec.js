import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest'
import Player from '../player.js'
import {playerModes, playerActions} from '../../constants/player.js'
import {stoneColors} from '../../constants/stone.js'

const {BLACK, WHITE} = stoneColors

//Turning a click into a grid coordinate reads the device pixel ratio off the
//window, which isn't there outside a browser
beforeEach(() => {
  vi.stubGlobal('window', {devicePixelRatio: 1})
})

afterEach(() => {
  vi.unstubAllGlobals()
})

/**
 * A player in play mode, on a board with a known draw size so that a click at
 * a pixel position lands on a known intersection
 */
const createPlayer = () => {
  const player = new Player({board: {showCoordinates: false}})
  player.board.setDrawSize(600, 600)
  const mode = player.getModeHandler(playerModes.PLAY)
  player.setMode(playerModes.PLAY)
  return {player, mode}
}

/**
 * Click the pixel position that the given intersection sits at
 */
const clickAt = (player, x, y) => {
  const {board} = player
  player.triggerEvent('click', {
    nativeEvent: {
      offsetX: board.getAbsX(x),
      offsetY: board.getAbsY(y),
      preventDefault: vi.fn(),
    },
  })
}

describe('Play mode clicks', () => {

  it('plays a move where the board was clicked', () => {
    const {player} = createPlayer()
    clickAt(player, 3, 3)

    expect(player.game.hasStone(3, 3, BLACK)).toBe(true)
    expect(player.game.getCurrentMoveNumber()).toBe(1)
  })

  it('alternates colour move by move', () => {
    const {player} = createPlayer()
    clickAt(player, 3, 3)
    clickAt(player, 15, 15)

    expect(player.game.hasStone(15, 15, WHITE)).toBe(true)
  })

  it('ignores a click off the board', () => {
    const {player} = createPlayer()
    clickAt(player, -2, 3)
    expect(player.game.getCurrentMoveNumber()).toBe(0)
  })

  it('ignores a click on an occupied point', () => {
    const {player} = createPlayer()
    clickAt(player, 3, 3)
    clickAt(player, 3, 3)

    expect(player.game.getCurrentMoveNumber()).toBe(1)
  })
})

describe('Play mode listeners', () => {

  it('listens for everything replay mode does, plus its own', () => {

    //NOTE: this used to list only its own three, which left a game being
    //played with markers that were rendered once on activation and never
    //again, and with no keyboard binding doing anything at all
    const {player, mode} = createPlayer()
    const replay = player.getModeHandler(playerModes.REPLAY)

    for (const event of Object.keys(replay.eventListenersMap)) {
      expect(Object.keys(mode.eventListenersMap)).toContain(event)
    }
    expect(Object.keys(mode.eventListenersMap)).toContain('gridEnter')
    expect(Object.keys(mode.eventListenersMap)).toContain('gridLeave')
  })

  it('renders the markers again after every move', () => {
    const {player, mode} = createPlayer()
    const spy = vi.spyOn(mode, 'renderMarkers')

    clickAt(player, 3, 3)
    clickAt(player, 15, 15)

    expect(spy).toHaveBeenCalledTimes(2)
  })

  it('renders the markers when navigating', () => {
    const {player, mode} = createPlayer()
    clickAt(player, 3, 3)

    const spy = vi.spyOn(mode, 'renderMarkers')
    player.goToPreviousPosition()

    expect(spy).toHaveBeenCalled()
  })

  it('acts on a keyboard binding', () => {
    const {player} = createPlayer()
    player.setConfig('keyBindings', [
      {key: 'ArrowLeft', action: playerActions.GO_TO_PREV_POSITION},
    ])
    clickAt(player, 3, 3)
    clickAt(player, 15, 15)

    player.triggerEvent('keydown', {
      nativeEvent: {
        key: 'ArrowLeft',
        ctrlKey: false,
        shiftKey: false,
        altKey: false,
        metaKey: false,
        preventDefault: vi.fn(),
      },
    })

    expect(player.game.getCurrentMoveNumber()).toBe(1)
  })

  it('stops listening when another mode takes over', () => {
    const {player, mode} = createPlayer()
    const spy = vi.spyOn(mode, 'onClick')

    player.setMode(playerModes.REPLAY)
    clickAt(player, 3, 3)

    expect(spy).not.toHaveBeenCalled()
  })
})

describe('Play mode actions', () => {

  it('handles the shared navigation actions', () => {
    const {player, mode} = createPlayer()
    clickAt(player, 3, 3)
    clickAt(player, 15, 15)

    expect(mode.processAction(playerActions.GO_TO_FIRST_POSITION)).toBe(true)
    expect(player.game.getCurrentMoveNumber()).toBe(0)
  })

  it('switches away to another mode', () => {
    const {player, mode} = createPlayer()
    mode.processAction(playerActions.SET_MODE_REPLAY)
    expect(player.getActiveMode()).toBe(playerModes.REPLAY)
  })
})
