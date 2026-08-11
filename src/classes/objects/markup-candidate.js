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
  fillColor
  textColor
  text = ''

  //Properties set via constructor
  index = 0
  winrateLoss = 0
  scoreLoss = 0
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
    this.scoreLoss = data.loss ? data.loss.score : 0
    this.isBest = Boolean(data.isBest)
    this.showText = data.showText
  }

  /**
   * Load additional properties for this markup type
   */
  loadProperties(x, y) {

    //Load parent properties
    const args = super.loadProperties(x, y)
    const [cellSize] = args
    const {index, winrateLoss, scoreLoss, isBest} = this

    //Load additional properties
    this.loadThemeProp('font', ...args)
    this.loadThemeProp('textColor', ...args)

    //Load the colours and line width with the loss, which is what the
    //gradient is drawn from
    this.loadThemeProp('color', ...args, winrateLoss, isBest)
    this.loadThemeProp('fillColor', ...args, winrateLoss, isBest)
    this.loadThemeProp('lineWidth', ...args, winrateLoss, isBest)

    //Text is what the marker says, so it has to be resolved before the font
    //size, which scales itself to fit it
    this.loadThemeProp('text', scoreLoss, cellSize, index, winrateLoss)
    this.loadThemeProp('fontSize', this.text, ...args)

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
   * Draw the fill the marker sits on
   */
  drawFill(context, x, y) {

    //No fill configured
    const {radius, fillColor} = this
    if (!fillColor) {
      return
    }

    //Get coordinates
    const absX = this.getAbsX(x)
    const absY = this.getAbsY(y)

    //Prepare context
    this.prepareContext(context)

    //Draw element
    context.fillStyle = fillColor
    context.beginPath()
    context.arc(absX, absY, radius, 0, 2 * Math.PI, true)
    context.fill()

    //Restore context
    this.restoreContext(context)
  }

  /**
   * Draw
   */
  draw(context, x, y) {

    //Load properties and lay the fill down first, as the ring the parent
    //draws and the text below both go on top of it
    this.loadProperties(x, y)
    this.drawFill(context, x, y)

    //Use parent method for the ring
    super.draw(context, x, y)

    //Not showing text, done
    const {radius, textColor, font, fontSize, text, showText} = this
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
    context.fillStyle = textColor
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
