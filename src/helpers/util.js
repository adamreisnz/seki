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
  const pixelRatio = getPixelRatio()

  //Scale context depending on pixel ratio
  if (pixelRatio > 1) {
    context.scale(pixelRatio, pixelRatio)
  }

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
  const pixelRatio = getPixelRatio()

  //Scale context depending on pixel ratio
  if (pixelRatio > 1) {
    context.scale(pixelRatio, pixelRatio)
  }

  //Set dimensions based on first canvas
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
 */
export function throttle(fn, interval) {
  fn.isRunning = false
  return (...args) => {
    if (fn.isRunning) {
      return
    }
    fn.isRunning = true
    fn(...args)
    setTimeout(() => fn.isRunning = false, interval)
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
