import PlayerMode from '../player-mode.js'
import {playerModes, playerTools} from '../../constants/player.js'

/**
 * Edit mode, go wild!
 */
export default class PlayerModeEdit extends PlayerMode {

  /**
   * Constructor
   */
  constructor(player) {

    //Parent method
    super(player, playerModes.EDIT)

    //Available tools in this mode
    this.availableTools = [
      playerTools.NONE,
      playerTools.MOVE,
      playerTools.SCORE,
      playerTools.SETUP,
      playerTools.MARKUP,
    ]

    //Set default tool
    this.defaultTool = playerTools.MOVE
  }
}
