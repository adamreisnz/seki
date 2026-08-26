import {describe, it, expect} from 'vitest'
import StoneGlass from './stone-glass.js'
import {stoneColors, stoneStyles} from '../../constants/stone.js'
import {createStubBoard, createStubContext} from '../../../test/helpers.js'

const {BLACK, WHITE} = stoneColors

describe('StoneGlass', () => {

  it('is a glass stone and casts a shadow', () => {
    const stone = new StoneGlass(createStubBoard({cellSize: 40}), BLACK)
    stone.loadProperties()

    expect(stone.style).toBe(stoneStyles.GLASS)
    expect(stone.shadow).toBe(true)
  })

  it('draws the stone just inside the cell radius', () => {
    const context = createStubContext()
    new StoneGlass(createStubBoard({cellSize: 40}), BLACK).draw(context, 3, 4)

    expect(context.arc)
      .toHaveBeenCalledWith(120, 160, 19 - 0.5, 0, 2 * Math.PI, true)
    expect(context.fill).toHaveBeenCalled()
  })

  it('runs a light gradient for a white stone', () => {
    const context = createStubContext()
    new StoneGlass(createStubBoard({cellSize: 40}), WHITE).draw(context, 3, 3)

    const [gradient] = context.gradients
    expect(gradient.stops).toEqual([[0, '#fff'], [1, '#aaa']])
  })

  it('runs a dark gradient for a black stone', () => {
    const context = createStubContext()
    new StoneGlass(createStubBoard({cellSize: 40}), BLACK).draw(context, 3, 3)

    const [gradient] = context.gradients
    expect(gradient.stops).toEqual([[0, '#666'], [1, '#111']])
  })

  it('reaches further for white than for black, so it looks lit', () => {

    //The white highlight starts a third of the way in and runs the full
    //radius; the black one starts at a point and stops short
    const light = createStubContext()
    const dark = createStubContext()

    new StoneGlass(createStubBoard({cellSize: 40}), WHITE).draw(light, 3, 3)
    new StoneGlass(createStubBoard({cellSize: 40}), BLACK).draw(dark, 3, 3)

    expect(light.gradients[0].args[2]).toBeCloseTo(19 / 3, 6)
    expect(light.gradients[0].args[5]).toBeCloseTo(19, 6)
    expect(dark.gradients[0].args[2]).toBe(1)
    expect(dark.gradients[0].args[5]).toBeCloseTo(4 * 19 / 5, 6)
  })

  it('takes the swapped colour when the board swaps them', () => {
    const context = createStubContext()
    const board = createStubBoard({cellSize: 40, swapColors: true})

    new StoneGlass(board, BLACK).draw(context, 3, 3)

    expect(context.gradients[0].stops).toEqual([[0, '#fff'], [1, '#aaa']])
  })
})
