/*
  The MIT License (MIT)

  Copyright (c) 2012 James Halliday, Josh Duff, and other contributors

  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in
  all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
  THE SOFTWARE.
*/

/**
 * Helper functions
 */
function isMergeableObject(value) {
  return isNonNullObject(value) && !isSpecial(value)
}
function isNonNullObject(value) {
  return !!value && typeof value === 'object'
}
function isSpecial(value) {
  if (typeof value === 'function') {
    return true
  }
  const str = Object.prototype.toString.call(value)
  return str === '[object RegExp]' || str === '[object Date]'
}
function emptyTarget(val) {
  return Array.isArray(val) ? [] : {}
}
function clone(value) {
  return isMergeableObject(value)
    ? deepmerge(emptyTarget(value), value)
    : value
}
function arrayMerge(target, source) {
  return target.concat(source).map(element => clone(element))
}
function propertyIsOnObject(object, property) {
  try {
    return property in object
  }
  catch (_) {
    return false
  }
}
function propertyIsUnsafe(target, key) {
  return propertyIsOnObject(target, key)
    && !(Object.hasOwnProperty.call(target, key)
      && Object.propertyIsEnumerable.call(target, key))
}
function mergeObject(target, source) {
  const destination = {}
  if (isMergeableObject(target)) {
    Object
      .keys(target)
      .forEach(key => destination[key] = clone(target[key]))
  }
  Object
    .keys(source)
    .forEach(key => {
      if (propertyIsUnsafe(target, key)) {
        return
      }
      if (propertyIsOnObject(target, key) && isMergeableObject(source[key])) {
        destination[key] = deepmerge(target[key], source[key])
      }
      else {
        destination[key] = clone(source[key])
      }
    })
  return destination
}

/**
 * Deep merge
 */
export function deepmerge(target, source = {}) {
  const sourceIsArray = Array.isArray(source)
  const targetIsArray = Array.isArray(target)
  if (sourceIsArray !== targetIsArray) {
    return clone(source)
  }
  else if (sourceIsArray) {
    return arrayMerge(target, source)
  }
  else {
    return mergeObject(target, source)
  }
}
