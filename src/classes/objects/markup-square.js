import Markup from './markup.js'
import {markupTypes} from '../../constants/markup.js'

/**
 * Square markup
 */
export default class MarkupSquare extends Markup {

  /**
   * Constructor
   */
  constructor(board, data) {

    //Parent constructor
    super(board, data)

    //Set type
    this.type = markupTypes.SQUARE
  }

  /**
   * Draw
   */
  draw(context, x, y) {

    //Parent draw
    super.draw(context, x, y)

    //Get data
    const {board, theme} = this

    //Get coordinates and stone radius
    const absX = board.getAbsX(x)
    const absY = board.getAbsY(y)
    const radius = this.getRadius()
    const color = this.getColor(x, y)

    //Get theme variables
    const lineWidth = this.getLineWidth()
    const canvasTranslate = theme.canvasTranslate(lineWidth)

    //Determine delta
    const d = Math.round(radius * Math.cos(Math.PI / 4))

    //Prepare context
    this.prepareContext(context, canvasTranslate)

    //Configure context
    context.strokeStyle = color
    context.lineWidth = lineWidth

    //Draw element
    context.beginPath()
    context.rect(
      absX - d,
      absY - d,
      2 * d,
      2 * d,
    )
    context.stroke()

    //Restore context
    this.restoreContext(context, canvasTranslate)
  }
}
