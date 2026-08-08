import {describe, it, expect, vi} from 'vitest'
import GameNode from './game-node.js'
import {stoneColors} from '../constants/stone.js'
import {setupTypes} from '../constants/setup.js'

const {BLACK, WHITE} = stoneColors

const move = (x, y, color = BLACK) => new GameNode({move: {x, y, color}})

/**
 * Build root -> a -> b, with c as a second child of a
 */
const createTree = () => {
  const root = new GameNode()
  const a = move(0, 0)
  const b = move(1, 1, WHITE)
  const c = move(2, 2, WHITE)
  a.appendToParent(root)
  b.appendToParent(a)
  c.appendToParent(a)
  return {root, a, b, c}
}

describe('GameNode', () => {

  describe('parents and children', () => {

    it('starts as its own root with no parent', () => {
      const node = new GameNode()
      expect(node.isRoot()).toBe(true)
      expect(node.hasParent()).toBe(false)
      expect(node.hasChildren()).toBe(false)
    })

    it('appends to a parent and reports the index', () => {
      const root = new GameNode()
      expect(new GameNode().appendToParent(root)).toBe(0)
      expect(new GameNode().appendToParent(root)).toBe(1)
      expect(root.hasMultipleChildren()).toBe(true)
    })

    it('links parent and root through the tree', () => {
      const {root, a, b} = createTree()
      expect(a.getParent()).toBe(root)
      expect(b.getParent()).toBe(a)
      expect(a.getRoot()).toBe(root)
      expect(b.isRoot()).toBe(false)
    })

    it('detaches a node from its parent', () => {
      const {root, a} = createTree()
      expect(a.detachFromParent()).toBe(root)
      expect(root.hasChildren()).toBe(false)
      expect(a.hasParent()).toBe(false)
    })

    it('moves a node between parents rather than duplicating it', () => {
      const {root, a, b} = createTree()
      b.appendToParent(root)
      expect(a.children).not.toContain(b)
      expect(root.children).toContain(b)
    })

    it('finds siblings', () => {
      const {a, b, c} = createTree()
      expect(a.hasSiblings()).toBe(false)
      expect(b.getNextSibling()).toBe(c)
      expect(c.getPreviousSibling()).toBe(b)
      expect(b.getPreviousSibling()).toBeUndefined()
    })
  })

  describe('removing children', () => {

    it('removes a child by reference', () => {
      const {root, a} = createTree()
      root.removeChild(a)
      expect(root.hasChildren()).toBe(false)
    })

    it('ignores a child that is not there', () => {
      const root = new GameNode()
      expect(() => root.removeChild(new GameNode())).not.toThrow()
    })

    it('keeps the path index pointing at the same child', () => {
      const {a, b, c} = createTree()
      a.setPathIndex(1)
      expect(a.getPathNode()).toBe(c)

      a.removeChild(b)
      expect(a.getPathNode()).toBe(c)
    })

    it('pulls the path index back when it would fall off the end', () => {
      const {a, c} = createTree()
      a.setPathIndex(1)
      a.removeChild(c)
      expect(a.getPathIndex()).toBe(0)
    })
  })

  describe('reordering children', () => {

    it('swaps two children', () => {
      const {a, b, c} = createTree()
      a.moveChild(c, 0)
      expect(a.getChild(0)).toBe(c)
      expect(a.getChild(1)).toBe(b)
    })

    it('moves the path index along with the child it points at', () => {
      const {a, b, c} = createTree()
      a.setPathIndex(0)
      a.moveChild(c, 0)
      expect(a.getPathNode()).toBe(b)
    })

    it('moves a child up and down', () => {
      const {a, c} = createTree()
      c.moveUp()
      expect(a.getChild(0)).toBe(c)

      c.moveDown()
      expect(a.getChild(1)).toBe(c)
    })

    it('ignores an out of range index', () => {
      const {a, b} = createTree()
      a.moveChild(b, 5)
      expect(a.getChild(0)).toBe(b)
    })

    it('swaps the variation roots along with the children', () => {

      //NOTE: b starts as the main variation and c as a branch, so a swap has
      //to turn c into the main variation and b into a branch, all the way
      //down their subtrees
      const {a, b, c} = createTree()
      const belowB = move(3, 3)
      belowB.appendToParent(b)

      a.moveChild(c, 0)

      expect(c.variationRoot).toBeFalsy()
      expect(b.variationRoot).toBe(b)
      expect(belowB.variationRoot).toBe(b)
    })

    it('leaves the children that did not move alone', () => {

      //NOTE: a swap used to re-parent every child, walking each child's
      //whole subtree twice over, when only the two swapped children can
      //have changed
      const {a, c} = createTree()
      const d = move(3, 3, WHITE)
      d.appendToParent(a)
      const setParent = vi.spyOn(d, 'setParent')
      const updateRoot = vi.spyOn(d, 'updateVariationRoot')

      a.moveChild(c, 0)

      expect(setParent).not.toHaveBeenCalled()
      expect(updateRoot).not.toHaveBeenCalled()
      expect(d.variationRoot).toBe(d)
    })

    it('keeps the variation roots straight when promoting deep down', () => {
      const {root, a, b, c} = createTree()
      const belowC = move(3, 3)
      belowC.appendToParent(c)

      a.moveChild(c, 0)
      a.moveChild(b, 0)

      expect(root.getChild(0)).toBe(a)
      expect(b.variationRoot).toBeFalsy()
      expect(c.variationRoot).toBe(c)
      expect(belowC.variationRoot).toBe(c)
    })
  })

  describe('variations', () => {

    it('treats the first child as the main line', () => {
      const {b, c} = createTree()
      expect(b.isMainVariation()).toBe(true)
      expect(c.isVariationBranch()).toBe(true)
      expect(c.isVariationRoot()).toBe(true)
    })

    it('carries the variation root down a branch', () => {
      const {c} = createTree()
      const d = move(3, 3)
      d.appendToParent(c)

      expect(d.isVariationBranch()).toBe(true)
      expect(d.isVariationRoot()).toBe(false)
    })

    it('promotes the new first child when the main line is removed', () => {
      const {a, b, c} = createTree()
      a.removeChild(b)
      expect(c.isMainVariation()).toBe(true)
    })

    it('finds move variations at given coordinates', () => {
      const {a} = createTree()
      expect(a.hasMoveVariation(1, 1)).toBe(true)
      expect(a.hasMoveVariation(9, 9)).toBe(false)
      expect(a.getMoveVariationIndex(2, 2)).toBe(1)
      expect(a.getMoveVariationIndex(9, 9)).toBe(-1)
    })

    it('counts move variations', () => {
      const {a} = createTree()
      expect(a.hasMoveVariations()).toBe(true)
      expect(a.hasMultipleMoveVariations()).toBe(true)
      expect(a.getMoveVariations()).toHaveLength(2)
    })

    it('does not count a setup node as a move variation', () => {
      const root = new GameNode()
      new GameNode().appendToParent(root)
      expect(root.hasMoveVariations()).toBe(false)
    })
  })

  describe('path index', () => {

    it('defaults to the first child', () => {
      const {a, b} = createTree()
      expect(a.getPathIndex()).toBe(0)
      expect(a.getPathNode()).toBe(b)
      expect(a.isMainPath()).toBe(true)
    })

    it('only accepts a valid index', () => {
      const {a} = createTree()
      a.setPathIndex(5)
      expect(a.getPathIndex()).toBe(0)

      a.setPathIndex(-1)
      expect(a.getPathIndex()).toBe(0)
    })

    it('increments and decrements within range', () => {
      const {a} = createTree()
      a.incrementPathIndex()
      expect(a.getPathIndex()).toBe(1)

      a.incrementPathIndex()
      expect(a.getPathIndex()).toBe(1)

      a.decrementPathIndex()
      expect(a.getPathIndex()).toBe(0)

      a.decrementPathIndex()
      expect(a.getPathIndex()).toBe(0)
    })

    it('points at a child by reference', () => {
      const {a, c} = createTree()
      a.setPathNode(c)
      expect(a.isSelectedPath(c)).toBe(true)
      expect(a.isSelectedPath(a.getChild(0))).toBe(false)
    })

    it('walks the selected path', () => {
      const {root, a, b} = createTree()
      expect(root.getPathNodes()).toEqual([root, a, b])
    })

    it('reports the selected path through the tree', () => {
      const {a, b, c} = createTree()
      expect(a.isPath).toBe(true)
      expect(b.isPath).toBe(true)
      expect(c.isPath).toBe(false)
    })
  })

  describe('moves', () => {

    it('distinguishes play, pass and non move nodes', () => {
      const play = move(0, 0)
      const pass = new GameNode({move: {color: BLACK, pass: true}})
      const setup = new GameNode()

      expect(play.isMove()).toBe(true)
      expect(play.isPlayMove()).toBe(true)
      expect(play.isPassMove()).toBe(false)

      expect(pass.isMove()).toBe(true)
      expect(pass.isPlayMove()).toBe(false)
      expect(pass.isPassMove()).toBe(true)

      expect(setup.isMove()).toBe(false)
    })

    it('counts move number along the ancestry', () => {
      const {root, a, b} = createTree()
      expect(root.getMoveNumber()).toBe(0)
      expect(a.getMoveNumber()).toBe(1)
      expect(b.getMoveNumber()).toBe(2)
    })

    it('skips non move nodes when counting', () => {
      const root = new GameNode()
      const setup = new GameNode()
      setup.appendToParent(root)
      const first = move(0, 0)
      first.appendToParent(setup)

      expect(first.getMoveNumber()).toBe(1)
    })

    it('finds the previous move across a setup node', () => {
      const first = move(0, 0)
      const setup = new GameNode()
      setup.appendToParent(first)
      const second = move(1, 1, WHITE)
      second.appendToParent(setup)

      expect(second.getPreviousMove()).toBe(first)
      expect(first.getPreviousMove()).toBeUndefined()
    })

    it('collects all move nodes back to the root', () => {
      const {b} = createTree()
      expect(b.getAllMoveNodes()).toHaveLength(2)
    })

    it('collects only the move nodes on a variation branch', () => {
      const {c} = createTree()
      const d = move(3, 3)
      d.appendToParent(c)
      expect(d.getVariationMoveNodes()).toEqual([c, d])
    })
  })

  describe('markup', () => {

    it('adds markup grouped by type', () => {
      const node = new GameNode()
      node.addMarkup(1, 1, {type: 'circle'})
      node.addMarkup(2, 2, {type: 'circle'})
      node.addMarkup(3, 3, {type: 'square'})

      expect(node.markup).toHaveLength(2)
      expect(node.hasMarkupInstructions()).toBe(true)
      expect(node.hasMarkup(1, 1)).toBe(true)
      expect(node.hasMarkup(9, 9)).toBe(false)
    })

    it('replaces markup on the same coordinate', () => {
      const node = new GameNode()
      node.addMarkup(1, 1, {type: 'circle'})
      node.addMarkup(1, 1, {type: 'square'})

      expect(node.markup).toEqual([
        {type: 'square', coords: [{x: 1, y: 1, text: undefined}]},
      ])
    })

    it('keeps label text', () => {
      const node = new GameNode()
      node.addMarkup(1, 1, {type: 'label', text: 'A'})
      expect(node.markup[0].coords[0].text).toBe('A')
    })

    it('drops an entry once its last coordinate goes', () => {
      const node = new GameNode()
      node.addMarkup(1, 1, {type: 'circle'})
      node.addMarkup(2, 2, {type: 'square'})
      node.removeMarkup(1, 1)
      expect(node.markup).toEqual([
        {type: 'square', coords: [{x: 2, y: 2, text: undefined}]},
      ])
    })

    it('stops reporting markup instructions once the last one goes', () => {
      const node = new GameNode()
      node.addMarkup(1, 1, {type: 'circle'})
      node.removeMarkup(1, 1)
      expect(node.markup).toBeUndefined()
      expect(node.hasMarkupInstructions()).toBe(false)
    })

    it('removes all markup instructions', () => {
      const node = new GameNode()
      node.addMarkup(1, 1, {type: 'circle'})
      node.removeAllMarkupInstructions()
      expect(node.hasMarkupInstructions()).toBe(false)
    })
  })

  describe('setup', () => {

    it('adds setup grouped by type', () => {
      const node = new GameNode()
      node.addSetup(1, 1, {type: BLACK})
      node.addSetup(2, 2, {type: BLACK})
      node.addSetup(3, 3, {type: WHITE})

      expect(node.setup).toHaveLength(2)
      expect(node.hasSetup(1, 1)).toBe(true)
      expect(node.hasSetup(9, 9)).toBe(false)
    })

    it('replaces setup on the same coordinate', () => {
      const node = new GameNode()
      node.addSetup(1, 1, {type: BLACK})
      node.addSetup(1, 1, {type: setupTypes.CLEAR})

      expect(node.setup).toEqual([
        {type: setupTypes.CLEAR, coords: [{x: 1, y: 1}]},
      ])
    })

    it('creates a child node when adding setup to a move node', () => {
      const node = move(0, 0)
      const index = node.addSetup(1, 1, {type: WHITE})

      expect(index).toBe(0)
      expect(node.getChild(0).hasSetup(1, 1)).toBe(true)
    })
  })

  describe('comments and lines', () => {

    it('wraps a bare comment in an array', () => {
      const node = new GameNode()
      node.setComments('Hello')
      expect(node.getComments()).toEqual(['Hello'])
      expect(node.hasComments()).toBe(true)
    })

    it('treats an empty comment as none', () => {
      const node = new GameNode()
      node.setComments('')
      expect(node.getComments()).toEqual([])
      expect(node.hasComments()).toBe(false)
    })

    it('adds and removes lines', () => {
      const node = new GameNode()
      expect(node.hasLines()).toBe(false)

      node.addLine(0, 0, 1, 1, '#fff')
      expect(node.hasLines()).toBe(true)

      node.removeLines()
      expect(node.hasLines()).toBe(false)
    })
  })

  describe('searching', () => {

    it('finds a named node', () => {
      const {root, c} = createTree()
      c.name = 'Target'
      expect(root.findNamedNode('Target')).toBe(c)
      expect(root.findNamedNode('Missing')).toBeUndefined()
    })

    it('finds a node by reference', () => {
      const {root, b} = createTree()
      expect(root.findNode(b)).toBe(b)
      expect(root.findNode(new GameNode())).toBeUndefined()
    })
  })

  describe('instructions', () => {

    it('reports whether a node carries anything at all', () => {
      expect(new GameNode().hasInstructions()).toBe(false)
      expect(move(0, 0).hasInstructions()).toBe(true)

      const withTurn = new GameNode({turn: WHITE})
      expect(withTurn.hasTurnInstructions()).toBe(true)
      expect(withTurn.hasInstructions()).toBe(true)
    })
  })
})

describe('Root node tracking through the tree', () => {

  it('gives every descendant the root of the tree it is attached to', () => {
    const {root, a, b} = createTree()
    expect(a.getRoot()).toBe(root)
    expect(b.getRoot()).toBe(root)
  })

  it('carries the root down to a grafted subtree', () => {
    const root = new GameNode()
    const a = move(0, 0)
    const b = move(1, 1, WHITE)
    b.appendToParent(a)

    //a still stands alone, so it is its own root and so is everything below it
    expect(b.getRoot()).toBe(a)

    a.appendToParent(root)
    expect(b.getRoot()).toBe(root)
  })

  it('releases a detached subtree from the old root', () => {
    const {root, a, b} = createTree()
    a.detachFromParent()

    expect(a.getRoot()).toBe(a)
    expect(a.isRoot()).toBe(true)
    expect(b.getRoot()).toBe(a)
    expect(b.getRoot()).not.toBe(root)
  })

  it('re-roots a subtree moved between trees', () => {
    const {a, b} = createTree()
    const otherRoot = new GameNode()

    a.appendToParent(otherRoot)
    expect(a.getRoot()).toBe(otherRoot)
    expect(b.getRoot()).toBe(otherRoot)
  })

  it('reaches more than one level down', () => {
    const root = new GameNode()
    const a = move(0, 0)
    const b = move(1, 1, WHITE)
    const c = move(2, 2)
    c.appendToParent(b)
    b.appendToParent(a)

    a.appendToParent(root)
    expect(c.getRoot()).toBe(root)
  })
})

describe('GameNode setup instructions', () => {

  it('stops reporting setup instructions once the last one goes', () => {

    //NOTE: an empty array still counts as having setup instructions, so
    //leaving one behind made a node that had all its setup removed go on
    //claiming it had some
    const node = new GameNode()
    node.addSetup(1, 1, {type: 'black'})
    node.removeSetup(1, 1)

    expect(node.setup).toBeUndefined()
    expect(node.hasSetupInstructions()).toBe(false)
    expect(node.hasInstructions()).toBe(false)
  })

  it('keeps the remaining entries when one of several goes', () => {
    const node = new GameNode()
    node.addSetup(1, 1, {type: 'black'})
    node.addSetup(2, 2, {type: 'white'})
    node.removeSetup(1, 1)

    expect(node.setup).toEqual([{type: 'white', coords: [{x: 2, y: 2}]}])
    expect(node.hasSetupInstructions()).toBe(true)
  })
})

describe('GameNode.isPath', () => {

  /**
   * A root with a main line of two nodes and a variation next to it
   */
  const createTree = () => {
    const root = new GameNode()
    const main = new GameNode()
    const variation = new GameNode()
    const leaf = new GameNode()
    main.appendToParent(root)
    variation.appendToParent(root)
    leaf.appendToParent(main)
    return {root, main, variation, leaf}
  }

  it('is true along the chain of path indices', () => {

    //NOTE: this is computed from the path indices when read, rather than
    //maintained as a flag by every navigation operation, so there is no
    //marking step for anything to forget
    const {root, main, variation, leaf} = createTree()

    expect(root.isPath).toBe(true)
    expect(main.isPath).toBe(true)
    expect(leaf.isPath).toBe(true)
    expect(variation.isPath).toBe(false)
  })

  it('follows a path index change as it is made', () => {
    const {root, main, variation, leaf} = createTree()
    root.setPathIndex(1)

    expect(variation.isPath).toBe(true)
    expect(main.isPath).toBe(false)
    expect(leaf.isPath).toBe(false)
  })

  it('is true on a lone root', () => {
    expect(new GameNode().isPath).toBe(true)
  })
})
