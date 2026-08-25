import {describe, it, expect, vi, afterEach} from 'vitest'
import ConvertFromSgf from './convert-from-sgf.js'
import {stoneColors} from '../../constants/stone.js'
import {markupTypes} from '../../constants/markup.js'
import {
  loadFixture, replayMainLine, countNodes, countForks
} from '../../../test/fixtures.js'

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
    expect(parse('(;FF[4]SZ[19];B[dd])').getGameDate()).toBe('')
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

    it('keeps only the first of a multi-date DT', () => {

      //NOTE: the record reads DT[1996-10-18,19], being a game played over
      //the 18th and 19th of October. Game#setInfo takes the first date and
      //drops the rest, which KNOWN_ISSUES.md documents. This is the first
      //record in the suite to actually exercise it.
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

    it('stops reading a property list at a line break', () => {

      //NOTE: the markup variation's node opens with an AB list of 35 points
      //split over three lines, followed by an AW list of another 37. Only
      //the 17 points on the AB list's first line survive, and the AW list
      //is dropped whole, because the node pattern joins values with no
      //whitespace allowed between them. See KNOWN_ISSUES.md.
      const g = game()
      const markup = g.getRootNode().getChild(2)
      expect(markup.setup).toHaveLength(1)
      expect(markup.setup[0].type).toBe(stoneColors.BLACK)
      expect(markup.setup[0].coords).toHaveLength(17)
    })
  })
})
