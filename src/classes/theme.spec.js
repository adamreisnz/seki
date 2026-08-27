import {describe, it, expect} from 'vitest'
import Theme from './theme.js'

describe('Theme', () => {

  it('falls back to the default theme with no config', () => {
    const theme = new Theme()
    expect(theme.get('board.stoneStyle')).toBe('slateShell')
  })

  it('overlays given config onto the defaults', () => {
    const theme = new Theme({board: {backgroundColor: '#000'}})
    expect(theme.get('board.backgroundColor')).toBe('#000')
    expect(theme.get('board.margin')).toBe(0.25)
  })

  it('calls a function valued property with the given arguments', () => {
    const theme = new Theme()
    expect(theme.get('grid.radius', 40)).toBe(20)
    expect(theme.get('stone.base.radius', 40)).toBe(Math.floor(40 / 2) * 0.97)
  })

  it('reports whether a property exists', () => {
    const theme = new Theme()
    expect(theme.has('board.margin')).toBe(true)
    expect(theme.has('board.nonsense')).toBe(false)
  })

  it('sets a property, including a function', () => {
    const theme = new Theme()

    theme.set('board.backgroundColor', '#fff')
    expect(theme.get('board.backgroundColor')).toBe('#fff')

    theme.set('grid.radius', cellSize => cellSize)
    expect(theme.get('grid.radius', 33)).toBe(33)
  })

  it('merges further config in', () => {
    const theme = new Theme()
    theme.merge({board: {backgroundColor: '#123'}})

    expect(theme.get('board.backgroundColor')).toBe('#123')
    expect(theme.get('board.stoneStyle')).toBe('slateShell')
  })

  it('resets back to the defaults', () => {
    const theme = new Theme({board: {backgroundColor: '#000'}})
    theme.resetToDefaults()
    expect(theme.get('board.backgroundColor')).toBe('#e2b768')
  })

  it('nudges odd line widths by half a pixel to keep lines crisp', () => {
    const theme = new Theme()
    expect(theme.canvasTranslate(1)).toBe(0.5)
    expect(theme.canvasTranslate(2)).toBe(0)
  })

  it('picks star points for the standard board sizes', () => {
    const theme = new Theme()
    expect(theme.get('grid.star.points', 19, 19)).toHaveLength(9)
    expect(theme.get('grid.star.points', 13, 13)).toHaveLength(4)
    expect(theme.get('grid.star.points', 12, 12)).toEqual([])
    expect(theme.get('grid.star.points', 19, 13)).toEqual([])
  })
})

describe('theme config', () => {

  it('lets an array valued theme property be replaced', () => {
    const shellTypes = [{lines: [0.1], factor: 0.5, thickness: 1}]
    const theme = new Theme({stone: {slateShell: {shellTypes}}})
    expect(theme.get('stone.slateShell.shellTypes')).toEqual(shellTypes)
  })

  it('keeps theme functions from the defaults callable', () => {
    const theme = new Theme({board: {backgroundColor: '#fff'}})
    expect(theme.get('grid.radius', 40)).toBe(20)
    expect(theme.get('board.backgroundColor')).toBe('#fff')
  })

  it('lets a theme function be overridden', () => {
    const theme = new Theme({grid: {radius: () => 7}})
    expect(theme.get('grid.radius', 40)).toBe(7)
  })
})

describe('Theme config copies', () => {

  it('survives a round trip through getConfigCopy', () => {

    //NOTE: this used to go through a JSON round trip, which stripped every
    //handler function out of the theme and left the copy unusable
    const theme = new Theme()
    const copy = theme.getConfigCopy()

    expect(copy.grid.radius).toBeTypeOf('function')
    expect(copy.grid.radius(40)).toBe(20)
    expect(copy.stone.base.radius).toBeTypeOf('function')
  })

  it('produces a copy that can be fed back in as config', () => {
    const theme = new Theme()
    const rebuilt = new Theme(theme.getConfigCopy())

    expect(rebuilt.get('grid.radius', 40)).toBe(20)
    expect(rebuilt.get('board.stoneStyle')).toBe('slateShell')
  })
})

describe('Coordinate size handler', () => {

  it('is called with the character and cell size', () => {
    const theme = new Theme()
    expect(theme.get('coordinates.vertical.size', 'A', 40)).toBe('19px')
    expect(theme.get('coordinates.horizontal.size', 'A', 40)).toBe('19px')
  })

  it('can be overridden with a plain value', () => {

    //NOTE: the default used to be a function returning a function, so a plain
    //value here produced "size is not a function" at draw time
    const theme = new Theme({coordinates: {vertical: {size: '12px'}}})
    expect(theme.get('coordinates.vertical.size', 'A', 40)).toBe('12px')
  })

  it('can be overridden with a function', () => {
    const theme = new Theme({
      coordinates: {vertical: {size: (ch, cellSize) => `${cellSize}px`}},
    })
    expect(theme.get('coordinates.vertical.size', 'A', 33)).toBe('33px')
  })
})

describe('Theme canvas translation', () => {

  //Canvas strokes straddle the coordinate they are drawn on, so an odd line
  //width lands half in one pixel and half in the next unless the whole canvas
  //is shifted by half a pixel first

  it('shifts by half a pixel for an odd line width', () => {
    expect(new Theme().canvasTranslate(1)).toBe(0.5)
    expect(new Theme().canvasTranslate(3)).toBe(0.5)
  })

  it('shifts by nothing for an even one', () => {
    expect(new Theme().canvasTranslate(2)).toBe(0)
    expect(new Theme().canvasTranslate(4)).toBe(0)
  })

  it('falls back to the grid line width when given none', () => {

    //Which is what everything on the grid is aligned against
    const theme = new Theme()
    theme.set('grid.lineWidth', 3)

    expect(theme.canvasTranslate()).toBe(0.5)

    theme.set('grid.lineWidth', 2)
    expect(theme.canvasTranslate()).toBe(0)
  })
})
