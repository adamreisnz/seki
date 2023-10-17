import {appIdentifier} from '../constants/app.js'

/**
 * Helper to make storage key
 */
export function makeKey(key) {
  return `${appIdentifier}.${key}`
}

/**
 * Get item from local storage
 */
export function get(key, defaultValue) {
  key = makeKey(key)
  try {
    const raw = localStorage.getItem(key)
    if (raw !== null) {
      return JSON.parse(raw)
    }
    return defaultValue
  }
  catch (error) {
    return defaultValue
  }
}

/**
 * Set item in local storage
 */
export function set(key, value) {
  key = makeKey(key)
  try {
    const raw = JSON.stringify(value)
    localStorage.setItem(key, raw)
  }
  catch (error) {
    //Fall through
  }
}

/**
 * Remove item from local storage
 */
export function remove(key) {
  key = makeKey(key)
  try {
    localStorage.removeItem(key)
  }
  catch (error) {
    //Fall through
  }
}
