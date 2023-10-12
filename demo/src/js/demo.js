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
 * Add click handler
 */
export function onClick(query, handler) {
  const elements = findByQuery(query)
  elements.forEach(element => {
    element.addEventListener('click', event => {
      handler(element, event)
    })
  })
}
