import {describe, it, expect} from 'vitest'
import {
  parseEvent, parseResult, parseKomi, parseHandicap, parseTime
} from './parsing.js'

describe('parsing helpers', () => {

  describe('parseEvent()', () => {

    it('leaves a plain string alone', () => {
      expect(parseEvent('Some Tournament')).toEqual(['Some Tournament'])
    })

    it('splits a trailing URL off', () => {
      const [name, url] = parseEvent('Some Tournament at https://example.com')
      expect(name).toBe('Some Tournament')
      expect(url).toBe('https://example.com')
    })
  })

  describe('parseResult()', () => {

    it('abbreviates the common outcomes', () => {
      expect(parseResult('W+Resign')).toBe('W+R')
      expect(parseResult('B+Time')).toBe('B+T')
      expect(parseResult('W+Forfeit')).toBe('W+F')
      expect(parseResult('Draw')).toBe('D')
    })

    it('keeps a points margin', () => {
      expect(parseResult('W+6.5')).toBe('W+6.5')
    })

    it('expands fraction glyphs', () => {
      expect(parseResult('W+6½')).toBe('W+6.5')
    })

    it('falls back to a question mark', () => {
      expect(parseResult('')).toBe('?')
      expect(parseResult(null)).toBe('?')
      expect(parseResult(123)).toBe('?')
    })
  })

  describe('parseKomi()', () => {

    it('parses numbers and numeric strings', () => {
      expect(parseKomi(6.5)).toBe(6.5)
      expect(parseKomi('6.5')).toBe(6.5)
    })

    it('expands fraction glyphs', () => {
      expect(parseKomi('6½')).toBe(6.5)
      expect(parseKomi('6¼')).toBe(6.25)
    })

    it('falls back to zero for nonsense', () => {
      expect(parseKomi('abc')).toBe(0)
    })

    it('passes undefined through', () => {
      expect(parseKomi(undefined)).toBeUndefined()
    })
  })

  describe('parseHandicap() and parseTime()', () => {

    it('parses handicap as an integer', () => {
      expect(parseHandicap('4')).toBe(4)
      expect(parseHandicap('abc')).toBe(0)
      expect(parseHandicap(undefined)).toBeUndefined()
    })

    it('parses time as a float', () => {
      expect(parseTime('1800')).toBe(1800)
      expect(parseTime('abc')).toBe(0)
      expect(parseTime(undefined)).toBeUndefined()
    })
  })
})
