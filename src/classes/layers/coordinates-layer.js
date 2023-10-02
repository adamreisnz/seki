import BoardLayer from '../board-layer.js'
import {coordinateGenerators} from '../../helpers/index.js'

/**
 * This class represents the grid layer of the board, and it is
 * responsible for drawing gridlines, starpoints and coordinates
 */
export default class CoordinatesLayer extends BoardLayer {

  /**************************************************************************
   * Object handling
   ***/

  /**
   * Get all has nothing to return
   */
  getAll() {
    return null
  }

  /**
   * Set all has nothing to set
   */
  setAll() {
    return
  }

  /**
   * Remove all has nothing to remove
   */
  removeAll() {
    return
  }

  /**************************************************************************
   * Drawing
   ***/

  /**
   * Check if we can or should draw coordinates
   */
  canDraw() {

    //Parent method
    if (!super.canDraw()) {
      return false
    }

    //Check flag
    return this.board.showCoordinates
  }

  /**
   * Draw
   */
  draw() {

    //Check if we can draw
    if (!this.canDraw()) {
      return
    }

    //Get data
    const {board, theme, context} = this
    const {drawWidth, drawHeight, drawMarginHor, drawMarginVer} = board

    //Get cell size
    const cellSize = board.getCellSize()

    //Get boundary coordinates
    const xl = Math.ceil((drawMarginHor - cellSize / 2) / 2)
    const xr = drawWidth - xl
    const yt = Math.ceil((drawMarginVer - cellSize / 2) / 2)
    const yb = drawHeight - yt

    //Get theme properties
    const fillStyle = theme.get('coordinates.color')
    const vertical = {
      font: theme.get('coordinates.vertical.font'),
      size: theme.get('coordinates.vertical.size'),
      style: theme.get('coordinates.vertical.style'),
      inverse: theme.get('coordinates.vertical.inverse'),
    }
    let horizontal = {
      font: theme.get('coordinates.horizontal.font'),
      size: theme.get('coordinates.horizontal.size'),
      style: theme.get('coordinates.horizontal.style'),
      inverse: theme.get('coordinates.horizontal.inverse'),
    }

    //Configure context
    context.fillStyle = fillStyle
    context.textBaseline = 'middle'
    context.textAlign = 'center'

    //Draw vertical coordinates
    for (let i = 0; i < board.height; i++) {

      //Get character
      const j = this.getIndex(i, board.height, vertical.inverse)
      const ch = this.getCharacter(j, vertical.style)

      //Draw
      const y = board.getAbsY(i)
      context.font = `${vertical.size(ch, cellSize)} ${vertical.font}`
      context.fillText(ch, xl, y)
      context.fillText(ch, xr, y)
    }

    //Draw horizontal coordinates
    for (let i = 0; i < board.width; i++) {

      //Get character
      const j = this.getIndex(i, board.width, horizontal.inverse)
      const ch = this.getCharacter(j, horizontal.style)

      //Draw
      const x = board.getAbsX(i)
      context.font = `${horizontal.size(ch, cellSize)} ${horizontal.font}`
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

    //Generator function
    if (typeof style === 'function') {
      return style(i)
    }

    //Existing generator
    if (typeof style === 'string' && coordinateGenerators[style]) {
      return coordinateGenerators[style](i)
    }

    //Return as is
    return i
  }
}
