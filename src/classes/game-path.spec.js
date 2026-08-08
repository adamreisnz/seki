import {describe, it, expect} from 'vitest'
import GamePath from './game-path.js'

describe('GamePath', () => {

  describe('advancing and retreating', () => {

    it('starts at move zero with no branches', () => {
      const path = new GamePath()
      expect(path.getMoveNumber()).toBe(0)
      expect(path.branches).toBe(0)
    })

    it('counts moves as it advances', () => {
      const path = new GamePath()
      path.advance(0)
      path.advance(0)
      expect(path.getMoveNumber()).toBe(2)
    })

    it('does not retreat past the start', () => {
      const path = new GamePath()
      path.retreat()
      expect(path.getMoveNumber()).toBe(0)
    })

    it('comes back to where it started', () => {
      const path = new GamePath()
      path.advance(0)
      path.retreat()
      expect(path.getMoveNumber()).toBe(0)
    })
  })

  describe('remembering branch choices', () => {

    it('ignores the main line, which is index zero', () => {
      const path = new GamePath()
      path.advance(0)
      expect(path.branches).toBe(0)
      expect(path.indexAtMove(0)).toBe(0)
    })

    it('remembers a choice off the main line', () => {
      const path = new GamePath()
      path.advance(2)
      expect(path.branches).toBe(1)
      expect(path.indexAtMove(0)).toBe(2)
    })

    //NOTE: forgetting choices on retreat, and the interaction between
    //setMove and stored choices, are covered in game-path-choices.spec.js

    it('defaults to the main line for moves it knows nothing about', () => {
      expect(new GamePath().indexAtMove(7)).toBe(0)
    })

    it('reports the choice at the current move', () => {
      const path = new GamePath()
      path.advance(0)
      path.advance(3)
      path.retreat()
      path.advance(3)
      expect(path.currentIndex()).toBeUndefined()
    })
  })

  describe('jumping to a move number', () => {

    it('sets the move number directly', () => {
      const path = new GamePath()
      path.setMove(10)
      expect(path.getMoveNumber()).toBe(10)
    })

    it('leaves choices alone when jumping forward', () => {
      const path = new GamePath()
      path.advance(2)
      path.setMove(5)

      expect(path.indexAtMove(0)).toBe(2)
      expect(path.branches).toBe(1)
    })
  })

  describe('resetting', () => {

    it('clears everything', () => {
      const path = new GamePath()
      path.advance(2)
      path.reset()

      expect(path.getMoveNumber()).toBe(0)
      expect(path.branches).toBe(0)
      expect(path.indexAtMove(0)).toBe(0)
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

    it('does not match a different move number', () => {
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
      expect(() => new GamePath().isSameAs({moveNo: 0}))
        .toThrow('Not a GamePath object')
    })
  })

  describe('serialisation', () => {

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

      expect(path.indexAtMove(0)).toBe(2)
    })

    it('clones without sharing state', () => {
      const path = new GamePath()
      path.advance(2)

      const clone = path.clone()
      clone.advance(1)

      expect(path.getMoveNumber()).toBe(1)
      expect(clone.getMoveNumber()).toBe(2)
    })
  })
})
