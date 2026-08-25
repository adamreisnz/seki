import {describe, it, expect} from 'vitest'
import GamePosition from './game-position.js'
import {stoneColors} from '../constants/stone.js'

const {BLACK, WHITE} = stoneColors

const createPosition = (size = 9) => new GamePosition(size, size)

/**
 * Place a set of stones, given as [x, y] pairs
 */
const place = (position, color, coords) => {
  for (const [x, y] of coords) {
    position.setStone(x, y, color)
  }
}

describe('GamePosition', () => {

  describe('setup', () => {

    it('starts empty with black to play', () => {
      const position = createPosition()
      expect(position.hasStones()).toBe(false)
      expect(position.getTurn()).toBe(BLACK)
    })

    it('places and removes stones', () => {
      const position = createPosition()
      position.setStone(2, 2, BLACK)
      expect(position.stones.get(2, 2)).toBe(BLACK)

      position.removeStone(2, 2)
      expect(position.hasStones()).toBe(false)
    })

    it('switches and sets the turn', () => {
      const position = createPosition()
      position.switchTurn()
      expect(position.getTurn()).toBe(WHITE)

      position.setTurn(BLACK)
      expect(position.getTurn()).toBe(BLACK)
    })

    it('rejects an invalid turn color', () => {
      expect(() => createPosition().setTurn('green')).toThrow('Invalid color')
    })
  })

  describe('liberties', () => {

    it('gives a lone stone in the centre four liberties worth of freedom', () => {
      const position = createPosition()
      position.setStone(4, 4, BLACK)
      expect(position.hasLiberties(4, 4)).toBe(true)
    })

    it('sees a corner stone as alive while it has a liberty', () => {
      const position = createPosition()
      position.setStone(0, 0, BLACK)
      position.setStone(1, 0, WHITE)
      expect(position.hasLiberties(0, 0)).toBe(true)
    })

    it('sees a fully surrounded corner stone as having none', () => {
      const position = createPosition()
      position.setStone(0, 0, BLACK)
      place(position, WHITE, [[1, 0], [0, 1]])
      expect(position.hasLiberties(0, 0)).toBe(false)
    })

    it('follows a connected group when counting liberties', () => {
      const position = createPosition()

      //A black wall along the top edge, boxed in by white
      place(position, BLACK, [[0, 0], [1, 0], [2, 0]])
      place(position, WHITE, [[0, 1], [1, 1], [2, 1], [3, 0]])

      expect(position.hasLiberties(0, 0)).toBe(false)
      expect(position.hasLiberties(1, 0)).toBe(false)
    })

    it('treats a surrounded group with one gap as alive', () => {
      const position = createPosition()
      place(position, BLACK, [[0, 0], [1, 0], [2, 0]])
      place(position, WHITE, [[0, 1], [1, 1], [3, 0]])

      //(2,1) is still open
      expect(position.hasLiberties(0, 0)).toBe(true)
    })

    it('has no liberties outside the board', () => {
      expect(createPosition().hasLiberties(-1, 0)).toBe(false)
    })
  })

  describe('capturing', () => {

    it('captures a single surrounded stone', () => {
      const position = createPosition()
      position.setStone(4, 4, WHITE)
      place(position, BLACK, [[3, 4], [5, 4], [4, 3]])

      //Placing the fourth black stone takes it
      position.setStone(4, 5, BLACK)
      expect(position.captureAdjacent(4, 5)).toBe(true)
      expect(position.stones.has(4, 4)).toBe(false)
    })

    it('captures a whole group at once', () => {
      const position = createPosition()
      place(position, WHITE, [[4, 4], [4, 5]])
      place(position, BLACK, [[3, 4], [3, 5], [5, 4], [5, 5], [4, 3]])

      position.setStone(4, 6, BLACK)
      position.captureAdjacent(4, 6)

      expect(position.stones.has(4, 4)).toBe(false)
      expect(position.stones.has(4, 5)).toBe(false)
    })

    it('leaves a group with a liberty alone', () => {
      const position = createPosition()
      position.setStone(4, 4, WHITE)
      place(position, BLACK, [[3, 4], [5, 4]])

      expect(position.captureAdjacent(5, 4)).toBe(false)
      expect(position.stones.get(4, 4)).toBe(WHITE)
    })

    it('records captures against the color of the captured stones', () => {
      const position = createPosition()
      position.setStone(0, 0, WHITE)
      position.setStone(1, 0, BLACK)
      position.setStone(0, 1, BLACK)
      position.captureAdjacent(0, 1)

      expect(position.getCaptures(WHITE)).toEqual([{x: 0, y: 0}])
      expect(position.hasCaptures()).toBe(true)
      expect(position.getTotalCaptureCount()).toBe(1)
    })

    it('counts a capture as a point for the capturing color', () => {
      const position = createPosition()
      position.setStone(0, 0, WHITE)
      place(position, BLACK, [[1, 0], [0, 1]])
      position.captureAdjacent(0, 1)

      //Black captured a white stone
      expect(position.getCaptureCount(BLACK)).toBe(1)
      expect(position.getCaptureCount(WHITE)).toBe(0)
    })

    it('cannot capture an empty spot', () => {
      expect(createPosition().captureAdjacent(4, 4)).toBe(false)
    })

    it('rejects an invalid color', () => {
      expect(() => createPosition().captureAdjacent(1, 1, 'green'))
        .toThrow('Invalid color')
      expect(() => createPosition().getCaptures('green'))
        .toThrow('Invalid color')
    })
  })

  describe('ko point', () => {

    /**
     * Lay out a simple ko, with a white stone on (4,3) hemmed in by black and
     * (3,3) left open for black to take it, ringed by white so that the stone
     * black plays there stands alone with a single liberty
     */
    const createKoShape = () => {
      const position = createPosition()
      place(position, WHITE, [[4, 3], [3, 2], [3, 4], [2, 3]])
      place(position, BLACK, [[4, 2], [4, 4], [5, 3]])
      return position
    }

    it('records the point and the color barred from it on a ko capture', () => {
      const position = createKoShape()

      position.setStone(3, 3, BLACK)
      position.captureAdjacent(3, 3)

      expect(position.hasKoPoint()).toBe(true)
      expect(position.getKoPoint()).toEqual({x: 4, y: 3, color: WHITE})
    })

    it('answers for the point and color it was asked about', () => {
      const position = createKoShape()
      position.setStone(3, 3, BLACK)
      position.captureAdjacent(3, 3)

      expect(position.isKoPoint(4, 3)).toBe(true)
      expect(position.isKoPoint(4, 3, WHITE)).toBe(true)

      //Black is the one who took the stone, so black may play there
      expect(position.isKoPoint(4, 3, BLACK)).toBe(false)
      expect(position.isKoPoint(3, 3)).toBe(false)
    })

    it('records nothing when more than one stone comes off', () => {
      const position = createPosition()
      place(position, WHITE, [[4, 3], [5, 3]])
      place(position, BLACK, [[4, 2], [5, 2], [4, 4], [5, 4], [6, 3]])

      position.setStone(3, 3, BLACK)
      position.captureAdjacent(3, 3)

      expect(position.stones.has(4, 3)).toBe(false)
      expect(position.stones.has(5, 3)).toBe(false)
      expect(position.hasKoPoint()).toBe(false)
    })

    it('records nothing when the played stone has a friend beside it', () => {
      const position = createKoShape()

      //A black stone on (3,2) instead of the white one, so that the stone
      //black plays joins it rather than standing alone. Only one white stone
      //still comes off, and (4,3) is still the only liberty left.
      position.setStone(3, 2, BLACK)

      position.setStone(3, 3, BLACK)
      position.captureAdjacent(3, 3)

      expect(position.stones.has(4, 3)).toBe(false)
      expect(position.hasKoPoint()).toBe(false)
    })

    it('records nothing when nothing was captured', () => {
      const position = createPosition()
      position.setStone(4, 4, BLACK)
      position.captureAdjacent(4, 4)

      expect(position.hasKoPoint()).toBe(false)
    })

    it('takes the ko point back off when asked', () => {
      const position = createKoShape()
      position.setStone(3, 3, BLACK)
      position.captureAdjacent(3, 3)

      position.clearKoPoint()
      expect(position.hasKoPoint()).toBe(false)
      expect(position.getKoPoint()).toBe(null)
    })
  })

  describe('cloning', () => {

    it('carries the stones and turn across', () => {
      const position = createPosition()
      position.setStone(2, 2, BLACK)
      position.setTurn(WHITE)

      const clone = position.clone()
      expect(clone.stones.get(2, 2)).toBe(BLACK)
      expect(clone.getTurn()).toBe(WHITE)
      expect(clone.width).toBe(9)
      expect(clone.height).toBe(9)
    })

    it('does not share the stones grid', () => {
      const position = createPosition()
      const clone = position.clone()

      clone.setStone(2, 2, BLACK)
      expect(position.hasStones()).toBe(false)
    })

    it('starts with a clean capture list', () => {
      const position = createPosition()
      position.setStone(0, 0, WHITE)
      place(position, BLACK, [[1, 0], [0, 1]])
      position.captureAdjacent(0, 1)

      expect(position.clone().hasCaptures()).toBe(false)
    })

    it('leaves the ko point behind', () => {
      const position = createPosition()
      place(position, WHITE, [[4, 3], [3, 2], [3, 4], [2, 3]])
      place(position, BLACK, [[4, 2], [4, 4], [5, 3]])
      position.setStone(3, 3, BLACK)
      position.captureAdjacent(3, 3)

      //The ko belongs to the move that made it, not to whatever comes next
      expect(position.hasKoPoint()).toBe(true)
      expect(position.clone().hasKoPoint()).toBe(false)
    })

    it('drops markup by default and keeps it on request', () => {
      const position = createPosition()
      position.setMarkup(1, 1, {type: 'circle'})

      expect(position.clone().hasMarkup()).toBe(false)
      expect(position.clone(true).hasMarkup()).toBe(true)
    })
  })

  describe('comparison', () => {

    it('matches a position with the same stones', () => {
      const a = createPosition()
      const b = createPosition()
      a.setStone(1, 1, BLACK)
      b.setStone(1, 1, BLACK)
      expect(a.isSameAs(b)).toBe(true)
    })

    it('ignores whose turn it is', () => {
      const a = createPosition()
      const b = createPosition()
      b.switchTurn()
      expect(a.isSameAs(b)).toBe(true)
    })

    it('ignores the ko point', () => {

      //The repeat scan compares a candidate that took a ko back, which has a
      //ko point of its own, against the position it repeats, which has none.
      //Comparing the two would stop it ever finding a repeat.
      const a = createPosition()
      const b = createPosition()
      a.setStone(1, 1, BLACK)
      b.setStone(1, 1, BLACK)
      a.koPoint = {x: 4, y: 3, color: WHITE}

      expect(a.isSameAs(b)).toBe(true)
      expect(b.isSameAs(a)).toBe(true)
    })

    it('does not match different stones', () => {
      const a = createPosition()
      const b = createPosition()
      a.setStone(1, 1, BLACK)
      b.setStone(1, 1, WHITE)
      expect(a.isSameAs(b)).toBe(false)
    })

    it('does not match a different size', () => {
      expect(createPosition(9).isSameAs(createPosition(13))).toBe(false)
    })
  })

  describe('lines', () => {

    it('adds, reports and clears lines', () => {
      const position = createPosition()
      expect(position.hasLines()).toBe(false)

      position.addLine(0, 0, 1, 1, '#fff')
      expect(position.hasLines()).toBe(true)
      expect(position.getLines()).toEqual([[0, 0, 1, 1, '#fff']])

      position.removeLines()
      expect(position.hasLines()).toBe(false)
    })
  })
})
