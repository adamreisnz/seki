import {describe, it, expect} from 'vitest'
import GamePath from './game-path.js'

describe('GamePath', () => {

  describe('advancing and retreating', () => {

    it('starts at depth zero with no branches', () => {
      const path = new GamePath()
      expect(path.getDepth()).toBe(0)
      expect(path.branches).toBe(0)
    })

    it('counts nodes as it advances', () => {
      const path = new GamePath()
      path.advance(0)
      path.advance(0)
      expect(path.getDepth()).toBe(2)
    })

    it('does not retreat past the start', () => {
      const path = new GamePath()
      path.retreat()
      expect(path.getDepth()).toBe(0)
    })

    it('comes back to where it started', () => {
      const path = new GamePath()
      path.advance(0)
      path.retreat()
      expect(path.getDepth()).toBe(0)
    })
  })

  describe('remembering branch choices', () => {

    it('ignores the main line, which is index zero', () => {
      const path = new GamePath()
      path.advance(0)
      expect(path.branches).toBe(0)
      expect(path.indexAtDepth(0)).toBe(0)
    })

    it('remembers a choice off the main line', () => {
      const path = new GamePath()
      path.advance(2)
      expect(path.branches).toBe(1)
      expect(path.indexAtDepth(0)).toBe(2)
    })

    //NOTE: forgetting choices on retreat, and the interaction between
    //setMove and stored choices, are covered by the choice bookkeeping block
    //at the bottom of this file

    it('defaults to the main line for depths it knows nothing about', () => {
      expect(new GamePath().indexAtDepth(7)).toBe(0)
    })

    it('reports the choice at the current depth', () => {
      const path = new GamePath()
      path.advance(0)
      path.advance(3)
      path.retreat()
      path.advance(3)
      expect(path.currentIndex()).toBeUndefined()
    })
  })

  describe('jumping to a depth', () => {

    it('sets the depth directly', () => {
      const path = new GamePath()
      path.setDepth(10)
      expect(path.getDepth()).toBe(10)
    })

    it('leaves choices alone when jumping forward', () => {
      const path = new GamePath()
      path.advance(2)
      path.setDepth(5)

      expect(path.indexAtDepth(0)).toBe(2)
      expect(path.branches).toBe(1)
    })
  })

  describe('resetting', () => {

    it('clears everything', () => {
      const path = new GamePath()
      path.advance(2)
      path.reset()

      expect(path.getDepth()).toBe(0)
      expect(path.branches).toBe(0)
      expect(path.indexAtDepth(0)).toBe(0)
    })
  })

  describe('comparison', () => {

    it('matches an identical path', () => {
      const a = new GamePath()
      const b = new GamePath()
      a.advance(1)
      b.advance(1)
      expect(a.isSameAs(b)).toBe(true)
    })

    it('does not match a different depth', () => {
      const a = new GamePath()
      const b = new GamePath()
      a.advance(0)
      expect(a.isSameAs(b)).toBe(false)
    })

    it('does not match a different branch choice', () => {
      const a = new GamePath()
      const b = new GamePath()
      a.advance(1)
      b.advance(2)
      expect(a.isSameAs(b)).toBe(false)
    })

    it('is false against nothing', () => {
      expect(new GamePath().isSameAs(null)).toBe(false)
    })

    it('rejects something that is not a path', () => {
      expect(() => new GamePath().isSameAs({depth: 0}))
        .toThrow('Not a GamePath object')
    })
  })

  describe('serialisation', () => {

    it('refuses an object with no depth on it', () => {

      //A path serialised by seki 6 named this moveNo. Building from it left
      //the depth undefined, which walked nowhere and rewound the board to the
      //start without saying anything
      expect(() => GamePath.fromObject({moveNo: 2, branches: 0, path: {}}))
        .toThrow('Not a valid game path object')
    })

    it('refuses an object with no path on it', () => {
      expect(() => GamePath.fromObject({depth: 2, branches: 0}))
        .toThrow('Not a valid game path object')
    })

    it('refuses nothing at all', () => {
      expect(() => GamePath.fromObject(null))
        .toThrow('Not a valid game path object')
      expect(() => GamePath.fromObject(undefined))
        .toThrow('Not a valid game path object')
    })

    it('takes an object with no branches count as having none', () => {
      const path = GamePath.fromObject({depth: 2, path: {}})
      expect(path.getDepth()).toBe(2)
      expect(path.branches).toBe(0)
    })

    it('round trips through a plain object', () => {
      const path = new GamePath()
      path.advance(0)
      path.advance(2)

      const restored = GamePath.fromObject(path.toObject())
      expect(restored.isSameAs(path)).toBe(true)
    })

    it('produces a plain object, not a live reference', () => {
      const path = new GamePath()
      path.advance(2)

      const object = path.toObject()
      object.path[0] = 99

      expect(path.indexAtDepth(0)).toBe(2)
    })

    it('clones without sharing state', () => {
      const path = new GamePath()
      path.advance(2)

      const clone = path.clone()
      clone.advance(1)

      expect(path.getDepth()).toBe(1)
      expect(clone.getDepth()).toBe(2)
    })
  })
})

describe('GamePath choice bookkeeping', () => {

  it('forgets a branch choice when retreating past it', () => {
    const path = new GamePath()
    path.advance(2)
    path.retreat()

    expect(path.branches).toBe(0)
    expect(path.indexAtDepth(0)).toBe(0)
  })

  it('forgets the right choice when several nodes deep', () => {
    const path = new GamePath()
    path.advance(0)
    path.advance(3)
    path.advance(0)

    path.retreat()
    expect(path.indexAtDepth(1)).toBe(3)

    path.retreat()
    expect(path.indexAtDepth(1)).toBe(0)
    expect(path.branches).toBe(0)
  })

  it('keeps choices below the point retreated to', () => {
    const path = new GamePath()
    path.advance(2)
    path.advance(3)
    path.retreat()

    expect(path.indexAtDepth(0)).toBe(2)
    expect(path.branches).toBe(1)
  })

  it('drops the choice at the depth jumped back to', () => {
    const path = new GamePath()
    path.advance(0)
    path.advance(2)
    path.advance(0)

    path.setDepth(1)
    expect(path.indexAtDepth(1)).toBe(0)
    expect(path.branches).toBe(0)
  })

  it('keeps choices below the depth jumped back to', () => {
    const path = new GamePath()
    path.advance(2)
    path.advance(3)

    path.setDepth(1)
    expect(path.indexAtDepth(0)).toBe(2)
    expect(path.branches).toBe(1)
  })

  it('comes back to a clean path after advancing and retreating', () => {
    const path = new GamePath()
    const fresh = new GamePath()

    path.advance(1)
    path.advance(2)
    path.retreat()
    path.retreat()

    expect(path.isSameAs(fresh)).toBe(true)
  })
})
