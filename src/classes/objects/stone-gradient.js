import Stone from './stone.js'
import {stoneStyles} from '../../constants/stone.js'

/**
 * Gradient stone class
 *
 * Draws a stone as a single radial gradient whose focus point and colour
 * stops come from the theme, unlike the glass style whose colours are fixed.
 * The gradient follows CSS radial-gradient semantics: it runs from the focus
 * point to the farthest corner of the stone's bounding box, so stop offsets
 * translate over directly from a CSS design.
 */
export default class StoneGradient extends Stone {

  //Style
  style = stoneStyles.GRADIENT

  //Additional theme props
  focus
  stops

  /**
   * Load additional properties for this stone type
   */
  loadProperties() {

    //Load parent properties
    const args = super.loadProperties()

    //Load additional properties
    this.loadThemeProp('focus', ...args)
    this.loadThemeProp('stops', ...args)

    //Pass on args
    return args
  }

  /**
   * Draw gradient stones
   */
  draw(context, x, y) {

    //Load properties
    this.loadProperties()

    //Get data
    const {radius, focus, stops} = this
    const absX = this.getAbsX(x)
    const absY = this.getAbsY(y)

    //Prepare context
    this.prepareContext(context)

    //Focus point, given as a fraction of the stone's bounding box
    const size = 2 * radius
    const focusX = absX - radius + (focus.x * size)
    const focusY = absY - radius + (focus.y * size)

    //The gradient reaches the farthest corner of the bounding box, so a
    //stop at offset 1 lands where CSS would put it
    const reachX = Math.max(focus.x, 1 - focus.x) * size
    const reachY = Math.max(focus.y, 1 - focus.y) * size
    const reach = Math.sqrt((reachX * reachX) + (reachY * reachY))

    //Create gradient
    const gradient = context.createRadialGradient(
      focusX, focusY, 0,
      focusX, focusY, reach
    )
    for (const [offset, color] of stops) {
      gradient.addColorStop(offset, color)
    }

    //Draw stone
    context.beginPath()
    context.fillStyle = gradient
    context.arc(absX, absY, Math.max(0, radius - 0.5), 0, 2 * Math.PI, true)
    context.fill()

    //Restore context
    this.restoreContext(context)
  }
}
