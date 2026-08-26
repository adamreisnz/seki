import {describe, it, expect} from 'vitest'
import StoneMono from './stone-mono.js'
import Theme from '../theme.js'
import {stoneColors, stoneStyles} from '../../constants/stone.js'
import {createStubBoard, createStubContext} from '../../../test/helpers.js'

const {BLACK, WHITE} = stoneColors

describe('StoneMono', () => {

  it('is a mono stone', () => {
    expect(new StoneMono(createStubBoard(), BLACK).style)
      .toBe(stoneStyles.MONO)
  })

  it('takes the full cell radius its style defines, not the base one', () => {

    //Every other style leaves a hair of board showing; a mono stone is a flat
    //shape with an outline, so it fills the cell
    const stone = new StoneMono(createStubBoard({cellSize: 40}), BLACK)
    stone.loadProperties()

    expect(stone.radius).toBe(20)
  })

  it('loads the outline width and colour on top of the base props', () => {
    const stone = new StoneMono(createStubBoard({cellSize: 40}), BLACK)
    const args = stone.loadProperties()

    expect(stone.lineWidth).toBe(1)
    expect(stone.lineColor).toBe('#000')
    expect(args).toEqual([40, BLACK])
  })

  it('fills black solid and white hollow', () => {
    const black = new StoneMono(createStubBoard({cellSize: 40}), BLACK)
    const white = new StoneMono(createStubBoard({cellSize: 40}), WHITE)
    black.loadProperties()
    white.loadProperties()

    expect(black.color).toBe('#000')
    expect(white.color).toBe('#fff')
  })

  it('draws the fill inside the outline, so the two do not overlap', () => {
    const context = createStubContext()
    new StoneMono(createStubBoard({cellSize: 40}), BLACK).draw(context, 3, 4)

    expect(context.arc)
      .toHaveBeenCalledWith(120, 160, 20 - 1, 0, 2 * Math.PI, true)
    expect(context.fill).toHaveBeenCalled()
    expect(context.stroke).toHaveBeenCalled()
    expect(context.strokeStyle).toBe('#000')
  })

  it('skips the outline when the theme asks for none', () => {
    const theme = new Theme()
    theme.set('stone.mono.lineWidth', 0)
    const context = createStubContext()

    new StoneMono(createStubBoard({cellSize: 40, theme}), BLACK)
      .draw(context, 3, 3)

    expect(context.fill).toHaveBeenCalled()
    expect(context.stroke).not.toHaveBeenCalled()
  })

  it('never asks for a negative radius on a tiny cell', () => {
    const theme = new Theme()
    theme.set('stone.mono.lineWidth', 40)
    const context = createStubContext()

    new StoneMono(createStubBoard({cellSize: 40, theme}), BLACK)
      .draw(context, 3, 3)

    expect(context.arc).toHaveBeenCalledWith(120, 120, 0, 0, 2 * Math.PI, true)
  })

  it('swaps the colour it draws when the board is swapping colours', () => {
    const stone = new StoneMono(
      createStubBoard({cellSize: 40, swapColors: true}), BLACK
    )
    stone.loadProperties()

    expect(stone.displayColor).toBe(WHITE)
    expect(stone.color).toBe('#fff')
  })
})
