import {describe, it, expect} from 'vitest'
import MarkupLastMove from './markup-last-move.js'
import MarkupCircle from './markup-circle.js'
import {markupTypes} from '../../constants/markup.js'
import {createStubBoard, createStubContext} from '../../../test/helpers.js'

describe('MarkupLastMove', () => {

  it('is a circle under another name', () => {

    //It draws as a circle but carries its own type, so a theme can style the
    //last move marker apart from circle markup the record itself holds
    const markup = new MarkupLastMove(createStubBoard())

    expect(markup).toBeInstanceOf(MarkupCircle)
    expect(markup.type).toBe(markupTypes.LAST_MOVE)
  })

  it('looks up its own theme entry before the base', () => {
    const markup = new MarkupLastMove(createStubBoard())

    expect(markup.getThemePaths('scale')).toEqual([
      'markup.lastMove.scale',
      'markup.base.scale',
    ])
  })

  it('takes the scale its own entry defines', () => {
    const markup = new MarkupLastMove(createStubBoard({cellSize: 40}))
    markup.loadProperties(3, 3)

    expect(markup.scale).toBe(0.55)
    expect(markup.radius).toBe(11)
  })

  it('draws the circle it inherits', () => {
    const context = createStubContext()
    new MarkupLastMove(createStubBoard({cellSize: 40})).draw(context, 2, 2)

    expect(context.arc).toHaveBeenCalledWith(80, 80, 11, 0, 2 * Math.PI, true)
    expect(context.stroke).toHaveBeenCalled()
  })
})
