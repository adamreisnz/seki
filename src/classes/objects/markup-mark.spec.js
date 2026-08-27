import {describe, it, expect} from 'vitest'
import MarkupMark from './markup-mark.js'
import {markupTypes} from '../../constants/markup.js'
import {createStubBoard, createStubContext} from '../../../test/helpers.js'

describe('MarkupMark', () => {

  it('is a mark', () => {
    expect(new MarkupMark(createStubBoard()).type).toBe(markupTypes.MARK)
  })

  it('loads the line cap its type asks for on top of the base props', () => {
    const markup = new MarkupMark(createStubBoard({cellSize: 40}))
    markup.loadProperties(3, 3)

    expect(markup.lineCap).toBe('square')
    expect(markup.radius).toBe(14)
  })

  it('draws two crossing strokes corner to corner', () => {
    const context = createStubContext()
    new MarkupMark(createStubBoard({cellSize: 40})).draw(context, 3, 4)

    const d = Math.round(14 * Math.cos(Math.PI / 4))

    expect(context.moveTo).toHaveBeenNthCalledWith(1, 120 - d, 160 - d)
    expect(context.lineTo).toHaveBeenNthCalledWith(1, 120 + d, 160 + d)
    expect(context.moveTo).toHaveBeenNthCalledWith(2, 120 + d, 160 - d)
    expect(context.lineTo).toHaveBeenNthCalledWith(2, 120 - d, 160 + d)
    expect(context.lineCap).toBe('square')
  })

  it('passes the cell size and stone colour on to its own props', () => {

    //The additional props are loaded with the same arguments the base ones
    //were, so a theme can vary them by cell size or by what is underneath
    const board = createStubBoard({
      cellSize: 40,
      stones: {'3,3': {stoneColor: 'black'}},
    })
    const markup = new MarkupMark(board)
    const args = markup.loadProperties(3, 3)

    expect(args).toEqual([40, 'black'])
  })
})
