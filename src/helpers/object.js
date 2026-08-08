import {deepmerge} from './deepmerge.js'

/**
 * Merge implementation
 *
 * Deep merges source into target and returns a new object, leaving both
 * inputs untouched. Arrays in the source replace arrays in the target rather
 * than being appended to them, so a caller can override a default array
 * (e.g. availableModes, mouseBindings) instead of only adding to it.
 */
export function merge(...args) {
  return deepmerge(...args)
}

/**
 * Deep copy a given value
 *
 * Primitives and functions come back as they went in, plain objects and arrays
 * are copied all the way down, and dates and regexes are rebuilt.
 *
 * NOTE: this used to be a JSON round trip, which silently dropped anything
 * JSON has no representation for. Theme config is full of handler functions,
 * so getConfigCopy() on a theme came back stripped of every one of them and
 * unusable. Undefined values and dates went the same way.
 */
export function copy(value) {

  //Primitives and functions are handed back as they are. A function is copied
  //by reference on purpose: theme handlers are behaviour, not data.
  if (value === null || typeof value !== 'object') {
    return value
  }

  //Dates and regexes are rebuilt rather than shared
  if (value instanceof Date) {
    return new Date(value.getTime())
  }
  if (value instanceof RegExp) {
    return new RegExp(value.source, value.flags)
  }

  //Arrays
  if (Array.isArray(value)) {
    return value.map(entry => copy(entry))
  }

  //Plain objects, own enumerable properties only
  const result = {}
  for (const key of Object.keys(value)) {
    result[key] = copy(value[key])
  }
  return result
}

/**
 * Flip object keys to values and vice versa
 */
export function flip(obj) {
  return Object
    .fromEntries(Object
      .entries(obj)
      .map(([key, value]) => [value, key])
    )
}

/**
 * Get path in an object
 */
export function get(obj, path, defaultValue = undefined) {

  //Invalid path given
  if (typeof path !== 'string') {
    throw new Error(`Invalid path given for lookup: ${path}`)
  }

  //Split path in object keys to traverse
  const keys = path.split('.')
  for (let i = 0; i < keys.length && obj !== undefined; i++) {
    const key = keys[i]
    obj = (obj !== null) ? obj[key] : undefined
  }

  //Return default value if undefined
  if (obj === undefined) {
    return defaultValue
  }

  //Return reference
  return obj
}

/**
 * Set a value in an object by path
 */
export function set(obj, path, value) {

  //Invalid path
  if (typeof path !== 'string') {
    throw new Error(`Invalid path given for set: ${path}`)
  }

  //Split path in object keys to traverse
  const keys = path.split('.')
  for (let i = 0; i < keys.length; i++) {
    if ((i + 1) === keys.length) {
      obj[keys[i]] = value
      break
    }
    if (typeof obj[keys[i]] === 'undefined') {
      obj[keys[i]] = {}
    }
    obj = obj[keys[i]]
  }
}

/**
 * Object check
 */
export function isObject(obj) {
  return !!obj && typeof obj === 'object'
}
