import {describe, it, expect} from 'vitest'
import MarkupSquare from './markup-square.js'
import Theme from '../theme.js'
import {markupTypes} from '../../constants/markup.js'
import {stoneColors} from '../../constants/stone.js'
import {createStubBoard, createStubContext} from '../../../test/helpers.js'

const {BLACK} = stoneColors

describe('MarkupSquare', () => {

  it('is a square', () => {
    const markup = new MarkupSquare(createStubBoard())
    expect(markup.type).toBe(markupTypes.SQUARE)
  })

  it('takes its scale from its own theme entry', () => {
    const markup = new MarkupSquare(createStubBoard({cellSize: 40}))
    markup.loadProperties(3, 3)

    expect(markup.scale).toBe(0.725)
    expect(markup.radius).toBe(15)
  })

  it('draws a square inside the marker radius', () => {

    //The corners sit on the circle of that radius, so the side is the radius
    //times twice the cosine of 45 degrees
    const context = createStubContext()
    const markup = new MarkupSquare(createStubBoard({cellSize: 40}))
    markup.draw(context, 3, 4)

    const d = Math.round(15 * Math.cos(Math.PI / 4))
    expect(context.rect).toHaveBeenCalledWith(120 - d, 160 - d, 2 * d, 2 * d)
    expect(context.stroke).toHaveBeenCalled()
  })

  it('strokes in the colour the theme gives for the stone underneath', () => {
    const context = createStubContext()
    const board = createStubBoard({
      cellSize: 40,
      stones: {'3,3': {stoneColor: BLACK}},
    })

    new MarkupSquare(board).draw(context, 3, 3)
    expect(context.strokeStyle).toBe('rgba(255,255,255,0.95)')
  })

  it('strokes in the colour for an empty point when there is no stone', () => {
    const context = createStubContext()
    new MarkupSquare(createStubBoard({cellSize: 40})).draw(context, 3, 3)

    expect(context.strokeStyle).toBe('rgba(0,0,0,0.95)')
    expect(context.lineWidth).toBe(2)
  })

  it('translates the canvas and puts it back again', () => {

    //Crisp lines need the half pixel translation for odd line widths, and
    //leaving it in place would shift everything drawn after it
    const theme = new Theme()
    const translate = theme.canvasTranslate(theme.get('grid.lineWidth', 40))
    const context = createStubContext()

    new MarkupSquare(createStubBoard({cellSize: 40, theme})).draw(context, 3, 3)

    expect(context.translate).toHaveBeenNthCalledWith(1, translate, translate)
    expect(context.translate).toHaveBeenNthCalledWith(2, -translate, -translate)
  })
})
