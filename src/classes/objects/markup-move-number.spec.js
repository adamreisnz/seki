import {describe, it, expect} from 'vitest'
import MarkupMoveNumber from './markup-move-number.js'
import MarkupLabel from './markup-label.js'
import {markupTypes} from '../../constants/markup.js'
import {createStubBoard, createStubContext} from '../../../test/helpers.js'

describe('MarkupMoveNumber', () => {

  it('is a label carrying its own type', () => {
    const markup = new MarkupMoveNumber(createStubBoard(), {number: 4})

    expect(markup).toBeInstanceOf(MarkupLabel)
    expect(markup.type).toBe(markupTypes.MOVE_NUMBER)
  })

  it('takes the number off the data it is given', () => {
    expect(new MarkupMoveNumber(createStubBoard(), {number: 12}).number).toBe(12)
  })

  it('falls back to zero when it is given no number', () => {
    expect(new MarkupMoveNumber(createStubBoard()).number).toBe(0)
    expect(new MarkupMoveNumber(createStubBoard(), {}).number).toBe(0)
  })

  it('turns the number into the text it draws', () => {
    const markup = new MarkupMoveNumber(createStubBoard({cellSize: 40}), {
      number: 42,
    })
    markup.loadProperties(3, 3)

    expect(markup.text).toBe(42)
  })

  it('sizes every number the same, whatever its length', () => {

    //A move number sits on a stone rather than on an empty point, so it is
    //sized to the stone rather than measured like a free text label
    const one = new MarkupMoveNumber(createStubBoard({cellSize: 40}), {number: 1})
    const many = new MarkupMoveNumber(createStubBoard({cellSize: 40}), {
      number: 100,
    })
    one.loadProperties(3, 3)
    many.loadProperties(3, 3)

    expect(one.fontSize).toBe(20)
    expect(many.fontSize).toBe(20)
  })

  it('draws the number as text', () => {
    const context = createStubContext()
    const markup = new MarkupMoveNumber(createStubBoard({cellSize: 40}), {
      number: 7,
    })

    markup.draw(context, 2, 2)

    expect(context.fillText)
      .toHaveBeenCalledWith('7', 80, Math.floor(80 + 2), 2 * markup.radius)
  })
})
