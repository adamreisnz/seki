import MarkupCircle from './markup-circle.js'
import {markupTypes} from '../../constants/markup.js'

/**
 * Analysis candidate markup
 *
 * One of these is drawn per candidate move an engine suggested for the current
 * position. Each candidate carries its own win rate loss against the best one,
 * which is what the theme colours and weights the marker by, so a marker never
 * has to look at its siblings to know how to draw itself.
 */
export default class MarkupCandidate extends MarkupCircle {

  //Type
  type = markupTypes.CANDIDATE

  //Additional theme properties
  font
  fontSize
  text = ''

  //Properties set via constructor
  index = 0
  winrateLoss = 0
  isBest = false
  showText

  /**
   * Constructor
   */
  constructor(board, data = {}) {
    super(board)

    //Set data attributes
    this.index = data.index || 0
    this.winrateLoss = data.loss ? data.loss.winrate : 0
    this.isBest = Boolean(data.isBest)
    this.showText = data.showText
  }

  /**
   * Load additional properties for this markup type
   */
  loadProperties(x, y) {

    //Load parent properties
    const args = super.loadProperties(x, y)
    const {index, winrateLoss, isBest} = this

    //Load additional properties
    this.loadThemeProp('font', ...args)
    this.loadThemeProp('fontSize', ...args)

    //Load colour and line width with the loss, which is what the gradient
    //is drawn from
    this.loadThemeProp('color', ...args, winrateLoss, isBest)
    this.loadThemeProp('lineWidth', ...args, winrateLoss, isBest)
    this.loadThemeProp('text', index)

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

    //Not showing text, done (e.g. a single candidate)
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
