import {describe, it, expect} from 'vitest'
import Theme from '../classes/theme.js'
import {
  defaultTheme,
  defaultGameInfo,
  defaultPlayerConfig,
  defaultStarPoints
} from './defaults.js'

const theme = () => new Theme()

describe('Default theme grid handlers', () => {

  it('thickens the grid lines as the board grows', () => {
    expect(theme().get('grid.lineWidth', 20)).toBe(1)
    expect(theme().get('grid.lineWidth', 55)).toBe(1.5)
    expect(theme().get('grid.lineWidth', 70)).toBe(2)
  })

  it('sizes a grid cell at half the cell size', () => {
    expect(theme().get('grid.radius', 21)).toBe(10)
  })

  it('gives star points for a square board it knows', () => {
    expect(theme().get('grid.star.points', 19, 19)).toBe(defaultStarPoints[19])
    expect(theme().get('grid.star.points', 9, 9)).toBe(defaultStarPoints[9])
  })

  it('gives no star points for a board it does not know', () => {
    expect(theme().get('grid.star.points', 19, 13)).toEqual([])
    expect(theme().get('grid.star.points', 17, 17)).toEqual([])
  })

  it('grows the star point radius with the cell size', () => {
    const radius = cellSize => theme().get('grid.star.radius', cellSize)
    expect(radius(4)).toBe(1)
    expect(radius(20)).toBe(2)
    expect(radius(40)).toBe(3)
    expect(radius(64)).toBe(5)
  })
})

describe('Default theme coordinate handlers', () => {

  it('takes the character and the cell size', () => {

    //NOTE: this used to be a function that returned a function, so the theme
    //handed back the inner one instead of a size, and overriding it with a
    //plain value like '12px' threw at draw time
    expect(theme().get('coordinates.vertical.size', '9', 20)).toBe('11px')
    expect(theme().get('coordinates.horizontal.size', 'A', 20)).toBe('11px')
  })

  it('can be overridden with a plain value', () => {
    const custom = new Theme({coordinates: {vertical: {size: '12px'}}})
    expect(custom.get('coordinates.vertical.size', 'A', 20)).toBe('12px')
  })

  it('numbers the vertical side and letters the horizontal one', () => {
    expect(theme().get('coordinates.vertical.type')).toBe('numbers')
    expect(theme().get('coordinates.horizontal.type')).toBe('letters')
  })

  it('counts the vertical side from the bottom', () => {
    expect(theme().get('coordinates.vertical.inverse')).toBe(true)
    expect(theme().get('coordinates.horizontal.inverse')).toBe(false)
  })
})

describe('Default theme markup handlers', () => {

  it('picks a colour that reads against the stone underneath', () => {
    const color = stoneColor => theme().get('markup.base.color', 20, stoneColor)
    expect(color('black')).toBe('rgba(255,255,255,0.95)')
    expect(color('white')).toBe('rgba(0,0,0,0.95)')
    expect(color(null)).toBe('rgba(0,0,0,0.95)')
  })

  it('keeps the line width at one pixel or more', () => {
    expect(theme().get('markup.base.lineWidth', 8)).toBe(1)
    expect(theme().get('markup.base.lineWidth', 64)).toBe(4)
  })

  it('refuses to size markup without a cell size', () => {
    expect(() => theme().get('markup.base.radius')).toThrow('No cell size')
  })

  it('shrinks a label as the text gets longer', () => {
    const fontSize = text => theme().get('markup.label.fontSize', text, 40)
    expect(fontSize('A')).toBeGreaterThan(fontSize('ABC'))
  })
})

describe('Default theme stone handlers', () => {

  it('sizes a stone just under half a cell', () => {
    expect(theme().get('stone.base.radius', 40)).toBe(Math.floor(40 / 2) * 0.97)
  })

  it('gives mono stones the full radius and hard colours', () => {
    expect(theme().get('stone.mono.radius', 40)).toBe(20)
    expect(theme().get('stone.mono.color', 40, 'black')).toBe('#000')
    expect(theme().get('stone.mono.color', 40, 'white')).toBe('#fff')
  })

  it('scales the shadow with the cell size', () => {
    expect(theme().get('stone.shadow.blur', 28)).toBe(2)
    expect(theme().get('stone.shadow.offsetX', 36)).toBe(2)
  })

  it('gives gradient stones stops for each colour', () => {
    const stops = stoneColor => theme().get('stone.gradient.stops', 40, stoneColor)
    expect(stops('black')).toHaveLength(3)
    expect(stops('white')).toHaveLength(3)
    expect(stops('black')[0][1]).not.toBe(stops('white')[0][1])
  })
})

describe('Theme overrides', () => {

  it('replaces a handler with a value of its own', () => {
    const custom = new Theme({grid: {lineWidth: 4}})
    expect(custom.get('grid.lineWidth', 20)).toBe(4)
  })

  it('replaces a handler with a handler of its own', () => {
    const custom = new Theme({grid: {lineWidth: cellSize => cellSize / 10}})
    expect(custom.get('grid.lineWidth', 20)).toBe(2)
  })

  it('leaves the defaults untouched for the next theme', () => {
    void new Theme({grid: {lineWidth: 4}})
    expect(theme().get('grid.lineWidth', 20)).toBe(1)
  })

  it('keeps the handlers a plain copy would have dropped', () => {
    const copy = theme().getConfigCopy()
    expect(copy.grid.lineWidth).toBeTypeOf('function')
  })
})

describe('Default game info', () => {

  it('defaults to a 19x19 board', () => {
    expect(defaultGameInfo.board.size).toBe(19)
  })

  it('defaults to a Go game', () => {
    expect(defaultGameInfo.game.type).toBe('go')
  })
})

describe('Default player config', () => {

  it('offers every mode but static', () => {
    expect(defaultPlayerConfig.availableModes).toContain('replay')
    expect(defaultPlayerConfig.availableModes).toContain('edit')
    expect(defaultPlayerConfig.initialMode).toBe('replay')
  })

  it('binds no keys of its own, leaving that to the consumer', () => {
    expect(defaultPlayerConfig.keyBindings).toEqual([])
  })

  it('binds the mouse wheel to stepping through the game', () => {
    const actions = defaultPlayerConfig.mouseBindings.map(b => b.action)
    expect(actions).toContain('goToNextPosition')
    expect(actions).toContain('goToPrevPosition')
  })

  it('exposes the theme separately from the player config', () => {
    expect(defaultPlayerConfig.theme).toBeUndefined()
    expect(defaultTheme.board).toBeDefined()
  })

  it('draws no board background gradient by default', () => {
    expect(defaultTheme.board.backgroundGradient).toBeNull()
  })
})
