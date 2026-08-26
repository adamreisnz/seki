import {createHash} from 'node:crypto'
import {describe, it, expect, vi, afterEach} from 'vitest'
import ConvertFromSgf from './convert-from-sgf.js'
import {stoneColors} from '../../constants/stone.js'
import {markupTypes} from '../../constants/markup.js'
import {sgfDiagnosticCodes} from '../../constants/sgf.js'
import {defaultGameInfo} from '../../constants/defaults.js'
import {
  loadFixture, loadFixtureBytes, replayMainLine, countNodes, countForks
} from '../../../test/fixtures.js'

const parse = sgf => new ConvertFromSgf().convert(sgf)

//Read a record and keep hold of what the reader had to say about it
const read = sgf => {
  const converter = new ConvertFromSgf()
  const game = converter.convert(sgf)
  return {game, diagnostics: converter.getDiagnostics()}
}

afterEach(() => {
  vi.restoreAllMocks()
})
describe('ConvertFromSgf, invalid input', () => {

  it('rejects empty input', () => {
    expect(() => parse('')).toThrow('No SGF data supplied')
  })

  it('reports a parse failure instead of crashing on non SGF input', () => {
    //This used to throw "sequence is not iterable", which is neither the
    //documented error nor something a caller can act on
    expect(() => parse('not an sgf file at all')).toThrow(/Unable to parse SGF data/)
  })

  it('reports a parse failure for HTML served in place of a record', () => {
    expect(() => parse('<html><body>404</body></html>')).toThrow(/Unable to parse SGF data/)
  })

  it('reports a parse failure when there is no game tree to read', () => {
    expect(() => parse(')))')).toThrow(/Unable to parse SGF data/)
  })

  it('handles an empty game tree', () => {
    const game = parse('(;FF[4]SZ[19])')
    expect(game.root.hasChildren()).toBe(false)
  })
})

describe('ConvertFromSgf, coordinates', () => {

  it('parses lowercase coordinates', () => {
    const game = parse('(;FF[4]SZ[19];B[dd])')
    expect(game.root.getChild(0).move).toMatchObject({x: 3, y: 3})
  })

  it('parses uppercase coordinates for boards larger than 26', () => {
    const game = parse('(;FF[4]SZ[38];B[aA];W[Zz])')
    expect(game.root.getChild(0).move).toMatchObject({x: 0, y: 26})
    expect(game.root.getChild(0).getChild(0).move).toMatchObject({x: 51, y: 25})
  })

  it('skips an empty setup coordinate rather than storing NaN', () => {
    vi.spyOn(console, 'warn').mockImplementation(vi.fn())
    const game = parse('(;FF[4]SZ[19]AB[])')
    expect(game.root.setup).toBeUndefined()
  })

  it('skips a truncated coordinate', () => {
    vi.spyOn(console, 'warn').mockImplementation(vi.fn())
    const game = parse('(;FF[4]SZ[19]AB[a])')
    expect(game.root.setup).toBeUndefined()
  })

  it('skips coordinates outside the coordinate alphabet', () => {
    vi.spyOn(console, 'warn').mockImplementation(vi.fn())
    const game = parse('(;FF[4]SZ[19]AB[!!])')
    expect(game.root.setup).toBeUndefined()
  })

  it('keeps the valid coordinates from a mixed list', () => {
    vi.spyOn(console, 'warn').mockImplementation(vi.fn())
    const game = parse('(;FF[4]SZ[19]AB[aa][][bb])')
    expect(game.root.setup).toEqual([
      {type: stoneColors.BLACK, coords: [{x: 0, y: 0}, {x: 1, y: 1}]},
    ])
  })

  it('does not put NaN coordinates on the game position', () => {
    vi.spyOn(console, 'warn').mockImplementation(vi.fn())
    const game = parse('(;FF[4]SZ[19]AB[])')
    game.goToFirstPosition()
    for (const {x, y} of game.getPosition().stones.getAll()) {
      expect(Number.isInteger(x)).toBe(true)
      expect(Number.isInteger(y)).toBe(true)
    }
  })

  it('treats an empty move value as a pass', () => {
    const game = parse('(;FF[4]SZ[19];B[])')
    expect(game.root.getChild(0).isPassMove()).toBe(true)
  })

  it('treats tt as a pass on boards up to 19', () => {
    const game = parse('(;FF[4]SZ[19];B[tt])')
    expect(game.root.getChild(0).isPassMove()).toBe(true)
  })

  it('treats tt as a real move on a large board', () => {
    const game = parse('(;FF[4]SZ[38];B[tt])')
    expect(game.root.getChild(0).isPassMove()).toBe(false)
    expect(game.root.getChild(0).move).toMatchObject({x: 19, y: 19})
  })
})

describe('ConvertFromSgf, compressed point lists', () => {

  it('expands a rectangle of setup stones', () => {
    const game = parse('(;FF[4]SZ[9]AB[aa:cc])')
    expect(game.root.setup).toEqual([
      {
        type: stoneColors.BLACK,
        coords: [
          {x: 0, y: 0}, {x: 0, y: 1}, {x: 0, y: 2},
          {x: 1, y: 0}, {x: 1, y: 1}, {x: 1, y: 2},
          {x: 2, y: 0}, {x: 2, y: 1}, {x: 2, y: 2},
        ],
      },
    ])
  })

  it('expands a rectangle of markup', () => {
    const game = parse('(;FF[4]SZ[9]TR[gg:hh])')
    expect(game.root.markup).toEqual([
      {
        type: markupTypes.TRIANGLE,
        coords: [
          {x: 6, y: 6}, {x: 6, y: 7},
          {x: 7, y: 6}, {x: 7, y: 7},
        ],
      },
    ])
  })

  it('expands a rectangle of territory', () => {
    const game = parse('(;FF[4]SZ[9]TW[aa:ab])')
    expect(game.root.score).toEqual([
      {
        color: stoneColors.WHITE,
        coords: [{x: 0, y: 0}, {x: 0, y: 1}],
      },
    ])
  })

  it('expands a rectangle given with its corners reversed', () => {
    const reversed = parse('(;FF[4]SZ[9]AB[cc:aa])')
    const forwards = parse('(;FF[4]SZ[9]AB[aa:cc])')
    expect(reversed.root.setup).toEqual(forwards.root.setup)
  })

  it('expands a one point rectangle to a single point', () => {
    const game = parse('(;FF[4]SZ[9]AB[aa:aa])')
    expect(game.root.setup).toEqual([
      {type: stoneColors.BLACK, coords: [{x: 0, y: 0}]},
    ])
  })

  it('expands a single row', () => {
    const game = parse('(;FF[4]SZ[9]AB[aa:ca])')
    expect(game.root.setup).toEqual([
      {
        type: stoneColors.BLACK,
        coords: [{x: 0, y: 0}, {x: 1, y: 0}, {x: 2, y: 0}],
      },
    ])
  })

  it('expands a single column', () => {
    const game = parse('(;FF[4]SZ[9]AB[aa:ac])')
    expect(game.root.setup).toEqual([
      {
        type: stoneColors.BLACK,
        coords: [{x: 0, y: 0}, {x: 0, y: 1}, {x: 0, y: 2}],
      },
    ])
  })

  it('expands a rectangle with uppercase corners on a board larger than 26', () => {
    const game = parse('(;FF[4]SZ[38]AB[aA:bB])')
    expect(game.root.setup).toEqual([
      {
        type: stoneColors.BLACK,
        coords: [
          {x: 0, y: 26}, {x: 0, y: 27},
          {x: 1, y: 26}, {x: 1, y: 27},
        ],
      },
    ])
  })

  it('places every stone of a rectangle on the game position', () => {
    const game = parse('(;FF[4]SZ[9]AB[aa:cc])')
    game.goToFirstPosition()
    expect(game.getPosition().stones.getAll()).toHaveLength(9)
  })

  it('skips a rectangle with an invalid corner', () => {
    vi.spyOn(console, 'warn').mockImplementation(vi.fn())
    const game = parse('(;FF[4]SZ[9]AB[aa:!!])')
    expect(game.root.setup).toBeUndefined()
  })

  it('still reads a label as a point and its text', () => {
    //LB values are point:text, so this colon is a label separator and must
    //not be read as marking out a rectangle
    const game = parse('(;FF[4]SZ[9]LB[aa:A][bb:hello])')
    expect(game.root.markup).toEqual([
      {
        type: markupTypes.LABEL,
        coords: [
          {x: 0, y: 0, text: 'A'},
          {x: 1, y: 1, text: 'hello'},
        ],
      },
    ])
  })
})

describe('ConvertFromSgf, cut off', () => {

  it('parses a cut off on each side from the legacy X properties', () => {
    const game = parse('(;FF[4]SZ[19]XL[1]XR[2]XT[3]XB[4])')
    expect(game.getBoardCutOff()).toEqual({
      cutOffLeft: 1,
      cutOffRight: 2,
      cutOffTop: 3,
      cutOffBottom: 4,
    })
  })

  it('ignores a BadukPop territory estimate written to XT', () => {
    //XT is a private property and BadukPop uses it for its territory
    //estimate, one signed decimal per intersection. Parsed as a cut off this
    //came out as -1, which grew a 19x19 board to 19x20
    const game = parse('(;FF[4]SZ[19]AP[BadukPop]XT[-1,-0.99,1,0.71,-1])')
    expect(game.getBoardSize()).toEqual({width: 19, height: 19})
    expect(game.getBoardCutOff().cutOffTop).toBe(0)
  })

  it('ignores a negative cut off', () => {
    const game = parse('(;FF[4]SZ[19]XT[-1])')
    expect(game.getBoardCutOff().cutOffTop).toBe(0)
  })

  it('ignores a non numeric cut off', () => {
    const game = parse('(;FF[4]SZ[19]XL[none])')
    expect(game.getBoardCutOff().cutOffLeft).toBe(0)
  })

  it('ignores a fractional cut off', () => {
    const game = parse('(;FF[4]SZ[19]XB[1.5])')
    expect(game.getBoardCutOff().cutOffBottom).toBe(0)
  })
})

describe('ConvertFromSgf, board view', () => {

  it('reads a compressed view into a cut off on each side', () => {
    const game = parse('(;FF[4]SZ[19]VW[bd:qo])')
    expect(game.getBoardCutOff()).toEqual({
      cutOffLeft: 1,
      cutOffRight: 2,
      cutOffTop: 3,
      cutOffBottom: 4,
    })
  })

  it('reads a view written out point by point', () => {
    //A point list may name every point instead of compressing it, so this
    //is the same 2x2 corner as VW[aa:bb]
    const game = parse('(;FF[4]SZ[9]VW[aa][ba][ab][bb])')
    expect(game.getBoardCutOff()).toEqual({
      cutOffLeft: 0,
      cutOffRight: 7,
      cutOffTop: 0,
      cutOffBottom: 7,
    })
  })

  it('reads a view given as several rectangles', () => {
    const game = parse('(;FF[4]SZ[19]VW[aa:cc][qq:ss])')
    expect(game.getBoardCutOff()).toEqual({
      cutOffLeft: 0,
      cutOffRight: 0,
      cutOffTop: 0,
      cutOffBottom: 0,
    })
  })

  it('degrades a non rectangular view to its bounding box', () => {
    //Seki crops with four cut off amounts, so an L shape is the one thing a
    //view can be that it has no way to hold. The points left out of the box
    //come back rather than the view being dropped
    const game = parse('(;FF[4]SZ[9]VW[cc][dc][ec][cd][ce])')
    expect(game.getBoardCutOff()).toEqual({
      cutOffLeft: 2,
      cutOffRight: 4,
      cutOffTop: 2,
      cutOffBottom: 4,
    })
  })

  it('lets a view override the legacy X properties, whichever comes first', () => {
    const cutOff = {
      cutOffLeft: 2,
      cutOffRight: 2,
      cutOffTop: 2,
      cutOffBottom: 2,
    }
    expect(parse('(;FF[4]SZ[19]XL[1]XR[2]XT[3]XB[4]VW[cc:qq])')
      .getBoardCutOff()).toEqual(cutOff)
    expect(parse('(;FF[4]SZ[19]VW[cc:qq]XL[1]XR[2]XT[3]XB[4])')
      .getBoardCutOff()).toEqual(cutOff)
  })

  it('reads an empty view as the whole board, clearing the X properties', () => {
    const game = parse('(;FF[4]SZ[19]XL[1]XR[2]XT[3]XB[4]VW[])')
    expect(game.getBoardCutOff()).toEqual({
      cutOffLeft: 0,
      cutOffRight: 0,
      cutOffTop: 0,
      cutOffBottom: 0,
    })
  })

  it('measures a view against the board size however they are ordered', () => {
    //The cut off on the right and at the bottom is measured from the far
    //edge, so a view read before SZ still has to come out against SZ
    const game = parse('(;FF[4]VW[cc:qq]SZ[38])')
    expect(game.getBoardCutOff()).toEqual({
      cutOffLeft: 2,
      cutOffRight: 21,
      cutOffTop: 2,
      cutOffBottom: 21,
    })
  })

  it('measures a view against 19x19 when the record gives no size', () => {
    const game = parse('(;FF[4]VW[cc:qq])')
    expect(game.getBoardCutOff()).toEqual({
      cutOffLeft: 2,
      cutOffRight: 2,
      cutOffTop: 2,
      cutOffBottom: 2,
    })
  })

  it('does not cut off a negative number of lines for a view off the board', () => {
    const game = parse('(;FF[4]SZ[9]VW[cc:qq])')
    expect(game.getBoardCutOff()).toEqual({
      cutOffLeft: 2,
      cutOffRight: 0,
      cutOffTop: 2,
      cutOffBottom: 0,
    })
  })

  it('ignores a view set part way through a game', () => {
    //VW is inheritable in SGF and applies from its node down, but seki holds
    //the cut off as board wide configuration with nowhere to put a view that
    //only covers part of the game
    const game = parse('(;FF[4]SZ[19];B[dd]VW[cc:qq];W[pp])')
    expect(game.getBoardCutOff()).toEqual({
      cutOffLeft: 0,
      cutOffRight: 0,
      cutOffTop: 0,
      cutOffBottom: 0,
    })
  })

  it('leaves the cut off alone for a view of nothing but rubbish', () => {
    vi.spyOn(console, 'warn').mockImplementation(vi.fn())
    const game = parse('(;FF[4]SZ[19]XL[1]VW[!!])')
    expect(game.getBoardCutOff().cutOffLeft).toBe(1)
  })

  it('reads a view per game in a collection', () => {
    const games = new ConvertFromSgf()
      .convertAll('(;FF[4]SZ[19]VW[cc:qq])(;FF[4]SZ[19])')
    expect(games[0].getBoardCutOff().cutOffLeft).toBe(2)
    expect(games[1].getBoardCutOff().cutOffLeft).toBe(0)
  })
})

describe('ConvertFromSgf, escaping', () => {

  it('unescapes a closing bracket', () => {
    const game = parse('(;FF[4]SZ[19]C[a \\] b])')
    expect(game.root.comments).toEqual(['a ] b'])
  })

  it('unescapes a single backslash', () => {
    const game = parse('(;FF[4]SZ[19]C[a \\\\ b])')
    expect(game.root.comments).toEqual(['a \\ b'])
  })

  it('does not collapse a run of escaped backslashes', () => {
    //Two escaped backslashes in the source are two literal backslashes
    const game = parse('(;FF[4]SZ[19]C[\\\\\\\\])')
    expect(game.root.comments).toEqual(['\\\\'])
  })

  it('removes soft line breaks', () => {
    const game = parse('(;FF[4]SZ[19]C[one \\\ntwo])')
    expect(game.root.comments).toEqual(['one two'])
  })

  it('keeps hard line breaks', () => {
    const game = parse('(;FF[4]SZ[19]C[one\ntwo])')
    expect(game.root.comments).toEqual(['one\ntwo'])
  })
})

describe('ConvertFromSgf, property identifiers', () => {

  //IGS/Pandanet writes CoPyright in the header of every game it serves.
  //A CoPyright the parser can't match ends the root node early, taking the
  //rest of the header with it, so a game imports with no komi, no players
  //and no result
  const igs = `(;GM[1]FF[3]
EV[Internet Go Server game]
US[Brought to you by IGS PANDANET]
CoPyright[
  Copyright (c) PANDANET Inc. 2024
  Permission to reproduce this game is given.]
GN[black-white(B) IGS]
RE[B+Resign]
PW[white]
WR[2d]
PB[black]
BR[1d]
PC[IGS: igs.joyjoy.net 6969]
DT[2024-05-01]
SZ[19]
TM[600]
KM[6.500000]
C[Have a good game]
;B[pd];W[dp])`

  it('keeps parsing the properties following a mixed case identifier', () => {
    const game = parse(igs)
    expect(game.getKomi()).toBe(6.5)
    expect(game.getPlayer(stoneColors.BLACK)).toMatchObject({name: 'black', rank: '1d'})
    expect(game.getPlayer(stoneColors.WHITE)).toMatchObject({name: 'white', rank: '2d'})
    expect(game.gameResult).toBe('B+R')
    expect(game.gameName).toBe('black-white(B) IGS')
    expect(game.getBoardSize()).toEqual({width: 19, height: 19})
    expect(game.root.comments).toEqual(['Have a good game'])
  })

  it('reads a mixed case identifier as its uppercase letters only', () => {
    //FF[3] allowed lowercase letters to be mixed in for compatibility, and
    //they are to be ignored, so CoPyright is the CP property
    const game = parse(igs)
    expect(game.sourceCopyright).toContain('PANDANET Inc. 2024')
  })

  it('still records the moves following a mixed case identifier', () => {
    const game = parse(igs)
    expect(game.root.getChild(0).move).toMatchObject({x: 15, y: 3})
    expect(game.root.getChild(0).getChild(0).move).toMatchObject({x: 3, y: 15})
  })

  it('ignores a property with no uppercase letters at all', () => {
    vi.spyOn(console, 'warn').mockImplementation(vi.fn())
    const game = parse('(;FF[4]SZ[19]nonsense[x]KM[7.5])')
    expect(game.getKomi()).toBe(7.5)
  })
})

describe('ConvertFromSgf, game collections', () => {

  //Two games in one file, each with its own info and its own moves. These
  //used to be merged into a single game, with the second game's moves showing
  //up as a variation on the first move of the first game, and the second
  //game's info overwriting the first game's players
  const collection = `(;GM[1]FF[4]SZ[19]PB[Alice]PW[Bob]RE[B+R];B[dd];W[pp])
(;GM[1]FF[4]SZ[13]PB[Carol]PW[Dave]RE[W+2.5];B[qq];W[cc])`

  it('reads every game in a collection', () => {
    const games = new ConvertFromSgf().convertAll(collection)
    expect(games).toHaveLength(2)
  })

  it('keeps each game in a collection to its own info', () => {
    const [first, second] = new ConvertFromSgf().convertAll(collection)
    expect(first.getPlayer(stoneColors.BLACK)).toMatchObject({name: 'Alice'})
    expect(first.getPlayer(stoneColors.WHITE)).toMatchObject({name: 'Bob'})
    expect(first.gameResult).toBe('B+R')
    expect(first.getBoardSize()).toEqual({width: 19, height: 19})
    expect(second.getPlayer(stoneColors.BLACK)).toMatchObject({name: 'Carol'})
    expect(second.getPlayer(stoneColors.WHITE)).toMatchObject({name: 'Dave'})
    expect(second.gameResult).toBe('W+2.5')
    expect(second.getBoardSize()).toEqual({width: 13, height: 13})
  })

  it('keeps each game in a collection to its own moves', () => {
    const [first, second] = new ConvertFromSgf().convertAll(collection)
    expect(first.root.getChildren()).toHaveLength(1)
    expect(first.root.getChild(0).move).toMatchObject({x: 3, y: 3})
    expect(first.root.getChild(0).getChild(0).move).toMatchObject({x: 15, y: 15})
    expect(second.root.getChildren()).toHaveLength(1)
    expect(second.root.getChild(0).move).toMatchObject({x: 16, y: 16})
    expect(second.root.getChild(0).getChild(0).move).toMatchObject({x: 2, y: 2})
  })

  it('gives the games separate root nodes', () => {
    const [first, second] = new ConvertFromSgf().convertAll(collection)
    expect(second.root).not.toBe(first.root)
  })

  it('reads variations within a game of a collection as variations', () => {
    const games = new ConvertFromSgf()
      .convertAll('(;FF[4]SZ[19];B[dd](;W[pp])(;W[cc]))(;FF[4]SZ[19];B[qq])')
    expect(games).toHaveLength(2)
    expect(games[0].root.getChild(0).getChildren()).toHaveLength(2)
    expect(games[1].root.getChildren()).toHaveLength(1)
  })

  it('returns an array of one for a single game file', () => {
    const games = new ConvertFromSgf().convertAll('(;GM[1]FF[4]SZ[19]PB[Alice];B[dd])')
    expect(games).toHaveLength(1)
    expect(games[0].getPlayer(stoneColors.BLACK)).toMatchObject({name: 'Alice'})
    expect(games[0].root.getChild(0).move).toMatchObject({x: 3, y: 3})
  })

  it('reads a collection preceded by a byte order mark and whitespace', () => {
    const games = new ConvertFromSgf()
      .convertAll(`\ufeff\n  ${collection}`)
    expect(games).toHaveLength(2)
    expect(games[0].getPlayer(stoneColors.BLACK)).toMatchObject({name: 'Alice'})
    expect(games[1].getPlayer(stoneColors.BLACK)).toMatchObject({name: 'Carol'})
  })

  it('reads only the first game of a collection when converting one game', () => {
    vi.spyOn(console, 'warn').mockImplementation(vi.fn())
    const game = parse(collection)
    expect(game.getPlayer(stoneColors.BLACK)).toMatchObject({name: 'Alice'})
    expect(game.getPlayer(stoneColors.WHITE)).toMatchObject({name: 'Bob'})
    expect(game.getBoardSize()).toEqual({width: 19, height: 19})
    expect(game.root.getChildren()).toHaveLength(1)
    expect(game.root.getChild(0).getChild(0).move).toMatchObject({x: 15, y: 15})
  })

  it('warns about the games it drops when converting one game', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(vi.fn())
    parse(collection)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('2 games'))
  })

  it('does not warn about a single game file', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(vi.fn())
    parse('(;GM[1]FF[4]SZ[19];B[dd])')
    expect(warn).not.toHaveBeenCalled()
  })

  it('reads a single game file the same way as it always did', () => {
    //Pins the regression: a file with one game has to come out of convert()
    //exactly as before, root node, moves, setup and all
    const game = parse('(;GM[1]FF[4]SZ[19]KM[6.5]PB[Alice]BR[1d]AB[dd][pp]PL[W];W[cc];B[qq])')
    expect(game.getKomi()).toBe(6.5)
    expect(game.getPlayer(stoneColors.BLACK)).toMatchObject({name: 'Alice', rank: '1d'})
    expect(game.root.setup).toEqual([
      {type: stoneColors.BLACK, coords: [{x: 3, y: 3}, {x: 15, y: 15}]},
    ])
    expect(game.root.turn).toBe(stoneColors.WHITE)
    expect(game.root.getChildren()).toHaveLength(1)
    expect(game.root.getChild(0).move).toMatchObject({color: stoneColors.WHITE, x: 2, y: 2})
    expect(game.root.getChild(0).getChild(0).move).toMatchObject({color: stoneColors.BLACK, x: 16, y: 16})
  })
})

describe('ConvertFromSgf, game information', () => {

  it('reads a record with no DT as having no date', () => {

    //NOTE: a record that doesn't say when it was played reads as not saying,
    //the same as every other field it leaves out. This used to read as today,
    //which was also at odds with DT[] below reading as no date at all.
    const game = parse('(;FF[4]SZ[19];B[dd])')
    expect(game.getGameDate()).toBe('')
    expect(game.getGameDates()).toEqual([])
  })

  it('reads a single DT as one date', () => {
    const game = parse('(;FF[4]SZ[19]DT[2024-05-01];B[dd])')
    expect(game.getGameDate()).toBe('2024-05-01')
    expect(game.getGameDates()).toEqual(['2024-05-01'])
  })

  it('reads every date of a multi-date DT', () => {
    const game = parse('(;FF[4]SZ[19]DT[2024-03-01,2024-04-05];B[dd])')
    expect(game.getGameDates()).toEqual(['2024-03-01', '2024-04-05'])
  })

  it('expands the shorthand within a multi-date DT', () => {
    const game = parse('(;FF[4]SZ[19]DT[2024-03-01,02,03];B[dd])')
    expect(game.getGameDates())
      .toEqual(['2024-03-01', '2024-03-02', '2024-03-03'])
  })

  it('reads every way of writing a draw as a draw', () => {

    //NOTE: '0' is the spec's form and the one written back out. 'D' is what
    //Seki itself wrote for years, so records it made still have to read as a
    //drawn game rather than as something unknown.
    for (const value of ['0', 'Draw', 'D']) {
      const game = parse(`(;FF[4]SZ[19]RE[${value}];B[dd])`)
      expect(game.getGameResult()).toBe('0')
    }
  })

  it('reads a void result in the casing the spec gives it', () => {
    const game = parse('(;FF[4]SZ[19]RE[Void];B[dd])')
    expect(game.getGameResult()).toBe('Void')
  })
})

describe('ConvertFromSgf, real records', () => {

  //Records written by other software, rather than by this spec. See
  //test/fixtures/README.md for where each of them came from.

  const fixtures = [
    'beginner_game.sgf', 'blank_game.sgf', 'pro_game.sgf', 'shodan_game.sgf',
    'ff4_ex.sgf', 'print1.sgf', 'print2.sgf', 'large-board.sgf',
  ]

  it('reads every record without throwing', () => {
    for (const name of fixtures) {
      expect(() => parse(loadFixture(`sgf/${name}`))).not.toThrow()
    }
  })

  describe('shodan_game.sgf', () => {

    const game = () => parse(loadFixture('sgf/shodan_game.sgf'))

    it('reads the whole header', () => {
      const g = game()
      expect(g.getBoardSize()).toEqual({width: 19, height: 19})
      expect(g.getPlayer(stoneColors.BLACK)).toMatchObject({name: 'Zero', rank: '1k'})
      expect(g.getPlayer(stoneColors.WHITE)).toMatchObject({name: 'Shodan', rank: '1d'})
      expect(g.getKomi()).toBe(6.5)
      expect(g.getHandicap()).toBe(0)
      expect(g.getGameResult()).toBe('B+R')
      expect(g.getGameDate()).toBe('2000-01-01')
      expect(g.getGameName()).toBe('A Challenge')
      expect(g.getEventName()).toBe('Tournament')
    })

    it('replays all 83 moves legally end to end', () => {
      const g = game()
      expect(g.getTotalNumberOfMoves()).toBe(83)
      expect(replayMainLine(g)).toEqual({played: 83, failure: null})
    })
  })

  describe('beginner_game.sgf', () => {

    const game = () => parse(loadFixture('sgf/beginner_game.sgf'))

    it('reads the whole header', () => {
      const g = game()
      expect(g.getPlayer(stoneColors.BLACK))
        .toMatchObject({name: 'Absolute Beginner', rank: '30k'})
      expect(g.getPlayer(stoneColors.WHITE)).toMatchObject({name: 'Noob', rank: '1d'})
      expect(g.getKomi()).toBe(5.5)
      expect(g.getGameDate()).toBe('2018-05-22')
      expect(g.getGameName()).toBe('Teaching Game')
      expect(g.getEventName()).toBe('Go Club')
    })

    it('reads the nine stone handicap and its stones', () => {

      //Unlike GIB and NGF, SGF spells the placement out in AB, so the
      //stones come from the record rather than from a table
      const g = game()
      expect(g.getHandicap()).toBe(9)
      expect(g.getRootNode().setup).toEqual([{
        type: stoneColors.BLACK,
        coords: [
          {x: 3, y: 15}, {x: 15, y: 3}, {x: 15, y: 15}, {x: 3, y: 3},
          {x: 3, y: 9}, {x: 15, y: 9}, {x: 9, y: 3}, {x: 9, y: 15},
          {x: 9, y: 9},
        ],
      }])
    })

    it('replays all 18 moves legally, starting with white', () => {
      const g = game()
      expect(g.getTotalNumberOfMoves()).toBe(18)
      expect(g.getRootNode().getChild(0).move)
        .toMatchObject({x: 13, y: 2, color: stoneColors.WHITE})
      expect(replayMainLine(g)).toEqual({played: 18, failure: null})
    })
  })

  describe('blank_game.sgf', () => {

    const game = () => parse(loadFixture('sgf/blank_game.sgf'))

    it('reads a header only record with no moves in it', () => {
      const g = game()
      expect(g.getKomi()).toBe(5.5)
      expect(g.getBoardSize()).toEqual({width: 19, height: 19})
      expect(g.getRootNode().hasChildren()).toBe(false)
      expect(g.getTotalNumberOfMoves()).toBe(0)
    })

    it('reads an empty DT as no date', () => {
      expect(game().getGameDate()).toBe('')
    })
  })

  describe('pro_game.sgf', () => {

    const game = () => parse(loadFixture('sgf/pro_game.sgf'))

    it('reads the whole header', () => {
      const g = game()
      expect(g.getPlayer(stoneColors.BLACK))
        .toMatchObject({name: 'Maruyama Toyoji', rank: '1p'})
      expect(g.getPlayer(stoneColors.WHITE))
        .toMatchObject({name: 'Ito Yoji', rank: '1p'})
      expect(g.getKomi()).toBe(5.5)
      expect(g.getGameResult()).toBe('W+6.5')
      expect(g.getGameDate()).toBe('1976-01-28')
      expect(g.getEventName()).toBe('1st Kisei')
    })

    it('falls back to a regular board, the record carrying no SZ', () => {
      expect(game().getBoardSize()).toEqual({width: 19, height: 19})
    })

    it('replays all 235 moves legally end to end', () => {

      //The longest single line in the corpus, and the one most likely to
      //catch a capture or a ko being handled wrongly
      const g = game()
      expect(g.getTotalNumberOfMoves()).toBe(235)
      expect(replayMainLine(g)).toEqual({played: 235, failure: null})
    })
  })

  describe('large-board.sgf', () => {

    const game = () => parse(loadFixture('sgf/large-board.sgf'))

    it('reads a board past 19 lines', () => {
      const g = game()
      expect(g.getBoardSize()).toEqual({width: 29, height: 29})
      expect(g.getKomi()).toBe(6.5)
      expect(g.getGameResult()).toBe('B+12.5')
      expect(g.getPlayer(stoneColors.BLACK)).toMatchObject({name: 'Black', rank: '3d'})
    })

    it('reads uppercase coordinates as the far half of the board', () => {

      //A is 26, B is 27 and C is 28, so a record on a board this size uses
      //both halves of the alphabet within a single move
      const g = game()
      expect(g.getRootNode().getChild(0).move).toMatchObject({x: 6, y: 6})

      const bd = g.findNodeForMoveNumber(6)
      expect(bd.move).toMatchObject({x: 27, y: 3, color: stoneColors.WHITE})

      const cc = g.findNodeForMoveNumber(15)
      expect(cc.move).toMatchObject({x: 28, y: 28, color: stoneColors.BLACK})
    })

    it('replays all 20 moves legally end to end', () => {
      const g = game()
      expect(g.getTotalNumberOfMoves()).toBe(20)
      expect(replayMainLine(g)).toEqual({played: 20, failure: null})
    })
  })
})

describe('ConvertFromSgf, the FF[4] specification examples', () => {

  describe('print1.sgf, a heavily branched record', () => {

    const game = () => parse(loadFixture('sgf/print1.sgf'))

    it('reads the whole tree, not just the main line', () => {
      const g = game()
      expect(countNodes(g.getRootNode())).toBe(142)
      expect(countForks(g.getRootNode())).toBe(6)
    })

    it('keeps both dates of a multi-date DT', () => {

      //NOTE: the record reads DT[1996-10-18,19], being a game played over the
      //18th and 19th of October, written with the shorthand SGF allows in a
      //date list. This used to read as the 18th and the number 19, of which
      //only the 18th survived.
      expect(game().getGameDates()).toEqual(['1996-10-18', '1996-10-19'])
      expect(game().getGameDate()).toBe('1996-10-18')
    })
  })

  describe('print2.sgf, the deepest tree in the corpus', () => {

    const game = () => parse(loadFixture('sgf/print2.sgf'))

    it('reads the whole tree', () => {
      const g = game()
      expect(countNodes(g.getRootNode())).toBe(314)
      expect(countForks(g.getRootNode())).toBe(5)
    })

    it('reads a month only DT as written', () => {
      expect(game().getGameDate()).toBe('1996-08')
    })
  })

  describe('ff4_ex.sgf, the specification\'s own feature tour', () => {

    const source = () => loadFixture('sgf/ff4_ex.sgf')

    //The record is a collection, so convert() warns about the game it drops
    const game = () => {
      vi.spyOn(console, 'warn').mockImplementation(vi.fn())
      return parse(source())
    }

    it('reads the first game of the collection and its branch points', () => {
      const g = game()
      expect(g.getGameName()).toBe('Gametree 1: properties')
      expect(countNodes(g.getRootNode())).toBe(53)
      expect(countForks(g.getRootNode())).toBe(3)
    })

    it('reads the collection as two games, each with its own tree', () => {

      //The file is an SGF collection, being the specification's own example
      //of one. Its second tree demonstrates game-info properties sitting on
      //the node where a game first becomes distinguishable, so its four
      //variations carry four different sets of players.
      const [first, second] = new ConvertFromSgf().convertAll(source())

      expect(first.getGameName()).toBe('Gametree 1: properties')
      expect(second.getRootNode().getChild(0).move)
        .toMatchObject({x: 15, y: 3, color: stoneColors.BLACK})
      expect(countNodes(second.getRootNode())).toBe(8)
      expect(countForks(second.getRootNode())).toBe(2)
    })

    it('reads a pass written both ways FF[4] allows', () => {

      //The record's first variation ends on W[] and B[tt], which the
      //specification gives as the two ways of writing a pass
      const g = game()
      expect(g.findNodeForMoveNumber(12).move)
        .toMatchObject({color: stoneColors.WHITE, pass: true})
      expect(g.findNodeForMoveNumber(13).move)
        .toMatchObject({color: stoneColors.BLACK, pass: true})
    })

    it('expands the compressed point lists in its setup node', () => {

      //The record's setup node reads
      //AB[dd][de][df][dg][do:gq]AW[jd][je][jf][jg][kn:lq][pn:pq], mixing
      //single points with rectangles given by two opposite corners. This is
      //the specification's own example of a compressed list, and the first
      //real record in the suite to exercise one.
      const g = game()
      const [black, white] = g.getRootNode().setup

      //Four single points, then the four by three rectangle from do to gq
      expect(black.coords).toHaveLength(16)
      expect(black.coords.slice(0, 4)).toEqual([
        {x: 3, y: 3}, {x: 3, y: 4}, {x: 3, y: 5}, {x: 3, y: 6},
      ])
      for (let x = 3; x <= 6; x++) {
        for (let y = 14; y <= 16; y++) {
          expect(black.coords).toContainEqual({x, y})
        }
      }

      //Four single points, then two more rectangles of four points each
      expect(white.coords).toHaveLength(16)
      expect(white.coords.slice(0, 4)).toEqual([
        {x: 9, y: 3}, {x: 9, y: 4}, {x: 9, y: 5}, {x: 9, y: 6},
      ])
      expect(white.coords).toContainEqual({x: 11, y: 16})
      expect(white.coords).toContainEqual({x: 15, y: 16})
    })

    it('reads a property list wrapped over several lines', () => {

      //The markup variation's node opens with an AB list of 35 points split
      //over two lines, followed by an AW list of another 37 split over three,
      //the line break being whitespace the specification allows between
      //values. The N and C properties that close the node come after all of
      //it, so they only arrive if the lists are read to the end.
      const g = game()
      const markup = g.getRootNode().getChild(2)
      const [black, white] = markup.setup

      expect(black.type).toBe(stoneColors.BLACK)
      expect(black.coords).toHaveLength(35)
      expect(black.coords[0]).toEqual({x: 3, y: 3})
      expect(black.coords[34]).toEqual({x: 12, y: 17})

      expect(white.type).toBe(stoneColors.WHITE)
      expect(white.coords).toHaveLength(37)
      expect(white.coords[0]).toEqual({x: 15, y: 3})
      expect(white.coords[36]).toEqual({x: 4, y: 17})

      expect(markup.name).toBe('Markup')
    })
  })
})

describe('ConvertFromSgf, a record that is not UTF-8', () => {

  //See test/fixtures/README.md for where this record came from, and
  //src/helpers/encoding.js for how its encoding is worked out

  it('reads a Shift_JIS record handed over as bytes', () => {

    const game = parse(loadFixtureBytes('sgf/shift-jis.sgf'))

    //The record declares no CA, so the encoding is recovered by scoring
    expect(game.getPlayer(stoneColors.BLACK).name).toBe('高尾紳路')
    expect(game.getPlayer(stoneColors.BLACK).rank).toBe('九段')
    expect(game.getPlayer(stoneColors.WHITE).name).toBe('山下敬吾')
    expect(game.getPlayer(stoneColors.WHITE).rank).toBe('九段')
    expect(game.getGameName()).toBe('テスト対局')
    expect(game.getEventName()).toBe('第三十期棋聖戦')
    expect(game.getEventLocation()).toBe('東京')
  })

  it('reads the Japanese comments in it too', () => {

    //Comments are where a record's Japanese really lives, and where losing
    //it to a UTF-8 decode is least likely to be noticed
    const game = parse(loadFixtureBytes('sgf/shift-jis.sgf'))
    const comments = []
    for (let node = game.getRootNode(); node; node = node.getChild(0)) {
      if (node.comments) {
        comments.push(...node.comments)
      }
    }
    expect(comments).toEqual([
      '黒番、両小目の布石。',
      '白の中押し負けとなりました。',
    ])
  })

  it('replays the same seven moves either way round', () => {

    //The moves are ASCII in any encoding, so the bytes and a UTF-8 decode of
    //them have to agree about the game itself
    const fromBytes = parse(loadFixtureBytes('sgf/shift-jis.sgf'))
    const fromString = parse(loadFixture('sgf/shift-jis.sgf'))
    expect(fromBytes.getTotalNumberOfMoves()).toBe(7)
    expect(replayMainLine(fromBytes)).toEqual({played: 7, failure: null})
    expect(replayMainLine(fromString)).toEqual({played: 7, failure: null})
  })

  it('loses the Japanese when the caller decodes it as UTF-8 first', () => {

    //What the reader did with this record before, and still does for a
    //caller that hands it a string rather than the bytes
    const game = parse(loadFixture('sgf/shift-jis.sgf'))
    expect(game.getPlayer(stoneColors.BLACK).name).not.toBe('高尾紳路')
    expect(game.getGameName()).not.toBe('テスト対局')
  })

  it('honours a declared charset over what it would otherwise guess', () => {

    //Latin-1 bytes for "(;FF[4]CA[EUC-KR]PB[이세돌])"
    const declared = Uint8Array.from(
      '(;FF[4]CA[EUC-KR]PB[\xc0\xcc\xbc\xbc\xb5\xb9])',
      char => char.charCodeAt(0)
    )
    const game = parse(declared)
    expect(game.getPlayer(stoneColors.BLACK).name).toBe('이세돌')
    expect(game.getInfo().record.charset).toBe('EUC-KR')
  })
})

describe('ConvertFromSgf, malformed records', () => {

  //Records in the wild are written by all sorts of software, and a reader
  //that rejects a file it could previously open is a worse reader. What the
  //tokenizer can't understand is skipped and reported, and the record around
  //it is still read.

  it('keeps reading the properties after a stray character', () => {

    //The SZ used to be dropped along with the stray character, so the board
    //silently came back as the default 19x19 rather than as the 9x9 it says
    const {game} = read('(;FF[4]@SZ[9];B[dd])')
    expect(game.getBoardSize()).toEqual({width: 9, height: 9})
    expect(game.getRootNode().getChild(0).move).toMatchObject({x: 3, y: 3})
  })

  it('reports the stray character it skipped', () => {
    const {diagnostics} = read('(;FF[4]@SZ[9];B[dd])')
    expect(diagnostics).toEqual([
      {
        code: sgfDiagnosticCodes.INVALID_INPUT,
        message: expect.stringContaining('@'),
        row: 1,
        col: 8,
        pos: 7,
      },
    ])
  })

  it('reads the record around an unterminated property value', () => {
    const {game} = read('(;FF[4]SZ[9];B[dd]C[unterminated')
    expect(game.getBoardSize()).toEqual({width: 9, height: 9})
    expect(game.getRootNode().getChild(0).move).toMatchObject({x: 3, y: 3})
    expect(game.getRootNode().getChild(0).comments).toBeUndefined()
  })

  it('reports an unterminated property value', () => {
    const {diagnostics} = read('(;FF[4]SZ[9];B[dd]C[unterminated')
    expect(diagnostics).toContainEqual(
      expect.objectContaining({
        code: sgfDiagnosticCodes.UNTERMINATED_VALUE,
        row: 1,
        col: 20,
      })
    )
  })

  it('reads a record whose parenthesis is never closed', () => {
    const {game} = read('(;FF[4]SZ[9]PB[Alice];B[dd];W[pp]')
    expect(game.getPlayer(stoneColors.BLACK)).toMatchObject({name: 'Alice'})
    expect(game.getTotalNumberOfMoves()).toBe(2)
  })

  it('reports the parenthesis that is never closed, where it was opened', () => {
    const {diagnostics} = read('(;FF[4]SZ[9];B[dd]\n(;W[pp]')
    expect(diagnostics).toEqual([
      expect.objectContaining({
        code: sgfDiagnosticCodes.UNCLOSED_PARENTHESIS, row: 1, col: 1, pos: 0,
      }),
      expect.objectContaining({
        code: sgfDiagnosticCodes.UNCLOSED_PARENTHESIS, row: 2, col: 1, pos: 19,
      }),
    ])
  })

  it('reports a closing parenthesis that never opened', () => {
    const {game, diagnostics} = read('(;FF[4]SZ[9];B[dd]))')
    expect(game.getTotalNumberOfMoves()).toBe(1)
    expect(diagnostics).toEqual([
      expect.objectContaining({
        code: sgfDiagnosticCodes.UNMATCHED_CLOSING_PARENTHESIS, row: 1, col: 20,
      }),
    ])
  })

  it('reports a property that is outside of any node', () => {
    const {diagnostics} = read('(FF[4];B[dd])')
    expect(diagnostics.map(({code}) => code)).toEqual([
      sgfDiagnosticCodes.PROPERTY_OUTSIDE_NODE,
      sgfDiagnosticCodes.PROPERTY_OUTSIDE_NODE,
    ])
  })

  it('reports a property with no value at all', () => {
    const {diagnostics} = read('(;FF[4]SZ[9]KM;B[dd])')
    expect(diagnostics).toContainEqual(
      expect.objectContaining({
        code: sgfDiagnosticCodes.PROPERTY_WITHOUT_VALUE,
        message: expect.stringContaining('KM'),
      })
    )
  })

  it('reports a property whose identifier is all lowercase', () => {
    const {game, diagnostics} = read('(;FF[4]SZ[9]nonsense[x]KM[7.5])')
    expect(game.getKomi()).toBe(7.5)
    expect(diagnostics).toContainEqual(
      expect.objectContaining({
        code: sgfDiagnosticCodes.PROPERTY_WITHOUT_IDENTIFIER,
      })
    )
  })

  it('reports a value with no identifier in front of it', () => {
    const {diagnostics} = read('(;[19]SZ[9])')
    expect(diagnostics).toContainEqual(
      expect.objectContaining({
        code: sgfDiagnosticCodes.VALUE_WITHOUT_IDENTIFIER,
      })
    )
  })

  it('says nothing about a record that reads cleanly', () => {
    const {diagnostics} = read('(;GM[1]FF[4]SZ[19]PB[Alice];B[dd];W[pp])')
    expect(diagnostics).toEqual([])
  })

  it('reports the diagnostics in the order they appear in the record', () => {
    const {diagnostics} = read('(;FF[4]\nSZ[9]!!\n;B[dd]??;W[pp])')
    expect(diagnostics.map(({row, col}) => [row, col])).toEqual([[2, 6], [3, 7]])
  })

  it('starts a fresh set of diagnostics for each record', () => {
    const converter = new ConvertFromSgf()
    converter.convert('(;FF[4]SZ[9]@;B[dd])')
    expect(converter.getDiagnostics()).toHaveLength(1)
    converter.convert('(;FF[4]SZ[9];B[dd])')
    expect(converter.getDiagnostics()).toEqual([])
  })

  it('still refuses a record with no game tree in it at all', () => {

    //Recovering is for a record that has something to recover. One that has
    //nothing is the case parseSgf has always thrown on, and still does.
    expect(() => parse('not an sgf file at all')).toThrow(/Unable to parse SGF data/)
    expect(() => parse(')))')).toThrow(/Unable to parse SGF data/)
  })

  it('puts a move on its own node even when whitespace follows the semicolon', () => {

    //The node this opens is a move node however it is laid out. Reading the
    //record as text, this move used to land on the root node instead, since
    //the check for one was looking for a literal ";B[" in the source.
    const {game} = read('(;FF[4]SZ[9];\nB[dd])')
    expect(game.getRootNode().move).toBeUndefined()
    expect(game.getRootNode().getChild(0).move).toMatchObject({x: 3, y: 3})
  })

  it('reads a move written with a mixed case identifier onto its own node', () => {
    const {game} = read('(;FF[4]SZ[9];Bb[dd])')
    expect(game.getRootNode().move).toBeUndefined()
    expect(game.getRootNode().getChild(0).move)
      .toMatchObject({x: 3, y: 3, color: stoneColors.BLACK})
  })
})

describe('ConvertFromSgf, the fixture corpus reads as it always did', () => {

  //The gate on the tokenizer rewrite. Every record in test/fixtures/sgf has
  //to parse to exactly what it parsed to before, read as a string and read as
  //bytes alike, so the digests below were taken from the parser as it stood
  //beforehand. A digest that no longer matches is a regression in the reader
  //until it is shown to be otherwise; the counts beside it are there to say
  //what kind of regression at a glance.
  //
  //Regenerate deliberately, never to make a failure go away — and say why
  //here when you do. So far:
  //
  //- print1.sgf, 2026-08-26. Its DT[1996-10-18,19] now reads as both dates
  //  rather than only the first, which is #64/#65 rather than anything to do
  //  with the reader. Confirmed by running the regex parser at that point on
  //  main against this one: identical output for all nine records.
  //- print1.sgf, print2.sgf, pro_game.sgf and shift-jis.sgf, 2026-08-26. These
  //  four name no application of their own, so their generator was Seki's own
  //  version and their digest changed with every release — v5.0.0 turned the
  //  corpus red on a tagged commit with the reader untouched. The generator
  //  default is now folded to a constant before digesting, which is what moved
  //  these four; the other five are byte for byte what they were, which is the
  //  evidence that only the default moved.

  const baselines = {
    'beginner_game.sgf': {
      games: 1, nodes: 19, forks: 0, moves: 18,
      digest: '7c838922ef056acbdcadef64606deb4ebc33e5af9e9c88ce987fe105103b9771',
    },
    'blank_game.sgf': {
      games: 1, nodes: 1, forks: 0, moves: 0,
      digest: 'c1c63c88dd518ac0d87401c5541a302c2b2f7460dba36c85c74591d5a4db0dfa',
    },
    'ff4_ex.sgf': {
      games: 2, nodes: 53, forks: 3, moves: 13,
      digest: '3d3880697aa276ad6fbfcc716c8c16605a4a62a28d011d0d26635f9f7b91217c',
    },
    'large-board.sgf': {
      games: 1, nodes: 21, forks: 0, moves: 20,
      digest: '7e4bf0ec24000edd96b20aa7d6d6d4170fda77c77a3f54905b1a7114417552b5',
    },
    'print1.sgf': {
      games: 1, nodes: 142, forks: 6, moves: 101,
      digest: '8ac56c23f0d9c42859c6865e99235803c4e96d810f473d0df6e120c090014e66',
    },
    'print2.sgf': {
      games: 1, nodes: 314, forks: 5, moves: 268,
      digest: 'e706bfe72b7c2733a770812b5e05a822e0775b621af2695594d0a01df5737c50',
    },
    'pro_game.sgf': {
      games: 1, nodes: 236, forks: 0, moves: 235,
      digest: '8240f3b0aaa768cdca98a92051d8e423403a449613ca2661d50c507d52c9c677',
    },
    'shift-jis.sgf': {
      games: 1, nodes: 8, forks: 0, moves: 7,
      digest: '9ca9404f2ecf4bfe2947c9e1b28c917ef6f2e28586089b6d7261a0f167b50a85',
    },
    'shodan_game.sgf': {
      games: 1, nodes: 84, forks: 0, moves: 83,
      digest: 'c2df1c4e13b0c9f33e3fb4634b113bc5a5c4a20e91bf7c6537e347f0de5ca586',
    },
  }

  //Everything a record parses to, spelled out so that a single coordinate,
  //comment or piece of game info going missing changes the digest
  const serialiseNode = node => {
    const out = {}
    for (const key of ['move', 'setup', 'markup', 'score', 'comments', 'name', 'turn']) {
      if (typeof node[key] !== 'undefined') {
        out[key] = node[key]
      }
    }
    out.children = node.children.map(serialiseNode)
    return out
  }

  //A record that names no application of its own is given Seki's own name and
  //version as its generator, straight out of the defaults. Digesting that as
  //it stands would make every release change the digest of every record
  //without an AP property, which says nothing about the reader. Fold the
  //default down to a constant; a generator the record does carry is left
  //alone and still counts towards the digest.
  const stableInfo = game => {
    const info = game.getInfo()
    if (info.record?.generator === defaultGameInfo.record.generator) {
      info.record = {...info.record, generator: '<default>'}
    }
    return info
  }

  const serialise = games => games.map(game => ({
    info: stableInfo(game),
    root: serialiseNode(game.root),
  }))

  const summarise = name => {

    //The record is a collection in one case, which convert() warns about
    vi.spyOn(console, 'warn').mockImplementation(vi.fn())

    //Read it both ways a caller can hand it over
    const fromString = new ConvertFromSgf().convertAll(loadFixture(`sgf/${name}`))
    const fromBytes = new ConvertFromSgf().convertAll(loadFixtureBytes(`sgf/${name}`))

    //Summarise what came out
    return {
      games: fromString.length,
      nodes: countNodes(fromString[0].root),
      forks: countForks(fromString[0].root),
      moves: fromString[0].getTotalNumberOfMoves(),
      digest: createHash('sha256')
        .update(JSON.stringify([serialise(fromString), serialise(fromBytes)]))
        .digest('hex'),
    }
  }

  for (const [name, baseline] of Object.entries(baselines)) {
    it(`reads ${name} to the same result as before`, () => {
      expect(summarise(name)).toEqual(baseline)
    })
  }

  it('reads every record without a single diagnostic', () => {

    //A real record written by real software should read cleanly. Anything
    //reported here is the reader misunderstanding the record, not the other
    //way around.
    vi.spyOn(console, 'warn').mockImplementation(vi.fn())
    for (const name of Object.keys(baselines)) {
      const converter = new ConvertFromSgf()
      converter.convertAll(loadFixtureBytes(`sgf/${name}`))
      expect({[name]: converter.getDiagnostics()}).toEqual({[name]: []})
    }
  })
})
