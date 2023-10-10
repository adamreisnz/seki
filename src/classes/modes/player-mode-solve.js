import PlayerMode from './player-mode.js'
import {playerModes} from '../../constants/player.js'

/**
 * Solve puzzles in this mode
 */
export default class PlayerModeSolve extends PlayerMode {

  //Mode type
  mode = playerModes.SOLVE
}
