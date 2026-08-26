import {describe, it, expect} from 'vitest'
import {
  parseEvent, parseResult, parseKomi, parseHandicap, parseTime,
  parseDates, stringifyDates
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
    })

    it('spells every drawn result the way the spec spells it', () => {

      //NOTE: '0' is the spec's form for a draw (jigo), and the only one other
      //programs read as one. 'D' is what Seki itself wrote for a long time,
      //so records it made have to keep reading back as a draw.
      expect(parseResult('0')).toBe('0')
      expect(parseResult('Draw')).toBe('0')
      expect(parseResult('draw')).toBe('0')
      expect(parseResult('D')).toBe('0')
      expect(parseResult('d')).toBe('0')
    })

    it('leaves a void result in the casing the spec gives it', () => {
      expect(parseResult('Void')).toBe('Void')
      expect(parseResult('void')).toBe('Void')
      expect(parseResult('VOID')).toBe('Void')
    })

    it('leaves the Fox win conditions alone', () => {

      //NOTE: these read as a forfeit and a timeout respectively, and share
      //their leading zero with a drawn result without being one
      expect(parseResult('W+0.03')).toBe('W+F')
      expect(parseResult('B+0.02')).toBe('B+T')
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

  describe('parseDates()', () => {

    it('reads a single date at any precision', () => {
      expect(parseDates('2024-03-01')).toEqual(['2024-03-01'])
      expect(parseDates('2024-03')).toEqual(['2024-03'])
      expect(parseDates('2024')).toEqual(['2024'])
    })

    it('reads a list of full dates', () => {
      expect(parseDates('2024-03-01,2024-04-05'))
        .toEqual(['2024-03-01', '2024-04-05'])
    })

    it('expands a date that gives only its day', () => {
      expect(parseDates('1996-10-18,19'))
        .toEqual(['1996-10-18', '1996-10-19'])
      expect(parseDates('2024-03-01,02,03'))
        .toEqual(['2024-03-01', '2024-03-02', '2024-03-03'])
    })

    it('expands a date that gives only its month and day', () => {
      expect(parseDates('2024-03-01,04-05'))
        .toEqual(['2024-03-01', '2024-04-05'])
    })

    it('pads a month or day written with one digit', () => {
      expect(parseDates('2024-3-1,2')).toEqual(['2024-03-01', '2024-03-02'])
    })

    it('has nothing for an empty or unreadable value', () => {
      expect(parseDates('')).toEqual([])
      expect(parseDates('   ')).toEqual([])
      expect(parseDates('not a date')).toEqual([])
      expect(parseDates(undefined)).toEqual([])
    })
  })

  describe('stringifyDates()', () => {

    it('writes a single date as it is', () => {
      expect(stringifyDates(['2024-03-01'])).toBe('2024-03-01')
    })

    it('leaves off what a date shares with the one before it', () => {
      expect(stringifyDates(['1996-10-18', '1996-10-19'])).toBe('1996-10-18,19')
      expect(stringifyDates(['2024-03-01', '2024-04-05']))
        .toBe('2024-03-01,04-05')
    })

    it('spells out a date written to a different precision', () => {

      //NOTE: an abbreviated date is read at the precision of the one before
      //it, so 2024-03-01,05 is the 5th of March. Abbreviating on the shared
      //parts alone would turn May 2024 into exactly that.
      expect(stringifyDates(['2024-03-01', '2024-05']))
        .toBe('2024-03-01,2024-05')
      expect(stringifyDates(['2024', '2024-03'])).toBe('2024,2024-03')
    })

    it('still abbreviates within one precision', () => {
      expect(stringifyDates(['2024-03', '2024-05'])).toBe('2024-03,05')
    })

    it('still writes something for a repeated date', () => {
      expect(stringifyDates(['2024-03-01', '2024-03-01'])).toBe('2024-03-01,01')
    })

    it('has nothing to write for an empty list', () => {
      expect(stringifyDates([])).toBe('')
      expect(stringifyDates(undefined)).toBe('')
    })

    it('round trips back through parseDates', () => {
      const dates = ['2024-03-01', '2024-03-02', '2024-04-05', '2025']
      expect(parseDates(stringifyDates(dates))).toEqual(dates)
    })

    it('round trips a list of mixed precision', () => {
      const dates = ['2024', '2024-03', '2024-03-01', '2024-05']
      expect(parseDates(stringifyDates(dates))).toEqual(dates)
    })
  })
})
