import {describe, it, expect} from 'vitest'
import Game from '../game.js'
import ConvertFromGib from './convert-from-gib.js'
import {handicapPlacements} from '../../constants/game.js'
import {setupTypes} from '../../constants/setup.js'
import {stoneColors} from '../../constants/stone.js'
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

  it('keeps the name when the rank is written in a script it cannot read', () => {

    //A rank in Korean or Chinese costs the rank alone, the name being ASCII
    //either way. The Chinese record also writes no space before the bracket.
    const game = parse(`[GAMEWHITENAME=Alice (1급)] [GAMEBLACKNAME=Bob(3段)] ${moves}`)
    expect(game.getPlayer(BLACK)).toEqual({name: 'Bob'})
    expect(game.getPlayer(WHITE)).toEqual({name: 'Alice'})
  })

  it('reads a player written without a rank at all', () => {

    //Properties are wrapped in escaped brackets, and the escape has to end
    //the value, or a player with no rank keeps the backslash in their name
    const game = parse(String.raw`\[GAMEBLACKNAME=Bob\] ${moves}`)
    expect(game.getPlayer(BLACK)).toEqual({name: 'Bob'})
  })

  it('reads a kyu and a pro rank as readily as a dan one', () => {
    const game = parse(`[GAMEWHITENAME=Alice (10K)] [GAMEBLACKNAME=Bob (9p)] ${moves}`)
    expect(game.getPlayer(BLACK).rank).toBe('9P')
    expect(game.getPlayer(WHITE).rank).toBe('10K')
  })

  it('reads the handicap off the INI line, and places its stones', () => {

    //The INI line opens the move section, and states the handicap in its
    //third field
    const game = parse(`${header} INI 0 1 4 &4`)
    expect(game.getHandicap()).toBe(4)
    expect(game.getRootNode().setup).toEqual([{
      type: setupTypes.BLACK,
      coords: handicapPlacements[19][4],
    }])
  })

  it('places no stones for an even game', () => {
    const game = parse(`${header} INI 0 1 0 &4 ${moves}`)
    expect(game.getHandicap()).toBe(0)
    expect(game.getRootNode().setup).toBeUndefined()
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
    expect(game.getGameDate()).toBe('')
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

    it('reads both players, and neither rank, both being written in Korean', () => {

      //The file says GAMEBLACKNAME=dustkd1015 (1급) and
      //GAMEWHITENAME=dongjik (1급). The rank is unreadable until charset
      //detection lands, which costs the rank and nothing else.
      expect(game().getPlayer(BLACK)).toEqual({name: 'dustkd1015'})
      expect(game().getPlayer(WHITE)).toEqual({name: 'dongjik'})
    })

    it('reads no handicap, the record being an even game', () => {

      //The file's INI line reads "INI 0 1 0 &4"
      expect(game().getHandicap()).toBe(0)
      expect(game().getRootNode().setup).toBeUndefined()
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

    it('reads the three stone handicap off the INI line', () => {

      //The file's INI line reads "INI 0 1 3 &4", and GAMECONDITION spells
      //the same number out as "3 Handicap"
      expect(game().getHandicap()).toBe(3)
    })

    it('places its three stones the way the Korean servers do', () => {

      //The standard three stone placement puts a stone on the bottom right
      //star point, being (15,15), which is where this record plays its very
      //first move. Tygem uses the top left instead, as WBaduk does.
      expect(game().getRootNode().setup).toEqual([{
        type: setupTypes.BLACK,
        coords: [
          {x: 3, y: 3},
          {x: 3, y: 15},
          {x: 15, y: 3},
        ],
      }])
    })

    it('reads both players, ranks included, both being kyu', () => {

      //The file says GAMEBLACKNAME=jy512 (15K) and
      //GAMEWHITENAME=leejw977 (10K)
      expect(game().getPlayer(BLACK)).toEqual({name: 'jy512', rank: '15K'})
      expect(game().getPlayer(WHITE)).toEqual({name: 'leejw977', rank: '10K'})
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

    it('reads the five stone handicap off the INI line', () => {

      //The file's INI line reads "INI 0 1 5 &4", with the handicap followed
      //by a run of Chinese text this reader has no use for
      expect(game().getHandicap()).toBe(5)
    })

    it('places its five stones on the standard points', () => {

      //Unlike three stones, five are placed the way everybody else places
      //them, which is what makes the record replay to its end
      expect(game().getRootNode().setup).toEqual([{
        type: setupTypes.BLACK,
        coords: handicapPlacements[19][5],
      }])
    })

    it('replays all 268 moves, the handicap stones being on the board', () => {

      //NOTE: without the handicap this stopped 214 moves in, on "Position
      //(2,3) already has a stone". A capture the real game made never
      //happened, and the move played onto that point landed on a stone.
      expect(replayMainLine(game())).toEqual({played: 268, failure: null})
    })

    it('reads the white player, and neither name written in Chinese', () => {

      //NOTE: the file says GAMEWHITENAME=harpmaster(3段), with no space
      //before the bracket, and GAMEBLACKNAME=石佛之心(2段). Both ranks are
      //in Chinese, and so is the black player's name, which comes back as
      //replacement characters until charset detection lands.
      expect(game().getPlayer(WHITE)).toEqual({name: 'harpmaster'})
      expect(game().getPlayer(BLACK).name).toContain('\uFFFD')
      expect(game().getPlayer(BLACK).rank).toBeUndefined()
    })

    it('leaves the date empty, because it is written in Chinese', () => {

      //NOTE: the file says GAMEDATE=2012年11月22日 下午 6:3. The date pattern
      //wants YYYY-M-D, so nothing matches and no date is set. This used to
      //read as today, because the game kept the date a new Game is stamped
      //with, which made an unreadable date a confident wrong answer rather
      //than a missing one.
      expect(game().getGameDate()).toBe('')
    })
  })
})
