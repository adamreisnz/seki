
/**
 * Convert a value at given grid coordinates to an object
 */
export function toObject(grid, x, y, valueKey) {

  //Create coordinates object
  const obj = {
    x: x,
    y: y,
  }

  //Already an object?
  if (typeof grid[x][y] === 'object') {
    return Object.assign(obj, grid[x][y])
  }

  //Not an object, set value with given value key and return
  obj[valueKey] = grid[x][y]
  return obj
}

/**
 * Helper to subtract sets
 */
export function setSubtract(a, b) {
  const n = []
  let q
  for (let i = 0; i < a.length; i++) {
    q = true
    for (let j in b) {
      if (a[i].x === b[j].x && a[i].y === b[j].y) {
        q = false
        break
      }
    }
    if (q) {
      n.push(a[i])
    }
  }
  return n
}
