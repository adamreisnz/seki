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

    //Load additional properties
    this.loadThemeProp('font', ...args)
    this.loadThemeProp('lineDash', ...args)

    //Pass on args
    return args
  }

  /**
   * Get parsed line dash
   */
  getLineDash() {
    const {lineDash} = this
    if (Array.isArray(lineDash)) {
      return
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
    const {theme, color, isSelected} = this
    return theme.get('markup.variation.color', color, isSelected)
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

    //Load properties
    this.loadProperties(x, y)

    //Get line dash
    const lineDash = this.getLineDash()

    //Use parent method to draw circle
    context.setLineDash(lineDash || [])
    super.draw(context, x, y)
    context.setLineDash([])

    //Not showing text, done (e.g. single move)
    const {radius, color, font, showText} = this
    if (!showText) {
      return
    }

    //Get coordinates and stone radius
    const absX = this.getAbsX(x)
    const absY = this.getAbsY(y)
    const text = this.getText()
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
