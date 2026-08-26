
//The operations a transformation is built out of
//
//A transformation is a short string of these, applied left to right, so 'rf'
//is a quarter turn followed by a mirror. Composing two transformations is
//therefore string concatenation, which is what makes them cheap to pass
//around and to store.
export const transformationOperations = {
  ROTATE: 'r', //Quarter turn clockwise
  FLIP: 'f', //Mirror left to right
  INVERT: 'i', //Swap the stone colours
}

//Named transformations, in the canonical form normalizeTransformation()
//produces. The diagonal flips mirror the board about one of its diagonals,
//which on a square board is the same as transposing it.
export const boardTransformations = {
  NONE: '',
  ROTATE_90: 'r',
  ROTATE_180: 'rr',
  ROTATE_270: 'rrr',
  FLIP_HORIZONTAL: 'f',
  FLIP_VERTICAL: 'rrf',
  FLIP_DIAGONAL: 'rf',
  FLIP_ANTI_DIAGONAL: 'rrrf',
  INVERT_COLORS: 'i',
}

//The eight symmetries of a board, which is every distinct way of rotating
//and mirroring it. Handy for generating all the presentations of a problem.
export const boardSymmetries = [
  boardTransformations.NONE,
  boardTransformations.ROTATE_90,
  boardTransformations.ROTATE_180,
  boardTransformations.ROTATE_270,
  boardTransformations.FLIP_HORIZONTAL,
  boardTransformations.FLIP_DIAGONAL,
  boardTransformations.FLIP_VERTICAL,
  boardTransformations.FLIP_ANTI_DIAGONAL,
]
