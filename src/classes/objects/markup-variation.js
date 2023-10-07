import MarkupCircle from './markup-circle.js'
import {markupTypes} from '../../constants/markup.js'

/**
 * Variation markup
 */
export default class MarkupVariation extends MarkupCircle {

  //Type
  type = markupTypes.VARIATION

  /**
   * Get grid erase radius
   */
  getGridEraseRadius() {
    return this.getRadius() * 1.4
  }

  /**
   * Determine font size
   */
  determineFontSize(text, radius) {
    //NOTE: Same size irrespective of text length, it is assumed you won't
    //be displaying more than 26 variations in one position.
    return Math.round(radius * 1.5) * 0.85
  }

  /**
   * Get markup color
   */
  getColor() {
    const {theme, color} = this
    return theme.get('markup.variation.color', color)
  }

  /**
   * Get markup text
   */
  getText() {
    const {theme, index, showText} = this
    if (!showText) {
      return ''
    }
    return theme.get('markup.variation.text', index || 0)
  }

  /**
   * Draw
   */
  draw(context, x, y) {

    //Get line dash
    const lineDash = this.getLineDash()
    context.setLineDash(lineDash || [])

    //Use parent method to draw circle
    super.draw(context, x, y)

    //Reset line dash
    context.setLineDash([])

    //Get data
    const {board, theme, showText} = this

    //Not showing text, done (e.g. single move)
    if (!showText) {
      return
    }

    //Get coordinates and stone radius
    const absX = board.getAbsX(x)
    const absY = board.getAbsY(y)
    const radius = this.getRadius()
    const color = this.getColor()
    const text = this.getText()

    //Get theme variables
    const font = this.getFont()
    const fontSize = this.determineFontSize(text, radius)
    const lineWidth = this.getLineWidth()
    const canvasTranslate = theme.canvasTranslate(lineWidth)

    //Reset line dash
    context.setLineDash([])

    //Prepare context
    this.prepareContext(context, canvasTranslate)

    //Configure context
    context.fillStyle = color
    context.textBaseline = 'middle'
    context.textAlign = 'center'
    context.font = `${fontSize}px ${font}`

    //Draw element
    context.beginPath()
    context.fillText(String(text), absX, absY, 2 * radius)

    //Restore context
    this.restoreContext(context, canvasTranslate)
  }
}
