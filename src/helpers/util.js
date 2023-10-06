
//Local debug flag
let debugFlag = false

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
