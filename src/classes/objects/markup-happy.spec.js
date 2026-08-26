import {describe, it, expect} from 'vitest'
import MarkupHappy from './markup-happy.js'
import {markupTypes} from '../../constants/markup.js'
import {createStubBoard, createStubContext} from '../../../test/helpers.js'

describe('MarkupHappy', () => {

  it('is a happy smiley', () => {
    expect(new MarkupHappy(createStubBoard()).type).toBe(markupTypes.HAPPY)
  })

  it('loads the rounded line cap its type asks for', () => {
    const markup = new MarkupHappy(createStubBoard({cellSize: 40}))
    markup.loadProperties(3, 3)

    expect(markup.lineCap).toBe('round')
    expect(markup.scale).toBe(0.85)
    expect(markup.radius).toBe(17)
  })

  it('fills two eyes above the centre line', () => {
    const context = createStubContext()
    new MarkupHappy(createStubBoard({cellSize: 40})).draw(context, 3, 4)

    const dEye = Math.round(17 * 0.36)
    const rEye = Math.round(17 / 6)

    expect(context.arc).toHaveBeenNthCalledWith(
      1, 120 - dEye, 160 - dEye, rEye, 0, 2 * Math.PI, true
    )
    expect(context.arc).toHaveBeenNthCalledWith(
      2, 120 + dEye, 160 - dEye, rEye, 0, 2 * Math.PI, true
    )
    expect(context.fill).toHaveBeenCalledTimes(2)
  })

  it('curves the mouth downward, so it smiles', () => {

    //Both control points sit below the mouth ends, which is what pulls the
    //curve down into a smile rather than up into a frown
    const context = createStubContext()
    new MarkupHappy(createStubBoard({cellSize: 40})).draw(context, 3, 4)

    const dxMouth = Math.round(17 * 0.6)
    const dyMouth = Math.round(17 * 0.2)
    const dxCp = Math.round(17 * 0.4)
    const dyCp = Math.round(17 * 0.8)

    expect(context.moveTo).toHaveBeenCalledWith(120 - dxMouth, 160 + dyMouth)
    expect(context.bezierCurveTo).toHaveBeenCalledWith(
      120 - dxCp, 160 + dyCp,
      120 + dxCp, 160 + dyCp,
      120 + dxMouth, 160 + dyMouth
    )
    expect(dyCp).toBeGreaterThan(dyMouth)
  })

  it('clears a little less grid than its radius', () => {
    const context = createStubContext()
    const board = createStubBoard({cellSize: 40})

    new MarkupHappy(board).draw(context, 3, 3)

    expect(board.gridLayer.eraseCell).toHaveBeenCalledWith(3, 3, 17 * 0.8)
  })
})
