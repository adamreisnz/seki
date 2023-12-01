
//Simple demo board with some stones and markup
export const demo = {
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
      markup: [
        {
          type: 'triangle',
          coords: [
            {x: 1, y: 2},
            {x: 2, y: 2},
            {x: 3, y: 2},
          ],
        },
        {
          type: 'square',
          coords: [
            {x: 1, y: 3},
            {x: 2, y: 3},
            {x: 3, y: 3},
          ],
        },
        {
          type: 'circle',
          coords: [
            {x: 1, y: 4},
            {x: 2, y: 4},
            {x: 3, y: 4},
          ],
        },
        {
          type: 'diamond',
          coords: [
            {x: 1, y: 5},
            {x: 2, y: 5},
            {x: 3, y: 5},
          ],
        },
        {
          type: 'mark',
          coords: [
            {x: 1, y: 6},
            {x: 2, y: 6},
            {x: 3, y: 6},
          ],
        },
        {
          type: 'label',
          coords: [
            {x: 5, y: 3, text: 'A'},
            {x: 6, y: 3, text: 'B'},
            {x: 7, y: 3, text: 'C'},
            {x: 5, y: 4, text: '1'},
            {x: 6, y: 4, text: '2'},
            {x: 7, y: 4, text: '3'},
          ],
        },
        {
          type: 'happy',
          coords: [
            {x: 5, y: 5},
            {x: 6, y: 5},
            {x: 7, y: 5},
          ],
        },
        {
          type: 'sad',
          coords: [
            {x: 5, y: 6},
            {x: 6, y: 6},
            {x: 7, y: 6},
          ],
        },
      ],
      setup: [
        {
          type: 'black',
          coords: [
            {x: 1, y: 2},
            {x: 1, y: 3},
            {x: 1, y: 4},
            {x: 1, y: 5},
            {x: 1, y: 6},
            {x: 5, y: 3},
            {x: 5, y: 4},
            {x: 5, y: 5},
            {x: 5, y: 6},
          ],
        },
        {
          type: 'white',
          coords: [
            {x: 2, y: 2},
            {x: 2, y: 3},
            {x: 2, y: 4},
            {x: 2, y: 5},
            {x: 2, y: 6},
            {x: 6, y: 3},
            {x: 6, y: 4},
            {x: 6, y: 5},
            {x: 6, y: 6},
          ],
        },
      ],
    },
  ],
}
