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
  fontSize
  text = ''

  /**
   * Constructor
   */
  constructor(board, data) {
    super(board)
    if (data && data.text) {
      this.text = data.text
    }
  }

  /**
   * Load additional properties for this markup type
   */
  loadProperties(x, y) {

    //Load parent properties
    const args = super.loadProperties(x, y)
    const {text} = this

    //Load additional properties
    this.loadThemeProp('font', ...args)

    //Only if there is text
    if (text) {
      this.loadThemeProp('fontSize', text, ...args)
    }

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
   * Draw
   */
  draw(context, x, y) {

    //Parent draw
    super.draw(context, x, y)

    //Get data
    const {radius, color, font, fontSize, text} = this
    const absX = this.getAbsX(x)
    const absY = this.getAbsY(y)

    //Move slightly lower
    const posY = Math.floor(absY + (fontSize / 10))

    //Prepare context
    this.prepareContext(context)

    //Configure context
    context.fillStyle = color
    context.textBaseline = 'middle'
    context.textAlign = 'center'
    context.font = `${fontSize}px ${font}`

    //Draw element
    context.beginPath()
    context.fillText(String(text), absX, posY, 2 * radius)

    //Restore context
    this.restoreContext(context)
  }
}
