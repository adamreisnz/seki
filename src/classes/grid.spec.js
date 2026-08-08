import {describe, it, expect} from 'vitest'
import Grid from './grid.js'

const createGrid = (width = 9, height = 9) => new Grid(width, height)

describe('Grid', () => {

  describe('sizing', () => {

    it('starts empty with no size', () => {
      const grid = new Grid()
      expect(grid.getSize()).toEqual({width: 0, height: 0})
      expect(grid.isEmpty()).toBe(true)
    })

    it('takes a width and height', () => {
      expect(createGrid(19, 13).getSize()).toEqual({width: 19, height: 13})
    })

    it('squares off when only a width is given', () => {
      expect(new Grid(9).getSize()).toEqual({width: 9, height: 9})
    })

    it('clears its contents when the size changes', () => {
      const grid = createGrid()
      grid.set(1, 1, 'black')
      grid.setSize(13, 13)
      expect(grid.isEmpty()).toBe(true)
    })

    it('keeps its contents when the size is set to the same value', () => {
      const grid = createGrid()
      grid.set(1, 1, 'black')
      grid.setSize(9, 9)
      expect(grid.get(1, 1)).toBe('black')
    })
  })

  describe('bounds', () => {

    it('reports what is on the grid', () => {
      const grid = createGrid()
      expect(grid.isOnGrid(0, 0)).toBe(true)
      expect(grid.isOnGrid(8, 8)).toBe(true)
      expect(grid.isOnGrid(-1, 0)).toBe(false)
      expect(grid.isOnGrid(0, -1)).toBe(false)
      expect(grid.isOnGrid(9, 0)).toBe(false)
      expect(grid.isOnGrid(0, 9)).toBe(false)
    })

    it('ignores writes outside the grid', () => {
      const grid = createGrid()
      grid.set(-1, 0, 'black')
      grid.set(9, 9, 'black')
      expect(grid.isEmpty()).toBe(true)
    })

    it('returns null for reads outside the grid', () => {
      expect(createGrid().get(-1, 0)).toBe(null)
    })

    it('reports nothing present outside the grid', () => {
      expect(createGrid().has(99, 99)).toBe(false)
    })
  })

  describe('values', () => {

    it('sets, gets and deletes', () => {
      const grid = createGrid()
      grid.set(3, 4, 'black')
      expect(grid.get(3, 4)).toBe('black')
      expect(grid.has(3, 4)).toBe(true)

      grid.delete(3, 4)
      expect(grid.has(3, 4)).toBe(false)
    })

    it('overwrites an existing value', () => {
      const grid = createGrid()
      grid.set(3, 4, 'black')
      grid.set(3, 4, 'white')
      expect(grid.get(3, 4)).toBe('white')
    })

    it('does not confuse coordinates that share digits', () => {
      const grid = createGrid(19, 19)
      grid.set(1, 11, 'black')
      grid.set(11, 1, 'white')
      expect(grid.get(1, 11)).toBe('black')
      expect(grid.get(11, 1)).toBe('white')
    })

    it('clears everything', () => {
      const grid = createGrid()
      grid.set(1, 1, 'black')
      grid.set(2, 2, 'white')
      grid.clear()
      expect(grid.isEmpty()).toBe(true)
    })
  })

  describe('is()', () => {

    it('compares scalar values directly', () => {
      const grid = createGrid()
      grid.set(1, 1, 'black')
      expect(grid.is(1, 1, 'black')).toBe(true)
      expect(grid.is(1, 1, 'white')).toBe(false)
    })

    it('compares object values by the given keys', () => {
      const grid = createGrid()
      grid.set(1, 1, {type: 'label', text: 'A'})
      expect(grid.is(1, 1, {type: 'label'})).toBe(true)
      expect(grid.is(1, 1, {type: 'label', text: 'A'})).toBe(true)
      expect(grid.is(1, 1, {type: 'circle'})).toBe(false)
      expect(grid.is(1, 1, {type: 'label', text: 'B'})).toBe(false)
    })

    it('is false off the grid', () => {
      expect(createGrid().is(99, 99, 'black')).toBe(false)
    })
  })

  describe('iteration', () => {

    it('is iterable, yielding coordinates and values', () => {
      const grid = createGrid()
      grid.set(1, 2, 'black')
      expect([...grid]).toEqual([{x: 1, y: 2, value: 'black'}])
    })

    it('returns everything via getAll', () => {
      const grid = createGrid()
      grid.set(1, 2, 'black')
      grid.set(3, 4, 'white')
      expect(grid.getAll()).toHaveLength(2)
    })

    it('gives numeric coordinates back, not strings', () => {
      const grid = createGrid()
      grid.set(1, 2, 'black')
      const [entry] = grid.getAll()
      expect(entry.x).toBe(1)
      expect(entry.y).toBe(2)
    })

    it('visits each entry with forEach', () => {
      const grid = createGrid()
      grid.set(1, 2, 'black')
      grid.set(3, 4, 'white')

      const seen = []
      grid.forEach((value, x, y) => seen.push({value, x, y}))
      expect(seen).toHaveLength(2)
      expect(seen).toContainEqual({value: 'black', x: 1, y: 2})
    })
  })

  describe('transformation', () => {

    it('maps values into a new grid', () => {
      const grid = createGrid()
      grid.set(1, 1, 'black')

      const mapped = grid.map(color => ({color}))
      expect(mapped.get(1, 1)).toEqual({color: 'black'})
      expect(grid.get(1, 1)).toBe('black')
      expect(mapped.getSize()).toEqual(grid.getSize())
    })

    it('filters into a new grid', () => {
      const grid = createGrid()
      grid.set(1, 1, 'black')
      grid.set(2, 2, 'white')

      const filtered = grid.filter(color => color === 'black')
      expect(filtered.has(1, 1)).toBe(true)
      expect(filtered.has(2, 2)).toBe(false)
    })

    it('clones without sharing the underlying map', () => {
      const grid = createGrid()
      grid.set(1, 1, 'black')

      const clone = grid.clone()
      clone.set(2, 2, 'white')

      expect(clone.get(1, 1)).toBe('black')
      expect(grid.has(2, 2)).toBe(false)
    })

    it('converts to a matrix in row order', () => {
      const grid = new Grid(3, 2)
      grid.set(0, 0, 'black')
      grid.set(2, 1, 'white')

      expect(grid.toMatrix()).toEqual([
        ['black', undefined, undefined],
        [undefined, undefined, 'white'],
      ])
    })

    it('applies a transform when converting to a matrix', () => {
      const grid = new Grid(2, 1)
      grid.set(0, 0, 'black')
      expect(grid.toMatrix(v => v === 'black' ? 1 : 0)).toEqual([[1, 0]])
    })
  })

  describe('comparison', () => {

    it('matches an identical grid', () => {
      const a = createGrid()
      const b = createGrid()
      a.set(1, 1, 'black')
      b.set(1, 1, 'black')
      expect(a.isSameAs(b)).toBe(true)
    })

    it('does not match a grid with a different value', () => {
      const a = createGrid()
      const b = createGrid()
      a.set(1, 1, 'black')
      b.set(1, 1, 'white')
      expect(a.isSameAs(b)).toBe(false)
    })

    it('does not match a grid with a different number of entries', () => {
      const a = createGrid()
      const b = createGrid()
      a.set(1, 1, 'black')
      expect(a.isSameAs(b)).toBe(false)
    })

    it('does not match a grid of a different size', () => {
      const a = createGrid(9, 9)
      const b = createGrid(13, 13)
      expect(a.isSameAs(b)).toBe(false)
    })
  })

  describe('compare()', () => {

    it('reports nothing between identical grids', () => {
      const a = createGrid()
      const b = createGrid()
      a.set(1, 1, 'black')
      b.set(1, 1, 'black')

      const changes = a.compare(b)
      expect(changes.add).toEqual([])
      expect(changes.remove).toEqual([])
    })

    it('reports entries the new grid gained', () => {
      const a = createGrid()
      const b = createGrid()
      b.set(1, 1, 'black')

      expect(a.compare(b).add).toEqual([{x: 1, y: 1, value: 'black'}])
    })

    it('reports entries the new grid lost', () => {
      const a = createGrid()
      const b = createGrid()
      a.set(1, 1, 'black')

      expect(a.compare(b).remove).toEqual([{x: 1, y: 1, value: 'black'}])
    })

    it('refuses to compare grids of different sizes', () => {
      expect(() => createGrid(9, 9).compare(createGrid(13, 13)))
        .toThrow('Trying to compare grids of a different size')
    })

    //NOTE: a value changing in place, e.g. a stone changing colour on the
    //same coordinate, is not reported as a change. Grid#compare is currently
    //unused inside the library, so this documents the limitation rather than
    //asserting it is right.
    it('does not currently notice a value changing in place', () => {
      const a = createGrid()
      const b = createGrid()
      a.set(1, 1, 'black')
      b.set(1, 1, 'white')

      const changes = a.compare(b)
      expect(changes.add).toEqual([])
      expect(changes.remove).toEqual([])
    })
  })
})
