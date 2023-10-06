
/**
 * Pixel ratio
 */
export const pixelRatio = window.devicePixelRatio || 1

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
 * Get element size
 */
export function getElementSize(element) {
  const s = window.getComputedStyle(element)
  const width = parseInt(s.width)
  const height = parseInt(s.height)
  return {width, height}
}

/**
 * Bind click handler
 */
export function bindClickHandler(id, handler) {
  const element = document.getElementById(id)
  element.addEventListener('click', handler)
}

/**
 * Toggle visibility
 */
export function toggleVisibility(id, visible) {
  const element = document.getElementById(id)
  element.style.display = visible ? 'block' : 'none'
}
