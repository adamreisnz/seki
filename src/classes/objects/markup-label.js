import Markup from './markup.js'
import {markupTypes} from '../../constants/markup.js'

/**
 * Label markup
 */
export default class MarkupLabel extends Markup {

  /**
   * Constructor
   */
  constructor(board, data) {

    //Parent constructor
    super(board)

    //Font and text
    this.font = undefined
    this.text = ''

    //Set data
    this.setData(data)

    //Set type
    this.type = markupTypes.LABEL
  }

  /**
   * Get grid erase radius
   */
  getGridEraseRadius() {
    return this.getRadius() * 0.8
  }

  /**
   * Get markup font
   */
  getFont() {

    //Get data
    const {theme, font} = this

    //Preset font
    if (font) {
      return font
    }

    //Dynamic line cap based on theme
    return theme.get('markup.label.font')
  }

  /**
   * Determine font size
   */
  determineFontSize(text, radius) {
    const len = String(text).length
    if (len === 1) {
      return Math.round(radius * 1.5)
    }
    else if (len === 2) {
      return Math.round(radius * 1.2)
    }
    return radius
  }

  /**
   * Draw
   */
  draw(context, x, y) {

    //Parent draw
    super.draw(context, x, y)

    //Get data
    const {board, theme, alpha, text} = this

    //Get coordinates and stone radius
    const absX = board.getAbsX(x)
    const absY = board.getAbsY(y)
    const radius = this.getRadius()
    const color = this.getColor(x, y)

    //Get theme variables
    const font = this.getFont()
    const fontSize = this.determineFontSize(text, radius)
    const canvasTranslate = theme.canvasTranslate()

    //Translate canvas
    context.translate(canvasTranslate, canvasTranslate)

    //Apply transparency?
    if (alpha && alpha < 1) {
      context.globalAlpha = alpha
    }

    //Configure context
    context.fillStyle = color
    context.textBaseline = 'middle'
    context.textAlign = 'center'
    context.font = `${fontSize}px ${font}`

    //Draw element
    context.beginPath()
    context.fillText(String(text), absX, absY, 2 * radius)

    //Reset transparency
    if (alpha && alpha < 1) {
      context.globalAlpha = 1
    }

    //Undo translation
    context.translate(-canvasTranslate, -canvasTranslate)
  }
}
