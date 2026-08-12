import {describe, it, expect, vi} from 'vitest'
import StoneGradient from './stone-gradient.js'
import Theme from '../theme.js'
import {stoneColors} from '../../constants/stone.js'

const {BLACK, WHITE} = stoneColors

/**
 * A board stand-in that draws stones in the colour they are given
 */
const createBoard = (cellSize = 40, theme = new Theme()) => ({
  theme,
  getCellSize: () => cellSize,
  getDisplayColor: color => color,
  getAbsX: x => x * cellSize,
  getAbsY: y => y * cellSize,
  isOnBoard: () => true,
  drawWidth: 400,
  drawHeight: 400,
})

/**
 * A canvas context stand-in that records the gradient it was asked for
 */
const createContext = () => {
  const gradient = {addColorStop: vi.fn()}
  return {
    gradient,
    translate: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    createRadialGradient: vi.fn(() => gradient),
  }
}

describe('StoneGradient', () => {

  it('loads the focus and stops off the theme', () => {
    const stone = new StoneGradient(createBoard(40), BLACK)
    stone.loadProperties()

    expect(stone.focus).toEqual({x: 0.34, y: 0.28})
    expect(stone.stops).toHaveLength(3)
  })

  it('gives each colour its own stops', () => {
    const black = new StoneGradient(createBoard(40), BLACK)
    const white = new StoneGradient(createBoard(40), WHITE)
    black.loadProperties()
    white.loadProperties()

    expect(black.stops).not.toEqual(white.stops)
    expect(white.stops[0][1]).toBe('#ffffff')
  })

  it('runs the gradient from the focus to the farthest corner', () => {
    const context = createContext()
    const stone = new StoneGradient(createBoard(40), BLACK)
    stone.draw(context, 1, 1)

    //Radius is 19 on a cell of 40, so the bounding box is 38 wide and starts
    //at 21. The focus lands at 34%/28% of that box, and the farthest corner
    //is the bottom right one.
    const focusX = 21 + (0.34 * 38)
    const focusY = 21 + (0.28 * 38)
    const reach = Math.sqrt(((0.66 * 38) ** 2) + ((0.72 * 38) ** 2))

    const args = context.createRadialGradient.mock.calls[0]
    expect(args[0]).toBeCloseTo(focusX, 6)
    expect(args[1]).toBeCloseTo(focusY, 6)
    expect(args[2]).toBe(0)
    expect(args[3]).toBeCloseTo(focusX, 6)
    expect(args[4]).toBeCloseTo(focusY, 6)
    expect(args[5]).toBeCloseTo(reach, 6)
  })

  it('adds every stop the theme gives', () => {
    const context = createContext()
    const stone = new StoneGradient(createBoard(40), WHITE)
    stone.draw(context, 1, 1)

    expect(context.gradient.addColorStop).toHaveBeenCalledTimes(3)
    expect(context.gradient.addColorStop)
      .toHaveBeenCalledWith(0, '#ffffff')
    expect(context.gradient.addColorStop)
      .toHaveBeenCalledWith(1, '#cdc0a8')
  })

  it('takes stops and focus overridden by the theme', () => {
    const theme = new Theme({
      stone: {
        gradient: {
          focus: {x: 0.5, y: 0.5},
          stops: [[0, '#f00'], [1, '#00f']],
        },
      },
    })
    const context = createContext()
    const stone = new StoneGradient(createBoard(40, theme), BLACK)
    stone.draw(context, 1, 1)

    //A centered focus reaches all corners equally
    const args = context.createRadialGradient.mock.calls[0]
    expect(args[0]).toBe(40)
    expect(args[1]).toBe(40)
    expect(args[5]).toBeCloseTo(Math.sqrt(2 * (19 ** 2)), 6)
    expect(context.gradient.addColorStop).toHaveBeenCalledWith(0, '#f00')
    expect(context.gradient.addColorStop).toHaveBeenCalledWith(1, '#00f')
  })
})
