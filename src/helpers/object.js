
/**
 * Copy a given value
 */
export function copy(value) {
  if (value !== null && typeof value === 'object') {
    return JSON.parse(JSON.stringify(value))
  }
  return value
}

/**
 * Flip object keys to values and vice versa
 */
export function flip(obj) {
  return Object
    .fromEntries(Object
      .entries(obj)
      .map(([key, value]) => [value, key]),
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
 * Is object check
 */
export function isObject(item) {
  return (item && typeof item === 'object' && !Array.isArray(item))
}

/**
 * Deep merge
 */
export function merge(target, source) {
  const output = Object.assign({}, target)
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] })
        }
        else {
          output[key] = merge(target[key], source[key])
        }
      }
      else {
        Object.assign(output, { [key]: source[key] })
      }
    })
  }
  return output
}
