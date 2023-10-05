import PlayerMode from '../player-mode.js'
import {playerModes, playerTools} from '../../constants/player.js'

/**
 * Play a game in this mode
 */
export default class PlayerModePlay extends PlayerMode {

  /**
   * Constructor
   */
  constructor(player) {

    //Parent method
    super(player, playerModes.PLAY)

    //Available tools in this mode
    this.availableTools = [
      playerTools.NONE,
      playerTools.MOVE,
    ]

    //Set default tool
    this.defaultTool = playerTools.MOVE
  }
}
