import PlayerMode from '../player-mode.js'
import {playerModes, playerTools} from '../../constants/player.js'

/**
 * A mode that doesn't allow the player to do anything
 */
export default class PlayerModeStatic extends PlayerMode {

  //Mode type
  mode = playerModes.STATIC

  //Available tools for this mode
  availableTools = [
    playerTools.NONE,
  ]

  //Default tool
  defaultTool = playerTools.NONE
}
