import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest'
import Player from './player.js'
import {boardLayerTypes} from '../constants/board.js'
import {stubDom} from '../../test/helpers.js'

/**
 * A bootstrapped player, with the DOM it needs stood in for
 */
const bootstrap = (config = {}) => {
  const dom = stubDom()
  const player = new Player({
    sounds: {move: 'move.mp3', capture: 'capture.mp3'},
    ...config,
  })
  player.bootstrap(dom.container)
  return {player, ...dom}
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('Player bootstrapping', () => {

  it('says when it is up', () => {
    const dom = stubDom()
    const player = new Player()
    const listener = vi.fn()
    player.on('bootstrapped', listener)

    player.bootstrap(dom.container)

    expect(player.isBootstrapped).toBe(true)
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('claims the container and makes it focusable', () => {

    //The container has to be able to take focus for the keyboard bindings to
    //reach it at all
    const {player, container} = bootstrap()

    expect(player.elements.container).toBe(container)
    expect(container.tabIndex).toBe(-1)
    expect(container.classList.contains('seki-board-container')).toBe(true)
  })

  it('builds the board elements inside it', () => {
    const {player, container} = bootstrap()
    const {wrapper, board, canvasses} = player.board.elements

    expect(container.children).toContain(wrapper)
    expect(wrapper.children).toContain(board)
    expect(Array.isArray(canvasses)).toBe(true)
    expect(canvasses.length).toBeGreaterThan(0)
  })

  it('gives every layer a context to draw on', () => {
    const {player} = bootstrap()

    for (const type of Object.values(boardLayerTypes)) {
      expect(player.board.getLayer(type).context).toBeTruthy()
    }
  })

  it('links the board back to the player', () => {
    const {player} = bootstrap()
    expect(player.board.player).toBe(player)
  })

  it('watches the container for size changes', () => {
    const {player, observers} = bootstrap()

    expect(observers).toHaveLength(1)
    expect(observers[0].observed).toEqual([player.elements.container])
  })

  it('shows the board once it has settled', () => {

    //Held back briefly so the board is not seen being laid out
    const {player} = bootstrap()
    const {board} = player.board.elements

    expect(board.style.visibility).toBeUndefined()
    vi.advanceTimersByTime(200)
    expect(board.style.visibility).toBe('visible')
  })
})

describe('Player audio', () => {

  it('creates an element for every sound configured', () => {
    const {player} = bootstrap()

    expect(Object.keys(player.audioElements)).toEqual(['move', 'capture'])
    expect(player.audioElements.move.src).toBe('move.mp3')
  })

  it('skips a sound that is configured to nothing', () => {
    const {player} = bootstrap({sounds: {move: 'move.mp3', capture: null}})

    expect(Object.keys(player.audioElements)).toEqual(['move'])
  })

  it('does not leave orphans behind when bootstrapped twice', () => {

    //Re-bootstrapping used to stack a second set of audio elements in the
    //container, which then all played at once
    const {player, container} = bootstrap()
    player.bootstrap(container)

    const audio = container.children.filter(el => el.tagName === 'AUDIO')
    expect(audio).toHaveLength(2)
  })

  it('plays a sound at the configured volume', async () => {
    const {player} = bootstrap({soundVolume: 0.25})

    await player.playSound('move')

    expect(player.audioElements.move.playCount).toBe(1)
    expect(player.audioElements.move.volume).toBe(0.25)
  })

  it('plays nothing when sounds are turned off', async () => {
    const {player} = bootstrap({playSounds: false})

    await player.playSound('move')

    expect(player.audioElements.move.playCount).toBe(0)
  })

  it('plays nothing for a sound it has no element for', async () => {
    const {player} = bootstrap()
    await expect(player.playSound('somethingElse')).resolves.toBeUndefined()
  })

  it('swallows a play the browser refused', async () => {

    //Browsers reject play() until the user has interacted with the page, and
    //a rejected promise here would surface as an unhandled rejection
    const {player} = bootstrap()
    player.audioElements.move.play = () => Promise.reject(new Error('blocked'))

    await expect(player.playSound('move')).resolves.toBeUndefined()
  })

  it('rewinds a sound when it is stopped', () => {
    const {player} = bootstrap()
    player.audioElements.move.currentTime = 5

    player.stopSound('move')

    expect(player.audioElements.move.paused).toBe(true)
    expect(player.audioElements.move.currentTime).toBe(0)
  })

  it('stops nothing for a sound it has no element for', () => {
    const {player} = bootstrap()
    expect(() => player.stopSound('somethingElse')).not.toThrow()
  })

  it('swallows a failure to rewind', () => {
    const {player} = bootstrap()
    player.audioElements.move.pause = () => {
      throw new Error('nope')
    }

    expect(() => player.stopSound('move')).not.toThrow()
  })
})

describe('Player capture sounds', () => {

  it('staggers one sound per stone taken', () => {
    const {player} = bootstrap()

    player.playCaptureSounds(3)
    vi.advanceTimersByTime(2000)

    expect(player.audioElements.capture.playCount).toBe(3)
  })

  it('stops at ten, however many were taken', () => {

    //A big capture would otherwise be a burst of noise rather than a sound
    const {player} = bootstrap()

    player.playCaptureSounds(50)
    vi.advanceTimersByTime(5000)

    expect(player.audioElements.capture.playCount).toBe(10)
  })

  it('cancels the pending ones on teardown', () => {

    //Otherwise they fire against a player that is no longer on the page
    const {player} = bootstrap()
    player.playCaptureSounds(5)

    player.teardown()
    vi.advanceTimersByTime(5000)

    expect(player.audioElements.capture).toBeUndefined()
  })
})

//Fire one of the listeners the player put on the document
const fireOnDocument = (player, type, event) =>
  player.documentEventHandler.handlers.get(type)(event)

describe('Player listeners', () => {

  it('follows a drag from the document, not from the board', () => {

    //The mouse can leave the board mid drag, so what says whether a drag is
    //in progress has to be watched on the document rather than on the board
    const {player} = bootstrap()
    const fire = (type, event) => fireOnDocument(player, type, event)

    expect(player.isDragging).toBe(false)

    fire('mousedown', {button: 0})
    fire('mousemove', {button: 0})
    expect(player.isDragging).toBe(true)

    fire('mouseup', {button: 0})
    expect(player.isDragging).toBe(false)
  })

  it('ignores a drag with any other mouse button', () => {
    const {player} = bootstrap()
    const fire = (type, event) => fireOnDocument(player, type, event)

    fire('mousedown', {button: 2})
    fire('mousemove', {button: 2})

    expect(player.isDragging).toBe(false)
  })

  it('ends a drag on the click that closes it', () => {
    const {player} = bootstrap()
    const fire = (type, event) => fireOnDocument(player, type, event)

    fire('mousedown', {button: 0})
    fire('mousemove', {button: 0})
    fire('click', {button: 0})

    expect(player.isDragging).toBe(false)
    expect(player.isMouseDown).toBe(false)
  })

  it('propagates document key presses to the modes', () => {
    const {player} = bootstrap()
    const listener = vi.fn()
    player.on('keydown', listener)

    fireOnDocument(player, 'keydown', {key: 'ArrowRight'})

    expect(listener.mock.calls[0][0].detail.nativeEvent.key).toBe('ArrowRight')
  })

  it('propagates the board events the modes listen for', () => {
    const {player} = bootstrap()
    const listener = vi.fn()
    player.on('click', listener)

    player.board.elements.board.dispatch('click', {
      button: 0,
      offsetX: 100,
      offsetY: 100,
      preventDefault: vi.fn(),
    })

    expect(listener).toHaveBeenCalled()
  })

  it('stops the browser acting on them itself', () => {
    const {player} = bootstrap()
    const preventDefault = vi.fn()

    player.board.elements.board.dispatch('wheel', {
      button: 0, deltaY: 1, preventDefault,
    })

    expect(preventDefault).toHaveBeenCalled()
  })

  it('leaves the element alone when told not to attach any', () => {
    const dom = stubDom()
    const player = new Player({applyElementListeners: false})
    player.bootstrap(dom.container)

    expect(player.elementEventHandler).toBeUndefined()
  })

  it('leaves the document alone when told not to attach any', () => {
    const dom = stubDom()
    const player = new Player({applyDocumentListeners: false})
    player.bootstrap(dom.container)

    expect(player.documentEventHandler).toBeUndefined()
  })

  it('does not stack listeners when bootstrapped twice', () => {
    const {player, container} = bootstrap()
    const listener = vi.fn()
    player.on('click', listener)

    player.bootstrap(container)
    player.board.elements.board.dispatch('click', {
      button: 0, offsetX: 100, offsetY: 100, preventDefault: vi.fn(),
    })

    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('stops listening once torn down', () => {
    const {player} = bootstrap()
    const boardElement = player.board.elements.board
    const listener = vi.fn()
    player.on('click', listener)

    player.teardown()
    boardElement.dispatch('click', {
      button: 0, offsetX: 100, offsetY: 100, preventDefault: vi.fn(),
    })

    expect(listener).not.toHaveBeenCalled()
  })
})

describe('Player teardown', () => {

  it('flags itself as no longer up', () => {
    const {player} = bootstrap()
    player.teardown()

    expect(player.isTornDown).toBe(true)
    expect(player.isBootstrapped).toBe(false)
  })

  it('disconnects the board size observer', () => {
    const {player, observers} = bootstrap()
    player.teardown()

    expect(observers[0].disconnected).toBe(true)
  })

  it('takes the audio elements out of the container', () => {
    const {player, container} = bootstrap()
    player.teardown()

    expect(container.children.filter(el => el.tagName === 'AUDIO'))
      .toHaveLength(0)
  })

  it('raises no events afterwards', () => {
    const {player} = bootstrap()
    const listener = vi.fn()
    player.on('pathChange', listener)

    player.teardown()
    player.triggerEvent('pathChange', {})

    expect(listener).not.toHaveBeenCalled()
  })
})
