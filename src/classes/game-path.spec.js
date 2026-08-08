import {describe, it, expect} from 'vitest'
import GamePath from './game-path.js'

describe('GamePath choice bookkeeping', () => {

  it('forgets a branch choice when retreating past it', () => {
    const path = new GamePath()
    path.advance(2)
    path.retreat()

    expect(path.branches).toBe(0)
    expect(path.indexAtMove(0)).toBe(0)
  })

  it('forgets the right choice when several moves deep', () => {
    const path = new GamePath()
    path.advance(0)
    path.advance(3)
    path.advance(0)

    path.retreat()
    expect(path.indexAtMove(1)).toBe(3)

    path.retreat()
    expect(path.indexAtMove(1)).toBe(0)
    expect(path.branches).toBe(0)
  })

  it('keeps choices below the point retreated to', () => {
    const path = new GamePath()
    path.advance(2)
    path.advance(3)
    path.retreat()

    expect(path.indexAtMove(0)).toBe(2)
    expect(path.branches).toBe(1)
  })

  it('drops the choice at the move jumped back to', () => {
    const path = new GamePath()
    path.advance(0)
    path.advance(2)
    path.advance(0)

    path.setMove(1)
    expect(path.indexAtMove(1)).toBe(0)
    expect(path.branches).toBe(0)
  })

  it('keeps choices below the move jumped back to', () => {
    const path = new GamePath()
    path.advance(2)
    path.advance(3)

    path.setMove(1)
    expect(path.indexAtMove(0)).toBe(2)
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
