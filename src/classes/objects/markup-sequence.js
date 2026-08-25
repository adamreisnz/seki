import Markup from './markup.js'
import {markupTypes} from '../../constants/markup.js'

/**
 * Expected sequence markup
 *
 * One of these is drawn per move of the follow-up an engine expects from the
 * current position, as a numbered ghost stone in the colour of the player
 * expected to play it. The sequence comes from a derived analysis, being the
 * remainder of a candidate's expected line beyond the moves the user already
 * entered, so the numbering carries on from the moves on the board rather
 * than starting over.
 *
 * A ghost stone is deliberately not a stone: it is smaller, translucent, and
 * outlined, so the expectation never reads as a position. The colour of the
 * disc is the move's own colour, which is why the display color is fixed
 * rather than read from the board, the same way variation markup does it.
 */
export default class MarkupSequence extends Markup {

  //Type
  type = markupTypes.SEQUENCE

  //Additional theme properties
  font
  fontSize
  fontWeight
  fillColor
  textColor
  text = ''

  //Properties set via constructor
  number = 0

  /**
   * Constructor
   */
  constructor(board, data = {}) {
    super(board)

    //Set data attributes. The display color is the colour of the expected
    //move, so the theme handlers receive it as the stone color to draw by.
    this.number = data.number || 0
    this.displayColor = data.color
  }

  /**
   * Load additional properties for this markup type
   */
  loadProperties(x, y) {

    //Load parent properties
    const args = super.loadProperties(x, y)
    const {number} = this

    //Load additional properties
    this.loadThemeProp('font', ...args)
    this.loadThemeProp('fontWeight', ...args)
    this.loadThemeProp('fillColor', ...args)
    this.loadThemeProp('textColor', ...args)

    //The text is the move's number in the expected line, resolved before the
    //font size, which scales itself to fit it
    this.loadThemeProp('text', number)
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
   * Draw
   */
  draw(context, x, y) {

    //Parent method loads the properties and clears the grid beneath
    super.draw(context, x, y)

    //Get data
    const {radius, color, fillColor, lineWidth} = this

    //Get coordinates
    const absX = this.getAbsX(x)
    const absY = this.getAbsY(y)

    //Prepare context, which is also what applies the ghosting: the theme's
    //alpha covers disc, outline and number alike
    this.prepareContext(context)

    //The disc in the move's colour
    context.fillStyle = fillColor
    context.beginPath()
    context.arc(absX, absY, radius, 0, 2 * Math.PI, true)
    context.fill()

    //The outline, which is what keeps a white ghost visible on a pale board
    if (lineWidth && color) {
      context.strokeStyle = color
      context.lineWidth = lineWidth
      context.stroke()
    }

    //Get text data
    const {textColor, font, fontSize, fontWeight, text} = this

    //Configure context
    context.fillStyle = textColor
    context.textBaseline = 'middle'
    context.textAlign = 'center'
    context.font = fontWeight ?
      `${fontWeight} ${fontSize}px ${font}` :
      `${fontSize}px ${font}`

    //Draw the number, slightly lower to sit centred in the disc
    const posY = Math.floor(absY + (fontSize / 10))
    context.beginPath()
    context.fillText(String(text), absX, posY, 2 * radius)

    //Restore context
    this.restoreContext(context)
  }
}
