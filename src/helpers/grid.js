
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
