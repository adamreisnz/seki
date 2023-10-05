export const jgf = {
  record: {
    generator: 'Seki v1.0.0',
    version: 1,
    charset: 'UTF-8',
  },
  game: {
    type: 'go',
    name: 'Demo JGF',
    players: [
      {
        color: 'black',
        name: 'Black',
        rank: '5k',
      },
      {
        color: 'white',
        name: 'White',
        rank: '2d',
      },
    ],
    rules: 'Japanese',
    komi: 0.5,
    result: 'B+R',
  },
  board: {
    width: 9,
    height: 9,
  },
  tree: [
    {
      comments: [
        'Comment at start of game',
      ],
      markup: [
        {
          type: 'triangle',
          coords: [
            {x: 0, y: 0},
            {x: 1, y: 0},
            {x: 2, y: 0},
          ],
        },
        {
          type: 'square',
          coords: [
            {x: 0, y: 1},
            {x: 1, y: 1},
            {x: 2, y: 1},
          ],
        },
        {
          type: 'circle',
          coords: [
            {x: 0, y: 2},
            {x: 1, y: 2},
            {x: 2, y: 2},
          ],
        },
        {
          type: 'select',
          coords: [
            {x: 0, y: 3},
            {x: 1, y: 3},
            {x: 2, y: 3},
          ],
        },
        {
          type: 'mark',
          coords: [
            {x: 0, y: 4},
            {x: 1, y: 4},
            {x: 2, y: 4},
          ],
        },
        {
          type: 'label',
          coords: [
            {x: 0, y: 5, text: 'A'},
            {x: 1, y: 5, text: 'B'},
            {x: 2, y: 5, text: 'C'},
            {x: 0, y: 6, text: '1'},
            {x: 1, y: 6, text: '2'},
            {x: 2, y: 6, text: '3'},
          ],
        },
        {
          type: 'happy',
          coords: [
            {x: 0, y: 7},
            {x: 1, y: 7},
            {x: 2, y: 7},
          ],
        },
        {
          type: 'sad',
          coords: [
            {x: 0, y: 8},
            {x: 1, y: 8},
            {x: 2, y: 8},
          ],
        },
      ],
      setup: [
        {
          type: 'black',
          coords: [
            {x: 0, y: 0},
            {x: 0, y: 1},
            {x: 0, y: 2},
            {x: 0, y: 3},
            {x: 0, y: 4},
            {x: 0, y: 5},
            {x: 0, y: 6},
            {x: 0, y: 7},
            {x: 0, y: 8},
            {x: 5, y: 3},
            {x: 6, y: 4},
          ],
        },
        {
          type: 'white',
          coords: [
            {x: 1, y: 0},
            {x: 1, y: 1},
            {x: 1, y: 2},
            {x: 1, y: 3},
            {x: 1, y: 4},
            {x: 1, y: 5},
            {x: 1, y: 6},
            {x: 1, y: 7},
            {x: 1, y: 8},
            {x: 5, y: 4},
            {x: 5, y: 5},
          ],
        },
      ],
    },
    {
      variations: [
        [
          {move: {B: 'gc'}, comments: ['Comment at first variation'], name: 'First variation'},
          {move: {W: 'gg'}}, {move: {B: 'cc'}}, {move: {W: 'dc'}},
          {move: {B: 'cb'}}, {move: {W: 'db'}}, {move: {B: 'ca'}},
          {move: {W: 'cd'}}, {move: {B: 'da'}}, {move: {W: 'ea'}},
          {move: {B: 'bi'}}, {move: {W: 'ef'}}, {move: {B: 'ch'}},
          {move: {W: 'cg'}}, {move: {B: 'dh'}}, {move: {W: 'dg'}},
          {move: {B: 'eh'}}, {move: {W: 'ge'}}, {move: {B: 'fg'}},
          {move: {W: 'ff'}, comments: ['Some comment']},
          {move: {B: 'gh'}}, {move: {W: 'hg'}}, {move: {B: 'hh'}},
          {move: {W: 'ig'}}, {move: {B: 'ih'}}, {move: {W: 'fd'}},
          {move: {B: 'ai'}}, {move: {W: 'hd'}, comments: ['Some other comment']},
          {move: {B: 'ci'}}, {move: {W: 'eg'}}, {move: {B: 'fh'}},
          {move: {W: 'gi'}}, {move: {B: 'fi'}},
        ],
        [
          {move: {B: 'gg'}, comments: ['Comment at second variation'], name: 'Second variation'},
          [
            [
              {move: {W: 'gc'}, name: 'Third variation'},
              {mode: 'solve', move: {B: 'eg'}},
              [
                [
                  {move: {W: 'ec', solution: true}},
                  {move: {B: 'fe', solution: true}},
                ],
                [
                  {move: {W: 'ge', solution: true}},
                  {move: {B: 'dh', solution: true}},
                ],
              ],
            ],
            [
              {setup: {E: ['aa', 'ba', 'ab', 'bb', 'ac', 'bc', 'ad', 'bd', 'ae', 'be', 'af', 'bf', 'ag', 'bg', 'ah', 'bh']}, comments: ['Variation where setup stones have been removed'], name: 'Fourth variation'},
              {move: {W: 'cc'}},
              {move: {B: 'cg'}},
              {move: {W: 'gc'}},
              {move: {B: 'ef'}},
              {move: {W: 'ed'}},
            ],
          ],
        ],
      ],
    },
  ],
}
