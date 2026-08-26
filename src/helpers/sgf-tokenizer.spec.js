import {describe, it, expect} from 'vitest'
import {tokenizeSgf} from './sgf-tokenizer.js'
import {sgfTokenTypes} from '../constants/sgf.js'

//Shorthand for asserting on the shape of a record without its positions
const shapeOf = sgf => tokenizeSgf(sgf).map(({type, value}) => [type, value])

describe('sgf tokenizer, structure', () => {

  it('reads a game tree as its parentheses, semicolons and properties', () => {
    expect(shapeOf('(;FF[4]SZ[19];B[dd])')).toEqual([
      [sgfTokenTypes.PARENTHESIS, '('],
      [sgfTokenTypes.SEMICOLON, ';'],
      [sgfTokenTypes.PROP_IDENT, 'FF'],
      [sgfTokenTypes.C_VALUE_TYPE, '[4]'],
      [sgfTokenTypes.PROP_IDENT, 'SZ'],
      [sgfTokenTypes.C_VALUE_TYPE, '[19]'],
      [sgfTokenTypes.SEMICOLON, ';'],
      [sgfTokenTypes.PROP_IDENT, 'B'],
      [sgfTokenTypes.C_VALUE_TYPE, '[dd]'],
      [sgfTokenTypes.PARENTHESIS, ')'],
    ])
  })

  it('reads each parenthesis as its own token', () => {
    expect(shapeOf('(())')).toEqual([
      [sgfTokenTypes.PARENTHESIS, '('],
      [sgfTokenTypes.PARENTHESIS, '('],
      [sgfTokenTypes.PARENTHESIS, ')'],
      [sgfTokenTypes.PARENTHESIS, ')'],
    ])
  })

  it('reads a mixed case identifier as a single token', () => {

    //FF[3] allowed lowercase letters to be mixed into an identifier, and the
    //CoPyright IGS writes is the one that turns up in practice. Splitting it
    //into several tokens ends the node early and drops the header with it.
    expect(shapeOf('CoPyright[x]')).toEqual([
      [sgfTokenTypes.PROP_IDENT, 'CoPyright'],
      [sgfTokenTypes.C_VALUE_TYPE, '[x]'],
    ])
  })

  it('returns nothing for input that has nothing in it', () => {
    expect(tokenizeSgf('')).toEqual([])
    expect(tokenizeSgf(null)).toEqual([])
    expect(tokenizeSgf(undefined)).toEqual([])
  })
})

describe('sgf tokenizer, whitespace', () => {

  it('does not make a token out of whitespace', () => {
    expect(shapeOf('  \n\t')).toEqual([])
  })

  it('reads a value list that wraps over lines as one list', () => {

    //The specification allows whitespace between the values of a property,
    //and writers use it to wrap a long list. The values have to come out as
    //values of the same property, or the node ends at the line break.
    expect(shapeOf('AB[aa]\n[bb]\n  [cc]')).toEqual([
      [sgfTokenTypes.PROP_IDENT, 'AB'],
      [sgfTokenTypes.C_VALUE_TYPE, '[aa]'],
      [sgfTokenTypes.C_VALUE_TYPE, '[bb]'],
      [sgfTokenTypes.C_VALUE_TYPE, '[cc]'],
    ])
  })

  it('skips a byte order mark, which counts as whitespace', () => {
    expect(shapeOf('﻿(;)')).toEqual([
      [sgfTokenTypes.PARENTHESIS, '('],
      [sgfTokenTypes.SEMICOLON, ';'],
      [sgfTokenTypes.PARENTHESIS, ')'],
    ])
  })

  it('allows whitespace between an identifier and its value', () => {
    expect(shapeOf('C  [hi]')).toEqual([
      [sgfTokenTypes.PROP_IDENT, 'C'],
      [sgfTokenTypes.C_VALUE_TYPE, '[hi]'],
    ])
  })
})

describe('sgf tokenizer, property values', () => {

  it('keeps an escaped closing bracket inside the value', () => {
    expect(shapeOf('C[a \\] b]')).toEqual([
      [sgfTokenTypes.PROP_IDENT, 'C'],
      [sgfTokenTypes.C_VALUE_TYPE, '[a \\] b]'],
    ])
  })

  it('ends the value at an escaped backslash before the closing bracket', () => {

    //A pattern looking for a ] not directly preceded by a backslash cannot
    //tell \] from \\], and used to read straight past the end of this value,
    //taking the whole property with it
    expect(shapeOf('C[a\\\\]SZ[19]')).toEqual([
      [sgfTokenTypes.PROP_IDENT, 'C'],
      [sgfTokenTypes.C_VALUE_TYPE, '[a\\\\]'],
      [sgfTokenTypes.PROP_IDENT, 'SZ'],
      [sgfTokenTypes.C_VALUE_TYPE, '[19]'],
    ])
  })

  it('reads an empty value', () => {
    expect(shapeOf('B[]')).toEqual([
      [sgfTokenTypes.PROP_IDENT, 'B'],
      [sgfTokenTypes.C_VALUE_TYPE, '[]'],
    ])
  })

  it('reads a value containing the tree characters as text', () => {
    expect(shapeOf('C[a (;) b]')).toEqual([
      [sgfTokenTypes.PROP_IDENT, 'C'],
      [sgfTokenTypes.C_VALUE_TYPE, '[a (;) b]'],
    ])
  })

  it('reads a value spanning several lines', () => {
    expect(shapeOf('C[one\ntwo]')).toEqual([
      [sgfTokenTypes.PROP_IDENT, 'C'],
      [sgfTokenTypes.C_VALUE_TYPE, '[one\ntwo]'],
    ])
  })
})

describe('sgf tokenizer, invalid input', () => {

  it('reports a stray character rather than skipping it', () => {
    expect(shapeOf('(;FF[4]@SZ[19])')).toEqual([
      [sgfTokenTypes.PARENTHESIS, '('],
      [sgfTokenTypes.SEMICOLON, ';'],
      [sgfTokenTypes.PROP_IDENT, 'FF'],
      [sgfTokenTypes.C_VALUE_TYPE, '[4]'],
      [sgfTokenTypes.INVALID, '@'],
      [sgfTokenTypes.PROP_IDENT, 'SZ'],
      [sgfTokenTypes.C_VALUE_TYPE, '[19]'],
      [sgfTokenTypes.PARENTHESIS, ')'],
    ])
  })

  it('reports a run of junk as a single token', () => {
    expect(shapeOf('!!!???')).toEqual([
      [sgfTokenTypes.INVALID, '!!!???'],
    ])
  })

  it('reports a stray closing bracket', () => {
    expect(shapeOf(']')).toEqual([
      [sgfTokenTypes.INVALID, ']'],
    ])
  })

  it('reports a value that is never closed, running to the end', () => {
    expect(shapeOf('(;C[oops')).toEqual([
      [sgfTokenTypes.PARENTHESIS, '('],
      [sgfTokenTypes.SEMICOLON, ';'],
      [sgfTokenTypes.PROP_IDENT, 'C'],
      [sgfTokenTypes.INVALID, '[oops'],
    ])
  })

  it('reports a value left open by a trailing escape as never closed', () => {
    expect(shapeOf('C[oops\\')).toEqual([
      [sgfTokenTypes.PROP_IDENT, 'C'],
      [sgfTokenTypes.INVALID, '[oops\\'],
    ])
  })

  it('covers every character of a record it cannot read', () => {

    //The whole point of tokenising is that nothing goes missing quietly, so
    //even a record that is not SGF at all has to come out as tokens
    const html = '<html><body>404</body></html>'
    const tokens = tokenizeSgf(html)
    expect(tokens.length).toBeGreaterThan(0)
    expect(tokens.map(token => token.value).join('')).toBe(html)
  })
})

describe('sgf tokenizer, positions', () => {

  it('counts rows and columns from one, and positions from zero', () => {
    const [first] = tokenizeSgf('(;B[dd])')
    expect(first).toEqual({
      type: sgfTokenTypes.PARENTHESIS, value: '(', row: 1, col: 1, pos: 0,
    })
  })

  it('reports the column a token starts at', () => {
    const tokens = tokenizeSgf('(;FF[4])')
    expect(tokens.map(({value, col}) => [value, col])).toEqual([
      ['(', 1], [';', 2], ['FF', 3], ['[4]', 5], [')', 8],
    ])
  })

  it('moves to the next row over a line break', () => {
    const tokens = tokenizeSgf('(;FF[4]\nSZ[19]\n;B[dd])')
    const sz = tokens.find(token => token.value === 'SZ')
    const b = tokens.find(token => token.value === 'B')
    expect(sz).toMatchObject({row: 2, col: 1})
    expect(b).toMatchObject({row: 3, col: 2})
  })

  it('counts a carriage return and line feed pair as one line break', () => {
    const tokens = tokenizeSgf('(;FF[4]\r\nSZ[19])')
    expect(tokens.find(token => token.value === 'SZ')).toMatchObject({row: 2, col: 1})
  })

  it('counts a lone carriage return as a line break', () => {
    const tokens = tokenizeSgf('(;FF[4]\rSZ[19])')
    expect(tokens.find(token => token.value === 'SZ')).toMatchObject({row: 2, col: 1})
  })

  it('counts the line breaks inside a value that spans several lines', () => {
    const tokens = tokenizeSgf('C[one\ntwo]SZ[19]')
    expect(tokens.find(token => token.value === 'SZ')).toMatchObject({row: 2, col: 5})
  })

  it('gives every token a position that points back at the record', () => {

    //An invariant worth pinning: a token's position and value together have
    //to identify the exact stretch of the record it came from, or a
    //diagnostic built from it points at the wrong place
    const sgf = '(;FF[4]\n C[a \\] b]\r\n@AB[aa]\n\t[bb])'
    for (const {value, pos} of tokenizeSgf(sgf)) {
      expect(sgf.slice(pos, pos + value.length)).toBe(value)
    }
  })

  it('reads the tokens in the order they appear', () => {
    const sgf = '(;FF[4]\nSZ[19];B[dd]!!;W[pp])'
    const positions = tokenizeSgf(sgf).map(token => token.pos)
    expect(positions).toEqual([...positions].sort((a, b) => a - b))
  })
})
