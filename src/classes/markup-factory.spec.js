import {describe, it, expect} from 'vitest'
import Board from './board.js'
import MarkupFactory from './markup-factory.js'
import Markup from './objects/markup.js'
import {markupTypes} from '../constants/markup.js'

const board = new Board({size: 19})

describe('MarkupFactory', () => {

  it('builds markup of every type it knows', () => {
    const buildable = Object
      .values(markupTypes)
      .filter(type => type !== markupTypes.ARROW && type !== markupTypes.LINE)

    for (const type of buildable) {
      const data = {index: 0, text: 'A', number: 1}
      const markup = MarkupFactory.create(type, board, data)
      expect(markup).toBeInstanceOf(Markup)
      expect(markup.type).toBe(type)
    }
  })

  it('carries label text through', () => {
    const markup = MarkupFactory.create(markupTypes.LABEL, board, {text: 'A'})
    expect(markup.getText()).toBe('A')
  })

  it('rejects an unknown type', () => {
    expect(() => MarkupFactory.create('nonsense', board))
      .toThrow('Unknown markup type')
  })

  it('rejects the types that are not implemented yet', () => {
    expect(() => MarkupFactory.create(markupTypes.ARROW, board)).toThrow()
    expect(() => MarkupFactory.create(markupTypes.LINE, board)).toThrow()
  })
})
