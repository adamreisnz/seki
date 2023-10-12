import {appName, appVersion} from './app.js'
import {keyCodes, mouseEvents} from './common.js'
import {gameTypes} from './game.js'
import {jgfVersion} from './jgf.js'
import {playerModes, playerActions} from './player.js'
import {markupTypes} from './markup.js'
import {stoneColors, stoneStyles} from './stone.js'
import {dateString} from '../helpers/util.js'

//Default game info
export const defaultGameInfo = {
  record: {
    version: jgfVersion,
    charset: 'UTF-8',
    generator: `${appName} v${appVersion}`,
  },
  game: {
    type: gameTypes.GO,
    dates: [
      dateString(),
    ],
  },
  players: [
    {
      color: stoneColors.BLACK,
      name: 'Black',
    },
    {
      color: stoneColors.WHITE,
      name: 'White',
    },
  ],
  board: {
    size: 19,
  },
  rules: {
    komi: 0,
    handicap: 0,
  },
}

//Default board configuration
export const defaultBoardConfig = {

  //Width and height
  size: 19,

  //Grid cut-off sides
  cutoff: {
    top: false,
    bottom: false,
    left: false,
    right: false,
  },

  //Section of board to display
  section: {
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },

  //Flags
  showCoordinates: true,
  swapColors: false,
}

//Default player configuration
export const defaultPlayerConfig = {

  //Available modes
  availableModes: [
    playerModes.STATIC,
    playerModes.PLAY,
    playerModes.REPLAY,
    playerModes.EDIT,
    playerModes.SOLVE,
  ],

  //Initial mode
  initialMode: playerModes.REPLAY,

  //Key bindings
  keyBindings: {

    //General
    [keyCodes.ESC]: playerActions.CANCEL_ACTION,

    //Mode selection
    [keyCodes.R]: playerActions.SET_MODE_REPLAY,
    [keyCodes.E]: playerActions.SET_MODE_EDIT,

    //Navigation
    [keyCodes.LEFT]: playerActions.PREV_POSITION,
    [keyCodes.RIGHT]: playerActions.NEXT_POSITION,
    [keyCodes.UP]: playerActions.PREV_VARIATION,
    [keyCodes.DOWN]: playerActions.NEXT_VARIATION,

    //Setup tool selection
    [keyCodes.Q]: playerActions.SET_EDIT_TOOL_STONE,
    [keyCodes.W]: playerActions.SET_EDIT_TOOL_CLEAR,

    //Markup tool selection
    [keyCodes.A]: playerActions.SET_EDIT_TOOL_TRIANGLE,
    [keyCodes.S]: playerActions.SET_EDIT_TOOL_SQUARE,
    [keyCodes.D]: playerActions.SET_EDIT_TOOL_DIAMOND,
    [keyCodes.F]: playerActions.SET_EDIT_TOOL_CIRCLE,
    [keyCodes.G]: playerActions.SET_EDIT_TOOL_MARK,
    [keyCodes.H]: playerActions.SET_EDIT_TOOL_HAPPY,
    [keyCodes.J]: playerActions.SET_EDIT_TOOL_SAD,
    [keyCodes.K]: playerActions.SET_EDIT_TOOL_NUMBER,
    [keyCodes.L]: playerActions.SET_EDIT_TOOL_LETTER,
  },

  //Mouse bindings
  mouseBindings: {
    [mouseEvents.WHEEL_UP]: playerActions.PREV_POSITION,
    [mouseEvents.WHEEL_DOWN]: playerActions.NEXT_POSITION,
    [mouseEvents.WHEEL_LEFT]: playerActions.PREV_VARIATION,
    [mouseEvents.WHEEL_RIGHT]: playerActions.NEXT_VARIATION,
  },

  //Audio
  audio: {
    move: null,
    capture: null,
  },

  //Flags
  swapColors: false,
  showLastMove: true,
  showNextMove: false,
  showCoordinates: true,
  showSolutions: false,
  showAllMoveNumbers: false,
  showVariationMoveNumbers: true,
  showVariations: true,
  showSiblingVariations: false,
  rememberVariationPaths: true,
  allowMovesInReplayMode: true,

  //Number of moves to skip at a time
  numSkipMoves: 10,

  //Allow player configuration settigns to be loaded from game records
  allowPlayerConfig: true,
}

//Default theme
export const defaultTheme = {

  //Board
  board: {
    margin: 0.25,
    stoneStyle: stoneStyles.SLATE_SHELL,
  },

  //Stones
  stone: {

    //Base
    base: {
      radius(cellSize) {
        return Math.floor(cellSize / 2) * 0.96
      },
      shadow: true,
    },

    //Slate and shell stones
    slateShell: {
      color(cellSize, stoneColor) {
        return (stoneColor === stoneColors.BLACK) ? '#111' : '#cfcfca'
      },
      shellStroke: 'rgba(128,128,150,0.15)',
      shellTypes: [
        {
          lines: [
            0.10, 0.12, 0.11, 0.10,
            0.09, 0.09, 0.09, 0.09,
          ],
          factor: 0.15,
          thickness: 1.75,
        },
        {
          lines: [
            0.10, 0.09, 0.08, 0.07,
            0.09, 0.06, 0.06, 0.07,
            0.07, 0.06, 0.06,
          ],
          factor: 0.1,
          thickness: 1.5,
        },
        {
          lines: [
            0.22, 0.11, 0.13,
            0.06, 0.11, 0.09,
          ],
          factor: 0.05,
          thickness: 1.75,
        },
        {
          lines: [
            0.18, 0.23, 0.09, 0.17, 0.14,
          ],
          factor: 0.1,
          thickness: 2,
        },
      ],
    },

    //Glass stones
    glass: {
      color(cellSize, stoneColor) {
        return (stoneColor === stoneColors.BLACK) ? '#111' : '#cfcfca'
      },
    },

    //Mono stones
    mono: {
      radius(cellSize) {
        return Math.floor(cellSize / 2)
      },
      color(cellSize, stoneColor) {
        return (stoneColor === stoneColors.BLACK) ? '#000' : '#fff'
      },
      shadow: false,
      lineWidth: 1,
      lineColor: '#000',
    },

    //Stone shadows
    shadow: {
      color: 'rgba(40,30,20,0.6)',
      size(cellSize) {
        //NOTE: Globally set on layer, hence no stone color here
        return Math.floor(cellSize / 100)
      },
      blur(cellSize) {
        return cellSize / 15
      },
      offsetX(cellSize) {
        return Math.ceil(cellSize / 20)
      },
      offsetY(cellSize) {
        return Math.ceil(cellSize / 20)
      },
    },

    //Points (modifier style)
    points: {
      shadow: false,
      scale: 0.5,
    },

    //Captures (modifier style)
    captures: {
      shadow: false,
      alpha(cellSize, stoneColor) {
        return (stoneColor === stoneColors.BLACK) ? 0.3 : 0.4
      },
    },

    //Hover stones (modifier style)
    hover: {
      shadow: true,
      alpha: 1,
      // alpha(cellSize, stoneColor) {
      //   return (stoneColor === stoneColors.BLACK) ? 0.5 : 0.6
      // },
    },
  },

  //Markup
  markup: {

    //Base
    base: {
      radius(cellSize) {
        if (!cellSize) {
          throw new Error('No cell size!')
        }
        return Math.floor(cellSize / 2)
      },
      color(cellSize, stoneColor) {
        if (stoneColor === stoneColors.BLACK) {
          return 'rgba(255,255,255,0.95)'
        }
        return 'rgba(0,0,0,0.95)'
      },
      lineWidth(cellSize) {
        return Math.max(1, Math.floor(cellSize / 16))
      },
      font: 'Arial',
    },

    //Triangle
    triangle: {
      scale: 0.7,
    },

    //Square
    square: {
      scale: 0.725,
    },

    //Diamond
    diamond: {
      scale: 0.65,
    },

    //Cricle
    circle: {
      scale: 0.55,
    },

    //Select
    select: {
      scale: 0.55,
    },

    //Mark
    mark: {
      lineCap: 'square',
      scale: 0.7,
    },

    //Happy smiley
    happy: {
      lineCap: 'round',
      scale: 0.85,
    },

    //Sad smiley
    sad: {
      lineCap: 'round',
      scale: 0.85,
    },

    //Label
    label: {
      fontSize(text, cellSize) {
        const len = String(text).length
        if (len === 1) {
          return Math.round(cellSize * 0.75)
        }
        else if (len === 2) {
          return Math.round(cellSize * 0.6)
        }
        return Math.round(cellSize * 0.5)
      },
    },

    //Variation markers
    variation: {
      type: markupTypes.LABEL,
      scale: 0.9,
      lineDash(cellSize) {
        const line = Math.max(1, Math.floor(cellSize / 16))
        const dash = Math.max(1, Math.floor(cellSize / 8))
        return [line, dash]
      },
      text(i) {
        // return '' //No text
        // return (i + 1) //Numbers
        return String.fromCharCode(65 + i) //Letters
      },
      fontSize(cellSize) {
        return Math.floor(cellSize * 0.6)
      },
      color(cellSize, stoneColor, isSelected) {
        const opacity = isSelected ? 1 : 0.75
        if (stoneColor === stoneColors.WHITE) {
          return `rgba(255,255,255,${opacity})`
        }
        return `rgba(0,0,0,${opacity})`
      },
    },

    //Last move marker
    lastMove: {
      type: markupTypes.CIRCLE,
      scale: 0.55,
    },

    //Move number
    moveNumber: {
      text(number) {
        return number
      },
      fontSize(cellSize/*, stoneColor, number*/) {
        return Math.round(cellSize * 0.5)
      },
    },

    //Solution paths markup
    solution: {
      valid: {
        type: markupTypes.SELECT,
        text: null,
        color: 'rgba(15, 137, 74, 1)',
        scale: 0.5,
      },
      invalid: {
        type: markupTypes.MARK,
        text: null,
        color: 'rgba(237,9,15,1)',
        scale: 0.3,
      },
    },
  },

  //Grid
  grid: {

    //Cell radius
    radius(cellSize) {
      return Math.floor(cellSize / 2)
    },

    //Line properties
    lineColor: 'rgba(60,40,15,.9)',
    lineWidth(cellSize) {
      if (cellSize > 60) {
        return 2
      }
      else if (cellSize > 50) {
        return 1.5
      }
      return 1
    },
    lineCap: 'square',

    //Star points
    star: {

      //Color and radius
      color: 'rgba(60,40,15,1)',
      radius(cellSize) {
        if (cellSize > 50) {
          return Math.floor((cellSize / 16) + 1)
        }
        else if (cellSize > 30) {
          return 3
        }
        else if (cellSize > 15) {
          return 2
        }
        else if (cellSize > 5) {
          return 1.5
        }
        return 1
      },

      //Locations
      points(width, height) {

        //19x19
        if (width === height && width === 19) {
          return [
            { x: 3, y: 3 }, { x: 9, y: 3 }, { x: 15, y: 3 },
            { x: 3, y: 9 }, { x: 9, y: 9 }, { x: 15, y: 9 },
            { x: 3, y: 15 }, { x: 9, y: 15 }, { x: 15, y: 15 },
          ]
        }

        //13x13
        if (width === height && width === 13) {
          return [
            { x: 3, y: 3 }, { x: 9, y: 3 },
            { x: 3, y: 9 }, { x: 9, y: 9 },
          ]
        }

        //9x9
        if (width === height && width === 9) {
          return [
            { x: 4, y: 4}, { x: 2, y: 2},
            { x: 2, y: 6}, { x: 6, y: 2},
            { x: 6, y: 6},
          ]
        }

        //No star points
        return []
      },
    },
  },

  //Coordinates
  coordinates: {

    //Board margin factor when showing coordinates
    margin: 1.5,

    //Vertical coordinates
    vertical: {
      color: 'rgba(101,69,37,0.9)',
      font: 'Arial',
      type: 'numbers',
      inverse: true,
      size() {
        return (ch, cellSize) => Math.floor((cellSize * 0.4) + 3) + 'px'
      },
    },

    //Horizontal coordinates
    horizontal: {
      color: 'rgba(101,69,37,0.9)',
      font: 'Arial',
      type: 'letters',
      inverse: false,
      size() {
        return (ch, cellSize) => Math.floor((cellSize * 0.4) + 3) + 'px'
      },
    },
  },
}
