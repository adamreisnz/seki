import {helpers} from '../../../src/index.js'

/**
 * Find elements by query
 */
export function findByQuery(query) {
  if (query.match(/^#/)) {
    const element = findById(query.substring(1))
    return element ? [element] : []
  }
  else if (query.match(/^\./)) {
    const elements = findByClass(query.substring(1))
    return Array.from(elements)
  }
  return []
}

/**
 * Find element by ID
 */
export function findById(id) {
  return document.getElementById(id)
}

/**
 * Find elements by class
 */
export function findByClass(className) {
  return document.getElementsByClassName(className)
}

/**
 * Set text
 */
export function setText(query, text) {
  findByQuery(query).forEach(element => {
    element.textContent = text
  })
}

/**
 * Toggle hidden class on element
 */
export function toggleHidden(elements, value) {
  if (typeof elements === 'string') {
    elements = findByQuery(elements)
  }
  helpers.util.toggleClass(elements, 'hidden', value)
}

/**
 * Toggle active class on element
 */
export function toggleActive(elements, value) {
  if (typeof elements === 'string') {
    elements = findByQuery(elements)
  }
  helpers.util.toggleClass(elements, 'active', value)
}

/**
 * Check if element is active
 */
export function isActive(element) {
  return helpers.util.hasClass(element, 'active')
}

/**
 * Add generic event handler
 */
export function onEvent(query, type, handler) {
  const elements = findByQuery(query)
  elements.forEach(element => {
    element.addEventListener(type, event => {
      handler(element, event)
    })
  })
}

/**
 * Add click handler
 */
export function onClick(query, handler) {
  onEvent(query, 'click', handler)
}

/**
 * Time parser
 */
export function parseTime(time = 0) {
  time = Math.floor(time)
  if (time >= 24 * 3600) {
    const days = String(Math.floor(time / (24 * 3600)))
    return (days === '1') ? `1 day` : `${days} days`
  }
  else if (time >= 3600) {
    const hours = String(Math.floor(time / 3600)).padStart(2, '0')
    const minutes = String(Math.floor((time % 3600) / 60)).padStart(2, '0')
    const seconds = String(time % 60).padStart(2, '0')
    return `${hours}:${minutes}:${seconds}`
  }
  else if (time >= 60) {
    const minutes = String(Math.floor(time / 60)).padStart(2, '0')
    const seconds = String(time % 60).padStart(2, '0')
    return `${minutes}:${seconds}`
  }
  else {
    const seconds = String(time).padStart(2, '0')
    return `00:${seconds}`
  }
}

/**
 * Over time parser
 */
export function parseOverTime(overTime) {
  if (!overTime) {
    return ''
  }
  const match = overTime.match(/[0-9]+x([0-9]+)([a-z -]+)/i)
  if (match) {
    const time = match[1]
    const suffix = match[2]
    if (time >= 24 * 3600) {
      const days = String(Math.floor(time / (24 * 3600)))
      return (days === '1') ? `1 day ${suffix}` : `${days} days ${suffix}`
    }
    else if (time >= 3600) {
      const hours = String(Math.floor(time / 3600))
      const minutes = String(Math.floor((time % 3600) / 60))
      const seconds = String(time % 60)
      return `${hours}h ${minutes}m ${seconds}s ${suffix}`
    }
    else if (time >= 60) {
      const minutes = String(Math.floor(time / 60))
      const seconds = String(time % 60)
      return `${minutes}m ${seconds}s ${suffix}`
    }
    else {
      return `${time}s ${suffix}`
    }
  }
}
