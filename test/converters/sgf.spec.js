import {describe, it, expect, vi, afterEach} from 'vitest'
import ConvertFromSgf from '../../src/classes/converters/convert-from-sgf.js'
import ConvertToSgf from '../../src/classes/converters/convert-to-sgf.js'
import Game from '../../src/classes/game.js'
import GameNode from '../../src/classes/game-node.js'
import {stoneColors} from '../../src/constants/stone.js'

const parse = sgf => new ConvertFromSgf().convert(sgf)
const write = game => new ConvertToSgf().convert(game)

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

describe('ConvertToSgf, coordinates', () => {

  const writeMove = (x, y) => {
    const game = new Game()
    new GameNode({move: {x, y, color: stoneColors.BLACK}}).appendToParent(game.root)
    return write(game)
  }

  it('writes lowercase coordinates below 26', () => {
    expect(writeMove(3, 3)).toContain('B[dd]')
  })

  it('switches to uppercase past 25 rather than running into punctuation', () => {
    expect(writeMove(26, 26)).toContain('B[AA]')
    expect(writeMove(51, 51)).toContain('B[ZZ]')
  })

  it('rejects a coordinate that cannot be represented', () => {
    expect(() => writeMove(52, 0)).toThrow('Invalid coordinate')
    expect(() => writeMove(-1, 0)).toThrow('Invalid coordinate')
  })
})

describe('SGF round trip', () => {

  it('round trips a game with variations', () => {
    const sgf = '(;FF[4]SZ[19];B[dd](;W[pp];B[pd])(;W[pd];B[pp]))'
    const game = parse(sgf)
    const reparsed = parse(write(game))

    const first = reparsed.root.getChild(0)
    expect(first.move).toMatchObject({x: 3, y: 3})
    expect(first.children).toHaveLength(2)
    expect(first.getChild(0).move).toMatchObject({x: 15, y: 15})
    expect(first.getChild(1).move).toMatchObject({x: 15, y: 3})
  })

  it('round trips coordinates on a board larger than 26', () => {
    const game = parse('(;FF[4]SZ[38];B[AA];W[Zz])')
    const reparsed = parse(write(game))
    expect(reparsed.root.getChild(0).move).toMatchObject({x: 26, y: 26})
    expect(reparsed.root.getChild(0).getChild(0).move).toMatchObject({x: 51, y: 25})
  })

  it('round trips comments containing brackets and backslashes', () => {
    const game = parse('(;FF[4]SZ[19]C[tricky \\] and \\\\ chars])')
    const reparsed = parse(write(game))
    expect(reparsed.root.comments).toEqual(['tricky ] and \\ chars'])
  })

  it('round trips setup instructions', () => {
    const game = parse('(;FF[4]SZ[19]AB[aa][bb]AW[cc]AE[dd])')
    const reparsed = parse(write(game))
    expect(reparsed.root.setup).toEqual(game.root.setup)
  })

  it('round trips markup', () => {
    const game = parse('(;FF[4]SZ[19];B[dd]TR[aa]CR[bb]LB[cc:A])')
    const reparsed = parse(write(game))
    expect(reparsed.root.getChild(0).markup).toEqual(game.root.getChild(0).markup)
  })

  it('round trips a pass move', () => {
    const game = parse('(;FF[4]SZ[19];B[];W[dd])')
    const reparsed = parse(write(game))
    expect(reparsed.root.getChild(0).isPassMove()).toBe(true)
  })

  it('round trips board size', () => {
    expect(write(parse('(;FF[4]SZ[13])'))).toContain('SZ[13]')
    expect(write(parse('(;FF[4]SZ[19:13])'))).toContain('SZ[19:13]')
  })
})
