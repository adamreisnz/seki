import PlayerModeReplay from './player-mode-replay.js'
import {aCharUc, aCharLc} from '../../constants/common.js'
import {markupTypes} from '../../constants/markup.js'
import {stoneColors} from '../../constants/stone.js'
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

    //Create bound event listeners
    this.createBoundListeners({
      keydown: 'onKeyDown',
      click: 'onClick',
      wheel: 'onMouseWheel',
      positionUpdate: 'onPostionUpdate',
      gridEnter: 'onGridEnter',
      gridLeave: 'onGridLeave',
    })
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
    this.clearHover()

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

  /**
   * On grid enter
   */
  onGridEnter(event) {

    //Get data
    const {player} = this

    //Markup tool active
    if (player.isToolActive(playerTools.MARKUP)) {
      this.showHoverMarkup(event)
    }

    //Setup tool active
    else if (player.isToolActive(playerTools.SETUP)) {
      this.showHoverStone(event)
    }
  }

  /**
   * On grid leave
   */
  onGridLeave(event) {

    //Get data
    const {x, y} = event.detail

    //Clear hover and redraw grid cell (for removed markup)
    this.clearHover()
    this.redrawGridCell(x, y)
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
    const type = this.getTypeForMarkupTool(markupTool)

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
      if (markup.type === type) {
        player.processPosition()
        return
      }
    }

    //Not clearing
    if (markupTool !== markupTools.CLEAR) {
      const text = this.getText()
      game.addMarkup(x, y, {type, text})
    }

    //Process position
    player.processPosition()
  }

  /**
   * Set setup
   */
  setSetup(x, y) {

    //Get data
    const {player, game, setupTool} = this
    const color = this.getColorForSetupTool(setupTool)

    //Debug
    this.debug(`setup ${setupTool} at (${x},${y})`)

    //Stone already in place of this same color
    if (color && game.hasStone(x, y, color)) {
      this.debug(`already have ${color} stone at (${x},${y})`)
      return
    }

    //Remove existing stone
    if (game.hasStone(x, y)) {
      game.removeStone(x, y)
    }

    //Add stone unless clear tool was used
    if (setupTool !== setupTools.CLEAR) {
      game.addStone(x, y, color)
    }

    //Process position
    player.processPosition()
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

  /**
   * Show hover stone
   */
  showHoverStone(event) {

    //Get data
    const {setupTool} = this
    const {x, y} = event.detail
    const color = this.getColorForSetupTool(setupTool)

    //No color
    if (!color) {
      return
    }

    //Parent method
    super.showHoverStone(x, y, color)
  }

  /**
   * Show hover markup
   */
  showHoverMarkup(event) {

    //Get data
    const {markupTool} = this
    const {x, y} = event.detail
    const type = this.getTypeForMarkupTool(markupTool)

    //No type
    if (!type) {
      return
    }

    //Parent method
    super.showHoverMarkup(x, y, type)
  }

  /**************************************************************************
   * Helpers
   ***/

  /**
   * Get text for markup
   */
  getText() {
    const {markupTool} = this
    if (markupTool === markupTools.LETTER) {
      return this.getNextLetter()
    }
    else if (markupTool === markupTools.NUMBER) {
      return this.getNextNumber()
    }
  }

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

  /**
   * Get stone color for a given setup type
   */
  getColorForSetupTool(tool) {
    if (tool === setupTools.BLACK) {
      return stoneColors.BLACK
    }
    else if (tool === setupTools.WHITE) {
      return stoneColors.WHITE
    }
  }

  /**
   * Get markup type for a give nmarkup tool
   */
  getTypeForMarkupTool(tool) {
    const label = [
      markupTools.LETTER,
      markupTools.NUMBER,
    ]
    if (label.includes(tool)) {
      return markupTypes.LABEL
    }
    else if (tool !== markupTools.CLEAR) {
      return tool
    }
  }
}
