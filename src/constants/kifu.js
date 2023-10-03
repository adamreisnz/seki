import {stoneColors, gameTypes} from './jgf.js'
import {appName, appVersion} from './app.js'

/**
 * Blank JGF
 */
export const blankJgf = {
  record: {
    application: `${appName} v${appVersion}`,
    version: 1,
    charset: 'UTF-8',
  },
  game: {
    type: gameTypes.GO,
    players: [
      {
        color: stoneColors.BLACK,
        name: 'Black',
      },
      {
        color: stoneColors.WHITE,
        name: 'White',
      },
    ],
  },
  board: {
    width: 19,
    height: 19,
  },
  tree: [],
}

/**
 * Blank SGF
 */
export const blankSgf = {
  AP: `${appName} v${appVersion}`,
  CA: 'UTF-8',
  FF: '4',
  GM: '1',
  SZ: '19',
  PB: 'Black',
  PW: 'White',
}
