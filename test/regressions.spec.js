import {describe, it, expect} from 'vitest'
import Game from '../src/classes/game.js'
import GameScore from '../src/classes/game-score.js'
import ConvertFromSgf from '../src/classes/converters/convert-from-sgf.js'
import ConvertToSgf from '../src/classes/converters/convert-to-sgf.js'
import {lowercase} from '../src/helpers/coordinates.js'
import {appVersion} from '../src/constants/app.js'
import {stoneColors} from '../src/constants/stone.js'
import {scoringMethods} from '../src/constants/score.js'
import {version as packageVersion} from '../package.json' with {type: 'json'}

/**
 * Regression tests for the small fixes in this branch. Each one fails on the
 * previous behaviour, so they double as documentation of what was wrong.
 */
describe('Game.isValidMove()', () => {

  it('returns a boolean instead of throwing', () => {
    const game = new Game()
    expect(game.isValidMove(3, 3, stoneColors.BLACK)).toBe(true)
  })

  it('rejects out of bounds coordinates', () => {
    const game = new Game()
    expect(game.isValidMove(-1, 3, stoneColors.BLACK)).toBe(false)
    expect(game.isValidMove(19, 3, stoneColors.BLACK)).toBe(false)
  })

  it('rejects an occupied intersection', () => {
    const game = new Game()
    game.playMove(3, 3)
    expect(game.isValidMove(3, 3, stoneColors.WHITE)).toBe(false)
  })

  it('does not mutate the current position', () => {
    const game = new Game()
    game.isValidMove(3, 3, stoneColors.BLACK)
    expect(game.hasStone(3, 3)).toBe(false)
  })
})

describe('Game.isMoveVariation()', () => {

  it('reports coordinates that a child move node plays on', () => {
    const game = new Game()
    game.playMove(3, 3)
    game.goToPreviousPosition()
    expect(game.isMoveVariation(3, 3)).toBe(true)
    expect(game.isMoveVariation(4, 4)).toBe(false)
  })
})

describe('Game navigation with a step count', () => {

  it('stops at the end of the tree instead of running the full count', () => {
    const game = new Game()
    game.playMove(3, 3)
    game.playMove(15, 15)
    game.goToFirstPosition()
    game.goForwardNumPositions(10)
    expect(game.getCurrentMoveNumber()).toBe(2)
  })

  it('stops at the start of the tree', () => {
    const game = new Game()
    game.playMove(3, 3)
    game.playMove(15, 15)
    game.goBackNumPositions(10)
    expect(game.getCurrentMoveNumber()).toBe(0)
    expect(game.isAtFirstPosition()).toBe(true)
  })
})

describe('Game event location', () => {

  it('keeps a plain location that contains no URL', () => {
    const game = new Game()
    game.setEventLocation('Amsterdam')
    expect(game.getEventLocation()).toBe('Amsterdam')
  })

  it('still splits a location that carries a URL', () => {
    const game = new Game()
    game.setEventLocation('Amsterdam at https://example.com')
    expect(game.getEventLocation()).toBe('https://example.com')
  })
})

describe('Game overtime', () => {

  it('does not throw on a null value', () => {
    const game = new Game()
    expect(() => game.setOvertime(null)).not.toThrow()
    expect(game.getOvertime()).toBeFalsy()
  })

  it('still parses periods out of a byo-yomi string', () => {
    const game = new Game()
    game.setOvertime('5x30 byo-yomi')
    expect(game.getNumberOfPeriods()).toBe(5)
    expect(game.getTimePerPeriod()).toBe(30)
  })
})

describe('Setup instructions on a move node', () => {

  it('does not leave an empty setup array behind on the move node', () => {
    const game = new Game()
    game.playMove(3, 3)
    const moveNode = game.getCurrentNode()
    game.addStone(5, 5, stoneColors.WHITE)
    expect(moveNode.hasSetupInstructions()).toBe(false)
    expect(moveNode.setup).toBeUndefined()
  })

  it('puts the setup on a newly created child node', () => {
    const game = new Game()
    game.playMove(3, 3)
    const moveNode = game.getCurrentNode()
    game.addStone(5, 5, stoneColors.WHITE)
    expect(game.getCurrentNode()).not.toBe(moveNode)
    expect(game.getCurrentNode().hasSetupInstructions()).toBe(true)
    expect(game.hasStone(5, 5, stoneColors.WHITE)).toBe(true)
  })
})

describe('Game.hasStone()', () => {

  it('matches a stone of the given color', () => {
    const game = new Game()
    game.playMove(3, 3)
    expect(game.hasStone(3, 3)).toBe(true)
    expect(game.hasStone(3, 3, stoneColors.BLACK)).toBe(true)
    expect(game.hasStone(3, 3, stoneColors.WHITE)).toBe(false)
  })

  it('is false on an empty intersection', () => {
    const game = new Game()
    expect(game.hasStone(3, 3)).toBe(false)
    expect(game.hasStone(3, 3, stoneColors.BLACK)).toBe(false)
  })

  it('lets addStone bail out when the stone is already there', () => {
    const game = new Game()
    game.addStone(5, 5, stoneColors.WHITE)
    const node = game.getCurrentNode()
    game.addStone(5, 5, stoneColors.WHITE)
    expect(game.getCurrentNode()).toBe(node)
  })
})

describe('Game.hasMarkup()', () => {

  it('matches markup of the given type', () => {
    const game = new Game()
    game.addMarkup(3, 3, {type: 'circle'})
    expect(game.hasMarkup(3, 3)).toBe(true)
    expect(game.hasMarkup(3, 3, 'circle')).toBe(true)
    expect(game.hasMarkup(3, 3, 'square')).toBe(false)
  })
})

describe('GameScore komi', () => {

  it('awards regular komi to white', () => {
    const score = new GameScore()
    score.setKomi(6.5)
    expect(score.getTotal(stoneColors.WHITE, scoringMethods.TERRITORY)).toBe(6.5)
    expect(score.getTotal(stoneColors.BLACK, scoringMethods.TERRITORY)).toBe(0)
  })

  it('awards reverse komi to black as points in their favour', () => {
    const score = new GameScore()
    score.setKomi(-5.5)
    expect(score.getTotal(stoneColors.BLACK, scoringMethods.TERRITORY)).toBe(5.5)
    expect(score.getResult(scoringMethods.TERRITORY)).toBe('B+5.5')
  })
})

describe('lowercase() coordinate generator', () => {

  it('uses a-z for the first 26 coordinates', () => {
    expect(lowercase(0)).toBe('a')
    expect(lowercase(25)).toBe('z')
  })

  it('continues into A-Z beyond 26 rather than into punctuation', () => {
    expect(lowercase(26)).toBe('A')
    expect(lowercase(27)).toBe('B')
    expect(lowercase(51)).toBe('Z')
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

describe('appVersion constant', () => {

  it('matches the package version', () => {
    expect(appVersion).toBe(packageVersion)
  })

  it('is used for the generator signature in exported SGF', () => {
    const game = new Game()
    expect(new ConvertToSgf().convert(game)).toContain(`AP[Seki v${packageVersion}]`)
  })
})
