import PlayerModeStatic from './modes/player-mode-static.js'
import PlayerModePlay from './modes/player-mode-play.js'
import PlayerModeReplay from './modes/player-mode-replay.js'
import PlayerModeEdit from './modes/player-mode-edit.js'
import PlayerModeSolve from './modes/player-mode-solve.js'
import {playerModes} from '../constants/player.js'

/**
 * Stone factory class
 */
export default class PlayerModeFactory {

  /**
   * Get pl;ayer mode class to use
   */
  static getClass(mode) {
    switch (mode) {
      case playerModes.PLAY:
        return PlayerModePlay
      case playerModes.REPLAY:
        return PlayerModeReplay
      case playerModes.EDIT:
        return PlayerModeEdit
      case playerModes.SOLVE:
        return PlayerModeSolve
      case playerModes.STATIC:
        return PlayerModeStatic
      default:
        throw new Error(`Unrecognized player mode: ${mode}`)
    }
  }

  /**
   * Create player mode instance
   */
  static create(mode, ...args) {
    const PlayerModeClass = this.getClass(mode)
    return new PlayerModeClass(...args)
  }
}
