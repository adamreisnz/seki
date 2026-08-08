import {mouseEvents} from '../constants/util.js'

/**************************************************************************
 * Dom
 ***/

//Pixel ratio
export function getPixelRatio() {
  return window.devicePixelRatio || 1
}

/**
 * Create an element
 */
export function createElement(parent, className, tag = 'div') {
  const element = document.createElement(tag)
  element.className = className
  parent.appendChild(element)
  return element
}

/**
 * Create canvas element and context for given element
 */
export function createCanvasContext(element, className) {

  //Create canvas element and get context
  const canvas = createElement(element, className, 'canvas')
  const context = canvas.getContext('2d')

  //NOTE: no pixel ratio scaling here. Assigning to canvas.width or height
  //resets the context transform, and the board does exactly that in
  //propagateDrawSize before anything is ever drawn, so scaling at this point
  //was thrown away again. The pixel ratio is instead folded into the draw
  //size the board computes with.

  //Set class name
  if (className) {
    canvas.className = className
  }

  //Return context
  return context
}

/**
 * Merge canvases onto a single canvas
 */
export function mergeCanvases(canvases) {

  //Create merged canvas
  const merged = document.createElement('canvas')
  const context = merged.getContext('2d')

  //Set dimensions based on first canvas. NOTE: the source canvases are
  //already at their full pixel ratio size and are copied across one to one,
  //so there is no scaling to apply. Doing so here had no effect anyway, as
  //setting the dimensions below resets the context transform.
  merged.width = canvases[0].width
  merged.height = canvases[0].height

  //Merge canvases
  for (const canvas of canvases) {
    context.drawImage(canvas, 0, 0)
  }

  //Return merged canvas
  return merged
}

/**
 * Helper wrapper
 */
export function editClassList(element, action, ...args) {
  if (element instanceof HTMLCollection) {
    element = Array.from(element)
  }
  if (Array.isArray(element)) {
    element.forEach(element => element.classList[action](...args))
  }
  else if (element) {
    element.classList[action](...args)
  }
}

/**
 * Has class
 */
export function hasClass(element, className) {
  return element.classList.contains(className)
}

/**
 * Add class
 */
export function addClass(element, className) {
  editClassList(element, 'add', className)
}

/**
 * Remove class
 */
export function removeClass(element, className) {
  editClassList(element, 'remove', className)
}

/**
 * Toggle class
 */
export function toggleClass(element, className, value) {
  editClassList(element, 'toggle', className, value)
}

/**************************************************************************
 * Debugging
 ***/

//Local debug flag
let debugFlag = false

/**
 * Set debug flag
 */
export function setDebug(debug) {
  debugFlag = debug
}

/**
 * Get debug flag
 */
export function getDebug() {
  return debugFlag
}

/**************************************************************************
 * Event handling
 ***/

/**
 * Check if a mouse event matches a binding
 */
export function isMouseEvent(event, binding) {

  //Get mouse event
  const {mouseEvent} = binding

  //Wheeling up
  if (mouseEvent === mouseEvents.WHEEL_UP) {
    return (event.deltaY < 0)
  }

  //Wheeling down
  if (mouseEvent === mouseEvents.WHEEL_DOWN) {
    return (event.deltaY > 0)
  }
}

/**
 * Check if a keydown event matches a binding
 */
export function isKeyDownEvent(event, binding) {
  return (
    event.key.toLowerCase() === binding.key.toLowerCase() &&
    event.ctrlKey === Boolean(binding.ctrlKey) &&
    event.shiftKey === Boolean(binding.shiftKey) &&
    event.altKey === Boolean(binding.altKey) &&
    event.metaKey === Boolean(binding.metaKey)
  )
}

/**************************************************************************
 * Misc
 ***/

/**
 * Random integer
 */
export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min)
}

/**
 * Throttle a function call to run at most once every interval
 *
 * The call that opens a window runs immediately. Calls made during a window
 * are collapsed into a single trailing call that runs when the window closes,
 * so the last set of arguments is never dropped. That matters for things like
 * resize handling, where the final size is the one that has to be applied.
 */
export function throttle(fn, interval) {

  //Throttle state lives in the closure, so throttling the same function twice
  //produces two independent throttled versions rather than a shared flag
  let timeout = null
  let trailingArgs = null

  //Helper to close the current window, running any collapsed trailing call
  const closeWindow = () => {

    //Nothing came in during the window, so we're idle again
    if (!trailingArgs) {
      timeout = null
      return
    }

    //Run the trailing call and open a new window for it
    const args = trailingArgs
    trailingArgs = null
    fn(...args)
    timeout = setTimeout(closeWindow, interval)
  }

  //Return throttled function
  return (...args) => {

    //Inside a window, remember the call for the trailing edge. Only the most
    //recent set of arguments is kept.
    if (timeout) {
      trailingArgs = args
      return
    }

    //Run immediately and open a window
    fn(...args)
    timeout = setTimeout(closeWindow, interval)
  }
}

/**
 * Date string generator
 */
export function dateString(date = new Date()) {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = String(date.getFullYear())
  return `${year}-${month}-${day}`
}
