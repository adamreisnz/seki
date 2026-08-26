import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest'
import PlayerMode from './player-mode.js'
import Player from '../player.js'
import {boardLayerTypes} from '../../constants/board.js'
import {markupTypes} from '../../constants/markup.js'
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

describe('PlayerMode navigation actions', () => {

  //A game that forks, carries a comment part way in, and has a variation to
  //select, so that every navigation action has something to reach
  const sgf = '(;GM[1]FF[4]SZ[9];B[cc]C[a note];W[gg](;B[cg];W[gc])(;B[gc]))'

  const createActiveMode = () => {
    const player = new Player()
    player.loadData(sgf)
    return {player, mode: new PlayerMode(player)}
  }

  //Every action, what to do first, and where it should land
  const cases = [
    [playerActions.GO_TO_LAST_POSITION, p => p.goToFirstPosition(), 4],
    [playerActions.GO_TO_PREV_POSITION, p => p.goToLastPosition(), 3],
    [playerActions.GO_FORWARD_NUM_POSITIONS, p => p.goToFirstPosition(), 4],
    [playerActions.GO_BACK_NUM_POSITIONS, p => p.goToLastPosition(), 0],
    [playerActions.GO_TO_NEXT_FORK, p => p.goToFirstPosition(), 2],
    [playerActions.GO_TO_PREV_FORK, p => p.goToLastPosition(), 2],
    [playerActions.GO_TO_NEXT_COMMENT, p => p.goToFirstPosition(), 1],
    [playerActions.GO_TO_PREV_COMMENT, p => p.goToLastPosition(), 1],
  ]

  for (const [action, setup, expected] of cases) {
    it(`handles ${action}`, () => {
      const {player, mode} = createActiveMode()
      setup(player)

      expect(mode.processAction(action)).toBe(true)
      expect(player.game.getCurrentMoveNumber()).toBe(expected)
    })
  }

  it('walks between the variations of a fork', () => {
    const {player, mode} = createActiveMode()
    player.goToFirstPosition()
    player.goToNextPosition()
    player.goToNextPosition()
    player.goToNextPosition()

    expect(mode.processAction(playerActions.GO_TO_NEXT_VARIATION)).toBe(true)
    expect(player.game.getCurrentNode().move.x).toBe(6)

    expect(mode.processAction(playerActions.GO_TO_PREV_VARIATION)).toBe(true)
    expect(player.game.getCurrentNode().move.x).toBe(2)
  })

  it('selects between the variations of a fork', () => {
    const {player, mode} = createActiveMode()
    player.goToFirstPosition()
    player.goToNextPosition()
    player.goToNextPosition()

    expect(mode.processAction(playerActions.SELECT_NEXT_VARIATION)).toBe(true)
    expect(player.game.getCurrentPathIndex()).toBe(1)

    expect(mode.processAction(playerActions.SELECT_PREV_VARIATION)).toBe(true)
    expect(player.game.getCurrentPathIndex()).toBe(0)
  })

  it('switches to replay and play mode as well as edit', () => {
    const {player, mode} = createActiveMode()

    expect(mode.processAction(playerActions.SET_MODE_PLAY)).toBe(true)
    expect(player.getActiveMode()).toBe(playerModes.PLAY)

    expect(mode.processAction(playerActions.SET_MODE_REPLAY)).toBe(true)
    expect(player.getActiveMode()).toBe(playerModes.REPLAY)
  })
})

describe('PlayerMode static board class', () => {

  //Class handling reaches for HTMLCollection, which is a browser global
  beforeEach(() => {
    vi.stubGlobal('HTMLCollection', class {})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const createBoardSpy = player => {
    const added = []
    const removed = []
    player.board.addClass = name => added.push(name)
    player.board.removeClass = name => removed.push(name)
    return {added, removed}
  }

  it('marks the board as static while static mode is active', () => {

    //The class is what keeps a board that cannot be interacted with from
    //showing the cursor and hover feedback of one that can
    const player = new Player()
    const {added, removed} = createBoardSpy(player)
    const mode = player.getModeHandler(playerModes.STATIC)

    mode.activate()
    expect(added).toEqual(['seki-board-static'])

    mode.deactivate()
    expect(removed).toEqual(['seki-board-static'])
  })

  it('leaves the class off any other mode', () => {
    const player = new Player()
    const {added, removed} = createBoardSpy(player)
    const mode = player.getModeHandler(playerModes.REPLAY)

    mode.activate()
    mode.deactivate()

    expect(added).toEqual([])
    expect(removed).toEqual([])
  })
})

describe('PlayerMode hover stones', () => {

  const createHoverMode = () => {
    const player = new Player()
    player.board.createLayers()
    return {player, mode: new PlayerMode(player)}
  }

  it('builds a hover stone as a shadow and the stone itself', () => {
    const {mode} = createHoverMode()
    const hover = mode.createHoverStone('black')

    expect(hover).toHaveLength(2)
    expect(hover[1].stoneColor).toBe('black')
  })

  it('puts it on the hover layer', () => {
    const {player, mode} = createHoverMode()
    mode.showHoverStoneForColor(3, 3, 'white')

    const hover = player.board.get(boardLayerTypes.HOVER, 3, 3)
    expect(hover[1].stoneColor).toBe('white')
  })

  it('clears the layer first, so the last shadow does not linger', () => {

    //A hover stone's shadow reaches onto the cells around it, so moving the
    //cursor has to take the whole layer rather than the cell it left
    const {player, mode} = createHoverMode()

    mode.showHoverStoneForColor(3, 3, 'black')
    mode.showHoverStoneForColor(4, 4, 'black')

    expect(player.board.has(boardLayerTypes.HOVER, 3, 3)).toBe(false)
    expect(player.board.has(boardLayerTypes.HOVER, 4, 4)).toBe(true)
  })

  it('builds markup through the factory', () => {
    const {mode} = createHoverMode()
    const markup = mode.createMarkup(markupTypes.SQUARE)

    expect(markup.type).toBe(markupTypes.SQUARE)
  })

  it('has an init that does nothing, for the modes that need none', () => {
    const {mode} = createHoverMode()
    expect(mode.init()).toBeUndefined()
  })
})
