import PlayerModeReplay from './player-mode-replay.js'
import {randomInt} from '../../helpers/util.js'
import {aCharUc, aCharLc} from '../../constants/util.js'
import {markupTypes} from '../../constants/markup.js'
import {stoneColors} from '../../constants/stone.js'
import {
  playerModes,
  playerActions,
  editTools,
} from '../../constants/player.js'

/**
 * This mode lets you edit a single position
 */
export default class PlayerModeEdit extends PlayerModeReplay {

  //Mode type
  mode = playerModes.EDIT

  //Set default editing tool
  tool = editTools.MOVE

  //Used markup labels
  usedMarkupLabels = []

  //Track current and last gird event detail
  currentGridDetail
  lastGridDetail
  lastEditedGridDetail

  /**
   * Initialise
   */
  init() {

    //Extend player
    this.extendPlayer()

    //Create bound event listeners
    this.createBoundListeners({
      keydown: 'onKeyDown',
      click: 'onClick',
      wheel: 'onMouseWheel',
      config: 'onPathChange',
      pathChange: 'onPathChange',
      variationChange: 'onVariationChange',
      gameLoad: 'onGameLoad',
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
    const {player, board} = this

    //Re-apply focus on player
    player.elements.container.focus()

    //Stop free draw
    board.stopFreeDraw()

    //Only process if valid coordinates
    if (!this.hasValidCoordinates(event)) {
      return
    }

    //Only process if not same grid detail as last time
    if (this.isLastEditedGridDetail(event)) {
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
    const {player, board} = this
    const {nativeEvent, isDragging} = event.detail

    //Only process if dragging and using free draw tool
    if (!isDragging || !this.isUsingDrawTool()) {
      return
    }

    //Re-apply focus on player
    player.elements.container.focus()

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

    //Dragging?
    if (isDragging) {

      //Move tool, action will be handled by the click handler
      //Just display the hover stone though
      if (this.isUsingMoveTool()) {
        this.showHoverStone()
        return
      }

      //Store last edited grid detail. This is to prevent the click event
      //from double triggering the edit event when it fires on the same cell
      this.lastEditedGridDetail = event.detail

      //Use edit tool
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

    //Using stone or move tool? Clear whole layer
    if (this.isUsingStoneTool() || this.isUsingMoveTool()) {
      board.clearHoverLayer()
    }

    //If markup tool, clear cell to properly redraw grid
    else if (this.isUsingMarkupTool() || this.isUsingClearTool()) {
      board.clearHoverCell(x, y)
    }
  }

  /**************************************************************************
   * Actions
   ***/

  /**
   * Process an action
   */
  processAction(action, event) {

    //Parent method
    if (super.processAction(action, event)) {
      return true
    }

    //Get data
    const {player} = this

    //Determine action
    switch (action) {

      //Edit tools
      case playerActions.SET_EDIT_TOOL_MOVE:
        player.setEditTool(editTools.MOVE)
        return true
      case playerActions.SET_EDIT_TOOL_STONE:
        player.setEditTool(editTools.STONE)
        return true
      case playerActions.SET_EDIT_TOOL_BLACK:
        player.setEditTool(editTools.BLACK)
        return true
      case playerActions.SET_EDIT_TOOL_WHITE:
        player.setEditTool(editTools.WHITE)
        return true
      case playerActions.SET_EDIT_TOOL_CLEAR:
        player.setEditTool(editTools.CLEAR)
        return true
      case playerActions.SET_EDIT_TOOL_CLEAR_AREA:
        player.setEditTool(editTools.CLEAR_AREA)
        return true
      case playerActions.SET_EDIT_TOOL_TRIANGLE:
        player.setEditTool(editTools.TRIANGLE)
        return true
      case playerActions.SET_EDIT_TOOL_CIRCLE:
        player.setEditTool(editTools.CIRCLE)
        return true
      case playerActions.SET_EDIT_TOOL_SQUARE:
        player.setEditTool(editTools.SQUARE)
        return true
      case playerActions.SET_EDIT_TOOL_DIAMOND:
        player.setEditTool(editTools.DIAMOND)
        return true
      case playerActions.SET_EDIT_TOOL_MARK:
        player.setEditTool(editTools.MARK)
        return true
      case playerActions.SET_EDIT_TOOL_HAPPY:
        player.setEditTool(editTools.HAPPY)
        return true
      case playerActions.SET_EDIT_TOOL_SAD:
        player.setEditTool(editTools.SAD)
        return true
      case playerActions.SET_EDIT_TOOL_LETTER:
        player.setEditTool(editTools.LETTER)
        return true
      case playerActions.SET_EDIT_TOOL_NUMBER:
        player.setEditTool(editTools.NUMBER)
        return true
      case playerActions.SET_EDIT_TOOL_DRAW:
        player.setEditTool(editTools.DRAW)
        return true
      case playerActions.REMOVE_ALL_MARKUP:
        player.removeAllMarkup()
        return true
    }

    //No action was performed
    return false
  }

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

    //Move tool
    if (this.isUsingMoveTool()) {
      if (!isDragging) {
        this.playMove(x, y)
      }
      return //Return to preserve move markers
    }

    //Clear tool
    else if (this.isUsingClearTool()) {
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
   * Play a move
   */
  playMove(x, y) {

    //Get player and play move
    const {player, game} = this
    const outcome = player.playMove(x, y)

    //Handle valid outcome
    if (outcome.isValid) {

      //Play move sound and trigger edited event
      player.playSound('move')
      this.triggerEditedEvent()

      //Play capture sounds
      if (game.position.hasCaptures()) {
        const num = Math.min(game.position.getTotalCaptureCount(), 10)
        for (let i = 0; i < num; i++) {
          setTimeout(() => {
            player.stopSound('capture')
            player.playSound('capture')
          }, 150 + randomInt(30, 90) * i)
        }
      }
    }
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
      this.triggerEditedEvent()
    }

    //Erase stones otherwise
    else if (game.hasStone(x, y)) {
      this.removeStone(x, y)
      this.triggerEditedEvent()
    }
  }

  /**
   * Erase area
   */
  eraseArea(area) {

    //Get data
    const {game} = this
    let hasErased = false

    //Loop area, erasing both markup and stones indiscriminantly
    area.forEach(({x, y}) => {
      if (game.hasMarkup(x, y)) {
        this.removeMarkup(x, y)
        hasErased = true
      }
      if (game.hasStone(x, y)) {
        this.removeStone(x, y)
        hasErased = true
      }
    })

    //Trigger edited event
    if (hasErased) {
      this.triggerEditedEvent()
    }
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

    //Trigger edited event
    this.triggerEditedEvent()
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

    //Trigger edited event
    this.triggerEditedEvent()
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
    this.triggerEditedEvent()
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

    //Trigger edited event
    this.triggerEditedEvent()
  }

  /**
   * Remove all markup
   */
  removeAllMarkup() {

    //Get data
    const {game, board} = this

    //Free drawn something? Erase that first (and leave markup)
    if (board.hasFreeDrawn()) {
      board.eraseDrawLayer()
      return
    }

    //Reset used markup labels
    this.resetUsedMarkupLabels()

    //Remove all from game and board
    game.removeAllMarkup()
    board.removeAllMarkup()

    //Trigger edited event
    this.triggerEditedEvent()
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
    //the tool or move color changed via hotkey
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
    const {currentGridDetail, game} = this
    if (!currentGridDetail) {
      return
    }

    //Get coordinates
    const {x, y} = currentGridDetail

    //Move tool
    if (this.isUsingMoveTool()) {

      //Already has any stone
      if (game.hasStone(x, y)) {
        return
      }

      //Get color and create stone
      const color = game.getTurn()
      this.showHoverStoneForColor(x, y, color)
      return
    }

    //Editing, check if valid color and if not have stone of this color
    const color = this.getEditingColor()
    if (!color || game.hasStone(x, y, color)) {
      return
    }

    //Show hover color
    this.showHoverStoneForColor(x, y, color)
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
   * Check if using move tool
   */
  isUsingMoveTool() {
    const {tool} = this
    return tool === editTools.MOVE
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

  /**
   * Trigger edited event
   */
  triggerEditedEvent() {
    this.player.triggerEvent('edited')
  }

  /**
   * Check if event has the same coordinates as last grid detail
   */
  isLastEditedGridDetail(event) {

    //Get last detail
    const {lastEditedGridDetail} = this
    if (!lastEditedGridDetail) {
      return false
    }

    //Reset it for next time
    this.lastEditedGridDetail = null

    //Check detail
    const {x, y} = lastEditedGridDetail
    return (x === event.detail.x && y === event.detail.y)
  }
}
