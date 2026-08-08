import {describe, it, expect} from 'vitest'
import {Outcome, ValidOutcome, ErrorOutcome} from './outcomes.js'

describe('ValidOutcome', () => {

  it('is valid', () => {
    expect(new ValidOutcome().isValid).toBe(true)
  })

  it('carries a payload when given one', () => {
    expect(new ValidOutcome({x: 1}).payload).toEqual({x: 1})
  })

  it('has no payload otherwise', () => {
    expect(new ValidOutcome().payload).toBeUndefined()
  })

  it('is an outcome', () => {
    expect(new ValidOutcome()).toBeInstanceOf(Outcome)
  })
})

describe('ErrorOutcome', () => {

  it('is not valid', () => {
    expect(new ErrorOutcome().isValid).toBe(false)
  })

  it('carries the reason it was given', () => {
    expect(new ErrorOutcome('Out of bounds').reason).toBe('Out of bounds')
  })

  it('says so when it has no reason', () => {
    expect(new ErrorOutcome().reason).toBe('No reason provided')
  })

  it('is an outcome', () => {
    expect(new ErrorOutcome()).toBeInstanceOf(Outcome)
  })
})

describe('Destructuring an outcome', () => {

  it('works for the shape callers rely on', () => {
    const {isValid: valid} = new ValidOutcome()
    const {isValid: invalid, reason} = new ErrorOutcome('Nope')

    expect(valid).toBe(true)
    expect(invalid).toBe(false)
    expect(reason).toBe('Nope')
  })
})
