import {describe, it, expect} from 'vitest'
import MarkupSad from './markup-sad.js'
import {markupTypes} from '../../constants/markup.js'
import {createStubBoard, createStubContext} from '../../../test/helpers.js'

describe('MarkupSad', () => {

  it('is a sad smiley', () => {
    expect(new MarkupSad(createStubBoard()).type).toBe(markupTypes.SAD)
  })

  it('loads the rounded line cap its type asks for', () => {
    const markup = new MarkupSad(createStubBoard({cellSize: 40}))
    markup.loadProperties(3, 3)

    expect(markup.lineCap).toBe('round')
    expect(markup.radius).toBe(17)
  })

  it('fills the same two eyes the happy one does', () => {
    const context = createStubContext()
    new MarkupSad(createStubBoard({cellSize: 40})).draw(context, 3, 4)

    const dEye = Math.round(17 * 0.36)
    const rEye = Math.round(17 / 6)

    expect(context.arc).toHaveBeenNthCalledWith(
      1, 120 - dEye, 160 - dEye, rEye, 0, 2 * Math.PI, true
    )
    expect(context.fill).toHaveBeenCalledTimes(2)
  })

  it('starts the mouth lower and pulls the curve up, so it frowns', () => {

    //The mouth ends sit further down than the happy one's, and the control
    //points sit on the centre line above them
    const context = createStubContext()
    new MarkupSad(createStubBoard({cellSize: 40})).draw(context, 3, 4)

    const dxMouth = Math.round(17 * 0.6)
    const dyMouth = Math.round(17 * 0.6)
    const dxCp = Math.round(17 * 0.4)

    expect(context.moveTo).toHaveBeenCalledWith(120 - dxMouth, 160 + dyMouth)
    expect(context.bezierCurveTo).toHaveBeenCalledWith(
      120 - dxCp, 160,
      120 + dxCp, 160,
      120 + dxMouth, 160 + dyMouth
    )
  })

  it('clears a little less grid than its radius', () => {
    const context = createStubContext()
    const board = createStubBoard({cellSize: 40})

    new MarkupSad(board).draw(context, 3, 3)

    expect(board.gridLayer.eraseCell).toHaveBeenCalledWith(3, 3, 17 * 0.8)
  })
})
