import PlayerMode from './player-mode.js'
import {playerModes} from '../../constants/player.js'

/**
 * A mode that doesn't allow the player to do anything
 */
export default class PlayerModeStatic extends PlayerMode {

  //Mode type
  mode = playerModes.STATIC
}
