import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest'
import Player from './player.js'
import GameNode from './game-node.js'
import {defaultPlayerConfig} from '../constants/defaults.js'
import {playerModes} from '../constants/player.js'
import {stoneColors} from '../constants/stone.js'
import {loadFixtureBytes} from '../../test/fixtures.js'

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

describe('setting analysis on a single node', () => {

  //Two moves, with a variation hanging off the first one
  const sgf = '(;GM[1]FF[4]SZ[19];B[dd](;W[pp];B[qf])(;W[cq]))'
  const analysis = {winrate: 0.42, scoreLead: -1.2, visits: 350, candidates: []}

  let player

  beforeEach(() => {
    player = new Player()
    player.loadData(sgf)
  })

  //The variation node the main line array cannot address
  const variationNode = () => player.game.getRootNode().getChild(0).getChild(1)

  it('attaches analysis to a variation node', () => {
    player.setNodeAnalysis(variationNode(), analysis)
    expect(variationNode().analysis).toBe(analysis)
  })

  it('takes it off again when handed nothing', () => {
    player.setNodeAnalysis(variationNode(), analysis)
    player.setNodeAnalysis(variationNode())

    expect('analysis' in variationNode()).toBe(false)
  })

  it('announces the change with the node it landed on', () => {
    const listener = vi.fn()
    player.on('analysisChange', listener)

    player.setNodeAnalysis(variationNode(), analysis)

    expect(listener).toHaveBeenCalledTimes(1)
    const {detail} = listener.mock.calls[0][0]
    expect(detail.hasAnalysis).toBe(true)
    expect(detail.node).toBe(variationNode())
  })

  it('announces a removal as having no analysis', () => {
    const listener = vi.fn()
    player.setNodeAnalysis(variationNode(), analysis)
    player.on('analysisChange', listener)

    player.setNodeAnalysis(variationNode(), null)

    expect(listener.mock.calls[0][0].detail.hasAnalysis).toBe(false)
  })

  it('survives being handed no node at all', () => {
    const listener = vi.fn()
    player.on('analysisChange', listener)

    expect(() => player.setNodeAnalysis(null, analysis)).not.toThrow()
    expect(listener).not.toHaveBeenCalled()
  })

  it('keeps it out of the saved record', () => {
    const before = player.game.toSgf()
    player.setNodeAnalysis(variationNode(), analysis)

    expect(player.game.toSgf()).toBe(before)
  })
})

describe('replacing analysis a variation was explored from', () => {

  const sgf = '(;GM[1]FF[4]SZ[9];B[cc];W[gg])'

  const analysisWithLine = pv => ({
    winrate: 0.5, scoreLead: 0, visits: 500,
    candidates: [{
      x: pv[0].x, y: pv[0].y,
      winrate: 0.55, scoreLead: 1.5, visits: 200,
      pv,
    }],
  })

  let player

  beforeEach(() => {
    player = new Player()
    player.loadData(sgf)
  })

  it('takes the expected line off the nodes it was cached on', () => {

    //NOTE: a derived entry is worked out once and left on the node, so
    //replacing the analysis it came from has to take it away again. Without
    //that, revisiting the line keeps showing the superseded expectation, as
    //the derivation sees an analysis already sitting there and leaves it.
    player.setAnalysis([analysisWithLine([{x: 4, y: 4}, {x: 5, y: 5}])])
    player.playMove(4, 4)

    const node = player.game.getCurrentNode()
    expect(node.analysis.derived).toBe(true)

    player.setNodeAnalysis(player.game.getRootNode(), null)
    expect('analysis' in node).toBe(false)
  })

  it('derives the new line for a node already sitting on it', () => {

    //The analysis for a variation position is fetched, so it can arrive
    //after the user has gone further along the line it expects
    player.playMove(4, 4)
    player.playMove(5, 5)
    expect(player.game.getCurrentNode().analysis).toBeUndefined()

    player.setNodeAnalysis(
      player.game.getRootNode(),
      analysisWithLine([{x: 4, y: 4}, {x: 5, y: 5}, {x: 6, y: 6}])
    )

    const analysis = player.game.getCurrentNode().analysis
    expect(analysis.derived).toBe(true)
    expect(analysis.sequence).toEqual([
      {x: 6, y: 6, color: stoneColors.BLACK, number: 3},
    ])
  })

  it('re-derives against the replacement rather than the old line', () => {
    player.setAnalysis([analysisWithLine([{x: 4, y: 4}, {x: 5, y: 5}])])
    player.playMove(4, 4)
    expect(player.game.getCurrentNode().analysis.scoreLead).toBe(1.5)

    //A deeper search of the same position, expecting a different follow-up
    player.setNodeAnalysis(player.game.getRootNode(), {
      winrate: 0.5, scoreLead: 0, visits: 5000,
      candidates: [{
        x: 4, y: 4, winrate: 0.61, scoreLead: 3.2, visits: 4000,
        pv: [{x: 4, y: 4}, {x: 2, y: 6}],
      }],
    })

    const analysis = player.game.getCurrentNode().analysis
    expect(analysis.scoreLead).toBe(3.2)
    expect(analysis.sequence).toEqual([
      {x: 2, y: 6, color: stoneColors.WHITE, number: 2},
    ])
  })

  it('survives a record deep enough to overflow a recursive walk', () => {

    //NOTE: a main line is one long chain of single children, so walking the
    //tree by recursion puts a frame on the stack per move played. The
    //parsers build such a record iteratively, so nothing stops one arriving.
    const deep = new Player()
    deep.loadData(sgf)

    let node = deep.game.getRootNode()
    while (node.hasChildren()) {
      node = node.getChild(0)
    }
    for (let i = 0; i < 20000; i++) {
      const child = new GameNode()
      child.move = {x: 0, y: 0, color: stoneColors.BLACK}
      node.appendChild(child)
      node = child
    }

    expect(() => deep.clearAnalysis()).not.toThrow()
  })
})

describe('clearing analysis across the whole tree', () => {

  const sgf = '(;GM[1]FF[4]SZ[19];B[dd](;W[pp];B[qf])(;W[cq]))'
  const moves = [
    {winrate: 0.5, visits: 500, candidates: []},
    {winrate: 0.48, visits: 500, candidates: []},
  ]
  const variationAnalysis = {winrate: 0.4, visits: 200, candidates: []}

  let player

  beforeEach(() => {
    player = new Player()
    player.loadData(sgf)
  })

  const variationNode = () => player.game.getRootNode().getChild(0).getChild(1)

  it('takes node-attached variation analysis off with the rest', () => {

    //NOTE: clearing used to walk the main line only, so anything attached to
    //a variation node survived a clear and resurfaced when revisited
    player.setAnalysis(moves)
    player.setNodeAnalysis(variationNode(), variationAnalysis)

    player.clearAnalysis()
    expect('analysis' in variationNode()).toBe(false)
  })

  it('clears stale variation analysis when a new review loads', () => {
    player.setNodeAnalysis(variationNode(), variationAnalysis)

    player.setAnalysis(moves)
    expect('analysis' in variationNode()).toBe(false)
  })

  it('takes derived entries off with the rest', () => {

    //Derive an entry by playing along an expected line off the root
    player.setAnalysis([{
      winrate: 0.5, visits: 500,
      candidates: [{
        x: 4, y: 4, winrate: 0.52, scoreLead: 0.5, visits: 300,
        pv: [{x: 4, y: 4}, {x: 5, y: 5}],
      }],
    }])
    player.playMove(4, 4)

    const node = player.game.getCurrentNode()
    expect(node.analysis?.derived).toBe(true)

    player.clearAnalysis()
    expect('analysis' in node).toBe(false)
  })
})

describe('deriving analysis for explored variations', () => {

  //A two move game with analysis on the root node. The first candidate's
  //line follows the game; the second explores elsewhere and includes a pass;
  //the third is the actually played move, appended without a line.
  const sgf = '(;GM[1]FF[4]SZ[9];B[cc];W[gg])'
  const rootAnalysis = {
    winrate: 0.5, scoreLead: 0, visits: 500,
    candidates: [
      {
        x: 2, y: 2, winrate: 0.52, scoreLead: 0.8, visits: 300,
        pv: [{x: 2, y: 2}, {x: 6, y: 6}, {x: 2, y: 6}, {x: 6, y: 2}],
      },
      {
        x: 4, y: 4, winrate: 0.48, scoreLead: -0.5, visits: 150,
        pv: [{x: 4, y: 4}, {x: 4, y: 2}, {pass: true}, {x: 5, y: 5}],
      },
      {x: 3, y: 3, winrate: 0.5, scoreLead: 0, visits: 1},
    ],
  }

  let player

  beforeEach(() => {
    player = new Player()
    player.loadData(sgf)
  })

  const currentAnalysis = () => player.game.getCurrentNode().analysis

  it('derives an analysis when the entered move follows a candidate line', () => {
    player.setAnalysis([rootAnalysis])
    player.playMove(4, 4)

    const analysis = currentAnalysis()
    expect(analysis.derived).toBe(true)
    expect(analysis.isVariation).toBe(true)
    expect(analysis.winrate).toBe(0.48)
    expect(analysis.scoreLead).toBe(-0.5)
    expect(analysis.visits).toBe(150)
    expect(analysis.candidates).toEqual([])
  })

  it('hands the node the remainder of the line, colours alternating onward', () => {
    player.setAnalysis([rootAnalysis])
    player.playMove(4, 4)

    expect(currentAnalysis().sequence).toEqual([
      {x: 4, y: 2, color: stoneColors.WHITE, number: 2},
      {pass: true, color: stoneColors.BLACK, number: 3},
      {x: 5, y: 5, color: stoneColors.WHITE, number: 4},
    ])
  })

  it('keeps deriving as the user follows the line', () => {

    //The first entered move left a derived entry on its node, which carries
    //no candidates of its own; the walk has to reach through it to the real
    //analysis on the root, or the line goes dark after one move
    player.setAnalysis([rootAnalysis])
    player.playMove(4, 4)
    player.playMove(4, 2)

    const analysis = currentAnalysis()
    expect(analysis.derived).toBe(true)
    expect(analysis.winrate).toBe(0.48)
    expect(analysis.sequence).toEqual([
      {pass: true, color: stoneColors.BLACK, number: 3},
      {x: 5, y: 5, color: stoneColors.WHITE, number: 4},
    ])
  })

  it('matches a pass in the line with a pass', () => {
    player.setAnalysis([rootAnalysis])
    player.playMove(4, 4)
    player.playMove(4, 2)
    player.passMove()

    const analysis = currentAnalysis()
    expect(analysis.derived).toBe(true)
    expect(analysis.sequence).toEqual([
      {x: 5, y: 5, color: stoneColors.WHITE, number: 4},
    ])
  })

  it('still values the position when the line is fully entered', () => {
    player.setAnalysis([rootAnalysis])
    player.playMove(4, 4)
    player.playMove(4, 2)
    player.passMove()
    player.playMove(5, 5)

    const analysis = currentAnalysis()
    expect(analysis.derived).toBe(true)
    expect(analysis.sequence).toEqual([])
  })

  it('derives nothing past the end of the line', () => {
    player.setAnalysis([rootAnalysis])
    player.playMove(4, 4)
    player.playMove(4, 2)
    player.passMove()
    player.playMove(5, 5)
    player.playMove(0, 0)

    expect(currentAnalysis()).toBeUndefined()
  })

  it('derives nothing for a move the lines do not expect', () => {
    player.setAnalysis([rootAnalysis])
    player.playMove(0, 0)

    expect(currentAnalysis()).toBeUndefined()
  })

  it('skips candidates that carry no line', () => {

    //The move actually played gets appended to a stored analysis as a
    //candidate without a line, and there is nothing to derive from it
    player.setAnalysis([rootAnalysis])
    player.playMove(3, 3)

    expect(currentAnalysis()).toBeUndefined()
  })

  it('derives nothing without an analysed ancestor', () => {
    player.playMove(4, 4)
    expect(currentAnalysis()).toBeUndefined()
  })

  it('rejects a line the entered colours do not alternate onto', () => {

    //Two records with the same variation point: one enters it with the
    //colour whose turn it is, the other with the same colour again. Only
    //the alternating one is an exploration of the analysed line.
    const analysis = {
      winrate: 0.5, scoreLead: 0, visits: 500,
      candidates: [{
        x: 4, y: 4, winrate: 0.53, scoreLead: 1.1, visits: 200,
        pv: [{x: 4, y: 4}, {x: 2, y: 6}],
      }],
    }

    const derive = sgf => {
      const other = new Player()
      other.loadData(sgf)
      other.setAnalysis([null, analysis])
      other.goToNextPosition()
      other.game.goToNextPosition(1)
      other.processPathChange()
      return other.game.getCurrentNode().analysis
    }

    const alternating = derive('(;GM[1]FF[4]SZ[9];B[cc](;W[gg];B[cg])(;W[ee]))')
    const repeating = derive('(;GM[1]FF[4]SZ[9];B[cc](;W[gg];B[cg])(;B[ee]))')

    expect(alternating?.derived).toBe(true)
    expect(repeating).toBeUndefined()
  })

  it('gives up at a node that is not a plain move', () => {

    //A setup node cannot be part of an engine line, so nothing beyond it
    //can be an exploration of one
    const other = new Player()
    other.loadData('(;GM[1]FF[4]SZ[9];B[cc];AE[cc];B[ee])')
    other.setAnalysis([rootAnalysis])
    other.goToLastPosition()

    expect(other.game.getCurrentNode().analysis).toBeUndefined()
  })

  it('derives on an analysis change while sitting on the variation', () => {

    //The review can arrive after the variation was entered, and the node
    //picks its derived entry up without being revisited
    player.playMove(4, 4)
    expect(currentAnalysis()).toBeUndefined()

    player.setAnalysis([rootAnalysis])
    expect(currentAnalysis()?.derived).toBe(true)
  })

  it('continues the numbering from the variation moves on the board', () => {

    //An analysis attached to a node mid-variation derives onward from that
    //node, but the marks keep counting the whole variation as numbered on
    //the board, not just the moves entered past the attached analysis
    player.setAnalysis([rootAnalysis])
    player.playMove(4, 4)
    player.playMove(4, 2)

    player.setNodeAnalysis(player.game.getCurrentNode(), {
      winrate: 0.5, scoreLead: 0, visits: 100,
      candidates: [{
        x: 0, y: 0, winrate: 0.5, scoreLead: 0, visits: 50,
        pv: [{x: 0, y: 0}, {x: 1, y: 1}],
      }],
    })
    player.playMove(0, 0)

    expect(currentAnalysis().sequence).toEqual([
      {x: 1, y: 1, color: stoneColors.WHITE, number: 4},
    ])
  })

  it('numbers the line from one where the board numbers nothing', () => {

    //A main line node past the end of the analysis array derives too, and
    //there are no variation move numbers on the board for it to continue
    const other = new Player()
    other.loadData('(;GM[1]FF[4]SZ[9];B[cc];W[gg])')
    other.setAnalysis([{
      winrate: 0.5, scoreLead: 0, visits: 500,
      candidates: [{
        x: 2, y: 2, winrate: 0.5, scoreLead: 0, visits: 300,
        pv: [{x: 2, y: 2}, {x: 6, y: 6}, {x: 2, y: 6}],
      }],
    }])
    other.goToNextPosition()

    expect(other.game.getCurrentNode().analysis.sequence).toEqual([
      {x: 6, y: 6, color: stoneColors.WHITE, number: 1},
      {x: 2, y: 6, color: stoneColors.BLACK, number: 2},
    ])
  })

  it('gives up before walking the whole record for nothing', () => {

    //NOTE: the walk runs on every step taken, so it must not climb the whole
    //game each time. Nothing further back than the longest line an engine
    //reports can be the position a line is being explored from, so a node
    //that far past the analysis is not even matched against it.
    const grow = length => {
      const other = new Player()
      other.loadData('(;GM[1]FF[4]SZ[9])')
      other.setAnalysis([rootAnalysis])

      //Built by hand rather than played, as a line this long has nowhere
      //legal left to go on a board this size
      let node = other.game.getRootNode()
      let color = stoneColors.BLACK
      for (let i = 0; i < length; i++) {
        const child = new GameNode()
        child.move = {x: i % 9, y: Math.floor(i / 9) % 9, color}
        node.appendChild(child)
        node = child
        color = color === stoneColors.BLACK ?
          stoneColors.WHITE : stoneColors.BLACK
      }

      const spy = vi.spyOn(other, 'findMatchingCandidate')
      other.deriveNodeAnalysis(node)
      return {spy, node}
    }

    //Within reach the analysis is still matched against, however hopelessly
    expect(grow(5).spy).toHaveBeenCalled()

    //Beyond it the walk stops short of the analysis altogether
    const far = grow(200)
    expect(far.spy).not.toHaveBeenCalled()
    expect(far.node.analysis).toBeUndefined()
  })

  it('leaves a node with its own analysis alone', () => {
    const own = {winrate: 0.6, scoreLead: 2, visits: 400, candidates: []}

    player.setAnalysis([rootAnalysis])
    player.playMove(4, 4)
    player.setNodeAnalysis(player.game.getCurrentNode(), own)

    //Moving away and back must not replace it with a derived entry
    player.goToPreviousPosition()
    player.goToNextPosition()

    expect(currentAnalysis()).toBe(own)
  })

  it('keeps derived entries out of the saved record', () => {
    const before = player.game.toSgf()

    player.setAnalysis([rootAnalysis])
    player.playMove(4, 4)
    player.goToFirstPosition()

    expect(player.game.toSgf()).not.toBe(before)

    //The variation itself belongs in the record; the analysis does not
    expect(player.game.toSgf()).not.toContain('undefined')
    expect(player.game.toSgf()).not.toContain('derived')
  })
})

describe('Player#loadData() with a record that is not UTF-8', () => {

  it('takes the raw bytes of a file, as read off disk or the wire', () => {

    //Nothing here decodes anything itself, it all comes from Game.fromData.
    //This is the check that the bytes survive the whole way down.
    const player = new Player()
    player.loadData(loadFixtureBytes('sgf/shift-jis.sgf'))

    const {game} = player
    expect(game.getPlayer(stoneColors.BLACK).name).toBe('高尾紳路')
    expect(game.getPlayer(stoneColors.WHITE).name).toBe('山下敬吾')
  })
})
