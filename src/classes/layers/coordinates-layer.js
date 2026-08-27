import BoardLayer from './board-layer.js'
import {boardLayerTypes} from '../../constants/board.js'
import {coordinateGenerators} from '../../helpers/coordinates.js'

/**
 * This class represents the grid layer of the board, and it is
 * responsible for drawing gridlines, starpoints and coordinates
 */
export default class CoordinatesLayer extends BoardLayer {

  //Type
  type = boardLayerTypes.COORDINATES

  /**
   * Unneeded methods
   */
  getAll() {} // eslint-disable-line no-empty-function
  setAll() {} // eslint-disable-line no-empty-function
  removeAll() {} // eslint-disable-line no-empty-function

  /**
   * Draw
   */
  draw() {

    //Check if we can draw
    if (!this.canDraw()) {
      return
    }

    //Check if enabled
    if (!this.board.getConfig('showCoordinates')) {
      return
    }

    //Draw vertical and horizontal
    this.drawVertical()
    this.drawHorizontal()
  }

  /**
   * Draw vertical coordinates
   */
  drawVertical() {

    //Get data
    const {board, theme, context} = this
    const {drawWidth, drawMarginHor} = board

    //Get cell size
    const cellSize = board.getCellSize()

    //Get boundary coordinates
    const xl = Math.ceil((drawMarginHor - cellSize / 2) / 2 + cellSize / 15)
    const xr = drawWidth - xl

    //Get theme data
    //NOTE: size is deliberately not read here. It is passed the character
    //being drawn, so it has to be looked up per coordinate rather than once
    //up front like the rest of these.
    const color = theme.get('coordinates.vertical.color')
    const font = theme.get('coordinates.vertical.font')
    const style = theme.get('coordinates.vertical.style')
    const type = theme.get('coordinates.vertical.type')
    const inverse = theme.get('coordinates.vertical.inverse')

    //Configure context
    context.fillStyle = color
    context.textBaseline = 'middle'
    context.textAlign = 'center'

    //Draw vertical coordinates
    for (let i = board.yTop; i <= board.yBottom; i++) {

      //Get character
      const j = this.getIndex(i, board.height, inverse)
      const ch = this.getCharacter(j, type)

      //Draw
      const y = board.getAbsY(i)
      const size = theme.get('coordinates.vertical.size', ch, cellSize)
      context.font = `${style || ''} ${size} ${font}`
      context.fillText(ch, xl, y)
      context.fillText(ch, xr, y)
    }
  }

  /**
   * Draw horizontal coordinates
   */
  drawHorizontal() {

    //Get data
    const {board, theme, context} = this
    const {drawHeight, drawMarginVer} = board

    //Get cell size
    const cellSize = board.getCellSize()

    //Get boundary coordinates
    const yt = Math.ceil((drawMarginVer - cellSize / 2) / 2 + cellSize / 15)
    const yb = drawHeight - yt

    //Get theme data
    //NOTE: size is deliberately not read here, see drawVertical
    const color = theme.get('coordinates.horizontal.color')
    const font = theme.get('coordinates.horizontal.font')
    const style = theme.get('coordinates.horizontal.style')
    const type = theme.get('coordinates.horizontal.type')
    const inverse = theme.get('coordinates.horizontal.inverse')

    //Configure context
    context.fillStyle = color
    context.textBaseline = 'middle'
    context.textAlign = 'center'

    //Draw horizontal coordinates
    for (let i = board.xLeft; i <= board.xRight; i++) {

      //Get character
      const j = this.getIndex(i, board.width, inverse)
      const ch = this.getCharacter(j, type)

      //Draw
      const x = board.getAbsX(i)
      const size = theme.get('coordinates.horizontal.size', ch, cellSize)
      context.font = `${style || ''} ${size} ${font}`
      context.fillText(ch, x, yt)
      context.fillText(ch, x, yb)
    }
  }

  /**************************************************************************
   * Helpers
   ***/

  /**
   * Get index for coordinate
   */
  getIndex(i, max, inverse) {
    if (inverse) {
      return max - i - 1
    }
    return i
  }

  /**
   * Get character
   */
  getCharacter(i, style) {

    //Existing generator. NOTE: a theme names one of these rather than handing
    //over a function of its own. Theme#get calls any function it finds, so a
    //function could never have reached here through the only route a theme
    //has to it, and the six generators cover every script the board draws.
    if (typeof style === 'string' && coordinateGenerators[style]) {
      return coordinateGenerators[style](i)
    }

    //Return as is
    return i
  }
}
