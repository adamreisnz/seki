import {describe, it, expect} from 'vitest'
import MarkupDiamond from './markup-diamond.js'
import {markupTypes} from '../../constants/markup.js'
import {createStubBoard, createStubContext} from '../../../test/helpers.js'

describe('MarkupDiamond', () => {

  it('is a diamond', () => {
    expect(new MarkupDiamond(createStubBoard()).type)
      .toBe(markupTypes.DIAMOND)
  })

  it('takes its scale from its own theme entry', () => {
    const markup = new MarkupDiamond(createStubBoard({cellSize: 40}))
    markup.loadProperties(3, 3)

    expect(markup.scale).toBe(0.65)
    expect(markup.radius).toBe(13)
  })

  it('draws four points on the axes at the marker radius', () => {
    const context = createStubContext()
    new MarkupDiamond(createStubBoard({cellSize: 40})).draw(context, 3, 4)

    expect(context.moveTo).toHaveBeenCalledWith(120, 160 - 13)
    expect(context.lineTo).toHaveBeenNthCalledWith(1, 120 - 13, 160)
    expect(context.lineTo).toHaveBeenNthCalledWith(2, 120, 160 + 13)
    expect(context.lineTo).toHaveBeenNthCalledWith(3, 120 + 13, 160)
    expect(context.closePath).toHaveBeenCalled()
  })

  it('clears more grid than its radius, as its points reach past it', () => {
    const context = createStubContext()
    const board = createStubBoard({cellSize: 40})

    new MarkupDiamond(board).draw(context, 3, 3)

    expect(board.gridLayer.eraseCell).toHaveBeenCalledWith(3, 3, 13 * 1.4)
  })
})
