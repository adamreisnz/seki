import {describe, it, expect} from 'vitest'
import GridChanges from './grid-changes.js'
import Grid from './grid.js'

/**
 * Build a changes object with the given additions and removals
 */
const changesOf = (add = [], remove = []) => {
  const changes = new GridChanges()
  changes.add = add
  changes.remove = remove
  return changes
}

describe('GridChanges', () => {

  it('starts empty', () => {
    const changes = new GridChanges()
    expect(changes.add).toEqual([])
    expect(changes.remove).toEqual([])
    expect(changes.has()).toBe(false)
  })

  it('reports having changes either way round', () => {
    expect(changesOf([{x: 1, y: 1}]).has()).toBe(true)
    expect(changesOf([], [{x: 1, y: 1}]).has()).toBe(true)
  })
})

describe('GridChanges.concat()', () => {

  it('collects changes on different points', () => {
    const changes = changesOf([{x: 1, y: 1}], [{x: 2, y: 2}])
    changes.concat(changesOf([{x: 3, y: 3}], [{x: 4, y: 4}]))

    expect(changes.add).toEqual([{x: 1, y: 1}, {x: 3, y: 3}])
    expect(changes.remove).toEqual([{x: 2, y: 2}, {x: 4, y: 4}])
  })

  it('drops an addition that the new changes remove again', () => {
    const changes = changesOf([{x: 1, y: 1}])
    changes.concat(changesOf([], [{x: 1, y: 1}]))

    expect(changes.add).toEqual([])
    expect(changes.remove).toEqual([{x: 1, y: 1}])
  })

  it('drops a removal that the new changes add back', () => {
    const changes = changesOf([], [{x: 1, y: 1}])
    changes.concat(changesOf([{x: 1, y: 1}]))

    expect(changes.remove).toEqual([])
    expect(changes.add).toEqual([{x: 1, y: 1}])
  })

  it('takes the value from the newer change on the same point', () => {
    const changes = changesOf([{x: 1, y: 1, value: 'black'}])
    changes.concat(changesOf([{x: 1, y: 1, value: 'white'}]))

    expect(changes.add).toEqual([
      {x: 1, y: 1, value: 'black'},
      {x: 1, y: 1, value: 'white'},
    ])
  })
})

describe('The changes a grid comparison produces', () => {

  const gridOf = entries => {
    const grid = new Grid(9, 9)
    entries.forEach(([x, y, value]) => grid.set(x, y, value))
    return grid
  }

  it('reports nothing for two identical grids', () => {
    const changes = gridOf([[1, 1, 'black']]).compare(gridOf([[1, 1, 'black']]))
    expect(changes.has()).toBe(false)
  })

  it('reports an addition', () => {
    const changes = gridOf([]).compare(gridOf([[1, 1, 'black']]))
    expect(changes.add).toEqual([{x: 1, y: 1, value: 'black'}])
    expect(changes.remove).toEqual([])
  })

  it('reports a removal', () => {
    const changes = gridOf([[1, 1, 'black']]).compare(gridOf([]))
    expect(changes.remove).toEqual([{x: 1, y: 1, value: 'black'}])
    expect(changes.add).toEqual([])
  })

  it('reports a changed value as both, so it gets redrawn', () => {
    const changes = gridOf([[1, 1, 'black']]).compare(gridOf([[1, 1, 'white']]))
    expect(changes.remove).toEqual([{x: 1, y: 1, value: 'black'}])
    expect(changes.add).toEqual([{x: 1, y: 1, value: 'white'}])
  })

  it('refuses to compare grids of a different size', () => {
    expect(() => new Grid(9, 9).compare(new Grid(19, 19)))
      .toThrow('different size')
  })
})
