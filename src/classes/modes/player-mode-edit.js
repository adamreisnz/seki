import PlayerMode from '../player-mode.js'
import {aCharUc, aCharLc} from '../../constants/common.js'
import {markupTypes} from '../../constants/markup.js'
import {stoneColors} from '../../constants/stone.js'
import {
  playerActions,
  playerModes,
  playerTools,
  markupTools,
  setupTools,
} from '../../constants/player.js'

/**
 * This mode lets you edit a single position
 */
export default class PlayerModeEdit extends PlayerMode {

  //Mode type
  mode = playerModes.EDIT

  //Available tools in this mode
  availableTools = [
    playerTools.NONE,
    playerTools.SETUP,
    playerTools.MARKUP,
  ]

  //Set default tool
  defaultTool = playerTools.SETUP

  //Default markup and setup tools
  markupTool = markupTools.TRIANGLE
  setupTool = setupTools.BLACK

  //Used markup labels
  usedMarkupLabels = []

  //Track hover coordinates so we can update the hover object
  currentHoverGrid

  /**
   * Constructor
   */
  constructor(player) {

    //Parent method
    super(player)

    //Extend player
    this.extendPlayer()

    //Create bound event listeners
    this.createBoundListeners({
      keydown: 'onKeyDown',
      click: 'onClick',
      gridEnter: 'onGridEnter',
      gridLeave: 'onGridLeave',
    })
  }

  /**
   * Extend the player with new methods
   */
  extendPlayer() {

    //Get data
    const {player, mode} = this

    //Extend player
    player.extend('switchMarkupTool', mode)
    player.extend('switchSetupTool', mode)
  }

  /**
   * Activate this mode
   */
  activate() {

    //Parent method
    super.activate()

    //Find used markup labels
    this.resetUsedMarkupLabels()
    this.findUsedMarkupLabels()
  }

  /**************************************************************************
   * Event listeners
   ***/

  /**
   * Keydown events
   */
  onKeyDown(event) {

    //Get data
    const {player} = this
    const {keyCode} = event.detail.nativeEvent
    const action = player.getActionForKeyCode(keyCode)

    //Process action
    this.processAction(action, event)
  }

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
  }

  /**
   * On grid enter
   */
  onGridEnter(event) {

    //Track coordinates
    this.currentHoverGrid = event.detail

    //Show hover markup or stone
    this.showHoverMarkup()
    this.showHoverStone()
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
   * Process a bound action
   */
  processAction(action, event) {

    //No action
    if (!action) {
      return
    }

    //Debug
    this.debug(`🎯 action ${action}`)

    //Get data
    const {player} = this
    const {nativeEvent} = event.detail

    //Prevent default
    nativeEvent.preventDefault()

    //Determine action
    switch (action) {

      //Setup tool actions
      case playerActions.SELECT_BLACK_SETUP_TOOL:
        this.switchSetupTool(setupTools.BLACK)
        break
      case playerActions.SELECT_WHITE_SETUP_TOOL:
        this.switchSetupTool(setupTools.WHITE)
        break

      //Shared between setup and markup tools
      case playerActions.SELECT_CLEAR_TOOL:
        if (player.isToolActive(playerTools.SETUP)) {
          this.switchSetupTool(setupTools.CLEAR)
        }
        else if (player.isToolActive(playerTools.MARKUP)) {
          this.switchMarkupTool(markupTools.CLEAR)
        }
        break

      //Markup tool actions
      case playerActions.SELECT_TRIANGLE_MARKUP_TOOL:
        this.switchMarkupTool(markupTools.TRIANGLE)
        break
      case playerActions.SELECT_CIRCLE_MARKUP_TOOL:
        this.switchMarkupTool(markupTools.CIRCLE)
        break
      case playerActions.SELECT_SQUARE_MARKUP_TOOL:
        this.switchMarkupTool(markupTools.SQUARE)
        break
      case playerActions.SELECT_DIAMOND_MARKUP_TOOL:
        this.switchMarkupTool(markupTools.DIAMOND)
        break
      case playerActions.SELECT_MARK_MARKUP_TOOL:
        this.switchMarkupTool(markupTools.MARK)
        break
      case playerActions.SELECT_HAPPY_MARKUP_TOOL:
        this.switchMarkupTool(markupTools.HAPPY)
        break
      case playerActions.SELECT_SAD_MARKUP_TOOL:
        this.switchMarkupTool(markupTools.SAD)
        break
      case playerActions.SELECT_LETTER_MARKUP_TOOL:
        this.switchMarkupTool(markupTools.LETTER)
        break
      case playerActions.SELECT_NUMBER_MARKUP_TOOL:
        this.switchMarkupTool(markupTools.NUMBER)
        break
    }
  }

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
    this.showHoverMarkup()
  }

  /**
   * Switch setup tool to use
   */
  switchSetupTool(setupTool) {
    this.player.switchTool(playerTools.SETUP)
    this.setupTool = setupTool
    this.debug(`${setupTool} setup tool activated`)
    this.showHoverStone()
  }

  /**
   * Show hover stone
   */
  showHoverStone() {

    //Check if anything to do
    const {player, setupTool, currentHoverGrid} = this
    if (!currentHoverGrid || !player.isToolActive(playerTools.SETUP)) {
      return
    }

    //Get data
    const {x, y} = currentHoverGrid
    const color = this.getColorForSetupTool(setupTool)
    if (!color) {
      return
    }

    //Parent method
    super.showHoverStone(x, y, color)
  }

  /**
   * Show hover markup
   */
  showHoverMarkup() {

    //Check if anything to do
    const {player, markupTool, currentHoverGrid} = this
    if (!currentHoverGrid || !player.isToolActive(playerTools.MARKUP)) {
      return
    }

    //Get details
    const {x, y} = currentHoverGrid
    const type = this.getTypeForMarkupTool(markupTool)
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
   * Find all the used markup labels in current position
   */
  findUsedMarkupLabels() {

    //Get data
    const {game, usedMarkupLabels} = this
    const markup = game.position.markup.getAll()

    //Filter function
    const isLabel = (entry) =>
      entry.value.type === markupTypes.LABEL &&
      entry.value.text

    //Loop
    markup
      .filter(isLabel)
      .forEach(item => usedMarkupLabels.push(item.value.text))
  }

  /**
   * Reset used markup labels
   */
  resetUsedMarkupLabels() {
    this.usedMarkupLabels = []
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
