import PlayerMode from '../player-mode.js'
import {playerModes, playerTools} from '../../constants/player.js'

/**
 * Solve puzzles in this mode
 */
export default class PlayerModeSolve extends PlayerMode {

  //Mode type
  mode = playerModes.SOLVE

  //Available tools in this mode
  availableTools = [
    playerTools.NONE,
    playerTools.MOVE,
  ]

  //Set default tool
  defaultTool = playerTools.MOVE
}
