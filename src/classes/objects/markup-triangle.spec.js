import {describe, it, expect} from 'vitest'
import MarkupTriangle from './markup-triangle.js'
import {markupTypes} from '../../constants/markup.js'
import {createStubBoard, createStubContext} from '../../../test/helpers.js'

describe('MarkupTriangle', () => {

  it('is a triangle', () => {
    expect(new MarkupTriangle(createStubBoard()).type)
      .toBe(markupTypes.TRIANGLE)
  })

  it('takes its scale from its own theme entry', () => {
    const markup = new MarkupTriangle(createStubBoard({cellSize: 40}))
    markup.loadProperties(3, 3)

    expect(markup.scale).toBe(0.7)
    expect(markup.radius).toBe(14)
  })

  it('draws a closed triangle sitting a little below centre', () => {

    //The apex is pulled up by a further quarter of the vertical delta, which
    //is what makes it sit naturally next to a square of the same radius
    const context = createStubContext()
    new MarkupTriangle(createStubBoard({cellSize: 40})).draw(context, 3, 4)

    const dy = Math.round(14 * Math.cos(Math.PI / 3.5))
    const dx = Math.round(14 * Math.cos(Math.PI / 6))

    expect(context.moveTo).toHaveBeenCalledWith(120, 160 - dy * 1.25)
    expect(context.lineTo).toHaveBeenNthCalledWith(1, 120 - dx, 160 + dy)
    expect(context.lineTo).toHaveBeenNthCalledWith(2, 120 + dx, 160 + dy)
    expect(context.closePath).toHaveBeenCalled()
    expect(context.stroke).toHaveBeenCalled()
  })

  it('erases the grid under it only where there is no stone', () => {
    const context = createStubContext()
    const board = createStubBoard({cellSize: 40})
    const markup = new MarkupTriangle(board)

    markup.draw(context, 3, 3)

    expect(markup.hasErasedGrid).toBe(true)
    expect(board.gridLayer.eraseCell).toHaveBeenCalledWith(3, 3, 14)
  })

  it('leaves the grid alone where a stone already hides it', () => {
    const context = createStubContext()
    const board = createStubBoard({
      cellSize: 40,
      stones: {'3,3': {stoneColor: 'black'}},
    })
    const markup = new MarkupTriangle(board)

    markup.draw(context, 3, 3)

    expect(markup.hasErasedGrid).toBe(false)
    expect(board.gridLayer.eraseCell).not.toHaveBeenCalled()
  })
})
