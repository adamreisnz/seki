import {describe, it, expect} from 'vitest'
import StoneShadow from './stone-shadow.js'
import StoneSlateShell from './stone-slate-shell.js'
import StoneMono from './stone-mono.js'
import Theme from '../theme.js'
import {stoneColors, stoneStyles, stoneModifierStyles} from '../../constants/stone.js'
import {createStubBoard, createStubContext} from '../../../test/helpers.js'

const {BLACK} = stoneColors

//A shadow always belongs to a stone, so it is built from one
const shadowFor = (stone) => new StoneShadow(stone)

describe('StoneShadow', () => {

  it('is a shadow, and borrows its parent stone board', () => {
    const board = createStubBoard({cellSize: 40})
    const shadow = shadowFor(new StoneSlateShell(board, BLACK))

    expect(shadow.style).toBe(stoneStyles.SHADOW)
    expect(shadow.board).toBe(board)
  })

  it('sits just inside the stone it belongs to', () => {

    //Half a pixel in from the stone, then scaled down again, so the shadow
    //never shows past the edge of what is casting it
    const board = createStubBoard({cellSize: 40})
    const shadow = shadowFor(new StoneSlateShell(board, BLACK))
    shadow.loadProperties()

    expect(shadow.radius).toBe(Math.round((19 - 0.5) * 0.97))
  })

  it('loads its blur and offset off the theme', () => {
    const board = createStubBoard({cellSize: 40})
    const shadow = shadowFor(new StoneSlateShell(board, BLACK))
    shadow.loadProperties()

    expect(shadow.color).toBe('rgba(30,20,10,.6)')
    expect(shadow.blur).toBeCloseTo(40 / 14, 6)
    expect(shadow.offsetX).toBe(3)
    expect(shadow.offsetY).toBe(3)
  })

  it('takes its alpha and whether to draw at all from its parent', () => {
    const board = createStubBoard({cellSize: 40})
    const shadow = shadowFor(new StoneSlateShell(board, BLACK))
    shadow.loadProperties()

    expect(shadow.shadow).toBe(true)
    expect(shadow.alpha).toBe(1)
  })

  it('draws offset from the stone, fading out at the edge', () => {
    const context = createStubContext()
    const board = createStubBoard({cellSize: 40})
    const shadow = shadowFor(new StoneSlateShell(board, BLACK))

    shadow.draw(context, 3, 4)

    const [gradient] = context.gradients
    expect(gradient.stops)
      .toEqual([[0, 'rgba(30,20,10,.6)'], [1, 'rgba(0,0,0,0)']])
    expect(context.arc).toHaveBeenCalledWith(
      120 + 3, 160 + 3, shadow.radius + shadow.blur, 0, 2 * Math.PI, true
    )
    expect(context.fill).toHaveBeenCalled()
  })

  it('draws nothing for a style that casts no shadow', () => {
    const context = createStubContext()
    const board = createStubBoard({cellSize: 40})

    shadowFor(new StoneMono(board, BLACK)).draw(context, 3, 3)

    expect(context.fill).not.toHaveBeenCalled()
  })

  it('draws nothing for a stone that is already see through', () => {

    //A captured stone is drawn faded, and a shadow under something you can
    //see through reads as a smudge rather than as depth
    const context = createStubContext()
    const board = createStubBoard({cellSize: 40})
    const captured = new StoneSlateShell(
      board, BLACK, stoneModifierStyles.CAPTURES
    )

    shadowFor(captured).draw(context, 3, 3)

    expect(context.fill).not.toHaveBeenCalled()
  })

  it('never asks for a negative radius', () => {
    const board = createStubBoard({cellSize: 0})
    const shadow = shadowFor(new StoneSlateShell(board, BLACK))
    shadow.loadProperties()

    expect(shadow.radius).toBe(0)
  })

  it('falls back to the full radius when the theme gives no scale', () => {
    const theme = new Theme()
    theme.set('stone.shadow.scale', 0)
    const board = createStubBoard({cellSize: 40, theme})
    const shadow = shadowFor(new StoneSlateShell(board, BLACK))

    shadow.loadProperties()

    expect(shadow.radius).toBe(Math.round(19 - 0.5))
  })
})
