import {describe, it, expect} from 'vitest'
import Game from '../classes/game.js'
import ConvertToSgf from '../classes/converters/convert-to-sgf.js'
import {appVersion, appName, appIdentifier, kifuFormats} from './app.js'
import {version as packageVersion, name as packageName} from '../../package.json' with {type: 'json'}

describe('app constants', () => {

  it('keeps appVersion in step with the package version', () => {
    expect(appVersion).toBe(packageVersion)
  })

  it('keeps appIdentifier in step with the package name', () => {
    expect(appIdentifier).toBe(packageName)
  })

  it('is used for the generator signature in exported SGF', () => {
    const sgf = new ConvertToSgf().convert(new Game())
    expect(sgf).toContain(`AP[${appName} v${packageVersion}]`)
  })

  it('lists the supported kifu formats', () => {
    expect(kifuFormats)
      .toEqual({JGF: 'jgf', SGF: 'sgf', GIB: 'gib', NGF: 'ngf'})
  })
})
