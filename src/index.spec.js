import {describe, it, expect} from 'vitest'
import * as seki from './index.js'
import pkg from '../package.json' with {type: 'json'}

/**
 * Smoke test for the public entry point. This guards against a class being
 * renamed or moved without the barrel file being updated, which would only
 * surface at runtime for consumers.
 */
describe('public API', () => {

  it('exports the core classes', () => {
    expect(seki.SekiPlayer).toBeTypeOf('function')
    expect(seki.SekiBoard).toBeTypeOf('function')
    expect(seki.SekiBoardStatic).toBeTypeOf('function')
    expect(seki.SekiTheme).toBeTypeOf('function')
  })

  it('exports the game related classes', () => {
    expect(seki.SekiGame).toBeTypeOf('function')
    expect(seki.SekiGameNode).toBeTypeOf('function')
    expect(seki.SekiGamePath).toBeTypeOf('function')
    expect(seki.SekiGamePosition).toBeTypeOf('function')
    expect(seki.SekiGameScore).toBeTypeOf('function')
    expect(seki.SekiGameColorScore).toBeTypeOf('function')
    expect(seki.SekiGameScoreState).toBeTypeOf('function')
    expect(seki.SekiGameScoreEstimator).toBeTypeOf('function')
  })

  it('exports the converters', () => {
    expect(seki.SekiConvertFromJgf).toBeTypeOf('function')
    expect(seki.SekiConvertFromSgf).toBeTypeOf('function')
    expect(seki.SekiConvertFromGib).toBeTypeOf('function')
    expect(seki.SekiConvertToJgf).toBeTypeOf('function')
    expect(seki.SekiConvertToSgf).toBeTypeOf('function')
  })

  it('exports the factories', () => {
    expect(seki.SekiBoardLayerFactory).toBeTypeOf('function')
    expect(seki.SekiMarkupFactory).toBeTypeOf('function')
    expect(seki.SekiPlayerModeFactory).toBeTypeOf('function')
    expect(seki.SekiStoneFactory).toBeTypeOf('function')
  })

  it('exports the helper namespaces', () => {
    expect(Object.keys(seki.helpers).sort()).toEqual([
      'color', 'coordinates', 'grid', 'object', 'parsing', 'util',
    ])
  })

  it('exports the constants', () => {
    expect(seki.stoneColors).toEqual({BLACK: 'black', WHITE: 'white'})
    expect(seki.kifuFormats).toEqual({JGF: 'jgf', SGF: 'sgf', GIB: 'gib'})
    expect(seki.playerModes).toBeTypeOf('object')
    expect(seki.markupTypes).toBeTypeOf('object')
    expect(seki.appVersion).toBeTypeOf('string')
  })
})

describe('package manifest', () => {

  it('points its entry point at the barrel file', () => {
    expect(pkg.main).toBe('src/index.js')
    expect(pkg.exports['.']).toBe('./src/index.js')
  })

  it('still allows deep imports through the exports map', () => {

    //Consumers can reach individual classes directly, so adding an exports
    //map must not close that off
    expect(pkg.exports['./src/*']).toBe('./src/*')
  })

  it('exposes package.json, which tooling asks for', () => {
    expect(pkg.exports['./package.json']).toBe('./package.json')
  })

  it('publishes src while excluding the specs that now live in it', () => {
    expect(pkg.files).toContain('src')
    expect(pkg.files).toContain('!src/**/*.spec.js')
  })
})
