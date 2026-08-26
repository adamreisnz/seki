import {describe, it, expect} from 'vitest'
import {
  parseTransformation,
  normalizeTransformation,
  composeTransformations,
  reverseTransformation,
  isIdentityTransformation,
  transformBoardSize,
  transformBoardCutOff,
  transformCoordinates
} from './transformation.js'
import {boardSymmetries, boardTransformations} from '../constants/transformation.js'

//Every transformation there is, being the eight symmetries with and without
//a colour inversion on top
const allTransformations = [
  ...boardSymmetries,
  ...boardSymmetries.map(symmetry => `${symmetry}i`),
]

describe('transformation helpers', () => {

  describe('parseTransformation()', () => {

    it('counts the quarter turns, the flip and the inversion', () => {
      expect(parseTransformation('rri')).toEqual({
        rotations: 2,
        isFlipped: false,
        isInverted: true,
      })
    })

    it('treats nothing at all as the identity', () => {
      expect(parseTransformation()).toEqual({
        rotations: 0,
        isFlipped: false,
        isInverted: false,
      })
    })

    it('rejects an operation it does not know', () => {
      expect(() => parseTransformation('rx')).toThrow(/invalid transformation/i)
    })
  })

  describe('normalizeTransformation()', () => {

    it('cancels four quarter turns, two flips and two inversions', () => {
      expect(normalizeTransformation('rrrr')).toBe('')
      expect(normalizeTransformation('ff')).toBe('')
      expect(normalizeTransformation('ii')).toBe('')
      expect(normalizeTransformation('rrrrrr')).toBe('rr')
    })

    it('pushes a flip past the rotations that follow it', () => {
      expect(normalizeTransformation('fr')).toBe('rrrf')
      expect(normalizeTransformation('frr')).toBe('rrf')
      expect(normalizeTransformation('frrr')).toBe('rf')
    })

    it('puts a colour inversion last, wherever it was given', () => {
      expect(normalizeTransformation('irf')).toBe('rfi')
      expect(normalizeTransformation('rif')).toBe('rfi')
    })

    it('leaves a canonical transformation as it is', () => {
      for (const transformation of allTransformations) {
        expect(normalizeTransformation(transformation)).toBe(transformation)
      }
    })
  })

  describe('composeTransformations()', () => {

    it('applies its arguments left to right', () => {
      expect(composeTransformations('r', 'r')).toBe('rr')
      expect(composeTransformations('f', 'r')).toBe('rrrf')
    })

    it('composes the flips into the rotations they amount to', () => {
      const {FLIP_HORIZONTAL, FLIP_VERTICAL, ROTATE_180} = boardTransformations
      expect(composeTransformations(FLIP_HORIZONTAL, FLIP_VERTICAL))
        .toBe(ROTATE_180)
    })
  })

  describe('reverseTransformation()', () => {

    it('undoes a quarter turn with three more', () => {
      expect(reverseTransformation('r')).toBe('rrr')
      expect(reverseTransformation('rrr')).toBe('r')
      expect(reverseTransformation('rr')).toBe('rr')
    })

    it('leaves a flip and a colour inversion to undo themselves', () => {
      expect(reverseTransformation('f')).toBe('f')
      expect(reverseTransformation('i')).toBe('i')
      expect(reverseTransformation('rf')).toBe('rf')
      expect(reverseTransformation('rrrf')).toBe('rrrf')
    })

    it('composes with what it reverses to give the identity', () => {
      for (const transformation of allTransformations) {
        const reversed = reverseTransformation(transformation)
        expect(composeTransformations(transformation, reversed)).toBe('')
        expect(composeTransformations(reversed, transformation)).toBe('')
      }
    })
  })

  describe('isIdentityTransformation()', () => {

    it('recognises everything that comes to nothing', () => {
      expect(isIdentityTransformation('')).toBe(true)
      expect(isIdentityTransformation('rrrr')).toBe(true)
      expect(isIdentityTransformation('rfrf')).toBe(true)
      expect(isIdentityTransformation('r')).toBe(false)
      expect(isIdentityTransformation('i')).toBe(false)
    })
  })

  describe('transformBoardSize()', () => {

    it('swaps the dimensions on an odd number of quarter turns', () => {
      expect(transformBoardSize(19, 9, 'r')).toEqual({width: 9, height: 19})
      expect(transformBoardSize(19, 9, 'rrr')).toEqual({width: 9, height: 19})
      expect(transformBoardSize(19, 9, 'rf')).toEqual({width: 9, height: 19})
    })

    it('leaves them alone otherwise', () => {
      expect(transformBoardSize(19, 9, '')).toEqual({width: 19, height: 9})
      expect(transformBoardSize(19, 9, 'rr')).toEqual({width: 19, height: 9})
      expect(transformBoardSize(19, 9, 'f')).toEqual({width: 19, height: 9})
      expect(transformBoardSize(19, 9, 'i')).toEqual({width: 19, height: 9})
    })
  })

  describe('transformCoordinates()', () => {

    //A point off both middle lines of the board, so that no two symmetries
    //of the same board send it to the same place
    const point = [0, 1]
    const size = [3, 4]

    it('sends a point where each of the eight symmetries should', () => {
      const {
        NONE, ROTATE_90, ROTATE_180, ROTATE_270,
        FLIP_HORIZONTAL, FLIP_VERTICAL, FLIP_DIAGONAL, FLIP_ANTI_DIAGONAL,
      } = boardTransformations
      const at = transformation =>
        transformCoordinates(...point, ...size, transformation)

      expect(at(NONE)).toEqual({x: 0, y: 1})
      expect(at(ROTATE_90)).toEqual({x: 2, y: 0})
      expect(at(ROTATE_180)).toEqual({x: 2, y: 2})
      expect(at(ROTATE_270)).toEqual({x: 1, y: 2})
      expect(at(FLIP_HORIZONTAL)).toEqual({x: 2, y: 1})
      expect(at(FLIP_VERTICAL)).toEqual({x: 0, y: 2})
      expect(at(FLIP_DIAGONAL)).toEqual({x: 1, y: 0})
      expect(at(FLIP_ANTI_DIAGONAL)).toEqual({x: 2, y: 2})
    })

    it('leaves a coordinate alone on a colour inversion', () => {
      expect(transformCoordinates(...point, ...size, 'i')).toEqual({x: 0, y: 1})
    })

    it('sends every point back where it came from when reversed', () => {
      const [width, height] = size
      for (const transformation of allTransformations) {
        const reversed = reverseTransformation(transformation)
        const {width: w, height: h} = transformBoardSize(width, height, transformation)
        for (let x = 0; x < width; x++) {
          for (let y = 0; y < height; y++) {
            const moved = transformCoordinates(x, y, width, height, transformation)
            const back = transformCoordinates(moved.x, moved.y, w, h, reversed)
            expect(back).toEqual({x, y})
          }
        }
      }
    })
  })

  describe('transformBoardCutOff()', () => {

    const cutOff = {
      cutOffLeft: 1,
      cutOffRight: 2,
      cutOffTop: 3,
      cutOffBottom: 4,
    }

    it('carries each side round with the board', () => {
      expect(transformBoardCutOff(cutOff, 'r')).toEqual({
        cutOffTop: 1,
        cutOffRight: 3,
        cutOffBottom: 2,
        cutOffLeft: 4,
      })
    })

    it('swaps only left and right on a horizontal flip', () => {
      expect(transformBoardCutOff(cutOff, 'f')).toEqual({
        cutOffLeft: 2,
        cutOffRight: 1,
        cutOffTop: 3,
        cutOffBottom: 4,
      })
    })

    it('turns the board upside down on half a turn', () => {
      expect(transformBoardCutOff(cutOff, 'rr')).toEqual({
        cutOffLeft: 2,
        cutOffRight: 1,
        cutOffTop: 4,
        cutOffBottom: 3,
      })
    })

    it('leaves the cut off alone on a colour inversion', () => {
      expect(transformBoardCutOff(cutOff, 'i')).toEqual(cutOff)
    })

    it('puts every side back when reversed', () => {
      for (const transformation of allTransformations) {
        const reversed = reverseTransformation(transformation)
        const moved = transformBoardCutOff(cutOff, transformation)
        expect(transformBoardCutOff(moved, reversed)).toEqual(cutOff)
      }
    })
  })
})
