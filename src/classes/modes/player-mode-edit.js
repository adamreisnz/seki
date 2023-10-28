import PlayerMode from './player-mode.js'
import {aCharUc, aCharLc} from '../../constants/util.js'
import {markupTypes} from '../../constants/markup.js'
import {stoneColors} from '../../constants/stone.js'
import {
  playerModes,
  editTools,
} from '../../constants/player.js'

/**
 * This mode lets you edit a single position
 */
export default class PlayerModeEdit extends PlayerMode {

  //Mode type
  mode = playerModes.EDIT

  //Set default editing tool
  tool = null

  //Used markup labels
  usedMarkupLabels = []

  //Track current and last gird event detail
  currentGridDetail
  lastGridDetail

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
      mousemove: 'onMouseMove',
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
    player.extend('getEditTool', mode)
    player.extend('setEditTool', mode)
    player.extend('removeAllMarkup', mode)
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

  /**
   * Deactivate this mode
   */
  deactivate() {

    //Parent method
    super.deactivate()

    //Clear edit tool
    this.setEditTool(null)
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
    const {nativeEvent} = event.detail
    const action = player.getActionForKeyDownEvent(nativeEvent)

    //Process action
    if (action) {
      this.processAction(action, event)
    }
  }

  /**
   * Click handler
   */
  onClick(event) {

    //Get data
    const {board} = this

    //Stop free draw
    board.stopFreeDraw()

    //Only process if valid coordinates
    if (!this.hasValidCoordinates(event)) {
      return
    }

    //Clear hover layer
    board.clearHoverLayer()
    this.edit(event)
  }

  /**
   * Mouse move handler
   */
  onMouseMove(event) {

    //Get data
    const {board} = this
    const {nativeEvent, isDragging} = event.detail

    //Only process if dragging and using free draw tool
    if (!isDragging || !this.isUsingDrawTool()) {
      return
    }

    //Draw directly on drawing layer
    const {offsetX, offsetY} = nativeEvent
    board.freeDraw(offsetX, offsetY)
  }

  /**
   * On grid enter
   */
  onGridEnter(event) {

    //Update grid detail
    this.lastGridDetail = this.currentGridDetail
    this.currentGridDetail = event.detail

    //Get event data
    const {isDragging} = event.detail

    //Check if valid coordinates
    if (!this.hasValidCoordinates(event)) {
      return
    }

    //Show eraser always
    this.showHoverEraser()

    //Dragging? Use edit tool
    if (isDragging) {
      this.edit(event)
      return
    }

    //Otherwise, show hover stuff
    this.showHoverMarkup()
    this.showHoverStone()
  }

  /**
   * On grid leave
   */
  onGridLeave(event) {

    //Check if valid coordinates
    if (!this.hasValidCoordinates(event)) {
      return
    }

    //Get data
    const {board} = this
    const {x, y} = event.detail

    //Clear current grid detail
    this.currentGridDetail = null

    //Using stone tool? Clear whole layer
    if (this.isUsingStoneTool()) {
      board.clearHoverLayer()
    }

    //If markup tool, clear cell to properly redraw grid
    else {
      board.clearHoverCell(x, y)
    }
  }

  /**************************************************************************
   * Actions
   ***/

  /**
   * Edit a position
   */
  edit(event) {

    //Check if valid coordinates
    if (!this.hasValidCoordinates(event)) {
      return
    }

    //Get data
    const {player} = this
    const {x, y, area, isDragging} = event.detail

    //Clear tool
    if (this.isUsingClearTool()) {
      this.eraseCell(x, y)
      this.showHoverEraser()
    }

    //Clear area tool
    else if (this.isUsingClearAreaTool()) {
      this.eraseArea(area)
      // this.showHoverEraser()
    }

    //Markup tool
    else if (this.isUsingMarkupTool()) {
      this.addMarkup(x, y, isDragging)
    }

    //Stone tool
    else if (this.isUsingStoneTool()) {
      this.addStone(x, y, isDragging)
    }

    //Update board position
    player.updateBoardPosition()
  }

  /**
   * Erase cell
   */
  eraseCell(x, y) {

    //Get data
    const {game} = this

    //Erase markup first if it is present
    if (game.hasMarkup(x, y)) {
      this.removeMarkup(x, y)
    }

    //Erase stones otherwise
    else if (game.hasStone(x, y)) {
      this.removeStone(x, y)
    }
  }

  /**
   * Erase area
   */
  eraseArea(area) {

    //Get data
    const {game} = this

    //Loop area, erasing both markup and stones indiscriminantly
    area.forEach(({x, y}) => {
      if (game.hasMarkup(x, y)) {
        this.removeMarkup(x, y)
      }
      if (game.hasStone(x, y)) {
        this.removeStone(x, y)
      }
    })
  }

  /**
   * Add stone
   */
  addStone(x, y, isDragging) {

    //Get data
    const {game} = this
    const color = this.getEditingColor()

    //If not dragging, check if there's an existing stone of same color
    //In that case, removal is enough
    if (!isDragging && game.hasStone(x, y, color)) {
      this.removeStone(x, y)
      return
    }

    //Remove existing stone and add new stone
    this.removeStone(x, y)
    game.addStone(x, y, color)
  }

  /**
   * Remove stone
   */
  removeStone(x, y) {

    //Get data
    const {game, board} = this

    //Remove from game and board
    game.removeStone(x, y)
    board.removeStone(x, y)
  }

  /**
   * Helper to add markup
   */
  addMarkup(x, y, isDragging) {

    //Get data
    const {game} = this
    const type = this.getEditingMarkupType()
    const text = this.getText()

    //If not dragging, check if there's an existing markup of same type
    //In that case, removal is enough
    if (!isDragging && game.hasMarkup(x, y, type)) {
      this.removeMarkup(x, y)
      return
    }

    //Remove existing markup and add new markup
    this.removeMarkup(x, y)
    game.addMarkup(x, y, {type, text})

    //Track used markup label
    this.addUsedMarkupLabel(text)
  }

  /**
   * Remove markup
   */
  removeMarkup(x, y) {

    //Get data
    const {game, board} = this

    //No markup here
    if (!game.hasMarkup(x, y)) {
      return
    }

    //Get markup label
    const markup = game.getMarkup(x, y)
    const {text} = markup

    //Remove used markup label
    if (text) {
      this.removeUsedMarkupLabel(text)
    }

    //Remove from game and board
    game.removeMarkup(x, y)
    board.removeMarkup(x, y)
  }

  /**
   * Remove all markup
   */
  removeAllMarkup() {

    //Get data
    const {game, board} = this

    //Reset used markup labels
    this.resetUsedMarkupLabels()

    //Remove all from game and board
    game.removeAllMarkup()
    board.removeAllMarkup()
    board.eraseDrawLayer()
  }

  /**
   * Get edit tool
   */
  getEditTool() {
    return this.tool
  }

  /**
   * Switch editing tool to use
   */
  setEditTool(tool) {

    //Get data
    const {board, currentGridDetail} = this

    //Special stone tool case
    if (tool === editTools.STONE) {
      if (this.tool === editTools.BLACK) {
        this.tool = editTools.WHITE
      }
      else {
        this.tool = editTools.BLACK
      }
    }
    else {
      this.tool = tool
    }

    //Set tool
    this.debug(`🪛 ${tool} tool activated`)

    //Clear hover layer and redraw grid
    board.clearHoverLayer()

    //Currently over board? Redraw grid cell in case we
    //switched from a markup tool to e.g. stone tool
    if (currentGridDetail) {
      const {x, y} = currentGridDetail
      board.redrawGridCell(x, y)
    }

    //Show hover, in case we're still over the board with mouse and
    //the tool changed via hotkey
    this.showHoverEraser()
    this.showHoverMarkup()
    this.showHoverStone()

    //Trigger event
    this.player.triggerEvent('editToolChange', {tool})
  }

  /**
   * Show hover stone
   */
  showHoverStone() {

    //Check if anything to do
    const {currentGridDetail, game, board} = this
    if (!currentGridDetail) {
      return
    }

    //Get data
    const {x, y} = currentGridDetail
    const color = this.getEditingColor()
    if (!color) {
      return
    }

    //Already have a stone of this color here?
    if (game.hasStone(x, y, color)) {
      return
    }

    //Create hover stone
    const stone = this.createHoverStone(color)

    //Set hover
    board.setHoverCell(x, y, stone)
  }

  /**
   * Show hover markup
   */
  showHoverMarkup() {

    //Check if anything to do
    const {currentGridDetail, board} = this
    if (!currentGridDetail) {
      return
    }

    //Get details
    const {x, y} = currentGridDetail
    const type = this.getEditingMarkupType()
    const text = this.getText()
    if (!type) {
      return
    }

    //Create markup
    const markup = this.createMarkup(type, {text})

    //Set hover
    board.setHoverCell(x, y, markup)
  }

  /**
   * Show hover eraser
   */
  showHoverEraser() {

    //Check if anything to do
    const {currentGridDetail, board} = this
    if (!currentGridDetail || !this.isUsingClearTool()) {
      return
    }

    //Get details
    const {x, y} = currentGridDetail
    const type = markupTypes.MARK

    //Create markup
    const markup = this.createMarkup(type)

    //Set hover
    board.setHoverCell(x, y, markup)
  }

  /**************************************************************************
   * Helpers
   ***/

  /**
   * Get text for markup
   */
  getText() {
    const {tool} = this
    if (tool === editTools.LETTER) {
      return this.getNextLetter()
    }
    else if (tool === editTools.NUMBER) {
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

    //Return
    return text
  }

  /**
   * Add used markup label
   */
  addUsedMarkupLabel(text) {
    if (text) {
      this.usedMarkupLabels.push(text)
    }
  }

  /**
   * Remove used markup label
   */
  removeUsedMarkupLabel(text) {
    if (!text) {
      return
    }
    if (Array.isArray(text)) {
      text.forEach(label => this.removeUsedMarkupLabel(label))
      return
    }
    const {usedMarkupLabels} = this
    const i = usedMarkupLabels.indexOf(text)
    if (i !== -1) {
      usedMarkupLabels.splice(i, 1)
    }
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
   * Check if using markup tool
   */
  isUsingMarkupTool() {
    const {tool} = this
    return [
      editTools.TRIANGLE,
      editTools.CIRCLE,
      editTools.SQUARE,
      editTools.ARROW,
      editTools.DIAMOND,
      editTools.MARK,
      editTools.SELECT,
      editTools.HAPPY,
      editTools.SAD,
      editTools.LETTER,
      editTools.NUMBER,
    ].includes(tool)
  }

  /**
   * Check if using stone tool
   */
  isUsingStoneTool() {
    const {tool} = this
    return [
      editTools.BLACK,
      editTools.WHITE,
    ].includes(tool)
  }

  /**
   * Check if using clear tool
   */
  isUsingClearTool() {
    const {tool} = this
    return tool === editTools.CLEAR
  }

  /**
   * Check if using clear area tool
   */
  isUsingClearAreaTool() {
    const {tool} = this
    return tool === editTools.CLEAR_AREA
  }

  /**
   * Check if using draw tool
   */
  isUsingDrawTool() {
    const {tool} = this
    return tool === editTools.DRAW
  }

  /**
   * Get stone color for a given editing tool
   */
  getEditingColor() {
    const {tool} = this
    if (tool === editTools.BLACK) {
      return stoneColors.BLACK
    }
    else if (tool === editTools.WHITE) {
      return stoneColors.WHITE
    }
  }

  /**
   * Get markup type for a given editing tool
   */
  getEditingMarkupType() {
    const {tool} = this
    const label = [
      editTools.LETTER,
      editTools.NUMBER,
    ]
    if (label.includes(tool)) {
      return markupTypes.LABEL
    }
    else if (Object.values(markupTypes).includes(tool)) {
      return tool
    }
  }
}
