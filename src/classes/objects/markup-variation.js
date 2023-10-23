import MarkupCircle from './markup-circle.js'
import {markupTypes} from '../../constants/markup.js'

/**
 * Variation markup
 */
export default class MarkupVariation extends MarkupCircle {

  //Type
  type = markupTypes.VARIATION

  //Additional theme properties
  font
  fontSize
  text = ''

  //Properties set via constructor
  index = 0
  displayColor
  showText
  isSelected

  /**
   * Constructor
   */
  constructor(board, data) {
    super(board)

    //Set data attributes
    this.index = data.index
    this.displayColor = data.displayColor
    this.showText = data.showText
    this.isSelected = data.isSelected
  }

  /**
   * Load additional properties for this markup type
   */
  loadProperties(x, y) {

    //Load parent properties
    const args = super.loadProperties(x, y)
    const {index, isSelected} = this

    //Load additional properties
    this.loadThemeProp('font', ...args)
    this.loadThemeProp('fontSize', ...args)

    //Load color with specific args
    this.loadThemeProp('color', ...args, isSelected)
    this.loadThemeProp('text', index || 0)

    //Pass on args
    return args
  }

  /**
   * Get grid erase radius
   */
  getGridEraseRadius() {
    return this.radius * 1.1
  }

  /**
   * Draw
   */
  draw(context, x, y) {

    //Use parent method
    super.draw(context, x, y)

    //Not showing text, done (e.g. single move)
    const {radius, color, font, fontSize, text, showText} = this
    if (!showText) {
      return
    }

    //Get coordinates and stone radius
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
