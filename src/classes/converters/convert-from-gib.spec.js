import {describe, it, expect} from 'vitest'
import Game from '../game.js'
import ConvertFromGib from './convert-from-gib.js'
import {handicapPlacements} from '../../constants/game.js'
import {setupTypes} from '../../constants/setup.js'
import {stoneColors} from '../../constants/stone.js'
import {dateString} from '../../helpers/util.js'
import {loadFixture, replayMainLine} from '../../../test/fixtures.js'

const {BLACK, WHITE} = stoneColors

const header = [
  '\\ [GAMEWHITENAME=Alice (1D)]',
  '[GAMEBLACKNAME=Bob (2D)]',
  '[GAMEGONGJE=65]',
].join(' ')

//STO 0 <moveNo> <color> <x> <y>, where colour 1 is black and 2 is white
const moves = 'STO 0 2 1 3 3 STO 0 3 2 15 3 STO 0 4 1 3 15'

const parse = gib => new ConvertFromGib().convert(gib)

describe('ConvertFromGib', () => {

  it('rejects empty input', () => {
    expect(() => parse('')).toThrow('No GIB data supplied')
  })

  it('reads player names and ranks', () => {
    const game = parse(`${header} ${moves}`)
    expect(game.getPlayer(BLACK)).toMatchObject({name: 'Bob', rank: '2D'})
    expect(game.getPlayer(WHITE)).toMatchObject({name: 'Alice', rank: '1D'})
  })

  it('reads komi, which is stored ten times over', () => {
    expect(parse(`${header} ${moves}`).getKomi()).toBe(6.5)
  })

  it('reads the moves in order, alternating colour', () => {
    const game = parse(`${header} ${moves}`)

    const first = game.getRootNode().getChild(0)
    expect(first.move).toMatchObject({x: 3, y: 3, color: BLACK})

    const second = first.getChild(0)
    expect(second.move).toMatchObject({x: 15, y: 3, color: WHITE})

    const third = second.getChild(0)
    expect(third.move).toMatchObject({x: 3, y: 15, color: BLACK})
    expect(third.hasChildren()).toBe(false)
  })

  it('reads a result with a margin', () => {
    const game = parse(`${header} [GAMERESULT=white 13.5 win] ${moves}`)
    expect(game.getGameResult()).toBe('W+13.5')
  })

  it('reads a result by resignation', () => {
    const game = parse(`${header} [GAMERESULT=black wins by resignation] ${moves}`)
    expect(game.getGameResult()).toBe('B+R')
  })

  it('reads a date without throwing', () => {

    //NOTE: this used to call game.setDate, which does not exist, so any
    //record carrying a date threw "game.setDate is not a function"
    const game = parse(`${header} [GAMEDATE=2024- 3- 9] ${moves}`)
    expect(game.getGameDate()).toBe('2024-03-09')
  })

  it('handles a record with no date at all', () => {
    const game = parse(`${header} ${moves}`)
    expect(() => game.getGameDate()).not.toThrow()
  })

  it('parses a second record without state carried over from the first', () => {

    //The module level regexes used to be global and run through a single
    //exec, so their lastIndex survived into the next file and everything
    //after the first record came back empty
    parse(`${header} [GAMERESULT=white 13.5 win] [GAMEDATE=2024- 3- 9] ${moves}`)
    const second = parse(`${header} [GAMERESULT=black 5.5 win] [GAMEDATE=2023- 1- 2] ${moves}`)

    expect(second.getKomi()).toBe(6.5)
    expect(second.getGameResult()).toBe('B+5.5')
    expect(second.getGameDate()).toBe('2023-01-02')
    expect(second.getPlayer(BLACK).name).toBe('Bob')
    expect(second.getRootNode().getChild(0).move).toMatchObject({x: 3, y: 3})
  })

  it('is reachable through the generic loader', () => {
    const game = Game.fromGib(`${header} [GAMEDATE=2024- 3- 9] ${moves}`)
    expect(game.getRootNode().getChild(0).move).toMatchObject({x: 3, y: 3})
  })

  it('is picked up by format detection', () => {
    const gib = `${header} ${moves}`
    const game = Game.fromData(gib)
    expect(game.getPlayer(BLACK).name).toBe('Bob')
  })
})

describe('ConvertFromGib, real Tygem records', () => {

  //The three records in the corpus are everything Sabaki has, and between
  //them they are the only evidence available of what Tygem actually writes.
  //See test/fixtures/README.md for where they came from.

  it('reads every record without throwing', () => {
    for (const name of ['euc-kr.gib', 'gb2312.gib', 'utf8.gib']) {
      expect(() => parse(loadFixture(`gib/${name}`))).not.toThrow()
    }
  })

  describe('euc-kr.gib', () => {

    const game = () => parse(loadFixture('gib/euc-kr.gib'))

    it('reads the header values written in ASCII', () => {
      expect(game().getKomi()).toBe(6.5)
      expect(game().getGameDate()).toBe('2015-08-29')
      expect(game().getBoardSize()).toEqual({width: 19, height: 19})
      expect(game().getEventLocation()).toBe('Tygem Go Server')
    })

    it('replays its 49 moves legally end to end', () => {
      const g = game()
      expect(g.getTotalNumberOfMoves()).toBe(49)
      expect(replayMainLine(g)).toEqual({played: 49, failure: null})
    })

    it('opens where the record says, on the top right 5-3 point', () => {

      //The record's first move line reads "STO 0 2 1 16 2", and GIB writes
      //its coordinates zero based and the same way round Seki stores them
      expect(game().getRootNode().getChild(0).move)
        .toMatchObject({x: 16, y: 2, color: BLACK})
    })

    it('reads neither player, because both ranks are written in Korean', () => {

      //NOTE: the file says GAMEBLACKNAME=dustkd1015 (1급) and
      //GAMEWHITENAME=dongjik (1급), so both names are plainly there. The
      //rank pattern only accepts a bare "2D" or "K", so the whole match
      //fails and the name goes with it. See KNOWN_ISSUES.md.
      expect(game().getPlayer(BLACK).name).toBe('')
      expect(game().getPlayer(WHITE).name).toBe('')
    })

    it('reads no result, because it is written in Korean', () => {

      //NOTE: the file says GAMERESULT=흑 시간승, being black winning on
      //time. Nothing in the reader matches that, so the result is empty
      //rather than wrong. See KNOWN_ISSUES.md.
      expect(game().getGameResult()).toBe('')
    })
  })

  describe('utf8.gib', () => {

    const game = () => parse(loadFixture('gib/utf8.gib'))

    it('reads the header values it can', () => {
      expect(game().getKomi()).toBe(0)
      expect(game().getGameDate()).toBe('2016-03-26')
      expect(game().getBoardSize()).toEqual({width: 19, height: 19})
    })

    it('replays its 118 moves legally end to end', () => {
      const g = game()
      expect(g.getTotalNumberOfMoves()).toBe(118)
      expect(replayMainLine(g)).toEqual({played: 118, failure: null})
    })

    it('opens with a white move, as a handicap game does', () => {
      expect(game().getRootNode().getChild(0).move)
        .toMatchObject({x: 15, y: 15, color: WHITE})
    })

    it('reads no handicap, though the record carries one', () => {

      //NOTE: the file's INI line reads "INI 0 1 3 &4", and GAMECONDITION
      //spells it out as "3 Handicap". The reader never looks at either, so
      //the three stones are missing from the board. See KNOWN_ISSUES.md.
      expect(game().getHandicap()).toBe(0)
      expect(game().getRootNode().setup).toBeUndefined()
    })

    it('reads neither player, because both ranks are kyu', () => {

      //NOTE: the file says GAMEWHITENAME=leejw977 (10K) and
      //GAMEBLACKNAME=jy512 (15K). The rank pattern reads "([0-9]+D|K)",
      //which accepts "10D" or a bare "K" but not "10K", so the match fails
      //and takes the name with it. See KNOWN_ISSUES.md.
      expect(game().getPlayer(BLACK).name).toBe('')
      expect(game().getPlayer(WHITE).name).toBe('')
    })
  })

  describe('gb2312.gib', () => {

    const game = () => parse(loadFixture('gib/gb2312.gib'))

    it('reads the board size and komi', () => {
      expect(game().getBoardSize()).toEqual({width: 19, height: 19})
      expect(game().getKomi()).toBe(0)
    })

    it('reads all 268 moves the record declares', () => {

      //GAMETOTALNUM spells the count out as "总: 268数"
      expect(game().getTotalNumberOfMoves()).toBe(268)
    })

    it('stops replaying at move 214, for want of the handicap stones', () => {

      //NOTE: the file's INI line reads "INI 0 1 5 &4", being a five stone
      //handicap, which the reader does not read. Without those stones a
      //capture that the real game made never happens, and the move played
      //onto that point 214 moves in lands on an occupied intersection.
      //Placing the standard five stones first makes the whole record replay,
      //which is what the next test shows. See KNOWN_ISSUES.md.
      expect(replayMainLine(game())).toEqual({
        played: 213,
        failure: 'Position (2,3) already has a stone',
      })
    })

    it('replays in full once the five handicap stones are placed', () => {

      //This is the evidence that the handicap is the whole of the problem,
      //and that Tygem uses the standard placement for five stones
      const g = game()
      for (const {x, y} of handicapPlacements[19][5]) {
        g.getRootNode().addSetup(x, y, {type: setupTypes.BLACK})
      }
      expect(replayMainLine(g)).toEqual({played: 268, failure: null})
    })

    it('dates the record today, because the date is written in Chinese', () => {

      //NOTE: the file says GAMEDATE=2012年11月22日 下午 6:3. The date pattern
      //wants YYYY-M-D, so nothing matches, setGameDate is never called, and
      //the game keeps the default date a new Game is born with, being today.
      //An unreadable date therefore reads as a confident wrong one rather
      //than as a missing one. See KNOWN_ISSUES.md.
      expect(game().getGameDate()).toBe(dateString())
    })
  })
})
