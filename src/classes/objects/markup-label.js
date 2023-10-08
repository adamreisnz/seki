import Markup from './markup.js'
import {markupTypes} from '../../constants/markup.js'

/**
 * Label markup
 */
export default class MarkupLabel extends Markup {

  //Type
  type = markupTypes.LABEL

  //Additional properties
  font
  text = '?'

  /**
   * Constructor
   */
  constructor(board, data) {
    super(board)
    if (data) {
      this.text = data.text
    }
  }

  /**
   * Load additional properties for this markup type
   */
  loadProperties(x, y) {

    //Load parent properties
    const args = super.loadProperties(x, y)

    //Load additional properties
    this.loadThemeProp('font', ...args)

    //Pass on args
    return args
  }

  /**
   * Get grid erase radius
   */
  getGridEraseRadius() {
    return this.radius * 0.8
  }

  /**
   * Get text
   */
  getText() {
    return this.text || ''
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

    //Load properties
    this.loadProperties(x, y)

    //Parent draw
    super.draw(context, x, y)

    //Get data
    const {radius, color, font, text} = this
    const absX = this.getAbsX(x)
    const absY = this.getAbsY(y)
    const fontSize = this.determineFontSize(text, radius)

    //Prepare context
    this.prepareContext(context)

    //Configure context
    context.fillStyle = color
    context.textBaseline = 'middle'
    context.textAlign = 'center'
    context.font = `${fontSize}px ${font}`

    //Draw element
    context.beginPath()
    context.fillText(String(text), absX, absY, 2 * radius)

    //Restore context
    this.restoreContext(context)
  }
}
