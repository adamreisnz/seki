import {describe, it, expect, vi, afterEach} from 'vitest'
import ConvertFromSgf from './convert-from-sgf.js'
import {stoneColors} from '../../constants/stone.js'

const parse = sgf => new ConvertFromSgf().convert(sgf)

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

describe('ConvertFromSgf, cut off', () => {

  it('parses a cut off on each side', () => {
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
