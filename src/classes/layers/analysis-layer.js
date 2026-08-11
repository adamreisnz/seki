import BoardLayer from './board-layer.js'
import {boardLayerTypes} from '../../constants/board.js'
import {stoneColors} from '../../constants/stone.js'

/**
 * Analysis layer
 *
 * Draws the ownership heat map an engine reports for a position: how firmly
 * each point is expected to end up in one player's territory.
 *
 * This is deliberately a layer of its own rather than a second user of the
 * score layer, so that an AI overlay and a real score estimate can be on the
 * board at the same time instead of overwriting each other.
 */
export default class AnalysisLayer extends BoardLayer {

  //Type
  type = boardLayerTypes.ANALYSIS

  //Helper vars
  ownership = null

  /**
   * Set ownership map
   *
   * Expects one entry per point, row major from the top left, in the range
   * -127 to 127 from black's perspective, being the range an Int8Array holds.
   */
  setAll(ownership) {

    //Remove all existing
    this.removeAll()

    //Set and draw
    this.ownership = ownership
    this.redraw()
  }

  /**
   * Remove all ownership
   */
  removeAll() {

    //Erase the layer, while we still know what is on it
    this.erase()

    //Clear ownership
    this.ownership = null
  }

  /**
   * Can draw check
   */
  canDraw() {
    if (!super.canDraw()) {
      return false
    }
    return Boolean(this.ownership && this.ownership.length)
  }

  /**
   * Draw layer
   */
  draw() {

    //Can't draw
    if (!this.canDraw()) {
      return
    }

    //Get data
    const {context, board, theme, ownership} = this
    const {width, height} = board
    const cellSize = board.getCellSize()
    const threshold = theme.get('analysis.ownership.threshold')

    //Walk the grid, as the ownership map covers every point rather than the
    //handful of them that have anything on them
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {

        //Off the board (e.g. cut off), nothing to draw
        if (!board.isOnBoard(x, y)) {
          continue
        }

        //Get the value for this point, as a fraction from black's perspective
        const value = ownership[(y * width) + x] / 127
        const strength = Math.abs(value)

        //Too contested to shade
        if (!strength || strength < threshold) {
          continue
        }

        //Work out whose point this is, and how to draw it
        const color = board.getDisplayColor(
          value > 0 ? stoneColors.BLACK : stoneColors.WHITE
        )
        const size = Math.round(
          cellSize * theme.get('analysis.ownership.scale', cellSize, color, strength)
        )
        const alpha = theme.get('analysis.ownership.alpha', cellSize, color, strength)
        const fill = theme.get('analysis.ownership.color', cellSize, color, strength)

        //Draw it, centred on the point
        const absX = board.getAbsX(x)
        const absY = board.getAbsY(y)

        context.globalAlpha = alpha
        context.fillStyle = fill
        context.fillRect(
          absX - (size / 2),
          absY - (size / 2),
          size,
          size
        )
        context.globalAlpha = 1
      }
    }
  }
}
