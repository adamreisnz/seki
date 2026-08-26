import {describe, it, expect, vi, afterEach} from 'vitest'
import ConvertFromSgf from './convert-from-sgf.js'
import ConvertToSgf from './convert-to-sgf.js'
import Game from '../game.js'
import GameNode from '../game-node.js'
import {stoneColors} from '../../constants/stone.js'
import {loadFixture} from '../../../test/fixtures.js'

const parse = sgf => new ConvertFromSgf().convert(sgf)
const write = game => new ConvertToSgf().convert(game)

afterEach(() => {
  vi.restoreAllMocks()
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

describe('SGF export of territory markup', () => {

  it('round trips TB/TW score nodes without throwing', () => {
    const sgf = '(;FF[4]SZ[19];B[dd];W[pp]TB[aa][ab]TW[ss])'
    const game = new ConvertFromSgf().convert(sgf)
    const out = new ConvertToSgf().convert(game)
    expect(out).toContain('TB[aa][ab]')
    expect(out).toContain('TW[ss]')
  })
})

describe('ConvertToSgf, label text', () => {

  const writeLabel = text => {
    const game = new Game()
    game.addMarkup(3, 3, {type: 'label', text})
    return write(game)
  }

  it('escapes a closing bracket in the text', () => {

    //NOTE: label text is written into the property value, and used to go in
    //raw. A ] in a label closed the property early, so everything after it in
    //the file was lost, or worse, read back as something else entirely
    expect(writeLabel('a]b')).toContain('LB[dd:a\\]b]')
  })

  it('escapes a backslash in the text', () => {
    expect(writeLabel('a\\b')).toContain('LB[dd:a\\\\b]')
  })

  it('round trips a label containing a bracket', () => {
    const game = parse(writeLabel('a]b'))
    game.goToFirstPosition()
    expect(game.getMarkup(3, 3)).toEqual({type: 'label', text: 'a]b'})
  })

  it('round trips a label containing a backslash', () => {
    const game = parse(writeLabel('a\\b'))
    game.goToFirstPosition()
    expect(game.getMarkup(3, 3)).toEqual({type: 'label', text: 'a\\b'})
  })

  it('leaves ordinary text alone', () => {
    expect(writeLabel('A1')).toContain('LB[dd:A1]')
  })
})

describe('ConvertToSgf, the charset it declares', () => {

  it('declares UTF-8, which is what a JavaScript string is', () => {
    expect(write(new Game())).toContain('CA[UTF-8]')
  })

  it('declares UTF-8 for a record that was read as something else', () => {

    //A record read as EUC-KR carries that in record.charset, and copying it
    //over would have this UTF-8 output declare itself as EUC-KR. Anything
    //reading the result back would then decode it twice.
    const game = parse('(;FF[4]CA[EUC-KR]SZ[19]PB[이세돌])')
    expect(game.getInfo().record.charset).toBe('EUC-KR')

    const sgf = write(game)
    expect(sgf).toContain('CA[UTF-8]')
    expect(sgf).not.toContain('CA[EUC-KR]')
    expect(sgf).toContain('PB[이세돌]')
  })

  it('survives a round trip through its own output', () => {
    const sgf = write(parse('(;FF[4]CA[EUC-KR]SZ[19]PB[이세돌]PW[柯洁])'))
    const game = parse(sgf)
    expect(game.getInfo().record.charset).toBe('UTF-8')
    expect(game.getPlayer(stoneColors.BLACK).name).toBe('이세돌')
    expect(game.getPlayer(stoneColors.WHITE).name).toBe('柯洁')
  })
})

describe('ConvertToSgf, the clock', () => {

  //BL/WL carry the time left and OB/OW the periods left, and every KGS, IGS
  //and OGS record puts them on most moves. The reader hangs them off the move
  //itself, so the color that moved is the color they belong to.
  const moveOf = (game, depth) => {
    let node = game.root
    for (let i = 0; i <= depth; i++) {
      node = node.getChild(0)
    }
    return node.move
  }

  it('round trips all four properties with the same values', () => {
    const sgf = '(;FF[4]SZ[19];B[dd]BL[120]OB[3];W[pp]WL[90]OW[2])'
    const reparsed = parse(write(parse(sgf)))

    expect(moveOf(reparsed, 0)).toMatchObject({timeLeft: 120, periodsLeft: 3})
    expect(moveOf(reparsed, 1)).toMatchObject({timeLeft: 90, periodsLeft: 2})
  })

  it('writes each property against the color that moved', () => {
    const sgf = write(parse('(;FF[4]SZ[19];B[dd]BL[120]OB[3];W[pp]WL[90]OW[2])'))

    expect(sgf).toContain('B[dd]BL[120]OB[3]')
    expect(sgf).toContain('W[pp]WL[90]OW[2]')
  })

  it('keeps a fractional time intact', () => {
    const sgf = write(parse('(;FF[4]SZ[19];B[dd]BL[12.5])'))

    expect(sgf).toContain('BL[12.5]')
    expect(parse(sgf).root.getChild(0).move.timeLeft).toBe(12.5)
  })

  it('does not give a whole number of seconds a decimal point', () => {
    expect(write(parse('(;FF[4]SZ[19];B[dd]BL[120])'))).toContain('BL[120]')
  })

  it('writes a time with no periods on its own', () => {
    const sgf = write(parse('(;FF[4]SZ[19];B[dd]BL[120])'))

    expect(sgf).toContain('BL[120]')
    expect(sgf).not.toContain('OB[')
  })

  it('writes a time of zero, being a player out of main time', () => {
    expect(write(parse('(;FF[4]SZ[19];B[dd]BL[0]OB[1])'))).toContain('BL[0]OB[1]')
  })

  it('emits nothing at all for a move with no clock', () => {
    const sgf = write(parse('(;FF[4]SZ[19];B[dd];W[pp])'))

    expect(sgf).toContain(';B[dd];W[pp]')
    for (const key of ['BL', 'WL', 'OB', 'OW']) {
      expect(sgf).not.toContain(`${key}[`)
    }
  })

  it('keeps the clock on a pass move, which is where servers write it too', () => {
    const sgf = write(parse('(;FF[4]SZ[19];B[]BL[10]OB[1])'))

    expect(sgf).toContain('B[]BL[10]OB[1]')
    expect(parse(sgf).root.getChild(0).isPassMove()).toBe(true)
  })
})

describe('ConvertToSgf, the clock in a real record', () => {

  //See test/fixtures/README.md for where this record came from. It is a
  //collection, and the clocked moves sit in a variation of its first game,
  //so both are walked for rather than assumed to be on the main line.
  const loadClocked = () => {
    const games = new ConvertFromSgf().convertAll(loadFixture('sgf/ff4_ex.sgf'))
    return games[0]
  }

  const collectClock = (node) => {
    const {move} = node
    const clock = (move && typeof move.timeLeft !== 'undefined') ?
      [[move.color, move.timeLeft, move.periodsLeft]] :
      []
    return node.children.reduce(
      (all, child) => all.concat(collectClock(child)), clock)
  }

  it('carries every clock value through a round trip', () => {
    const game = loadClocked()
    const before = collectClock(game.root)

    expect(before).toHaveLength(6)
    expect(collectClock(parse(write(game)).root)).toEqual(before)
  })

  it('normalises a padded real to the same number', () => {

    //The record writes BL[120.0] and BL[87.00]. SGF reals don't care about
    //the trailing zeroes, so these go back out as 120 and 87, which reads
    //back in as the value the file meant.
    const sgf = write(loadClocked())

    expect(sgf).toContain('BL[120]')
    expect(sgf).toContain('BL[87]')
    expect(sgf).toContain('BL[105.6]')
    expect(sgf).toContain('WL[13.2]')
  })
})
