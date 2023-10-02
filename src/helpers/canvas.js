
/**
 * Pixel ratio
 */
export const pixelRatio = window.devicePixelRatio || 1

/**
 * Create canvas element and context for given element
 */
export function createCanvasContext(
  element, width, height, className,
) {

  //Create canvas element and get context
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')

  //Scale context depending on pixel ratio
  if (pixelRatio > 1) {
    context.scale(pixelRatio, pixelRatio)
  }

  //Set class name
  if (className) {
    canvas.className = className
  }

  //Set initial size
  canvas.width = width
  canvas.height = height

  //Add canvas to parent
  element.appendChild(canvas)

  //Return context
  return context
}
