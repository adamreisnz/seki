# JGF specification

````javascript
JGF = {

  //Game record information
  record: {

    //JGF version
    version: 1,

    //Character set of the file
    charset: "UTF-8",

    //The application that was used to generate the game record file
    generator: "Seki v1.0.0",

    //The person (or program) who created the game record file
    transcriber: "Adam Reis"
  },

  //Source of the game record
  source: {

    //The name of the source
		name: "Go magazine",

    //The URL of the source, if applicable
    url: "https://gomagazine.example.org/kifu/123",

		//Any copyright notice
		copyright: "Copyright 2014",
  },

	//Game information
	game: {

		//The type of game
		type: "go",

		//The game name
		name: "Lee Sedol beats Lee Chang-Ho",

		//The game result, using the following format:
		//
		//  W+4.5 (white wins by 4.5 points)
		//  B+R (black wins by resignation)
		//  W+T (white wins by time)
		//  B+F (black wins by forfeit)
		//  0 (draw / jigo)
		//  ? (unknown result)
		//  <empty string> (no result or suspended play)
		//
		result: "W+4.5",

    //Date this game was played on in ISO format
    date: "2023-06-12",

		//If played on more than one date, specify an array of date values
		dates: [
      "2011-04-22",
      "2011-04-23"
    ],

		//Opening used
		opening: "Low chinese",

		//The annotator/commentator of the game
		annotator: "An Younggil",

		//General game description
		description: "This is a general description about this game"
	},

  //Players involved
  players: [

    //For maximum flexibility, this is an array with player objects. This allows
    //for more than 2 players, and for colors other than black and white.
    {
      //Player color (full color name in english, all lowercase)
      color: "black",

      //Player name
      name: "Lee Chang-Ho",

      //Player rank at time of the game, e.g. 15k, 4d, 2p
      rank: "9p",

      //Player team, if any
      team: "",

      //Player country, if any
      country: "South Korea",

      //Whether the player is a professional player
      pro: true,

      //Whether the player was an AI engine
      ai: false
    },
    {
      color: "white",
      name: "Lee Sedol",
      rank: "9p",
      country: "South Korea",
      pro: true
    }
  ],

  //Event information
  event: {

    //The name of the event this game was played fo
		name: "3rd Fujitsu cup",

    //Where the event was held
		location: "Seoul",

		//The round of the event
		round: "Semi finals",
  },

  //Game rules
  rules: {

    //The rule set used
		ruleSet: "Japanese",

    //Whether suicide moves are allowed
    allowSuicide: false,

    //Whether any board position is disallowed to repeat (as opposed to just ko's)
    disallowRepeats: false,

    //Komi used (can be negative)
		komi: 6.5,

		//Handicap used (does not imply any particular way of handicap stone placement)
		handicap: 0,

    //Main time (in seconds)
    mainTime: 7200,

    //Overtime
    overTime: '3x20 byo-yomi',
  },

	//Board properties
	board: {

    //Board size (if square)
    size: 19,

		//The board size can also specified by width and height separately, to
		//allow support for non-square boards
		width: 19,
		height: 19,

		//Cut-off part of the grid (for displaying problems)
    cutOffTop: 5, //Will cut off 5 rows from the top
    cutOffBottom: 0,
    cutOffLeft: 10, //Will cut off 10 columns from the left
    cutOffRight: 0,
	},

  //Instructions for the game record replayer
	settings: {

    //Show the last played move
    showLastMove: false,

    //Show the next move when replaying
    showNextMove: false,

		//Show child variations of current node
		showVariations: true,

		//Show sibling variations of current node
		showSiblingVariations: false,

    //Show solutions for problems
		showSolutions: false,

    //...extensible with other custom instructions for various players
	},

  //Meta data for any other information to be saved with the record
  meta: {
    foo: "Bar",
  },

	//Moves tree
	tree: [

		//First (root) node may contain comments, board setup or just a blank board.
		//It cannot contain moves or variations
		{

			//Comments are placed in an array and each comment can either be
			//a simple string, or an object if more information is present.
			comments: [

				//Simple comments
				"These are comments shown at the start of the game.",
				"Every separate comment has it's own entry.",

				//More detailed comments
				{
					//Commentator name
					name: "C. Ommentator",

					//Comment timestamp
					timestamp: "2023-12-08 14:30",

					//The actual comment
					comment: "This is my comment"
				}
			]
		},

		//Second node and onwards contain moves, setup instructions or variations.
		//Moves are indicated by the color of the player whose turn it was and the
		//move coordinates. Move coordinates are an array with the X and Y coordinate.
		{
			move: {
        color: "black",
        x: 2,
        y: 3,
      }
		},

		//Pass moves are indicated with a "pass" flag
		{
      move: {
        color: "white",
        pass: true,
      }
		},

    //You can specify remaining time & byo-yomi periods per move
    {
			move: {
        color: "black",
        x: 2,
        y: 3,
        timeLeft: 345, //seconds
        periodsLeft: 3,
      }
		},

		//A move node may contain other annotation as well, like comments or markup
		{
			move: {
        color: "black",
        x: 2,
        y: 4,
      },
			comments: [
        "Move comment",
        "Another comment"
      ]
		},

		//A node can be named using the name property
		{
			name: "Node name",
      move: {
        color: "white",
        x: 15,
        y: 15,
      }
		},

		//Markup can be added to any node
		{
      move: {
        color: "black",
        x: 3,
        y: 15,
      },

			//Markup is contained in its own array container
			markup: [

        //Default types are "circle", "triangle", "square", "mark", "label" and "selected".
				//However, any other type can be specified in order to store custom markup types.
        {
          type: "triangle",
          coords: [
            {x: 4, y: 3},
            {x: 5, y: 3},
          ],
        },
        {
          type: "circle",
          coords: [
            {x: 6, y: 4},
            {x: 7, y: 4},
          ],
        },

        //Label markup gets a text property to indicate label contents
        {
          type: "label",
          coords: [
            {x: 8, y: 5, text: "A"},
            {x: 9, y: 5, text: "1"},
          ],
        },
      ],
		},

		//Setup instructions always get their own node and cannot be combined with moves.
		{
			//Setup positions are indicated with color as type
			setup: [
        {
          type: "black",
          coords: [
            {x: 4, y: 16},
            {x: 2, y: 15},
            {x: 9, y: 9},
          ],
        },
        {
          type: "white",
          coords: [
            {x: 3, y: 15},
          ],
        },

        //Instructions to clear a grid spot are indicated with the "clear" type
        {
          type: "clear",
          coords: [
            {x: 7, y: 18},
          ],
        }
			],

			//The player turn can be specified in setup nodes as well.
			turn: "white"
		},

		//When scoring a position, a scoring node is used
		{

			//Scoring instructions indicate black and white territory.
			//These points must be unique and can overlap existing stones.
			//For japanese scoring, existing (living) stone positions can be
			//excluded. For chinese scoring, they can be included.
			score: [
        {
          color: "black",
          coords: [
            {x: 0, y: 0},
            {x: 0, y: 1},
            {x: 1, y: 1},
          ],
        },
        {
          color: "white",
          coords: [
            {x: 6, y: 2},
            {x: 6, y: 3},
            {x: 7, y: 2},
          ],
        },
      ],
		},

		//For problems, a node with the correct solution can be marked as follows
		{
			solution: true,
      move: {
        color: "white",
        x: 15,
        y: 6,
      },
		},

		//Variations are contained in a variations node
    {
      variations: [
        //Each variation's nodes are contained in a child moves container.
        //Variation nodes themselves adhere to the same specifications.
        [
          {
            name: "Variation 1",
            move: {
              color: "black",
              x: 3,
              y: 15,
            },
          },
          {
            move: {
              color: "white",
              x: 3,
              y: 16,
            },
          }
        ],
        [
          {
            name: "Variation 2",
            move: {
              color: "black",
              x: 3,
              y: 16,
            },
          },
          {
            move: {
              color: "white",
              x: 3,
              y: 15,
            },
          }
        ]
      ]
    },
	]
};
````
