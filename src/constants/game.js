
//Game types
export const gameTypes = {
  GO: 'go',
  OTHELLO: 'othello',
  CHESS: 'chess',
  RENJU: 'renju',
  BACKGAMMON: 'backgammon',
  CHINESE_CHESS: 'chinese_chess',
  SHOGI: 'shogi',
  UNKNOWN: 'unknown',
}

//Default handicap placements for standard board sizes
export const handicapPlacements = {
  9: {
    2: [
      {x: 2, y: 6},
      {x: 6, y: 2},
    ],
    3: [
      {x: 2, y: 6},
      {x: 6, y: 2},
      {x: 6, y: 6},
    ],
    4: [
      {x: 2, y: 2},
      {x: 2, y: 6},
      {x: 6, y: 2},
      {x: 6, y: 6},
    ],
    5: [
      {x: 2, y: 2},
      {x: 2, y: 6},
      {x: 4, y: 4},
      {x: 6, y: 2},
      {x: 6, y: 6},
    ],
    6: [
      {x: 2, y: 2},
      {x: 2, y: 4},
      {x: 2, y: 6},
      {x: 6, y: 2},
      {x: 6, y: 4},
      {x: 6, y: 6},
    ],
    7: [
      {x: 2, y: 2},
      {x: 2, y: 4},
      {x: 2, y: 6},
      {x: 4, y: 4},
      {x: 6, y: 2},
      {x: 6, y: 4},
      {x: 6, y: 6},
    ],
    8: [
      {x: 2, y: 2},
      {x: 2, y: 4},
      {x: 2, y: 6},
      {x: 4, y: 2},
      {x: 4, y: 6},
      {x: 6, y: 2},
      {x: 6, y: 4},
      {x: 6, y: 6},
    ],
    9: [
      {x: 2, y: 2},
      {x: 2, y: 4},
      {x: 2, y: 6},
      {x: 4, y: 2},
      {x: 4, y: 4},
      {x: 4, y: 6},
      {x: 6, y: 2},
      {x: 6, y: 4},
      {x: 6, y: 6},
    ],
  },
  13: {
    2: [
      {x: 3, y: 9},
      {x: 9, y: 3},
    ],
    3: [
      {x: 3, y: 9},
      {x: 9, y: 3},
      {x: 9, y: 9},
    ],
    4: [
      {x: 3, y: 3},
      {x: 3, y: 9},
      {x: 9, y: 3},
      {x: 9, y: 9},
    ],
    5: [
      {x: 3, y: 3},
      {x: 3, y: 9},
      {x: 6, y: 6},
      {x: 9, y: 3},
      {x: 9, y: 9},
    ],
    6: [
      {x: 3, y: 3},
      {x: 3, y: 6},
      {x: 3, y: 9},
      {x: 9, y: 3},
      {x: 9, y: 6},
      {x: 9, y: 9},
    ],
    7: [
      {x: 3, y: 3},
      {x: 3, y: 6},
      {x: 3, y: 9},
      {x: 6, y: 6},
      {x: 9, y: 3},
      {x: 9, y: 6},
      {x: 9, y: 9},
    ],
    8: [
      {x: 3, y: 3},
      {x: 3, y: 6},
      {x: 3, y: 9},
      {x: 6, y: 3},
      {x: 6, y: 9},
      {x: 9, y: 3},
      {x: 9, y: 6},
      {x: 9, y: 9},
    ],
    9: [
      {x: 3, y: 3},
      {x: 3, y: 6},
      {x: 3, y: 9},
      {x: 6, y: 3},
      {x: 6, y: 6},
      {x: 6, y: 9},
      {x: 9, y: 3},
      {x: 9, y: 6},
      {x: 9, y: 9},
    ],
  },
  19: {
    2: [
      {x: 3, y: 15},
      {x: 15, y: 3},
    ],
    3: [
      {x: 3, y: 15},
      {x: 15, y: 3},
      {x: 15, y: 15},
    ],
    4: [
      {x: 3, y: 3},
      {x: 3, y: 15},
      {x: 15, y: 3},
      {x: 15, y: 15},
    ],
    5: [
      {x: 3, y: 3},
      {x: 3, y: 15},
      {x: 15, y: 3},
      {x: 15, y: 15},
      {x: 9, y: 9},
    ],
    6: [
      {x: 3, y: 3},
      {x: 3, y: 9},
      {x: 3, y: 15},
      {x: 15, y: 3},
      {x: 15, y: 9},
      {x: 15, y: 15},
    ],
    7: [
      {x: 3, y: 3},
      {x: 3, y: 9},
      {x: 3, y: 15},
      {x: 9, y: 9},
      {x: 15, y: 3},
      {x: 15, y: 9},
      {x: 15, y: 15},
    ],
    8: [
      {x: 3, y: 3},
      {x: 3, y: 9},
      {x: 3, y: 15},
      {x: 9, y: 3},
      {x: 9, y: 15},
      {x: 15, y: 3},
      {x: 15, y: 9},
      {x: 15, y: 15},
    ],
    9: [
      {x: 3, y: 3},
      {x: 3, y: 9},
      {x: 3, y: 15},
      {x: 9, y: 3},
      {x: 9, y: 9},
      {x: 9, y: 15},
      {x: 15, y: 3},
      {x: 15, y: 9},
      {x: 15, y: 15},
    ],
  },
}
