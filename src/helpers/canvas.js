
/**
 * Create canvas element and context for given element
 */
export function createCanvasContext(element, className) {

  //Create canvas element and get context
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  const pixelRatio = window.devicePixelRatio || 1

  //Scale context depending on pixel ratio
  if (pixelRatio > 1) {
    context.scale(pixelRatio, pixelRatio)
  }

  //Set class name
  if (className) {
    canvas.className = className
  }

  //Set initial canvas width/height based on our own size
  canvas.width = element.clientWidth * pixelRatio
  canvas.height = element.clientHeight * pixelRatio

  //Add canvas to parent
  element.appendChild(canvas)

  //Return context
  return context
}
