import {describe, it, expect} from 'vitest'
import MarkupCircle from './markup-circle.js'
import Theme from '../theme.js'
import {markupTypes} from '../../constants/markup.js'
import {createStubBoard, createStubContext} from '../../../test/helpers.js'

describe('MarkupCircle', () => {

  it('is a circle', () => {
    expect(new MarkupCircle(createStubBoard()).type).toBe(markupTypes.CIRCLE)
  })

  it('takes its scale from its own theme entry', () => {
    const markup = new MarkupCircle(createStubBoard({cellSize: 40}))
    markup.loadProperties(3, 3)

    expect(markup.scale).toBe(0.55)
    expect(markup.radius).toBe(11)
  })

  it('strokes a circle at the marker radius', () => {
    const context = createStubContext()
    new MarkupCircle(createStubBoard({cellSize: 40})).draw(context, 3, 4)

    expect(context.arc).toHaveBeenCalledWith(120, 160, 11, 0, 2 * Math.PI, true)
    expect(context.stroke).toHaveBeenCalled()
  })

  it('clears a good deal more grid than its radius', () => {
    const context = createStubContext()
    const board = createStubBoard({cellSize: 40})

    new MarkupCircle(board).draw(context, 3, 3)

    expect(board.gridLayer.eraseCell).toHaveBeenCalledWith(3, 3, 11 * 1.4)
  })
})

describe('MarkupCircle line dash', () => {

  const withLineDash = lineDash => {
    const theme = new Theme()
    theme.set('markup.circle.lineDash', lineDash)
    return new MarkupCircle(createStubBoard({cellSize: 40, theme}))
  }

  it('has none by default', () => {
    const markup = new MarkupCircle(createStubBoard({cellSize: 40}))
    markup.loadProperties(3, 3)

    expect(markup.getLineDash()).toBeNull()
  })

  it('takes an array from the theme as it stands', () => {
    const markup = withLineDash([4, 2])
    markup.loadProperties(3, 3)

    expect(markup.getLineDash()).toEqual([4, 2])
  })

  it('splits a comma separated string into segments', () => {

    //A theme may express the dash the way CSS does, which is a string
    const markup = withLineDash('4,2')
    markup.loadProperties(3, 3)

    expect(markup.getLineDash()).toEqual(['4', '2'])
  })

  it('sets the dash before stroking and clears it again after', () => {

    //The dash is context state, so leaving it set would dash everything
    //drawn on this layer after the marker
    const context = createStubContext()
    withLineDash([4, 2]).draw(context, 3, 3)

    expect(context.setLineDash).toHaveBeenNthCalledWith(1, [4, 2])
    expect(context.setLineDash).toHaveBeenNthCalledWith(2, [])
  })

  it('passes an empty dash when it has none, rather than null', () => {
    const context = createStubContext()
    new MarkupCircle(createStubBoard({cellSize: 40})).draw(context, 3, 3)

    expect(context.setLineDash).toHaveBeenNthCalledWith(1, [])
  })
})
