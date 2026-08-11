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

describe('loading a handicap game', () => {

  const loadSgf = sgf => {
    const player = new Player()
    player.loadData(sgf)
    return player.game
  }

  it('leaves a record that places its own handicap stones alone', () => {

    //NOTE: the handicap check used to read whether the board had stones before
    //rewinding, which is what applies the root node's setup instructions. It
    //therefore always saw an empty board, and added the default star points on
    //top of whatever the record had placed, editing the record in the process
    const game = loadSgf('(;GM[1]FF[4]SZ[19]HA[2]AB[dd][pp];W[qf])')

    expect(game.getRootNode().setup).toEqual([
      {type: 'black', coords: [{x: 3, y: 3}, {x: 15, y: 15}]},
    ])
    expect(game.getPosition().stones.getAll()).toHaveLength(2)
  })

  it('still places the default stones when the record has none', () => {
    const game = loadSgf('(;GM[1]FF[4]SZ[19]HA[2];W[qf])')
    expect(game.getPosition().stones.getAll()).toHaveLength(2)
    expect(game.hasStone(3, 15)).toBe(true)
    expect(game.hasStone(15, 3)).toBe(true)
  })

  it('gives white the first move either way', () => {
    expect(loadSgf('(;GM[1]FF[4]SZ[19]HA[2]AB[dd][pp])').getTurn()).toBe('white')
    expect(loadSgf('(;GM[1]FF[4]SZ[19]HA[2])').getTurn()).toBe('white')
  })

  it('leaves a game without a handicap alone', () => {
    const game = loadSgf('(;GM[1]FF[4]SZ[19];B[dd])')
    expect(game.getPosition().hasStones()).toBe(false)
    expect(game.getTurn()).toBe('black')
  })
})

describe('setting analysis on a game', () => {

  //Two moves, with a variation hanging off the first one
  const sgf = '(;GM[1]FF[4]SZ[19];B[dd](;W[pp];B[qf])(;W[cq]))'

  const moves = [
    {winrate: 0.5, visits: 500},
    {winrate: 0.48, visits: 500, loss: {winrate: 0.02, score: 1.4}},
    {winrate: 0.52, visits: 500, loss: {winrate: 0, score: 0}},
    {winrate: 0.51, visits: 500, loss: {winrate: 0.01, score: 0.4}},
  ]

  const mainLine = game => {
    const nodes = []
    let node = game.getRootNode()
    while (node) {
      nodes.push(node)
      node = node.getChild(0)
    }
    return nodes
  }

  let player

  beforeEach(() => {
    player = new Player()
    player.loadData(sgf)
  })

  it('gives the first entry to the root node', () => {

    //NOTE: the array is indexed by move number, and the root node is the
    //position before any move was made, so it takes entry 0. Handing it the
    //first move's analysis instead puts the whole game one node out of step.
    player.setAnalysis(moves)
    expect(player.game.getRootNode().analysis).toBe(moves[0])
  })

  it('walks the main line in order', () => {
    player.setAnalysis(moves)
    expect(mainLine(player.game).map(node => node.analysis)).toEqual(moves)
  })

  it('leaves the variations without any', () => {
    player.setAnalysis(moves)

    const [, first] = mainLine(player.game)
    expect(first.getChild(1).analysis).toBeUndefined()
  })

  it('leaves nodes the array does not reach alone', () => {
    player.setAnalysis(moves.slice(0, 2))

    const [, , second] = mainLine(player.game)
    expect(second.analysis).toBeUndefined()
  })

  it('takes it all off again', () => {
    player.setAnalysis(moves)
    player.clearAnalysis()

    expect(mainLine(player.game).every(node => !('analysis' in node))).toBe(true)
  })

  it('keeps it out of the saved record', () => {

    //NOTE: an unknown key on a node has no SGF property to be written to, so
    //it must not become one. The game tree is fingerprinted with toSgf() for
    //multiplayer sync, which a stray property would break as well.
    const before = player.game.toSgf()
    player.setAnalysis(moves)

    expect(player.game.toSgf()).toBe(before)
  })

  it('announces the change, so the board can be redrawn', () => {
    const listener = vi.fn()
    player.on('analysisChange', listener)

    player.setAnalysis(moves)
    expect(listener).toHaveBeenCalledTimes(1)

    player.clearAnalysis()
    expect(listener).toHaveBeenCalledTimes(2)
  })
})
