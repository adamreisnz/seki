import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest'
import Player from '../player.js'
import {boardLayerTypes} from '../../constants/board.js'
import {markupTypes} from '../../constants/markup.js'
import {playerModes, playerActions} from '../../constants/player.js'
import {stoneColors} from '../../constants/stone.js'

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

  it('announces a stop that stopped auto play', () => {
    const listener = vi.fn()
    player.on('autoPlayToggle', listener)
    replay.isAutoPlaying = true

    replay.stopAutoPlay()

    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener.mock.calls[0][0].detail).toEqual({isAutoPlaying: false})
  })

  it('says nothing about stopping auto play that was not running', () => {

    //Deactivation and teardown both stop auto play as a matter of course, and
    //every handler that has one goes through both
    const listener = vi.fn()
    player.on('autoPlayToggle', listener)

    replay.stopAutoPlay()
    expect(listener).not.toHaveBeenCalled()
  })

  it('stays quiet about auto play through a teardown', () => {
    const listener = vi.fn()
    player.on('autoPlayToggle', listener)

    player.teardown()
    expect(listener).not.toHaveBeenCalled()
  })
})

describe('Replay mode analysis overlay', () => {

  //A three move game. The board is small enough to keep the fixtures below
  //readable, and the candidates all sit on empty points.
  const sgf = '(;GM[1]FF[4]SZ[9];B[cc];W[gg];B[cg])'

  /**
   * Build a candidate as the API stores it, being a point with what it gives
   * up in win rate against the best one, and where the analysis put it on the
   * quality scale. An analysis stored before that scale existed has no grade,
   * which is what leaving it off says.
   */
  const candidate = (x, y, winrate, qualityScale) => ({
    x, y,
    winrate: 0.5 - winrate,
    scoreLead: -winrate * 20,
    visits: 100,
    prior: 0.1,
    loss: {winrate, score: winrate * 20},
    qualityScale,
    pv: [{x, y}],
  })

  /**
   * Build the analysis for one node. Everything but the loss and quality
   * describes the position at the node; those two describe the move that
   * reached it.
   */
  const analysis = (candidates, ownership = null) => ({
    winrate: 0.5,
    scoreLead: 0,
    visits: 500,
    best: candidates[0],
    loss: {winrate: 0.03, score: 1.4},
    quality: 'inaccuracy',
    candidates,
    ownership,
  })

  //One entry per node on the main line, root included, so the array is one
  //longer than the game has moves
  const moves = [
    analysis([candidate(4, 4, 0, 0), candidate(2, 2, 0.03, 0.35)]),
    analysis([candidate(6, 6, 0), candidate(6, 2, 0.06)]),
    analysis([candidate(2, 6, 0), candidate(4, 2, 0.01)]),
    analysis([candidate(7, 7, 0)]),
  ]

  let player
  let board

  const load = data => {
    player = new Player()
    board = player.board

    //Layers are normally created when the board is bootstrapped onto an
    //element, which needs a document
    board.createLayers()
    player.loadData(data)
  }

  beforeEach(() => load(sgf))

  //Candidate markers live on the AI layer, apart from the markup layer that
  //carries the record's own markup and the markers the mode generates
  const candidateAt = (x, y) => board.get(boardLayerTypes.AI, x, y)
  const markupAt = (x, y) => board.get(boardLayerTypes.MARKUP, x, y)

  it('shows nothing until it is asked to', () => {
    player.setAnalysis(moves)
    expect(candidateAt(4, 4)).toBeUndefined()
  })

  it('marks up each candidate for the position it is at', () => {
    player.setConfig('showAnalysis', true)
    player.setAnalysis(moves)

    expect(candidateAt(4, 4).type).toBe(markupTypes.CANDIDATE)
    expect(candidateAt(2, 2).type).toBe(markupTypes.CANDIDATE)
  })

  it('shows the candidates for this position, not for the move that reached it', () => {

    //NOTE: this is the one that fails silently. A whole game of candidates one
    //node out of step is a coherent, plausible overlay of the wrong position.
    player.setConfig('showAnalysis', true)
    player.setAnalysis(moves)
    player.goToNextPosition()

    expect(candidateAt(6, 6).type).toBe(markupTypes.CANDIDATE)
    expect(candidateAt(6, 2).type).toBe(markupTypes.CANDIDATE)
    expect(candidateAt(4, 4)).toBeUndefined()
    expect(candidateAt(2, 6)).toBeUndefined()
  })

  it('ranks the candidates by the order the engine gave them', () => {
    player.setConfig('showAnalysis', true)
    player.setAnalysis(moves)

    expect(candidateAt(4, 4).isBest).toBe(true)
    expect(candidateAt(2, 2).isBest).toBe(false)
    expect(candidateAt(2, 2).index).toBe(1)
  })

  it('hands each marker its own loss to colour itself by', () => {
    player.setConfig('showAnalysis', true)
    player.setAnalysis(moves)

    expect(candidateAt(4, 4).winrateLoss).toBe(0)
    expect(candidateAt(2, 2).winrateLoss).toBe(0.03)
  })

  it('hands each marker the grade the analysis gave its move', () => {

    //The grade is what the marker colours itself by, so a move graded worse
    //than its point loss suggests reads as the grade. Nothing here decides
    //what it means; it is passed straight through to the theme.
    player.setConfig('showAnalysis', true)
    player.setAnalysis(moves)

    expect(candidateAt(4, 4).qualityScale).toBe(0)
    expect(candidateAt(2, 2).qualityScale).toBe(0.35)
  })

  it('leaves the grade off an analysis that carries none', () => {

    //Analyses stored before the quality scale existed have no grade on their
    //candidates, and those markers fall back to colouring by point loss
    player.setConfig('showAnalysis', true)
    player.setAnalysis(moves)
    player.goToNextPosition()

    expect(candidateAt(6, 6).qualityScale).toBeUndefined()
    expect(candidateAt(6, 6).scoreLoss).toBe(0)
  })

  it('hands each marker the points its move gives up, to label itself with', () => {
    player.setConfig('showAnalysis', true)
    player.setAnalysis(moves)

    //The fixture puts the score loss at twenty times the win rate loss.
    //Turning it into a label is the theme's job, and is covered there.
    expect(candidateAt(4, 4).scoreLoss).toBe(0)
    expect(candidateAt(2, 2).scoreLoss).toBeCloseTo(0.6)
  })

  it('marks the candidate that was actually played as played', () => {

    //The played move is the node's main line child, derived from the tree
    //rather than flagged in the analysis data, so every stored analysis gets
    //the distinction for free. The root's first move is B[cc], at (2, 2).
    player.setConfig('showAnalysis', true)
    player.setAnalysis(moves)

    expect(candidateAt(2, 2).isPlayed).toBe(true)
    expect(candidateAt(4, 4).isPlayed).toBe(false)
  })

  it('marks nothing as played at the end of the game', () => {

    //The last position has no child, so nothing was played from it
    player.setConfig('showAnalysis', true)
    player.setAnalysis(moves)
    player.goToLastPosition()

    expect(candidateAt(7, 7).isPlayed).toBe(false)
  })

  it('labels a lone candidate too, as what it gives up is still worth saying', () => {
    player.setConfig('showAnalysis', true)
    player.setAnalysis(moves)
    player.goToLastPosition()

    expect(candidateAt(7, 7).showText).toBe(true)
  })

  it('takes the markers off again when the overlay is turned off', () => {
    player.setConfig('showAnalysis', true)
    player.setAnalysis(moves)
    player.setConfig('showAnalysis', false)

    expect(candidateAt(4, 4)).toBeUndefined()
  })

  it('takes them off again when the analysis is cleared', () => {
    player.setConfig('showAnalysis', true)
    player.setAnalysis(moves)
    player.clearAnalysis()

    expect(candidateAt(4, 4)).toBeUndefined()
  })

  it('leaves the game record alone', () => {

    //NOTE: candidate markers are a board overlay and nothing else. Putting
    //them in the node's markup would write a type the SGF converter has no
    //property for, corrupting the saved record and every fingerprint of it.
    player.setConfig('showAnalysis', true)
    player.setAnalysis(moves)

    expect(player.game.getRootNode().markup).toBeUndefined()
    expect(player.game.toSgf()).not.toContain('undefined')
  })

  it('stays out of the way of markup the record itself carries', () => {

    //The triangle sits on the root node's best candidate
    load('(;GM[1]FF[4]SZ[9]TR[ee];B[cc];W[gg];B[cg])')
    player.setConfig('showAnalysis', true)
    player.setAnalysis(moves)

    expect(markupAt(4, 4).type).toBe(markupTypes.TRIANGLE)
    expect(candidateAt(4, 4)).toBeUndefined()
    expect(candidateAt(2, 2).type).toBe(markupTypes.CANDIDATE)
  })

  it('leaves the record markup standing on a point it marked one move ago', () => {

    //NOTE: clearing the markers used to remove them by coordinate alone. The
    //position sync draws the new node's own markup before the markers are
    //cleared, so a record that marks a point we had a candidate on had that
    //markup wiped off the board until the next full redraw. Candidates cover
    //enough points per node to make that routine rather than rare.
    load('(;GM[1]FF[4]SZ[9];B[cc];W[gg]TR[gg][cg];B[cg])')
    player.setConfig('showAnalysis', true)
    player.setAnalysis(moves)

    //The engine suggests (6, 6) at the first move, and the record both plays
    //and marks that point at the second, which is the collision in practice
    player.goToNextPosition()
    expect(candidateAt(6, 6).type).toBe(markupTypes.CANDIDATE)

    player.goToNextPosition()
    expect(markupAt(6, 6).type).toBe(markupTypes.TRIANGLE)
    expect(markupAt(2, 6).type).toBe(markupTypes.TRIANGLE)
    expect(candidateAt(6, 6)).toBeUndefined()
  })
})

describe('Replay mode expected sequence overlay', () => {

  const sgf = '(;GM[1]FF[4]SZ[9];B[cc];W[gg])'

  /**
   * A derived analysis as the player synthesizes it, carrying the remainder
   * of an expected line instead of candidates
   */
  const derivedAnalysis = sequence => ({
    derived: true,
    isVariation: true,
    winrate: 0.5,
    scoreLead: 0,
    visits: 100,
    candidates: [],
    sequence,
  })

  let player
  let board

  beforeEach(() => {
    player = new Player()
    board = player.board
    board.createLayers()
    player.loadData(sgf)
    player.setConfig('showAnalysis', true)
  })

  const aiAt = (x, y) => board.get(boardLayerTypes.AI, x, y)
  const aiMarkers = () => board.getLayer(boardLayerTypes.AI).grid.getAll()

  it('draws each sequence move as a numbered mark in its colour', () => {
    player.setNodeAnalysis(player.game.getCurrentNode(), derivedAnalysis([
      {x: 4, y: 4, color: 'black', number: 2},
      {x: 5, y: 5, color: 'white', number: 3},
    ]))

    expect(aiAt(4, 4).type).toBe(markupTypes.SEQUENCE)
    expect(aiAt(4, 4).number).toBe(2)
    expect(aiAt(4, 4).displayColor).toBe('black')
    expect(aiAt(5, 5).number).toBe(3)
    expect(aiAt(5, 5).displayColor).toBe('white')
  })

  it('skips passes while their numbering stands', () => {
    player.setNodeAnalysis(player.game.getCurrentNode(), derivedAnalysis([
      {pass: true, color: 'black', number: 2},
      {x: 4, y: 4, color: 'white', number: 3},
    ]))

    expect(aiMarkers()).toHaveLength(1)
    expect(aiAt(4, 4).number).toBe(3)
  })

  it('stays off the stones', () => {
    player.goToNextPosition()
    player.setNodeAnalysis(player.game.getCurrentNode(), derivedAnalysis([
      {x: 2, y: 2, color: 'white', number: 2},
      {x: 4, y: 4, color: 'black', number: 3},
    ]))

    expect(aiAt(2, 2)).toBeUndefined()
    expect(aiAt(4, 4).number).toBe(3)
  })

  it('gives a point the line revisits to the first mark', () => {

    //A ko fight in the line comes back to the same point; the first visit is
    //the one whose number keeps the sequence readable
    player.setNodeAnalysis(player.game.getCurrentNode(), derivedAnalysis([
      {x: 4, y: 4, color: 'black', number: 2},
      {x: 5, y: 5, color: 'white', number: 3},
      {x: 4, y: 4, color: 'black', number: 4},
    ]))

    expect(aiAt(4, 4).number).toBe(2)
    expect(aiMarkers()).toHaveLength(2)
  })

  it('tolerates candidates and sequence side by side', () => {

    //A derived analysis carries no candidates in practice, but an analysis
    //that has both draws both, with candidates keeping any shared point
    player.setNodeAnalysis(player.game.getCurrentNode(), {
      ...derivedAnalysis([
        {x: 4, y: 4, color: 'black', number: 2},
        {x: 6, y: 2, color: 'white', number: 3},
      ]),
      candidates: [{x: 6, y: 2, loss: {winrate: 0, score: 0}}],
    })

    expect(aiAt(4, 4).type).toBe(markupTypes.SEQUENCE)
    expect(aiAt(6, 2).type).toBe(markupTypes.CANDIDATE)
  })

  it('shows the line the user is following when they play a candidate', () => {

    //The full journey: a review is loaded, the user plays a considered move,
    //and the remainder of its expected line appears on the board
    player.setAnalysis([{
      winrate: 0.5, scoreLead: 0, visits: 500,
      candidates: [{
        x: 4, y: 4, winrate: 0.52, scoreLead: 0.5, visits: 300,
        loss: {winrate: 0, score: 0},
        pv: [{x: 4, y: 4}, {x: 2, y: 6}, {x: 6, y: 2}],
      }],
    }])
    player.playMove(4, 4)

    expect(aiAt(2, 6).type).toBe(markupTypes.SEQUENCE)
    expect(aiAt(2, 6).number).toBe(2)
    expect(aiAt(2, 6).displayColor).toBe('white')
    expect(aiAt(6, 2).number).toBe(3)
    expect(aiAt(4, 4)).toBeUndefined()
  })

  it('comes off the board with the rest of the overlay', () => {
    player.setNodeAnalysis(player.game.getCurrentNode(), derivedAnalysis([
      {x: 4, y: 4, color: 'black', number: 2},
    ]))
    player.clearAnalysis()

    expect(aiAt(4, 4)).toBeUndefined()
  })
})

describe('Analysis overlay across the modes that inherit it', () => {

  const sgf = '(;GM[1]FF[4]SZ[9];B[cc];W[gg])'
  const moves = [
    {winrate: 0.5, candidates: [{x: 4, y: 4, loss: {winrate: 0, score: 0}}]},
    {winrate: 0.5, candidates: [{x: 6, y: 2, loss: {winrate: 0, score: 0}}]},
    {winrate: 0.5, candidates: [{x: 2, y: 6, loss: {winrate: 0, score: 0}}]},
  ]

  const load = mode => {
    const player = new Player({initialMode: mode})
    player.board.createLayers()
    player.loadData(sgf)
    return player
  }

  //NOTE: edit and play both used to restate the replay listener map rather
  //than compose it, so neither of them ever heard about an analysis change.
  //Setting the analysis drew nothing, and clearing it left the markers up.
  for (const mode of [playerModes.REPLAY, playerModes.EDIT, playerModes.PLAY]) {

    it(`renders the overlay in ${mode} mode`, () => {
      const player = load(mode)
      player.setConfig('showAnalysis', true)
      player.setAnalysis(moves)

      expect(player.board.get(boardLayerTypes.AI, 4, 4).type)
        .toBe(markupTypes.CANDIDATE)
    })

    it(`takes the overlay down again in ${mode} mode`, () => {
      const player = load(mode)
      player.setConfig('showAnalysis', true)
      player.setAnalysis(moves)
      player.clearAnalysis()

      expect(player.board.get(boardLayerTypes.AI, 4, 4)).toBeUndefined()
    })
  }

  it('keeps play mode off the navigation listeners', () => {

    //Composing the map must not quietly hand play mode the keyboard and mouse
    //wheel, which it leaves out on purpose
    const listeners = load(playerModes.PLAY)
      .getModeHandler(playerModes.PLAY)
      .getEventListeners()

    expect(listeners.keydown).toBeUndefined()
    expect(listeners.wheel).toBeUndefined()
    expect(listeners.analysisChange).toBe('onAnalysisChange')
    expect(listeners.gridEnter).toBe('onGridEnter')
  })

  it('keeps edit mode on its own listeners as well as the inherited ones', () => {
    const listeners = load(playerModes.EDIT)
      .getModeHandler(playerModes.EDIT)
      .getEventListeners()

    expect(listeners.analysisChange).toBe('onAnalysisChange')
    expect(listeners.mousemove).toBe('onMouseMove')
    expect(listeners.keydown).toBe('onKeyDown')
  })
})

describe('Replay mode ko marker', () => {

  //A 9x9 game that walks into a simple ko: black's last move on (3,3) takes
  //white's stone off (4,3), which white may not take straight back
  const sgf = '(;GM[1]FF[4]SZ[9];B[fd];W[ed];B[ec];W[cd];B[ee];W[dc];B[hh];W[de];B[dd])'

  let player
  let board

  const load = data => {
    player = new Player()
    board = player.board
    board.createLayers()
    player.loadData(data)
    player.goToLastPosition()
  }

  beforeEach(() => load(sgf))

  const markupAt = (x, y) => board.get(boardLayerTypes.MARKUP, x, y)

  it('marks the ko point with a square', () => {
    expect(player.game.getKoPoint()).toEqual({x: 4, y: 3, color: stoneColors.WHITE})
    expect(markupAt(4, 3).type).toBe(markupTypes.SQUARE)
  })

  it('shows nothing when it is turned off', () => {
    player.setConfig('showKo', false)
    expect(markupAt(4, 3)).toBeUndefined()
  })

  it('follows the ko back and forward through the game', () => {
    player.goToPreviousPosition()
    expect(markupAt(4, 3)).toBeUndefined()

    player.goToNextPosition()
    expect(markupAt(4, 3).type).toBe(markupTypes.SQUARE)
  })

  it('marks nothing at a position without a ko in it', () => {
    load('(;GM[1]FF[4]SZ[9];B[cc];W[gg];B[cg])')
    expect(player.game.hasKoPoint()).toBe(false)
    expect(markupAt(4, 3)).toBeUndefined()
  })

  it('stays out of the way of markup the record itself carries', () => {

    //The record marks the ko point with a triangle of its own
    load('(;GM[1]FF[4]SZ[9];B[fd];W[ed];B[ec];W[cd];B[ee];W[dc];B[hh];W[de];B[dd]TR[ed])')

    expect(player.game.hasKoPoint()).toBe(true)
    expect(markupAt(4, 3).type).toBe(markupTypes.TRIANGLE)
  })

  it('leaves the game record alone', () => {

    //The marker is a board overlay, the same as the last move marker. Writing
    //it into the node would put it in the saved record.
    expect(player.game.getCurrentNode().markup).toBeUndefined()
    expect(player.game.toSgf()).not.toContain('SQ')
  })
})

describe('Replay mode ownership heat map', () => {

  //Ownership only comes back on the deeper analysis tiers, so the last node
  //here stands in for a position that was analysed without it
  const sgf = '(;GM[1]FF[4]SZ[9];B[cc];W[gg])'
  const ownership = new Int8Array(81).fill(100)
  const moves = [
    {winrate: 0.5, candidates: [], ownership},
    {winrate: 0.5, candidates: [], ownership},
    {winrate: 0.5, candidates: []},
  ]

  let player
  let board

  beforeEach(() => {
    player = new Player()
    board = player.board
    board.createLayers()
    player.loadData(sgf)
  })

  const analysisLayer = () => board.getLayer(boardLayerTypes.ANALYSIS)

  it('is off by default, even with the candidates showing', () => {
    player.setConfig('showAnalysis', true)
    player.setAnalysis(moves)

    expect(analysisLayer().ownership).toBeNull()
  })

  it('shows once both flags are on', () => {
    player.setConfig('showAnalysis', true)
    player.setConfig('showAnalysisOwnership', true)
    player.setAnalysis(moves)

    expect(analysisLayer().ownership).toBe(ownership)
  })

  it('needs the overlay itself to be on', () => {
    player.setConfig('showAnalysisOwnership', true)
    player.setAnalysis(moves)

    expect(analysisLayer().ownership).toBeNull()
  })

  it('comes off the board again when it is turned off', () => {
    player.setConfig('showAnalysis', true)
    player.setConfig('showAnalysisOwnership', true)
    player.setAnalysis(moves)
    player.setConfig('showAnalysisOwnership', false)

    expect(analysisLayer().ownership).toBeNull()
  })

  it('comes off when moving to a position that has none', () => {
    player.setConfig('showAnalysis', true)
    player.setConfig('showAnalysisOwnership', true)
    player.setAnalysis([...moves, {winrate: 0.5, candidates: []}])
    player.goToLastPosition()

    expect(analysisLayer().ownership).toBeNull()
  })
})

describe('Replay mode auto play', () => {

  //A five move game, so there is somewhere to auto play to
  const sgf = '(;GM[1]FF[4]SZ[9];B[cc];W[gg];B[cg];W[gc];B[ee])'

  const load = (config = {}) => {
    const player = new Player(config)
    player.board.createLayers()
    player.loadData(sgf)
    return {player, replay: player.getModeHandler(playerModes.REPLAY)}
  }

  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('steps to the next position as soon as it starts', () => {
    const {player} = load()
    player.startAutoPlay()

    expect(player.game.getCurrentMoveNumber()).toBe(1)
  })

  it('waits for the delay when told not to start immediately', () => {
    const {player} = load({autoPlayStartsImmediately: false})
    player.startAutoPlay()

    expect(player.game.getCurrentMoveNumber()).toBe(0)

    vi.advanceTimersByTime(1000)
    expect(player.game.getCurrentMoveNumber()).toBe(1)
  })

  it('keeps stepping on the configured delay', () => {
    const {player} = load({autoPlayDelay: 500})
    player.startAutoPlay()

    vi.advanceTimersByTime(500)
    expect(player.game.getCurrentMoveNumber()).toBe(2)

    vi.advanceTimersByTime(500)
    expect(player.game.getCurrentMoveNumber()).toBe(3)
  })

  it('says when it starts and when it stops', () => {
    const {player} = load()
    const listener = vi.fn()
    player.on('autoPlayToggle', listener)

    player.startAutoPlay()
    player.stopAutoPlay()

    expect(listener.mock.calls.map(call => call[0].detail)).toEqual([
      {isAutoPlaying: true},
      {isAutoPlaying: false},
    ])
  })

  it('says so each time it plays a move', () => {
    const {player} = load({autoPlayDelay: 500})
    const listener = vi.fn()
    player.on('autoPlayed', listener)

    player.startAutoPlay()
    vi.advanceTimersByTime(1000)

    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('does not start twice over', () => {
    const {player, replay} = load()
    player.startAutoPlay()
    player.startAutoPlay()

    expect(player.game.getCurrentMoveNumber()).toBe(1)
    expect(replay.isAutoPlaying).toBe(true)
  })

  it('will not start at the end of the record', () => {
    const {player, replay} = load()
    player.goToLastPosition()

    player.startAutoPlay()

    expect(replay.isAutoPlaying).toBe(false)
    expect(replay.autoPlayTimeout).toBeNull()
  })

  it('stops of its own accord when it runs out of record', () => {
    const {player, replay} = load({autoPlayDelay: 100})
    player.startAutoPlay()
    vi.advanceTimersByTime(1000)

    expect(player.game.getCurrentMoveNumber()).toBe(5)
    expect(replay.isAutoPlaying).toBe(false)
  })

  it('stops when asked, leaving no timer behind', () => {
    const {player, replay} = load()
    player.startAutoPlay()

    player.stopAutoPlay()

    expect(replay.isAutoPlaying).toBe(false)
    expect(replay.autoPlayTimeout).toBeNull()

    vi.advanceTimersByTime(5000)
    expect(player.game.getCurrentMoveNumber()).toBe(1)
  })

  it('says it stopped even when it was never going', () => {

    //NOTE: pinning current behaviour. stopAutoPlay raises the event without
    //checking the flag, and deactivate() calls it, so a consumer wiring a
    //play button to this event is told "stopped" on every mode change.
    const {player} = load()
    const listener = vi.fn()
    player.on('autoPlayToggle', listener)

    player.stopAutoPlay()

    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener.mock.calls[0][0].detail).toEqual({isAutoPlaying: false})
  })

  it('toggles on and off again', () => {
    const {player, replay} = load()

    player.toggleAutoPlay()
    expect(replay.isAutoPlaying).toBe(true)

    player.toggleAutoPlay()
    expect(replay.isAutoPlaying).toBe(false)
  })

  it('stops when the user navigates away from the end', () => {
    const {player, replay} = load({autoPlayDelay: 100})
    player.startAutoPlay()
    player.goToLastPosition()

    expect(replay.isAutoPlaying).toBe(false)
  })

  it('runs from the keyboard actions as well', () => {
    const {replay} = load()

    expect(replay.processAction(playerActions.START_AUTO_PLAY)).toBe(true)
    expect(replay.isAutoPlaying).toBe(true)

    expect(replay.processAction(playerActions.STOP_AUTO_PLAY)).toBe(true)
    expect(replay.isAutoPlaying).toBe(false)

    expect(replay.processAction(playerActions.TOGGLE_AUTO_PLAY)).toBe(true)
    expect(replay.isAutoPlaying).toBe(true)
  })

  it('stops when the mode is left', () => {
    const {player, replay} = load()
    player.startAutoPlay()

    player.setMode(playerModes.EDIT)

    expect(replay.isAutoPlaying).toBe(false)
    expect(replay.autoPlayTimeout).toBeNull()
  })
})

describe('Replay mode navigation', () => {

  //A record that forks at the third move, so a variation can be picked
  const sgf = '(;GM[1]FF[4]SZ[9];B[cc];W[gg](;B[cg];W[gc])(;B[gc]))'

  const load = (config = {}) => {
    const player = new Player(config)
    player.board.createLayers()
    player.board.setDrawSize(600, 600)
    player.loadData(sgf)
    return {player, replay: player.getModeHandler(playerModes.REPLAY)}
  }

  it('steps forward on a click anywhere empty', () => {
    const {player, replay} = load()
    replay.onClick({detail: {x: 0, y: 8}})

    expect(player.game.getCurrentMoveNumber()).toBe(1)
  })

  it('ignores a click off the board', () => {
    const {player, replay} = load()
    replay.onClick({detail: {x: -1, y: -1}})

    expect(player.game.getCurrentMoveNumber()).toBe(0)
  })

  it('takes a click on a variation as a variation, not as a step forward', () => {
    const {player, replay} = load()
    player.goToNextPosition()
    player.goToNextPosition()
    const spy = vi.spyOn(replay, 'selectMoveVariation')

    replay.onClick({detail: {x: 6, y: 2}})

    expect(spy).toHaveBeenCalledWith(6, 2)
  })

  it('works out which variation was clicked', () => {
    const {player} = load()
    player.goToNextPosition()
    player.goToNextPosition()

    expect(player.game.getMoveVariationIndex(2, 6)).toBe(0)
    expect(player.game.getMoveVariationIndex(6, 2)).toBe(1)
  })

  it('follows the selected path rather than the variation clicked', () => {

    //NOTE: pinning current behaviour, and it is a bug. selectMoveVariation
    //works out the index of the variation that was clicked and hands it to
    //Player#goToNextPosition, which takes no arguments and always follows
    //the currently selected path. Clicking B walks down A. See
    //KNOWN_ISSUES.md.
    const {player, replay} = load()
    player.goToNextPosition()
    player.goToNextPosition()

    replay.onClick({detail: {x: 6, y: 2}})

    expect(player.game.getCurrentNode().move).toEqual({
      color: stoneColors.BLACK, x: 2, y: 6,
    })
  })

  it('runs the action a key is bound to', () => {
    const {player} = load({
      keyBindings: [
        {key: 'ArrowRight', action: playerActions.GO_TO_NEXT_POSITION},
      ],
    })

    player.triggerEvent('keydown', {
      nativeEvent: {
        key: 'ArrowRight',
        ctrlKey: false, shiftKey: false, altKey: false, metaKey: false,
        preventDefault: vi.fn(),
      },
    })

    expect(player.game.getCurrentMoveNumber()).toBe(1)
  })

  it('does nothing for a key bound to nothing', () => {
    const {player} = load({
      keyBindings: [
        {key: 'ArrowRight', action: playerActions.GO_TO_NEXT_POSITION},
      ],
    })

    player.triggerEvent('keydown', {
      nativeEvent: {
        key: 'q',
        ctrlKey: false, shiftKey: false, altKey: false, metaKey: false,
        preventDefault: vi.fn(),
      },
    })

    expect(player.game.getCurrentMoveNumber()).toBe(0)
  })

  it('steps forward on a wheel down and back on a wheel up', () => {
    const {player} = load()

    player.triggerEvent('wheel', {
      nativeEvent: {deltaY: 1, preventDefault: vi.fn()},
    })
    expect(player.game.getCurrentMoveNumber()).toBe(1)

    player.triggerEvent('wheel', {
      nativeEvent: {deltaY: -1, preventDefault: vi.fn()},
    })
    expect(player.game.getCurrentMoveNumber()).toBe(0)
  })

  it('does nothing for a wheel event bound to nothing', () => {
    const {player} = load({mouseBindings: []})

    player.triggerEvent('wheel', {
      nativeEvent: {deltaY: 1, preventDefault: vi.fn()},
    })

    expect(player.game.getCurrentMoveNumber()).toBe(0)
  })

  it('clears the hover on the wheel, bound or not', () => {

    //The board moves under the cursor, so whatever was being previewed on
    //the point the cursor is over is no longer what would happen there
    const {player, replay} = load()
    const spy = vi.spyOn(player.board, 'clearHoverLayer')

    replay.onMouseWheel({
      detail: {nativeEvent: {deltaY: 1, preventDefault: vi.fn()}},
    })

    expect(spy).toHaveBeenCalled()
  })

  it('forgets which variation was taken when told not to remember', () => {
    const {player} = load({rememberVariationPaths: false})
    player.goToNextPosition()
    player.goToNextPosition()
    player.selectNextVariation()

    expect(player.game.getCurrentPathIndex()).toBe(1)

    player.goToPreviousPosition()
    expect(player.game.getCurrentPathIndex()).toBe(0)
  })
})

describe('Replay mode move numbering', () => {

  //Two moves on the main line and a two move variation off the first, so
  //that both the variation numbering and the whole game numbering have
  //something to count
  const sgf = '(;GM[1]FF[4]SZ[9];B[cc](;W[gg];B[cg])(;W[gc]))'

  const load = (config = {}) => {
    const player = new Player(config)
    player.board.createLayers()
    player.loadData(sgf)
    return player
  }

  const markupAt = (player, x, y) =>
    player.board.get(boardLayerTypes.MARKUP, x, y)

  it('numbers every move when asked to', () => {
    const player = load({showAllMoveNumbers: true})
    player.goToLastPosition()

    expect(markupAt(player, 2, 2).number).toBe(1)
    expect(markupAt(player, 6, 6).number).toBe(2)
    expect(markupAt(player, 2, 6).number).toBe(3)
  })

  it('numbers the moves of a variation once one is being followed', () => {

    //Numbering starts at the fork, so the main line move before it goes
    //unnumbered while the two moves of the branch count from one
    const player = load()
    player.goToNextPosition()
    player.selectNextVariation()
    player.goToNextPosition()

    expect(markupAt(player, 2, 2)).toBeUndefined()
    expect(markupAt(player, 6, 2).number).toBe(1)
  })

  it('numbers nothing on the main line, which is not a variation', () => {
    const player = load()
    player.goToLastPosition()

    expect(markupAt(player, 6, 6)).toBeUndefined()
    expect(markupAt(player, 2, 6).type).toBe(markupTypes.LAST_MOVE)
  })

  it('numbers just the last move when asked to', () => {
    const player = load({
      showVariationMoveNumbers: false,
      showLastMoveNumber: true,
    })
    player.goToLastPosition()

    expect(markupAt(player, 2, 6).number).toBe(3)
    expect(markupAt(player, 6, 6)).toBeUndefined()
  })

  it('numbers nothing at the root, which is no move', () => {
    const player = load({
      showVariationMoveNumbers: false,
      showLastMoveNumber: true,
    })

    expect(markupAt(player, 2, 2)).toBeUndefined()
  })

  it('marks the last move with a circle when numbering is off', () => {
    const player = load({showVariationMoveNumbers: false})
    player.goToLastPosition()

    expect(markupAt(player, 2, 6).type).toBe(markupTypes.LAST_MOVE)
  })

  it('leaves the record own markup standing over a number', () => {
    const player = load({showAllMoveNumbers: true})
    player.loadData('(;GM[1]FF[4]SZ[9];B[cc];W[gg]TR[cc])')
    player.goToLastPosition()

    expect(markupAt(player, 2, 2).type).toBe(markupTypes.TRIANGLE)
  })

  it('takes the numbers off again when the setting is turned off', () => {
    const player = load({showAllMoveNumbers: true})
    player.goToLastPosition()

    player.setConfig('showAllMoveNumbers', false)

    expect(markupAt(player, 2, 2)).toBeUndefined()
  })
})

describe('Replay mode variation markers', () => {

  const sgf = '(;GM[1]FF[4]SZ[9];B[cc](;W[gg])(;W[gc]))'

  const load = (config = {}, data = sgf) => {
    const player = new Player(config)
    player.board.createLayers()
    player.loadData(data)
    return player
  }

  const markupAt = (player, x, y) =>
    player.board.get(boardLayerTypes.MARKUP, x, y)

  it('letters each continuation from a fork', () => {
    const player = load()
    player.goToNextPosition()

    expect(markupAt(player, 6, 6).type).toBe(markupTypes.VARIATION)
    expect(markupAt(player, 6, 6).index).toBe(0)
    expect(markupAt(player, 6, 2).index).toBe(1)
  })

  it('marks which of them the path is on', () => {
    const player = load()
    player.goToNextPosition()

    expect(markupAt(player, 6, 6).isSelected).toBe(true)
    expect(markupAt(player, 6, 2).isSelected).toBe(false)
  })

  it('shows none when variations are turned off', () => {
    const player = load({showVariations: false})
    player.goToNextPosition()

    expect(markupAt(player, 6, 6)).toBeUndefined()
  })

  it('marks a single continuation when asked to show the next move', () => {

    //One continuation is not a fork, so it only appears if the next move is
    //what was asked for, and then without a letter to tell it apart
    const player = load(
      {showVariations: false, showNextMove: true},
      '(;GM[1]FF[4]SZ[9];B[cc];W[gg])'
    )
    player.goToNextPosition()
    player.goToPreviousPosition()

    expect(markupAt(player, 2, 2).type).toBe(markupTypes.VARIATION)
    expect(markupAt(player, 2, 2).showText).toBe(false)
  })

  it('shows nothing at all until something has been navigated', () => {

    //NOTE: pinning current behaviour, and it looks like a bug. Loading a
    //record suppresses the path change event on purpose, and the replay
    //mode's game load handler only stops auto play, so nothing renders the
    //markers. A record whose opening position forks shows no letters until
    //the user moves off it and back. See KNOWN_ISSUES.md.
    const player = load({}, '(;GM[1]FF[4]SZ[9](;B[cc])(;B[gg]))')

    expect(markupAt(player, 2, 2)).toBeUndefined()
    expect(markupAt(player, 6, 6)).toBeUndefined()

    player.goToNextPosition()
    player.goToPreviousPosition()

    expect(markupAt(player, 2, 2).type).toBe(markupTypes.VARIATION)
  })

  it('marks the sibling variations of the move just played', () => {
    const player = load({showSiblingVariations: true})
    player.goToNextPosition()
    player.goToNextPosition()

    expect(markupAt(player, 6, 2).type).toBe(markupTypes.VARIATION)
  })

  it('stays off a point that already has a stone', () => {

    //A sibling variation can point at a place the game has since played
    const player = load(
      {showSiblingVariations: true},
      '(;GM[1]FF[4]SZ[9];B[cc](;W[gg];B[gc])(;W[gc]))'
    )
    player.goToLastPosition()

    expect(player.game.hasStone(6, 2)).toBe(true)
    expect(markupAt(player, 6, 2).type).not.toBe(markupTypes.VARIATION)
  })

  it('leaves the record own markup standing', () => {
    const player = load({}, '(;GM[1]FF[4]SZ[9];B[cc]TR[gg](;W[gg])(;W[gc]))')
    player.goToNextPosition()

    expect(markupAt(player, 6, 6).type).toBe(markupTypes.TRIANGLE)
    expect(markupAt(player, 6, 2).type).toBe(markupTypes.VARIATION)
  })
})
