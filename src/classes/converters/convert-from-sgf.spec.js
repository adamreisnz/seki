import {describe, it, expect, vi, afterEach} from 'vitest'
import ConvertFromSgf from './convert-from-sgf.js'
import {stoneColors} from '../../constants/stone.js'
import {markupTypes} from '../../constants/markup.js'

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
