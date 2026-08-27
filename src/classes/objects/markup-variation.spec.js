import {describe, it, expect} from 'vitest'
import MarkupVariation from './markup-variation.js'
import MarkupCircle from './markup-circle.js'
import {markupTypes} from '../../constants/markup.js'
import {stoneColors} from '../../constants/stone.js'
import {createStubBoard, createStubContext} from '../../../test/helpers.js'

const {WHITE} = stoneColors

//The data a variation marker is always constructed with
const data = (overrides = {}) => ({
  index: 0,
  displayColor: undefined,
  showText: true,
  isSelected: false,
  ...overrides,
})

describe('MarkupVariation', () => {

  it('is a circle carrying its own type', () => {
    const markup = new MarkupVariation(createStubBoard(), data())

    expect(markup).toBeInstanceOf(MarkupCircle)
    expect(markup.type).toBe(markupTypes.VARIATION)
  })

  it('keeps what it was told about the variation it stands for', () => {
    const markup = new MarkupVariation(createStubBoard(), data({
      index: 2,
      displayColor: WHITE,
      isSelected: true,
    }))

    expect(markup.index).toBe(2)
    expect(markup.displayColor).toBe(WHITE)
    expect(markup.isSelected).toBe(true)
  })

  it('labels each variation with a letter from its index', () => {
    const first = new MarkupVariation(createStubBoard({cellSize: 40}), data())
    const third = new MarkupVariation(createStubBoard({cellSize: 40}), data({
      index: 2,
    }))
    first.loadProperties(3, 3)
    third.loadProperties(3, 3)

    expect(first.text).toBe('A')
    expect(third.text).toBe('C')
  })

  it('draws the letter when it is asked to show text', () => {
    const context = createStubContext()
    const markup = new MarkupVariation(createStubBoard({cellSize: 40}), data({
      index: 1,
    }))

    markup.draw(context, 3, 4)

    expect(context.fillText)
      .toHaveBeenCalledWith('B', 120, expect.any(Number), 2 * markup.radius)
  })

  it('draws the circle alone when it is not', () => {

    //A node with a single continuation gets a marker without a letter, since
    //there is nothing to tell it apart from
    const context = createStubContext()
    const markup = new MarkupVariation(createStubBoard({cellSize: 40}), data({
      showText: false,
    }))

    markup.draw(context, 3, 3)

    expect(context.arc).toHaveBeenCalled()
    expect(context.fillText).not.toHaveBeenCalled()
  })

  it('draws the selected variation more strongly than the rest', () => {
    const plain = new MarkupVariation(createStubBoard({cellSize: 40}), data())
    const selected = new MarkupVariation(createStubBoard({cellSize: 40}), data({
      isSelected: true,
    }))
    plain.loadProperties(3, 3)
    selected.loadProperties(3, 3)

    expect(plain.color).toBe('rgba(0,0,0,0.75)')
    expect(selected.color).toBe('rgba(0,0,0,1)')
  })

  it('colours itself for the stone it would be drawn over', () => {

    //The marker sits where the move would be played, so the colour it has to
    //stay legible against is the colour of that move
    const markup = new MarkupVariation(createStubBoard({cellSize: 40}), data({
      displayColor: WHITE,
    }))
    markup.loadProperties(3, 3)

    expect(markup.color).toBe('rgba(255,255,255,0.75)')
  })

  it('clears a little more grid than its radius', () => {
    const context = createStubContext()
    const board = createStubBoard({cellSize: 40})
    const markup = new MarkupVariation(board, data())

    markup.draw(context, 3, 3)

    expect(board.gridLayer.eraseCell)
      .toHaveBeenCalledWith(3, 3, markup.radius * 1.1)
  })

  it('dashes its circle, so it reads as a suggestion', () => {
    const context = createStubContext()
    new MarkupVariation(createStubBoard({cellSize: 40}), data())
      .draw(context, 3, 3)

    expect(context.setLineDash).toHaveBeenNthCalledWith(1, [5, 4])
  })
})
