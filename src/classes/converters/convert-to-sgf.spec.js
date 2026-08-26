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

  it('writes a drawn result the way the spec spells it', () => {

    //NOTE: whichever way the record being read spelled it, what goes back out
    //is RE[0], the spec's form for jigo. Seki used to write RE[D], which no
    //other program reads as a draw at all.
    for (const value of ['0', 'Draw', 'D']) {
      const sgf = write(parse(`(;FF[4]SZ[19]RE[${value}])`))
      expect(sgf).toContain('RE[0]')
      expect(parse(sgf).getGameResult()).toBe('0')
    }
  })

  it('writes a void result in the casing the spec gives it', () => {
    const sgf = write(parse('(;FF[4]SZ[19]RE[Void])'))
    expect(sgf).toContain('RE[Void]')
    expect(parse(sgf).getGameResult()).toBe('Void')
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

describe('ConvertToSgf, the dates it writes', () => {

  it('writes a single date as one DT', () => {
    const game = new Game({game: {date: '2024-05-01'}})
    expect(write(game)).toContain('DT[2024-05-01]')
  })

  it('writes every date of a game played over several days', () => {

    //NOTE: DT used to be written from the single date alone, so a record with
    //more than one date came back out with only its first
    const game = new Game({game: {dates: ['2024-03-01', '2024-04-05']}})
    expect(write(game)).toContain('DT[2024-03-01,04-05]')
  })

  it('writes a run of consecutive days in the SGF shorthand', () => {
    const game = new Game({game: {
      dates: ['1996-10-18', '1996-10-19'],
    }})
    expect(write(game)).toContain('DT[1996-10-18,19]')
  })

  it('writes no DT at all for a game with no date', () => {
    expect(write(new Game())).not.toContain('DT[')
  })

  it('survives a round trip through its own output', () => {
    const game = parse(write(new Game({game: {
      dates: ['2024-03-01', '2024-03-02', '2024-04-05'],
    }})))
    expect(game.getGameDates())
      .toEqual(['2024-03-01', '2024-03-02', '2024-04-05'])
  })

  it('brings a multi-date record back unchanged', () => {
    const sgf = '(;FF[4]GM[1]SZ[19]DT[1996-10-18,19])'
    expect(write(parse(sgf))).toContain('DT[1996-10-18,19]')
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

describe('ConvertToSgf, the board view', () => {

  it('writes a partial board as a compressed VW point list', () => {
    const game = new Game()
    game.setBoardSize(19)
    game.setBoardCutOff(1, 2, 3, 4)
    expect(write(game)).toContain('VW[bd:qo]')
  })

  it('writes a view of a single point as that point', () => {
    const game = new Game()
    game.setBoardSize(9)
    game.setBoardCutOff(4, 4, 4, 4)
    expect(write(game)).toContain('VW[ee]')
  })

  it('writes no view for a board with nothing cut off', () => {
    const game = new Game()
    game.setBoardSize(19)
    game.setBoardCutOff(0, 0, 0, 0)
    expect(write(game)).not.toContain('VW[')
  })

  it('writes no view when the sides are cut past each other', () => {
    const game = new Game()
    game.setBoardSize(9)
    game.setBoardCutOff(6, 6, 0, 0)
    expect(write(game)).not.toContain('VW[')
  })

  it('leaves out a view it cannot name, rather than failing the export', () => {
    //A board past 52 lines has no SGF coordinate for its far corner. The cut
    //off used to go out as a plain number of lines, so throwing here would
    //take a record that exported before down with it
    const warn = vi.spyOn(console, 'warn').mockImplementation(vi.fn())
    const game = new Game()
    game.setBoardSize(60)
    game.setBoardCutOff(1, 0, 0, 0)

    expect(write(game)).not.toContain('VW[')
    expect(warn).toHaveBeenCalled()
  })

  it('no longer writes the private XL/XR/XT/XB properties', () => {
    //These were seki's own and nothing else reads them, so a partial board
    //now travels as VW alone
    const game = new Game()
    game.setBoardSize(19)
    game.setBoardCutOff(1, 2, 3, 4)

    const sgf = write(game)
    expect(sgf).not.toMatch(/X[LRTB]\[/)
    expect(sgf).toContain('VW[bd:qo]')
  })

  it('takes a partial board in as X properties and writes it out as VW', () => {
    const sgf = write(parse('(;FF[4]SZ[19]XL[1]XR[2]XT[3]XB[4])'))
    expect(sgf).toContain('VW[bd:qo]')
    expect(sgf).not.toMatch(/X[LRTB]\[/)

    expect(parse(sgf).getBoardCutOff()).toEqual({
      cutOffLeft: 1,
      cutOffRight: 2,
      cutOffTop: 3,
      cutOffBottom: 4,
    })
  })

  it('round trips a partial board on a rectangular board', () => {
    const sgf = write(parse('(;FF[4]SZ[19:13]VW[bd:qk])'))
    expect(sgf).toContain('VW[bd:qk]')
    expect(parse(sgf).getBoardCutOff()).toEqual({
      cutOffLeft: 1,
      cutOffRight: 2,
      cutOffTop: 3,
      cutOffBottom: 2,
    })
  })
})

describe('ConvertToSgf, what it refuses', () => {

  it('refuses anything that is not a game', () => {
    const converter = new ConvertToSgf()

    expect(() => converter.convert({})).toThrow('Not a game instance')
    expect(() => converter.convert(null)).toThrow('Not a game instance')
  })
})

describe('ConvertToSgf, the source it credits', () => {

  const sourceOf = sgf => sgf.match(/SO\[(.*?)\]/)?.[1]

  it('writes the name and the URL together when it has both', () => {
    const game = new Game()
    game.setSourceName('Go Weekly')
    game.setSourceUrl('https://example.test/game')

    expect(sourceOf(game.toSgf())).toBe('Go Weekly, https://example.test/game')
  })

  it('writes the name alone', () => {
    const game = new Game()
    game.setSourceName('Go Weekly')

    expect(sourceOf(game.toSgf())).toBe('Go Weekly')
  })

  it('writes the URL alone', () => {
    const game = new Game()
    game.setSourceUrl('https://example.test/game')

    expect(sourceOf(game.toSgf())).toBe('https://example.test/game')
  })

  it('writes neither when it has neither', () => {
    expect(sourceOf(new Game().toSgf())).toBeUndefined()
  })

  it('writes the copyright when there is one', () => {
    const game = new Game()
    game.setSourceCopyright('© 2026')

    expect(game.toSgf()).toContain('CP[© 2026]')
  })
})

describe('ConvertToSgf, the players it names', () => {

  it('writes the rank and team alongside the name', () => {
    const game = new Game()
    game.setPlayer(stoneColors.BLACK, {
      name: 'Black Player', rank: '5d', team: 'Team A',
    })

    const sgf = game.toSgf()

    expect(sgf).toContain('PB[Black Player]')
    expect(sgf).toContain('BR[5d]')
    expect(sgf).toContain('BT[Team A]')
  })

  it('writes an empty name for a player it has nothing for', () => {
    const sgf = new Game().toSgf()

    expect(sgf).toContain('PB[]')
    expect(sgf).toContain('PW[]')
    expect(sgf).not.toContain('BR[')
    expect(sgf).not.toContain('BT[')
  })

  it('skips an entry under a colour it does not know', () => {
    const game = new Game()
    game.players.purple = {name: 'Purple Player'}

    expect(game.toSgf()).not.toContain('Purple Player')
  })
})

describe('ConvertToSgf, escaping', () => {

  it('escapes the closing bracket and the backslash', () => {

    //Both end a value as far as an SGF reader is concerned, so both have to
    //be escaped or the record is cut short at the first one
    const game = new Game()
    game.setGameName('A [bracket] and a \\ backslash')

    const sgf = game.toSgf()

    expect(sgf).toContain('A [bracket\\] and a \\\\ backslash')
  })

  it('leaves anything that is not a string alone', () => {
    const converter = new ConvertToSgf()

    expect(converter.escapeSgf(42)).toBe(42)
    expect(converter.escapeSgf(null)).toBeNull()
  })

  it('round trips an escaped value back out again', () => {
    const game = new Game()
    game.setGameName('A [bracket]')

    expect(Game.fromSgf(game.toSgf()).getGameName()).toBe('A [bracket]')
  })
})

describe('ConvertToSgf, comments and node names', () => {

  const sgfFor = build => {
    const game = new Game({board: {size: 9}})
    game.playMove(2, 2)
    build(game)
    return game.toSgf()
  }

  it('writes a comment', () => {
    expect(sgfFor(game => game.setComments('a note'))).toContain('C[a note]')
  })

  it('writes several comments as several values', () => {
    const sgf = sgfFor(game => game.setComments(['first', 'second']))
    expect(sgf).toContain('C[first][second]')
  })

  it('writes nothing for a comment that is empty', () => {
    expect(sgfFor(game => game.setComments(''))).not.toContain('C[')
    expect(sgfFor(game => game.setComments([]))).not.toContain('C[')
    expect(sgfFor(game => game.setComments(['', null]))).not.toContain('C[')
  })

  it('writes a node name', () => {
    const sgf = sgfFor(game => {
      game.getCurrentNode().name = 'the fork'
    })
    expect(sgf).toContain('N[the fork]')
  })

  it('writes nothing for a node with no name', () => {
    expect(sgfFor(() => null)).not.toContain('N[')
  })
})

describe('ConvertToSgf, the variation settings it writes', () => {

  //ST is a two bit field: bit one is whether siblings are shown, bit two is
  //whether variations are shown at all, inverted
  const settings = (showVariations, showSiblingVariations) => {
    const game = new Game()
    game.setSettings({showVariations, showSiblingVariations})
    return new ConvertToSgf().convert(game, {includeVariationSettings: true})
  }

  it('writes children only as zero', () => {
    expect(settings(true, false)).toContain('ST[0]')
  })

  it('writes siblings as one', () => {
    expect(settings(true, true)).toContain('ST[1]')
  })

  it('writes no variations as two', () => {
    expect(settings(false, false)).toContain('ST[2]')
  })

  it('writes no variations with siblings as three', () => {
    expect(settings(false, true)).toContain('ST[3]')
  })

  it('writes none of it unless it is asked to', () => {
    const game = new Game()
    game.setSettings({showVariations: false})

    expect(game.toSgf()).not.toContain('ST[')
  })
})

describe('ConvertToSgf, a board it cannot size', () => {

  it('writes a zero rather than leaving the key out', () => {

    //A record that never said how big its board is has nothing to write, and
    //a missing SZ is a nineteen by nineteen board to every reader
    const game = new Game()
    game.boardWidth = 0
    game.boardHeight = 0

    expect(game.toSgf()).toContain('SZ[0]')
  })
})
