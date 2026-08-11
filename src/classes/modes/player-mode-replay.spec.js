import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest'
import Player from '../player.js'
import {boardLayerTypes} from '../../constants/board.js'
import {markupTypes} from '../../constants/markup.js'
import {playerModes} from '../../constants/player.js'

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
})

describe('Replay mode analysis overlay', () => {

  //A three move game. The board is small enough to keep the fixtures below
  //readable, and the candidates all sit on empty points.
  const sgf = '(;GM[1]FF[4]SZ[9];B[cc];W[gg];B[cg])'

  /**
   * Build a candidate as the API stores it, being a point with what it gives
   * up in win rate against the best one
   */
  const candidate = (x, y, winrate) => ({
    x, y,
    winrate: 0.5 - winrate,
    scoreLead: -winrate * 20,
    visits: 100,
    prior: 0.1,
    loss: {winrate, score: winrate * 20},
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
    analysis([candidate(4, 4, 0), candidate(2, 2, 0.03)]),
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

  const markupAt = (x, y) => board.get(boardLayerTypes.MARKUP, x, y)

  it('shows nothing until it is asked to', () => {
    player.setAnalysis(moves)
    expect(markupAt(4, 4)).toBeUndefined()
  })

  it('marks up each candidate for the position it is at', () => {
    player.setConfig('showAnalysis', true)
    player.setAnalysis(moves)

    expect(markupAt(4, 4).type).toBe(markupTypes.CANDIDATE)
    expect(markupAt(2, 2).type).toBe(markupTypes.CANDIDATE)
  })

  it('shows the candidates for this position, not for the move that reached it', () => {

    //NOTE: this is the one that fails silently. A whole game of candidates one
    //node out of step is a coherent, plausible overlay of the wrong position.
    player.setConfig('showAnalysis', true)
    player.setAnalysis(moves)
    player.goToNextPosition()

    expect(markupAt(6, 6).type).toBe(markupTypes.CANDIDATE)
    expect(markupAt(6, 2).type).toBe(markupTypes.CANDIDATE)
    expect(markupAt(4, 4)).toBeUndefined()
    expect(markupAt(2, 6)).toBeUndefined()
  })

  it('ranks the candidates by the order the engine gave them', () => {
    player.setConfig('showAnalysis', true)
    player.setAnalysis(moves)

    expect(markupAt(4, 4).isBest).toBe(true)
    expect(markupAt(2, 2).isBest).toBe(false)
    expect(markupAt(2, 2).index).toBe(1)
  })

  it('hands each marker its own loss to colour itself by', () => {
    player.setConfig('showAnalysis', true)
    player.setAnalysis(moves)

    expect(markupAt(4, 4).winrateLoss).toBe(0)
    expect(markupAt(2, 2).winrateLoss).toBe(0.03)
  })

  it('leaves a single candidate unnumbered', () => {
    player.setConfig('showAnalysis', true)
    player.setAnalysis(moves)
    player.goToLastPosition()

    expect(markupAt(7, 7).showText).toBe(false)
  })

  it('takes the markers off again when the overlay is turned off', () => {
    player.setConfig('showAnalysis', true)
    player.setAnalysis(moves)
    player.setConfig('showAnalysis', false)

    expect(markupAt(4, 4)).toBeUndefined()
  })

  it('takes them off again when the analysis is cleared', () => {
    player.setConfig('showAnalysis', true)
    player.setAnalysis(moves)
    player.clearAnalysis()

    expect(markupAt(4, 4)).toBeUndefined()
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
    expect(markupAt(2, 2).type).toBe(markupTypes.CANDIDATE)
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
