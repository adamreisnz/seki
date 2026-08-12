import Markup from './markup.js'
import {markupTypes} from '../../constants/markup.js'

/**
 * Analysis candidate markup
 *
 * One of these is drawn per candidate move an engine suggested for the current
 * position. Each candidate carries its own point loss against the best one,
 * which is what the theme colours the marker by, so a marker never has to look
 * at its siblings to know how to draw itself.
 *
 * Candidates draw as solid discs. The move that was actually played from this
 * position draws as a rounded square instead, so shape says "you played here"
 * while the colour keeps saying how good it was, and the two signals never
 * compete. The best move needs no decoration of its own: it is the only
 * candidate that gives up nothing, so it is the only marker in the colour the
 * scale starts at.
 */
export default class MarkupCandidate extends Markup {

  //Type
  type = markupTypes.CANDIDATE

  //Additional theme properties
  font
  fontSize
  fontWeight
  fillColor
  textColor
  shadowColor
  shadowBlur = 0
  shadowOffsetY = 0
  text = ''

  //Properties set via constructor
  index = 0
  winrateLoss = 0
  scoreLoss = 0
  isBest = false
  isPlayed = false
  showText

  /**
   * Constructor
   */
  constructor(board, data = {}) {
    super(board)

    //Set data attributes. A candidate the engine never searched carries only
    //its point loss, so each half of the loss stands on its own.
    this.index = data.index || 0
    this.winrateLoss = data.loss?.winrate ?? 0
    this.scoreLoss = data.loss?.score ?? 0
    this.isBest = Boolean(data.isBest)
    this.isPlayed = Boolean(data.isPlayed)
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
    this.loadThemeProp('fontWeight', ...args)

    //The colours are worked out from the points the candidate gives up, which
    //is what makes the gradient a theme concern rather than drawing code
    this.loadThemeProp('color', ...args, scoreLoss, isBest)
    this.loadThemeProp('fillColor', ...args, scoreLoss, isBest)
    this.loadThemeProp('textColor', ...args, scoreLoss, isBest)
    this.loadThemeProp('lineWidth', ...args, scoreLoss, isBest)

    //Shadow that lifts the marker off the board
    this.loadThemeProp('shadowColor', ...args)
    this.loadThemeProp('shadowBlur', ...args)
    this.loadThemeProp('shadowOffsetY', ...args)

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
   * Trace the marker's outline at a given size: a circle for a candidate, a
   * rounded square for the move that was actually played
   */
  traceShape(context, absX, absY, size) {

    //A candidate is a disc
    context.beginPath()
    if (!this.isPlayed) {
      context.arc(absX, absY, size, 0, 2 * Math.PI, true)
      return
    }

    //The played move is a rounded square. The corner grows by however far
    //outside the marker this outline sits, which is what keeps a ring drawn
    //around it at an even width through the corners.
    const corner = (this.radius * 0.59) + (size - this.radius)
    const left = absX - size
    const top = absY - size
    const right = absX + size
    const bottom = absY + size

    context.moveTo(left + corner, top)
    context.arcTo(right, top, right, bottom, corner)
    context.arcTo(right, bottom, left, bottom, corner)
    context.arcTo(left, bottom, left, top, corner)
    context.arcTo(left, top, right, top, corner)
    context.closePath()
  }

  /**
   * Draw
   */
  draw(context, x, y) {

    //Parent method loads the properties and clears the grid beneath
    super.draw(context, x, y)

    //Get data
    const {
      radius, color, fillColor, lineWidth,
      shadowColor, shadowBlur, shadowOffsetY,
    } = this

    //Get coordinates
    const absX = this.getAbsX(x)
    const absY = this.getAbsY(y)

    //Prepare context
    this.prepareContext(context)

    //The ring is drawn as a slightly larger shape underneath the fill rather
    //than a stroke on top of it, so the drop shadow falls from marker and
    //ring together, the way it would from one solid object
    if (shadowColor) {
      context.shadowColor = shadowColor
      context.shadowBlur = shadowBlur
      context.shadowOffsetY = shadowOffsetY
    }
    context.fillStyle = color
    this.traceShape(context, absX, absY, radius + lineWidth)
    context.fill()

    //The fill goes on top of the ring shape, without a shadow of its own
    context.shadowColor = 'transparent'
    context.shadowBlur = 0
    context.shadowOffsetY = 0
    context.fillStyle = fillColor
    this.traceShape(context, absX, absY, radius)
    context.fill()

    //Restore context
    this.restoreContext(context)

    //Not showing text, done
    const {textColor, font, fontSize, fontWeight, text, showText} = this
    if (!showText) {
      return
    }

    //Move slightly lower
    const posY = Math.floor(absY + (fontSize / 10))

    //Prepare context
    this.prepareContext(context)

    //Configure context
    context.fillStyle = textColor
    context.textBaseline = 'middle'
    context.textAlign = 'center'
    context.font = fontWeight ?
      `${fontWeight} ${fontSize}px ${font}` :
      `${fontSize}px ${font}`

    //Draw element
    context.beginPath()
    context.fillText(String(text), absX, posY, 2 * radius)

    //Restore context
    this.restoreContext(context)
  }
}
