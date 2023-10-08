import MarkupCircle from './markup-circle.js'
import {markupTypes} from '../../constants/markup.js'

/**
 * Variation markup
 */
export default class MarkupVariation extends MarkupCircle {

  //Type
  type = markupTypes.VARIATION

  //Additional theme properties
  lineDash
  font
  fontSize
  text = ''

  //Properties set via constructor
  index = 0
  stoneColor
  showText
  isSelected

  /**
   * Constructor
   */
  constructor(board, data) {
    super(board)

    //Set data attributes
    this.index = data.index
    this.stoneColor = data.stoneColor
    this.showText = data.showText
    this.isSelected = data.isSelected
  }

  /**
   * Load additional properties for this markup type
   */
  loadProperties(x, y) {

    //Load parent properties
    const args = super.loadProperties(x, y)
    const {index, stoneColor, isSelected} = this

    //Load additional properties
    this.loadThemeProp('font', ...args)
    this.loadThemeProp('fontSize', ...args)
    this.loadThemeProp('lineDash', ...args)

    //Load color with specific args
    this.loadThemeProp('color', stoneColor, isSelected)
    this.loadThemeProp('text', index || 0)

    //Pass on args
    return args
  }

  /**
   * Get parsed line dash
   */
  getLineDash() {
    const {lineDash} = this
    if (Array.isArray(lineDash)) {
      return lineDash
    }
    return lineDash ? lineDash.split(',') : null
  }

  /**
   * Get grid erase radius
   */
  getGridEraseRadius() {
    return this.radius * 1.4
  }

  /**
   * Draw
   */
  draw(context, x, y) {

    //Load properties
    this.loadProperties(x, y)

    //Get line dash
    const lineDash = this.getLineDash()

    //Use parent method to draw circle
    context.setLineDash(lineDash || [])
    super.draw(context, x, y)
    context.setLineDash([])

    //Not showing text, done (e.g. single move)
    const {radius, color, font, fontSize, text, showText} = this
    if (!showText) {
      return
    }

    //Get coordinates and stone radius
    const absX = this.getAbsX(x)
    const absY = this.getAbsY(y)

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
