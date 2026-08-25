import {describe, it, expect, vi, afterEach} from 'vitest'
import ConvertFromSgf from './convert-from-sgf.js'
import ConvertToSgf from './convert-to-sgf.js'
import Game from '../game.js'
import GameNode from '../game-node.js'
import {stoneColors} from '../../constants/stone.js'

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
