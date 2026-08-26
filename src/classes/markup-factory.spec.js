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

  it('says up front which types it can build', () => {
    const buildable = Object
      .values(markupTypes)
      .filter(type => type !== markupTypes.ARROW && type !== markupTypes.LINE)

    for (const type of buildable) {
      expect(MarkupFactory.isSupported(type)).toBe(true)
    }
  })

  it('says up front which types it cannot build', () => {
    expect(MarkupFactory.isSupported(markupTypes.ARROW)).toBe(false)
    expect(MarkupFactory.isSupported(markupTypes.LINE)).toBe(false)
    expect(MarkupFactory.isSupported('nonsense')).toBe(false)
    expect(MarkupFactory.isSupported(undefined)).toBe(false)
  })

  it('claims nothing for a name off the object prototype', () => {

    //A plain property read answers for anything the prototype carries, so
    //'constructor' would come back as a class and be built with
    for (const type of ['constructor', 'toString', '__proto__']) {
      expect(MarkupFactory.isSupported(type)).toBe(false)
      expect(() => MarkupFactory.create(type, board)).toThrow('Unknown markup type')
    }
  })
})
