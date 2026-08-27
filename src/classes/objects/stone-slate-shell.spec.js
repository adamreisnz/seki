import {describe, it, expect} from 'vitest'
import StoneSlateShell from './stone-slate-shell.js'
import Theme from '../theme.js'
import {stoneColors, stoneStyles} from '../../constants/stone.js'
import {createStubBoard, createStubContext} from '../../../test/helpers.js'

const {BLACK, WHITE} = stoneColors

//The shell pattern is picked from a seed drawn once at module load, so a
//spec can pin the shape of what is drawn but not which of the four shell
//types a given point lands on
const theme = () => new Theme()

describe('StoneSlateShell', () => {

  it('is a slate and shell stone and casts a shadow', () => {
    const stone = new StoneSlateShell(createStubBoard({cellSize: 40}), BLACK)
    stone.loadProperties()

    expect(stone.style).toBe(stoneStyles.SLATE_SHELL)
    expect(stone.shadow).toBe(true)
  })

  it('loads the shell types and stroke on top of the base props', () => {
    const stone = new StoneSlateShell(createStubBoard({cellSize: 40}), WHITE)
    const args = stone.loadProperties()

    expect(stone.shellTypes).toHaveLength(4)
    expect(stone.shellStroke).toBe('rgba(128,128,150,0.15)')
    expect(args).toEqual([40, WHITE])
  })

  it('gives each colour its own base tone', () => {
    const black = new StoneSlateShell(createStubBoard({cellSize: 40}), BLACK)
    const white = new StoneSlateShell(createStubBoard({cellSize: 40}), WHITE)
    black.loadProperties()
    white.loadProperties()

    expect(black.color).toBe('#111')
    expect(white.color).toBe('#cfcfca')
  })
})

describe('StoneSlateShell slate', () => {

  it('lays two gradients over the flat fill', () => {

    //A dark one down to the bottom right and a light one up to the top left,
    //which is what gives the slate its sheen
    const context = createStubContext()
    new StoneSlateShell(createStubBoard({cellSize: 40, theme: theme()}), BLACK)
      .draw(context, 3, 3)

    expect(context.gradients).toHaveLength(2)
    expect(context.gradients[0].stops)
      .toEqual([[0, 'rgba(32,32,32,1)'], [1, 'rgba(0,0,0,0)']])
    expect(context.gradients[1].stops).toEqual([
      [0, 'rgba(90,90,90,1)'],
      [0.5, 'rgba(0,0,0,0.2)'],
      [1, 'rgba(0,0,0,0)'],
    ])
    expect(context.fill).toHaveBeenCalledTimes(3)
  })

  it('draws no shell lines', () => {
    const context = createStubContext()
    new StoneSlateShell(createStubBoard({cellSize: 40}), BLACK)
      .draw(context, 3, 3)

    expect(context.bezierCurveTo).not.toHaveBeenCalled()
  })

  it('keeps every circle at the stone radius', () => {
    const context = createStubContext()
    new StoneSlateShell(createStubBoard({cellSize: 40}), BLACK)
      .draw(context, 3, 4)

    for (const call of context.arc.mock.calls) {
      expect(call).toEqual([120, 160, 19 - 0.5, 0, 2 * Math.PI, true])
    }
  })
})

describe('StoneSlateShell shell', () => {

  it('lays a bright gradient over the flat fill', () => {
    const context = createStubContext()
    new StoneSlateShell(createStubBoard({cellSize: 40}), WHITE)
      .draw(context, 3, 3)

    const gradient = context.gradients[context.gradients.length - 1]
    expect(gradient.stops).toEqual([
      [0, 'rgba(255,255,255,0.95)'],
      [0.1, 'rgba(255,255,255,0.85)'],
      [0.5, 'rgba(255,255,255,0.5)'],
      [1, 'rgba(255,255,255,0.1)'],
    ])
  })

  it('draws a curved line for every line in the shell type it picked', () => {

    //Which type it lands on comes from a seed drawn once at load, so what
    //can be pinned is that the count matches one of the four
    const context = createStubContext()
    const stone = new StoneSlateShell(createStubBoard({cellSize: 40}), WHITE)

    stone.draw(context, 3, 3)

    const lineCounts = stone.shellTypes.map(type => type.lines.length)
    expect(lineCounts).toContain(context.bezierCurveTo.mock.calls.length)
    expect(context.stroke.mock.calls.length)
      .toBe(context.bezierCurveTo.mock.calls.length)
  })

  it('scales the line width with the stone, off the shell thickness', () => {
    const context = createStubContext()
    const stone = new StoneSlateShell(createStubBoard({cellSize: 40}), WHITE)

    stone.draw(context, 3, 3)

    const thicknesses = stone.shellTypes.map(type => (19 / 30) * type.thickness)
    expect(thicknesses).toContain(context.lineWidth)
    expect(context.strokeStyle).toBe('rgba(128,128,150,0.15)')
  })

  it('keeps every shell line inside the stone', () => {

    //Each line is drawn on a radius pulled in by its own width, so a thick
    //line does not spill over the edge of the stone
    const context = createStubContext()
    const stone = new StoneSlateShell(createStubBoard({cellSize: 40}), WHITE)

    stone.draw(context, 3, 3)

    for (const [x, y] of context.moveTo.mock.calls) {
      const distance = Math.sqrt(((x - 120) ** 2) + ((y - 120) ** 2))
      expect(distance).toBeLessThanOrEqual(19)
    }
  })

  it('picks the same shell for the same point every time it is drawn', () => {

    //The seed is global on purpose: a stone that reshuffled its pattern on
    //every redraw would shimmer as the board is navigated
    const first = createStubContext()
    const second = createStubContext()
    const board = createStubBoard({cellSize: 40})

    new StoneSlateShell(board, WHITE).draw(first, 3, 3)
    new StoneSlateShell(board, WHITE).draw(second, 3, 3)

    expect(second.moveTo.mock.calls).toEqual(first.moveTo.mock.calls)
  })

  it('varies the shell from point to point', () => {

    //Which pattern any one point lands on depends on the seed, so this asks
    //only that a board of them is not all the same stone repeated
    const board = createStubBoard({cellSize: 40})
    const patterns = new Set()

    for (let i = 0; i < 12; i++) {
      const context = createStubContext()
      new StoneSlateShell(board, WHITE).draw(context, i, i + 1)
      patterns.add(JSON.stringify(context.moveTo.mock.calls))
    }

    expect(patterns.size).toBeGreaterThan(1)
  })
})

describe('StoneSlateShell shell lines', () => {

  //The line drawing works the curve out from the angle between its ends,
  //which it has to arrive at three different ways. Which of them a drawn
  //stone happens to take is down to the seed, so they are driven directly.
  const drawLine = (startAngle, endAngle) => {
    const context = createStubContext()
    const stone = new StoneSlateShell(createStubBoard({cellSize: 40}), WHITE)
    stone.loadProperties()
    stone.drawShellLine(
      context, stone.shellTypes[0], 100, 100, startAngle, endAngle
    )
    return context
  }

  it('draws a curve left to right', () => {
    const context = drawLine(0.9, 0.1)
    const [[x1], [, , , , x2]] = [
      context.moveTo.mock.calls[0],
      context.bezierCurveTo.mock.calls[0],
    ]

    expect(x2).toBeGreaterThan(x1)
    expect(context.stroke).toHaveBeenCalled()
  })

  it('draws a curve right to left', () => {
    const context = drawLine(0.1, 0.9)
    const [x1] = context.moveTo.mock.calls[0]
    const x2 = context.bezierCurveTo.mock.calls[0][4]

    expect(x2).toBeLessThan(x1)
    expect(context.stroke).toHaveBeenCalled()
  })

  it('draws a vertical curve without dividing by zero', () => {

    //Mirrored angles put both ends on the same x, which is the one case the
    //slope cannot be worked out from
    const context = drawLine(0.5, -0.5)
    const [x1, y1] = context.moveTo.mock.calls[0]
    const [, , , , x2, y2] = context.bezierCurveTo.mock.calls[0]

    expect(x2).toBeCloseTo(x1, 6)
    expect(y2).not.toBeCloseTo(y1, 6)
    for (const value of [x1, y1, x2, y2]) {
      expect(Number.isFinite(value)).toBe(true)
    }
  })
})
