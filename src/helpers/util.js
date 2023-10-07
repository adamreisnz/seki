
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
 * Misc
 ***/

/**
 * Throttle a functino call
 */
export function throttle(fn, delay) {
  let t = 0
  return (...args) => {
    clearTimeout(t)
    t = setTimeout(() => fn(...args), delay)
  }
}
