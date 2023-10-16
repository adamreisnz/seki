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
 * File handling
 ***/

/**
 * Get URL
 */
export function getUrl() {
  let url = prompt('Enter game URL')
  if (url) {
    const match = url.match(/https:\/\/online-go\.com\/game\/([0-9]+)/)
    if (match) {
      url = `https://online-go.com/api/v1/games/${match[1]}/sgf`
    }
  }
  return url
}

/**
 * Open file
 */
export function openFile(accept = `.jgf,.sgf,.gib`) {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.onchange = () => {
      const files = Array.from(input.files)
      if (files.length) {
        resolve(files[0])
      }
    }
    input.click()
  })
}

/**
 * Download file
 */
export function downloadFile(data, name, type) {
  const link = document.createElement('a')
  link.href = `data:text/${type};charset=utf-8,${encodeURI(data)}`
  link.target = '_blank'
  link.download = `${name}.${type}`
  link.click()
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
 * Throttle a functino call
 */
export function throttle(fn, delay) {
  let t = 0
  return (...args) => {
    clearTimeout(t)
    t = setTimeout(() => fn(...args), delay)
  }
}

export function dateString(date = new Date()) {
  const day = date.getDate()
  const month = date.getMonth() + 1
  const year = date.getFullYear()
  return `${year}-${month}-${day}`
}
