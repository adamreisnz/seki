import {describe, it, expect} from 'vitest'
import ConvertFromNgf from './convert-from-ngf.js'
import {stoneColors} from '../../constants/stone.js'

const {BLACK, WHITE} = stoneColors

//NGF has no keys at all, so a header is entirely positional. These lines are
//taken from real WBaduk records, with only the values under test varied.
const header = ({
  boardSize = '19',
  white = 'LQC         9DP',
  black = 'CYY         9DP',
  handicap = '0',
  komi = '7',
  date = '20170316 [09:37]',
  result = 'Black wins by 0.5!',
} = {}) => [
  'Rated game',
  boardSize,
  white,
  black,
  'www.cyberoro.com',
  handicap,
  '0',
  komi,
  date,
  '5',
  result,
  '3',
]

//PM<move number><color><x><y><y><x>, where B is the first line of the board
const moves = ['PMABBREER', 'PMACWEEEE', 'PMADBQRRQ']

const parse = ngf => new ConvertFromNgf().convert(ngf)
const record = (info, lineEnding = '\n') =>
  [...header(info), ...moves].join(lineEnding)

describe('ConvertFromNgf', () => {

  it('rejects empty input', () => {
    expect(() => parse('')).toThrow('No NGF data supplied')
  })

  it('reads player names and ranks in conventional notation', () => {
    const game = parse(record({
      white: 'ace550      7D*',
      black: 'querdak5   21K*',
    }))
    expect(game.getPlayer(BLACK)).toMatchObject({name: 'querdak5', rank: '21k'})
    expect(game.getPlayer(WHITE)).toMatchObject({name: 'ace550', rank: '7d'})
  })

  it('reads a professional rank', () => {
    const game = parse(record())
    expect(game.getPlayer(BLACK)).toMatchObject({name: 'CYY', rank: '9p'})
  })

  it('reads a name off a line with no recognisable rank', () => {

    //Records written in Korean spell the rank out in Korean, which leaves
    //the name as the only thing on the line we can make sense of
    const game = parse(record({black: '노영현      7단P'}))
    expect(game.getPlayer(BLACK)).toMatchObject({name: '노영현'})
    expect(game.getPlayer(BLACK).rank).toBeUndefined()
  })

  it('reads the board size', () => {
    const game = parse(record({boardSize: '13'}))
    expect(game.getBoardSize()).toEqual({width: 13, height: 13})
  })

  it('falls back to a regular board when the size is unreadable', () => {
    const game = parse(record({boardSize: 'Rated game'}))
    expect(game.getBoardSize()).toEqual({width: 19, height: 19})
  })

  it('reads komi, which is written without its half point', () => {
    expect(parse(record({komi: '7'})).getKomi()).toBe(7.5)
  })

  it('leaves a handicap game without komi', () => {
    expect(parse(record({handicap: '2', komi: '0'})).getKomi()).toBe(0)
  })

  it('reads the date', () => {
    expect(parse(record()).getGameDate()).toBe('2017-03-16')
  })

  it('reads a date written with separators, as older records do', () => {
    const game = parse(record({date: '2009-03-25'}))
    expect(game.getGameDate()).toBe('2009-03-25')
  })

  it('reads a result with a margin', () => {
    const game = parse(record({result: 'Black wins by 0.5!'}))
    expect(game.getGameResult()).toBe('B+0.5')
  })

  it('reads a result that also spells out the score', () => {
    const game = parse(record({
      result: 'Black wins by 34win >> White(58):Black(92)',
    }))
    expect(game.getGameResult()).toBe('B+34')
  })

  it('reads a result by resignation', () => {
    const game = parse(record({result: 'White wins by  resign!'}))
    expect(game.getGameResult()).toBe('W+R')
  })

  it('reads a result phrased as a loss', () => {
    const game = parse(record({result: 'Black lose by time!'}))
    expect(game.getGameResult()).toBe('W+T')
  })

  it('leaves the result alone when the line names no winner', () => {

    //Korean records phrase the result in Korean, and a margin on its own
    //says nothing about who it belongs to
    const game = parse(record({result: '250수 흑7집승'}))
    expect(game.getGameResult()).toBe('')
  })

  it('reads the moves in order, alternating colour', () => {
    const game = parse(record())

    //Coordinates are letters with B as the first line, so R is 16 and E is 3
    const first = game.getRootNode().getChild(0)
    expect(first.move).toMatchObject({x: 16, y: 3, color: BLACK})

    const second = first.getChild(0)
    expect(second.move).toMatchObject({x: 3, y: 3, color: WHITE})

    const third = second.getChild(0)
    expect(third.move).toMatchObject({x: 15, y: 16, color: BLACK})
    expect(third.hasChildren()).toBe(false)
  })

  it('reads a record written with CRLF line endings', () => {
    const game = parse(record({}, '\r\n'))
    expect(game.getPlayer(BLACK)).toMatchObject({name: 'CYY', rank: '9p'})
    expect(game.getRootNode().getChild(0).move).toMatchObject({x: 16, y: 3})
  })

  it('skips a move that falls outside the board', () => {
    const game = parse([...header({boardSize: '9'}), 'PMABBREER'].join('\n'))
    expect(game.getRootNode().hasChildren()).toBe(false)
  })

  it('places the handicap stones, which a record never spells out', () => {
    const game = parse(record({handicap: '2', komi: '0'}))
    expect(game.getHandicap()).toBe(2)
    expect(game.getRootNode().setup).toEqual([{
      type: BLACK,
      coords: [{x: 3, y: 15}, {x: 15, y: 3}],
    }])
  })

  it('places the third handicap stone in the top left, as WBaduk does', () => {

    //NOTE: the standard placement puts this stone in the bottom right, and a
    //three stone record played there confirms WBaduk does not
    const game = parse(record({handicap: '3', komi: '0'}))
    expect(game.getRootNode().setup).toEqual([{
      type: BLACK,
      coords: [{x: 3, y: 3}, {x: 3, y: 15}, {x: 15, y: 3}],
    }])
  })

  it('treats a single handicap stone as an even game', () => {
    const game = parse(record({handicap: '1', komi: '0'}))
    expect(game.getRootNode().setup).toBeUndefined()
  })

  it('sets the event location', () => {
    expect(parse(record()).getEventLocation()).toBe('WBaduk Go Server')
  })
})
