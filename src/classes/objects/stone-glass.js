import Stone from './stone.js'
import {stoneColors} from '../../constants/stone.js'

/**
 * Glass stone class
 */
export default class StoneGlass extends Stone {

  /**
   * Draw glass stones
   */
  draw(context, x, y) {

    //Get data
    const {board, theme} = this

    //Get coordinates and stone radius
    const absX = board.getAbsX(x)
    const absY = board.getAbsY(y)
    const radius = this.getRadius()
    const color = this.getColor()

    //Get theme variables
    const canvasTranslate = theme.canvasTranslate()

    //Prepare context
    this.prepareContext(context, canvasTranslate)

    //Begin path
    context.beginPath()

    //Determine stone texture
    if (color === stoneColors.WHITE) {
      context.fillStyle = context.createRadialGradient(
        absX - 2 * radius / 5,
        absY - 2 * radius / 5,
        radius / 3,
        absX - radius / 5,
        absY - radius / 5,
        5 * radius / 5,
      )
      context.fillStyle.addColorStop(0, '#fff')
      context.fillStyle.addColorStop(1, '#aaa')
    }
    else {
      context.fillStyle = context.createRadialGradient(
        absX - 2 * radius / 5,
        absY - 2 * radius / 5,
        1,
        absX - radius / 5,
        absY - radius / 5,
        4 * radius / 5,
      )
      context.fillStyle.addColorStop(0, '#666')
      context.fillStyle.addColorStop(1, '#111')
    }

    //Complete drawing
    context.arc(absX, absY, Math.max(0, radius - 0.5), 0, 2 * Math.PI, true)
    context.fill()

    //Restore context
    this.restoreContext(context, canvasTranslate)
  }
}
