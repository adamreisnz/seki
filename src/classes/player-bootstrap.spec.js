import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest'
import Player from './player.js'
import {boardLayerTypes} from '../constants/board.js'
import {playerModes, editTools} from '../constants/player.js'
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

  it('lets go of the element it was listening to when bootstrapped twice', () => {

    //Bootstrapping builds a fresh board element, so the listeners on the old
    //one have to come off or they outlive the element they were put there
    //for. Asserting on the new element alone would pass either way.
    const {player, container} = bootstrap()
    const first = player.board.elements.board
    const listener = vi.fn()
    player.on('click', listener)

    player.bootstrap(container)
    const second = player.board.elements.board
    expect(second).not.toBe(first)

    first.dispatch('click', {
      button: 0, offsetX: 100, offsetY: 100, preventDefault: vi.fn(),
    })
    expect(listener).not.toHaveBeenCalled()

    second.dispatch('click', {
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

describe('Player re-bootstrapping', () => {

  //A record with two moves on it, so that there is something to put back on
  //the board and somewhere to navigate to
  const sgf = '(;GM[1]FF[4]SZ[9];B[cc];W[gg])'

  /**
   * A player torn down and bootstrapped again onto the same container
   *
   * The container is given a size, as the position is only drawn onto layers
   * that have a cell size to draw at.
   */
  const rebootstrap = (config = {}, data = sgf) => {
    const dom = stubDom()
    Object.assign(dom.container, {clientWidth: 600, clientHeight: 600})
    const player = new Player(config)
    player.bootstrap(dom.container)
    player.loadData(data)
    player.board.setDrawSize(600, 600)
    return {player, ...dom}
  }

  const stoneAt = (player, x, y) => player.board
    .getLayer(boardLayerTypes.STONES)
    .grid
    .get(x, y)

  const clickAt = (player, x, y) => player.board.elements.board.dispatch(
    'click',
    {
      button: 0,
      offsetX: player.board.getAbsX(x),
      offsetY: player.board.getAbsY(y),
      preventDefault: vi.fn(),
    }
  )

  it('finds its voice again', () => {

    //Being torn down silences every event the player raises, and nothing
    //used to lift that again, so a player bootstrapped a second time came up
    //permanently mute
    const {player, container} = rebootstrap()
    player.teardown()

    const listener = vi.fn()
    player.on('bootstrapped', listener)
    player.bootstrap(container)

    expect(player.isTornDown).toBe(false)
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('raises path change events again', () => {
    const {player, container} = rebootstrap()
    player.teardown()
    player.bootstrap(container)

    const listener = vi.fn()
    player.on('pathChange', listener)
    player.goToNextPosition()

    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('puts the position back on the board', () => {

    //Tearing down destroys the board, which clears its layers, so the ones
    //built by the second bootstrap start out empty and have to be filled
    const {player, container} = rebootstrap()
    player.goToLastPosition()
    expect(stoneAt(player, 2, 2)).toBeTruthy()

    player.teardown()
    player.bootstrap(container)

    expect(stoneAt(player, 2, 2)).toBeTruthy()
    expect(stoneAt(player, 6, 6)).toBeTruthy()
  })

  it('lets the active mode hear events again', () => {

    //Teardown deactivates the mode, taking its listeners off the player.
    //Setting the mode again is no way back, as that is a no-op for the mode
    //that is already the active one
    const {player, container} = rebootstrap({
      initialMode: playerModes.EDIT,
      board: {showCoordinates: false},
    }, '(;GM[1]FF[4]SZ[9])')
    player.setEditTool(editTools.BLACK)

    player.teardown()
    player.bootstrap(container)
    player.board.setDrawSize(600, 600)

    clickAt(player, 4, 4)
    expect(stoneAt(player, 4, 4)).toBeTruthy()
  })

  it('leaves only the new board in the container', () => {

    //Tearing down takes the board element back out, so the second bootstrap
    //does not stack a live board on top of a dead one
    const {player, container} = rebootstrap()
    player.teardown()
    player.bootstrap(container)

    expect(container.children.filter(
      child => child.className === 'seki-board-wrapper'
    )).toHaveLength(1)
  })

  it('watches the new container for size changes', () => {

    //The observer the first bootstrap set up was disconnected on teardown, so
    //without a fresh one the board never resizes again
    const {player, container, observers} = rebootstrap()
    player.teardown()
    player.bootstrap(container)

    expect(observers).toHaveLength(2)
    expect(observers[0].disconnected).toBe(true)
    expect(observers[1].disconnected).toBe(false)
    expect(observers[1].observed).toEqual([player.elements.container])
  })
})
