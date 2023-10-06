import PlayerModeReplay from './player-mode-replay.js'
import {aCharUc, aCharLc} from '../../constants/common.js'
import {markupTypes} from '../../constants/markup.js'
import {boardLayerTypes} from '../../constants/board.js'
import {
  playerModes,
  playerTools,
  markupTools,
  setupTools,
} from '../../constants/player.js'

/**
 * Edit mode, go wild!
 */
export default class PlayerModeEdit extends PlayerModeReplay {

  //Mode type
  mode = playerModes.EDIT

  //Available tools in this mode
  availableTools = [
    playerTools.NONE,
    playerTools.MOVE,
    playerTools.SCORE,
    playerTools.MARKUP,
    playerTools.SETUP,
  ]

  //Set default tool
  defaultTool = playerTools.MOVE

  //Default markup and setup tools
  markupTool = markupTools.TRIANGLE
  setupTool = setupTools.BLACK

  //Used markup labels
  usedMarkupLabels = []

  /**
   * Constructor
   */
  constructor(player) {

    //Parent method
    super(player)

    //Extend player
    this.extendPlayerForEdit()
  }

  /**
   * Extend the player with new methods
   */
  extendPlayerForEdit() {

    //Get data
    const {player, mode} = this

    //Extend player
    player.extend('switchMarkupTool', mode)
    player.extend('switchSetupTool', mode)
  }

  /**************************************************************************
   * Event listeners
   ***/

  /**
   * Click handler
   */
  onClick(event) {

    //Get data
    const {player, board} = this
    const {x, y} = event.detail

    //Debug
    this.debug(`click event at (${x},${y})`)

    //Did the click fall outside of the board grid?
    if (!board || !board.isOnBoard(x, y)) {
      this.debug(`position (${x},${y}) is outside of board grid`)
      return
    }

    //Clear hover layer
    this.clearHoverLayer()

    //Markup tool active
    if (player.isToolActive(playerTools.MARKUP)) {
      this.setMarkup(x, y)
    }

    //Markup tool active
    else if (player.isToolActive(playerTools.SETUP)) {
      this.setSetup(x, y)
    }

    //Parent handler
    else {
      super.onClick(event)
    }
  }

  /**************************************************************************
   * Actions
   ***/

  /**
   * Set markup
   */
  setMarkup(x, y) {

    //Get data
    const {player, game, markupTool, usedMarkupLabels} = this

    //Debug
    this.debug(`setting markup ${markupTool} at (${x},${y})`)

    //Already markup in place? Remove it first
    if (game.hasMarkup(x, y)) {

      //Check what markup there is
      const markup = game.getMarkup(x, y)

      //Label? Also remove from our labels list
      if (markup.type === markupTypes.LABEL && markup.text) {
        const i = usedMarkupLabels.indexOf(markup.text)
        if (i !== -1) {
          usedMarkupLabels.splice(i, 1)
        }
      }

      //Remove markup
      game.removeMarkup(x, y)

      //Was existing markup of the same type?
      if (
        markup.type === markupTool ||
        (
          markup.type === markupTypes.LABEL &&
          [markupTools.LETTER, markupTools.NUMBER].includes(markupTool)
        )) {
        player.processPosition()
        return
      }
    }

    //Clear tool used? Done
    if (markupTool === markupTools.CLEAR) {
      //Fall through
    }

    //Letter
    else if (markupTool === markupTools.LETTER) {
      game.addMarkup(x, y, {
        type: markupTypes.LABEL,
        text: this.getNextLetter(),
      })
    }

    //Number
    else if (markupTool === markupTools.NUMBER) {
      game.addMarkup(x, y, {
        type: markupTypes.LABEL,
        text: this.getNextNumber(),
      })
    }

    //Other markup, safe to add as is
    else {
      game.addMarkup(x, y, {type: markupTool})
    }

    //Process position
    player.processPosition()
  }

  /**
   * Set setup
   */
  setSetup(x, y, isDrag) {

    //Get data
    const {game, board, setupTool} = this

    //Clear
    if (setupTool === setupTools.CLEAR) {
      game.removeStone(x, y)
    }

    //Adding a stone
    else {

      //The color is the tool
      const color = setupTool

      //A stone there already of the same color? Just remove if not dragging
      if (!isDrag && game.hasStone(x, y, color)) {
        game.removeStone(x, y)
        return
      }

      //Any stone present?
      else if (game.hasStone(x, y)) {
        game.removeStone(x, y)
      }

      //Add stone now
      game.addStone(x, y, color)
    }

    //Redraw markup
    board.redrawCell(boardLayerTypes.MARKUP, x, y)
  }

  /**
   * Switch markup tool to use
   */
  switchMarkupTool(markupTool) {
    this.player.switchTool(playerTools.MARKUP)
    this.markupTool = markupTool
    this.debug(`${markupTool} markup tool activated`)
  }

  /**
   * Switch setup tool to use
   */
  switchSetupTool(setupTool) {
    this.player.switchTool(playerTools.SETUP)
    this.setupTool = setupTool
    this.debug(`${setupTool} setup tool activated`)
  }

  /**************************************************************************
   * Helpers
   ***/

  /**
   * Determine the next letter for markup label text
   */
  getNextLetter() {

    //Get data
    const {usedMarkupLabels} = this

    //Initialise
    let i = 0
    let text = ''

    //Loop while the label is present
    while (!text || usedMarkupLabels.includes(text)) {

      //A-Z
      if (i < 26) {
        text = String.fromCharCode(aCharUc + i)
      }

      //a-z
      else if (i < 52) {
        text = String.fromCharCode(aCharLc + i - 26)
      }

      //AA, AB, AC, etc.
      else {
        text = String.fromCharCode(aCharUc + Math.floor(i / 26) - 2) +
          String.fromCharCode(aCharUc + (i % 26))
      }

      //Keep going
      i++
    }

    //Flag as used
    usedMarkupLabels.push(text)

    //Return text
    return text
  }

  /**
   * Determine the next number for markup label text
   */
  getNextNumber() {

    //Get data
    const {usedMarkupLabels} = this

    //Initialise
    let num = 0
    let text = ''

    //Loop while the label is present
    while (text === '' || usedMarkupLabels.includes(text)) {
      num++
      text = String(num)
    }

    //Flag as used
    usedMarkupLabels.push(text)

    //Return
    return text
  }
}
