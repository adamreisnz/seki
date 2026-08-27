import {describe, it, expect} from 'vitest'
import MarkupSelect from './markup-select.js'
import {markupTypes} from '../../constants/markup.js'
import {createStubBoard, createStubContext} from '../../../test/helpers.js'

describe('MarkupSelect', () => {

  it('is a selection marker', () => {
    expect(new MarkupSelect(createStubBoard()).type)
      .toBe(markupTypes.SELECT)
  })

  it('fills a solid circle rather than stroking one', () => {
    const context = createStubContext()
    new MarkupSelect(createStubBoard({cellSize: 40})).draw(context, 3, 4)

    expect(context.arc).toHaveBeenCalledWith(120, 160, 11, 0, 2 * Math.PI, true)
    expect(context.fill).toHaveBeenCalled()
    expect(context.stroke).not.toHaveBeenCalled()
    expect(context.fillStyle).toBe('rgba(0,0,0,0.95)')
  })

  it('clears a quarter more grid than its radius', () => {
    const context = createStubContext()
    const board = createStubBoard({cellSize: 40})

    new MarkupSelect(board).draw(context, 3, 3)

    expect(board.gridLayer.eraseCell).toHaveBeenCalledWith(3, 3, 11 * 1.25)
  })
})
