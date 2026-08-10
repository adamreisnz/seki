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
