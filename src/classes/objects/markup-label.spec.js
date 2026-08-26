import {describe, it, expect} from 'vitest'
import MarkupLabel from './markup-label.js'
import {markupTypes} from '../../constants/markup.js'
import {stoneColors} from '../../constants/stone.js'
import {createStubBoard, createStubContext} from '../../../test/helpers.js'

const {BLACK} = stoneColors

describe('MarkupLabel', () => {

  it('is a label', () => {
    expect(new MarkupLabel(createStubBoard()).type).toBe(markupTypes.LABEL)
  })

  it('takes its text off the data it is given', () => {
    const markup = new MarkupLabel(createStubBoard(), {text: 'A'})
    expect(markup.getText()).toBe('A')
  })

  it('has no text when it is given none', () => {
    expect(new MarkupLabel(createStubBoard()).getText()).toBe('')
    expect(new MarkupLabel(createStubBoard(), {}).getText()).toBe('')
  })

  it('sizes a single character to fill the cell', () => {
    const markup = new MarkupLabel(createStubBoard({cellSize: 40}), {text: 'A'})
    markup.loadProperties(3, 3)

    expect(markup.fontSize).toBe(30)
    expect(markup.font).toBe('Arial')
  })

  it('sizes a longer label down so it still fits', () => {
    const two = new MarkupLabel(createStubBoard({cellSize: 40}), {text: 'AB'})
    const three = new MarkupLabel(createStubBoard({cellSize: 40}), {text: 'ABC'})
    two.loadProperties(3, 3)
    three.loadProperties(3, 3)

    expect(two.fontSize).toBe(24)
    expect(three.fontSize).toBe(20)
  })

  it('never asks the theme to size an empty label', () => {

    //The size handler measures the text, so calling it with nothing to
    //measure is asking a question that has no answer
    const markup = new MarkupLabel(createStubBoard({cellSize: 40}))
    markup.loadProperties(3, 3)

    expect(markup.fontSize).toBeUndefined()
  })

  it('draws the text centred on the point', () => {
    const context = createStubContext()
    const markup = new MarkupLabel(createStubBoard({cellSize: 40}), {text: 'A'})

    markup.draw(context, 3, 4)

    expect(context.textAlign).toBe('center')
    expect(context.textBaseline).toBe('middle')
    expect(context.font).toBe('30px Arial')
    expect(context.fillText)
      .toHaveBeenCalledWith('A', 120, Math.floor(160 + 3), 2 * markup.radius)
  })

  it('takes its colour from the stone underneath', () => {
    const context = createStubContext()
    const board = createStubBoard({
      cellSize: 40,
      stones: {'3,3': {stoneColor: BLACK}},
    })

    new MarkupLabel(board, {text: 'A'}).draw(context, 3, 3)
    expect(context.fillStyle).toBe('rgba(255,255,255,0.95)')
  })

  it('clears less grid than its radius, as the text is inset', () => {
    const context = createStubContext()
    const board = createStubBoard({cellSize: 40})
    const markup = new MarkupLabel(board, {text: 'A'})

    markup.draw(context, 3, 3)

    expect(board.gridLayer.eraseCell)
      .toHaveBeenCalledWith(3, 3, markup.radius * 0.8)
  })
})
