import {describe, it, expect, vi} from 'vitest'
import Game from './game.js'
import {stoneColors} from '../constants/stone.js'
import {kifuFormats} from '../constants/app.js'

const {BLACK, WHITE} = stoneColors

//Every plain set/get pair on the record, with a value to round trip through it
const accessors = [
  ['RecordVersion', '4'],
  ['RecordCharset', 'UTF-8'],
  ['RecordGenerator', 'Seki'],
  ['RecordTranscriber', 'A. Transcriber'],
  ['SourceName', 'Go Weekly'],
  ['SourceUrl', 'https://example.test/game'],
  ['SourceCopyright', '© 2026'],
  ['EventRound', 'Final'],
  ['GameType', 'Go'],
  ['GameName', 'A famous game'],
  ['GameOpening', 'Chinese'],
  ['GameAnnotator', 'A. Annotator'],
  ['GameDescription', 'A description'],
  ['Ruleset', 'Japanese'],
  ['Overtime', '5x30 byo-yomi'],
]

describe('Game record information', () => {

  for (const [name, value] of accessors) {
    it(`round trips ${name.charAt(0).toLowerCase()}${name.slice(1)}`, () => {
      const game = new Game()

      game[`set${name}`](value)
      expect(game[`get${name}`]()).toBe(value)
    })
  }

  it('says so whenever a piece of information changes', () => {
    const game = new Game()
    const listener = vi.fn()
    game.on('info', listener)

    game.setGameName('A famous game')

    expect(listener.mock.calls[0][0].detail).toEqual({
      gameName: 'A famous game',
    })
  })

  it('empties a field it is set to nothing', () => {
    const game = new Game()
    game.setGameName('A famous game')

    game.setGameName()

    expect(game.getGameName()).toBe('')
  })

  it('splits a URL out of an event name into the location', () => {

    //Online servers routinely write the event and a link to it as one string
    const game = new Game()
    game.setEventName('The Big Cup, https://example.test/cup')

    expect(game.getEventName()).toBe('The Big Cup')
    expect(game.getEventLocation()).toBe('https://example.test/cup')
  })

  it('leaves an event that carries no URL alone', () => {
    const game = new Game()
    game.setEventName('The Big Cup, Tokyo')

    expect(game.getEventName()).toBe('The Big Cup, Tokyo')
    expect(game.getEventLocation()).toBe('')
  })

  it('takes an event location on its own as well', () => {
    const game = new Game()
    game.setEventLocation('Tokyo')

    expect(game.getEventLocation()).toBe('Tokyo')
  })

  it('carries the time settings', () => {
    const game = new Game()

    game.setTime(3600)
    game.setNumberOfPeriods(5)
    game.setTimePerPeriod(30)

    expect(game.getTime()).toBe(3600)
    expect(game.getNumberOfPeriods()).toBe(5)
    expect(game.getTimePerPeriod()).toBe(30)
  })

  it('carries arbitrary metadata and settings', () => {
    const game = new Game()

    game.setMeta({source: 'somewhere'})
    game.setSettings({showCoordinates: false})

    expect(game.getMeta()).toEqual({source: 'somewhere'})
    expect(game.getSettings()).toEqual({showCoordinates: false})
  })

  it('reads a whole info object back out again', () => {
    const game = new Game()
    game.setGameName('A famous game')
    game.setKomi(6.5)

    const info = game.getInfo()

    expect(info.game.name).toBe('A famous game')
    expect(info.rules.komi).toBe(6.5)
  })
})

describe('Game board size', () => {

  it('takes a square size', () => {
    const game = new Game()
    game.setBoardSize(13, 13)

    expect(game.getBoardSize()).toEqual({width: 13, height: 13})
  })

  it('takes a rectangular one', () => {
    const game = new Game()
    game.setBoardSize(19, 13)

    expect(game.getBoardSize()).toEqual({width: 19, height: 13})
  })

  it('squares off a size given only one way', () => {
    const game = new Game()
    game.setBoardSize(9)

    expect(game.getBoardSize()).toEqual({width: 9, height: 9})
  })

  it('keeps the size it had when given one it cannot parse', () => {
    const game = new Game()
    game.setBoardSize(13, 13)

    game.setBoardSize('nonsense', 'nonsense')

    expect(game.getBoardSize()).toEqual({width: 13, height: 13})
  })

  it('carries the cut off edges of a board section', () => {
    const game = new Game()
    game.setBoardCutOff(1, 2, 3, 4)

    expect(game.getBoardCutOff()).toEqual({
      cutOffLeft: 1, cutOffRight: 2, cutOffTop: 3, cutOffBottom: 4,
    })
  })

  it('hands the board everything it needs to size itself', () => {
    const game = new Game()
    game.setBoardSize(13, 13)
    game.setBoardCutOff(1, 0, 0, 0)

    expect(game.getBoardConfig()).toMatchObject({
      width: 13, height: 13, cutOffLeft: 1,
    })
  })
})

describe('Game rules', () => {

  it('carries whether suicide is allowed', () => {
    const game = new Game()
    expect(game.getAllowSuicide()).toBe(false)

    game.setAllowSuicide(true)
    expect(game.getAllowSuicide()).toBe(true)
  })

  it('carries whether repeating positions are barred', () => {
    const game = new Game()
    expect(game.getDisallowRepeats()).toBe(false)

    game.setDisallowRepeats(true)
    expect(game.getDisallowRepeats()).toBe(true)
  })

  it('carries komi and handicap', () => {
    const game = new Game()

    game.setKomi(7.5)
    game.setHandicap(4)

    expect(game.getKomi()).toBe(7.5)
    expect(game.getHandicap()).toBe(4)
  })

  it('carries the players', () => {
    const game = new Game()

    game.setPlayer(BLACK, {name: 'Black Player', rank: '5d'})
    game.updatePlayer(BLACK, {rank: '6d'})

    expect(game.getPlayer(BLACK)).toMatchObject({
      name: 'Black Player', rank: '6d',
    })
    expect(game.getPlayers()).toHaveProperty(BLACK)
    expect(game.getPlayers()).toHaveProperty(WHITE)
  })
})

describe('Game turn handling', () => {

  it('starts on black', () => {
    expect(new Game().getTurn()).toBe(BLACK)
  })

  it('takes a turn it is given', () => {
    const game = new Game()
    game.setTurn(WHITE)

    expect(game.getTurn()).toBe(WHITE)
  })

  it('switches turn', () => {
    const game = new Game()
    game.switchTurn()

    expect(game.getTurn()).toBe(WHITE)
  })

  it('says so when the turn changes', () => {
    const game = new Game()
    const listener = vi.fn()
    game.on('positionChange', listener)

    game.setTurn(WHITE)
    game.switchTurn()

    expect(listener).toHaveBeenCalledTimes(2)
  })
})

describe('Game clock', () => {

  //A record that carries the clock on each move, the way a served game does
  const sgf = '(;GM[1]FF[4]SZ[9]TM[600];B[cc]BL[580]OB[5];W[gg]WL[560]OW[5])'

  it('reports the main time at the root', () => {
    const game = Game.fromSgf('(;GM[1]FF[4]SZ[9]TM[600])')

    expect(game.getTimeLeft(BLACK)).toBe(600)
  })

  it('reports what a move left on the clock', () => {
    const game = Game.fromSgf(sgf)
    game.goToLastPosition()

    expect(game.getTimeLeft(WHITE)).toBe(560)
    expect(game.getPeriodsLeft(WHITE)).toBe(5)
  })

  it('looks back a move for the other player clock', () => {
    const game = Game.fromSgf(sgf)
    game.goToLastPosition()

    expect(game.getTimeLeft(BLACK)).toBe(580)
    expect(game.getPeriodsLeft(BLACK)).toBe(5)
  })

  it('falls back to the main time before that player has moved', () => {
    const game = Game.fromSgf(sgf)
    game.goToNextPosition()

    expect(game.getTimeLeft(WHITE)).toBe(600)
    expect(game.getPeriodsLeft(WHITE)).toBeUndefined()
  })

  it('reports nothing on a node that is not a move', () => {
    const game = Game.fromSgf('(;GM[1]FF[4]SZ[9]TM[600];B[cc];AW[gg])')
    game.goToLastPosition()

    expect(game.getTimeLeft(BLACK)).toBeUndefined()
    expect(game.getPeriodsLeft(BLACK)).toBeUndefined()
  })
})

describe('Game format handling', () => {

  const sgf = '(;GM[1]FF[4]SZ[9];B[cc];W[gg])'

  it('detects an SGF string', () => {
    expect(Game.detectFormat(sgf)).toBe(kifuFormats.SGF)
  })

  it('detects a JGF string and the object it parses to', () => {
    const jgf = Game.fromSgf(sgf).toJgf()

    expect(Game.detectFormat(jgf)).toBe(kifuFormats.JGF)
    expect(Game.detectFormat(JSON.parse(jgf))).toBe(kifuFormats.JGF)
  })

  it('refuses to guess at nothing', () => {
    expect(() => Game.detectFormat('')).toThrow('No data')
  })

  it('loads from data of whatever format it is handed', () => {
    const fromSgf = Game.fromData(sgf)
    const fromJgf = Game.fromData(fromSgf.toJgf())

    expect(fromSgf.getTotalNumberOfMoves()).toBe(2)
    expect(fromJgf.getTotalNumberOfMoves()).toBe(2)
  })

  it('writes out to whichever format it is asked for', () => {
    const game = Game.fromSgf(sgf)

    expect(game.toData(kifuFormats.SGF)).toContain('B[cc]')
    expect(game.toData(kifuFormats.JGF)).toContain('"record"')
  })

  it('refuses a format it does not know', () => {
    const game = Game.fromSgf(sgf)
    expect(() => game.toData('pdf')).toThrow('Unsupported data format')
  })

  it('refuses data it cannot parse as the format claimed', () => {
    expect(() => Game.fromSgf('not an sgf')).toThrow()
    expect(() => Game.fromJgf('not a jgf')).toThrow()
  })
})

describe('Game position stack', () => {

  it('adds and removes positions as the game is walked', () => {
    const game = Game.fromSgf('(;GM[1]FF[4]SZ[9];B[cc];W[gg])')
    const atRoot = game.positions.length

    game.goToLastPosition()
    expect(game.positions).toHaveLength(atRoot + 2)

    game.goToPreviousPosition()
    expect(game.positions).toHaveLength(atRoot + 1)
  })

  it('empties the stack when cleared', () => {
    const game = Game.fromSgf('(;GM[1]FF[4]SZ[9];B[cc])')
    game.clearPositionStack()

    expect(game.positions).toHaveLength(0)
  })

  it('reports the position as a matrix of colour numbers', () => {
    const game = Game.fromSgf('(;GM[1]FF[4]SZ[9];B[cc];W[gg])')
    game.goToLastPosition()

    const matrix = game.getPositionMatrix()

    expect(matrix).toHaveLength(9)
    expect(matrix[2][2]).toBe(1)
    expect(matrix[6][6]).toBe(-1)
    expect(matrix[0][0]).toBe(0)
  })
})

describe('Game path handling', () => {

  //Forks at the second move, and names the node it forks at
  const sgf = '(;GM[1]FF[4]SZ[9];B[cc]N[the fork](;W[gg];B[cg])(;W[gc]))'

  it('reports its path as a plain object', () => {
    const game = Game.fromSgf(sgf)
    game.goToLastPosition()

    expect(game.getPathObject()).toEqual({
      moveNo: 3, path: {}, branches: 0,
    })
  })

  it('finds a named node', () => {
    const game = Game.fromSgf(sgf)

    expect(game.findNamedNode('the fork').name).toBe('the fork')
  })

  it('throws when asked to find a node by name', () => {

    //NOTE: pinning current behaviour, and it is a bug. Game#findNodeByName
    //hands the name to GameNode#findNodeByName, which does not exist — the
    //node class has findNode(target, path) and nothing else. The method
    //cannot ever have worked. See KNOWN_ISSUES.md.
    const game = Game.fromSgf(sgf)

    expect(() => game.findNodeByName('the fork')).toThrow(TypeError)
  })

  it('finds the node a path leads to', () => {
    const game = Game.fromSgf(sgf)
    game.goToLastPosition()
    const node = game.getCurrentNode()

    expect(game.findNodeForPath(game.getPath())).toBe(node)
  })

  it('takes a path as a plain object too', () => {
    const game = Game.fromSgf(sgf)
    game.goToLastPosition()
    const node = game.getCurrentNode()

    expect(game.findNodeForPath(game.getPathObject())).toBe(node)
  })

  it('finds nothing for no path at all', () => {
    expect(Game.fromSgf(sgf).findNodeForPath(null)).toBeNull()
  })

  it('finds nothing for a path that runs off the tree', () => {
    const game = Game.fromSgf(sgf)

    expect(game.findNodeForPath({moveNo: 9, path: {}, branches: 0})).toBeNull()
  })

  it('sets and reads the index of the branch it is following', () => {
    const game = Game.fromSgf(sgf)
    game.goToNextPosition()

    game.setCurrentPathIndex(1)
    expect(game.getCurrentPathIndex()).toBe(1)
  })

  it('stays put when told to go where it already is', () => {
    const game = Game.fromSgf(sgf)
    game.goToNamedNode('the fork')
    const node = game.getCurrentNode()

    game.goToNamedNode('the fork')
    game.goToNode(node)
    game.goToPath(game.getPath())

    expect(game.getCurrentNode()).toBe(node)
  })

  it('goes nowhere for no path', () => {
    const game = Game.fromSgf(sgf)
    game.goToPath(null)

    expect(game.getCurrentMoveNumber()).toBe(0)
  })

  it('walks to the next and previous fork', () => {
    const game = Game.fromSgf(sgf)

    game.goToNextFork()
    expect(game.getCurrentMoveNumber()).toBe(1)

    game.goToLastPosition()
    game.goToPreviousFork()
    expect(game.getCurrentMoveNumber()).toBe(1)
  })
})

describe('Game comments', () => {

  it('reads and writes the comments of the current node', () => {
    const game = Game.fromSgf('(;GM[1]FF[4]SZ[9];B[cc])')
    game.goToLastPosition()

    game.setComments('a note')

    expect(game.getComments()).toEqual(['a note'])
    expect(game.toSgf()).toContain('C[a note]')
  })
})

describe('Game area operations', () => {

  const area = [{x: 2, y: 2}, {x: 3, y: 3}]

  it('removes markup across an area, skipping what has none', () => {
    const game = new Game({board: {size: 9}})
    game.addMarkup(2, 2, {type: 'triangle'})

    game.removeMarkupFromArea(area)

    expect(game.hasMarkupInArea(area)).toBe(false)
  })

  it('removes stones across an area, skipping what has none', () => {
    const game = new Game({board: {size: 9}})
    game.addStone(2, 2, BLACK)

    game.removeStonesFromArea(area)

    expect(game.hasStonesInArea(area)).toBe(false)
  })

  it('reports what an area holds', () => {
    const game = new Game({board: {size: 9}})
    game.addStone(3, 3, BLACK)
    game.addMarkup(2, 2, {type: 'triangle'})

    expect(game.hasStonesInArea(area)).toBe(true)
    expect(game.hasMarkupInArea(area)).toBe(true)
  })
})

describe('Game lines', () => {

  it('records free drawn lines against the position and the node', () => {
    const game = new Game({board: {size: 9}})

    game.addLine(0, 0, 1, 1, '#f00')

    expect(game.hasLines()).toBe(true)
    expect(game.getLines()).toEqual([[0, 0, 1, 1, '#f00']])
  })

  it('clears them again', () => {
    const game = new Game({board: {size: 9}})
    game.addLine(0, 0, 1, 1, '#f00')

    game.removeAllLines()

    expect(game.hasLines()).toBe(false)
  })
})

describe('Game move variations', () => {

  it('follows a variation that already exists rather than making another', () => {

    //Playing the move that is already the first continuation walks into it
    const game = Game.fromSgf('(;GM[1]FF[4]SZ[9];B[cc];W[gg])')

    game.playMove(2, 2)

    expect(game.getCurrentMoveNumber()).toBe(1)
    expect(game.getTotalNumberOfMoves()).toBe(2)
  })

  it('reports which continuation a point belongs to', () => {
    const game = Game.fromSgf('(;GM[1]FF[4]SZ[9];B[cc](;W[gg])(;W[gc]))')
    game.goToNextPosition()

    expect(game.isMoveVariation(6, 6)).toBe(true)
    expect(game.getMoveVariationIndex(6, 2)).toBe(1)
    expect(game.isMoveVariation(4, 4)).toBe(false)
  })
})
