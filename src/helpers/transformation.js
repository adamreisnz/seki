import {transformationOperations} from '../constants/transformation.js'

//Get the operations
const {ROTATE, FLIP, INVERT} = transformationOperations

/**
 * Parse a transformation into its canonical parts
 *
 * A transformation is a string of operations applied left to right, and any
 * composition of them collapses into at most three quarter turns, at most one
 * flip, and at most one colour inversion. That is what this works out.
 *
 * The collapsing rests on one identity: flipping and then rotating is the same
 * as rotating the other way and then flipping (f·r = r⁻¹·f). So a flip already
 * seen simply reverses the direction every rotation after it turns in, which
 * lets the flip be pushed to the end. Four quarter turns and two flips each
 * cancel out. A colour inversion commutes with both, as it moves nothing.
 */
export function parseTransformation(transformation = '') {

  //Initialise
  let rotations = 0
  let isFlipped = false
  let isInverted = false

  //Go over the operations
  for (const operation of String(transformation)) {
    switch (operation) {
      case ROTATE:
        rotations += isFlipped ? -1 : 1
        break
      case FLIP:
        isFlipped = !isFlipped
        break
      case INVERT:
        isInverted = !isInverted
        break
      default:
        throw new Error(`Invalid transformation operation: ${operation}`)
    }
  }

  //Return the canonical parts
  return {
    rotations: ((rotations % 4) + 4) % 4,
    isFlipped,
    isInverted,
  }
}

/**
 * Rewrite a transformation into its canonical form
 *
 * Every transformation has exactly one canonical form, so two of them describe
 * the same thing if and only if they normalise to the same string.
 */
export function normalizeTransformation(transformation) {
  const {rotations, isFlipped, isInverted} = parseTransformation(transformation)
  return (
    ROTATE.repeat(rotations) +
    (isFlipped ? FLIP : '') +
    (isInverted ? INVERT : '')
  )
}

/**
 * Compose transformations into a single one, applied left to right
 */
export function composeTransformations(...transformations) {
  return normalizeTransformation(transformations.join(''))
}

/**
 * Get the transformation that undoes a given one
 *
 * Undoing a composition means undoing each of its operations in the opposite
 * order. A flip and a colour inversion each undo themselves, and a quarter
 * turn clockwise is undone by three more of them.
 */
export function reverseTransformation(transformation) {
  const reversed = Array
    .from(String(transformation))
    .reverse()
    .map(operation => (operation === ROTATE ? ROTATE.repeat(3) : operation))
    .join('')
  return normalizeTransformation(reversed)
}

/**
 * Check whether a transformation leaves everything as it was
 */
export function isIdentityTransformation(transformation) {
  return (normalizeTransformation(transformation) === '')
}

/**
 * Transform a board size
 *
 * A quarter turn stands the board on its side, so an odd number of them swaps
 * the two dimensions.
 */
export function transformBoardSize(width, height, transformation) {
  const {rotations} = parseTransformation(transformation)
  if (rotations % 2 === 0) {
    return {width, height}
  }
  return {width: height, height: width}
}

/**
 * Transform a single coordinate on a board of the given size
 *
 * The size given is the size of the board the coordinate is on now, before
 * the transformation. Use transformBoardSize() for the size it ends up on.
 */
export function transformCoordinates(x, y, width, height, transformation) {

  //Get the canonical parts
  const {rotations, isFlipped} = parseTransformation(transformation)

  //Turn the board a quarter at a time. Clockwise sends the top left corner to
  //the top right one, and swaps the dimensions as it goes.
  for (let i = 0; i < rotations; i++) {
    const turnedX = height - 1 - y
    const turnedY = x
    const turnedWidth = height
    height = width
    width = turnedWidth
    x = turnedX
    y = turnedY
  }

  //Mirror left to right, on the board as it now stands
  if (isFlipped) {
    x = width - 1 - x
  }

  //Return
  return {x, y}
}

/**
 * Transform a board cut off
 *
 * A cut off hides lines from one side of the board, so it travels round with
 * the board it was cut from: a quarter turn clockwise takes the left edge to
 * the top, the top edge to the right, and so on.
 */
export function transformBoardCutOff(cutOff, transformation) {

  //Get the canonical parts and the sides
  const {rotations, isFlipped} = parseTransformation(transformation)
  let {cutOffLeft, cutOffRight, cutOffTop, cutOffBottom} = cutOff

  //Carry the sides round a quarter at a time
  for (let i = 0; i < rotations; i++) {
    const turnedTop = cutOffLeft
    const turnedRight = cutOffTop
    const turnedBottom = cutOffRight
    const turnedLeft = cutOffBottom
    cutOffTop = turnedTop
    cutOffRight = turnedRight
    cutOffBottom = turnedBottom
    cutOffLeft = turnedLeft
  }

  //A mirror left to right only swaps the two sides it mirrors
  if (isFlipped) {
    const flippedLeft = cutOffRight
    cutOffRight = cutOffLeft
    cutOffLeft = flippedLeft
  }

  //Return
  return {cutOffLeft, cutOffRight, cutOffTop, cutOffBottom}
}
