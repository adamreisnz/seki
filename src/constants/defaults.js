import {appName, appVersion} from './app.js'
import {mouseEvents} from './util.js'
import {gameTypes} from './game.js'
import {playerModes, playerActions} from './player.js'
import {markupTypes} from './markup.js'
import {stoneColors, stoneStyles} from './stone.js'
import {dateString} from '../helpers/util.js'

//Default game info
export const defaultGameInfo = {
  record: {
    generator: `${appName} v${appVersion}`,
    charset: 'UTF-8',
  },
  game: {
    type: gameTypes.GO,

    //NOTE: a getter, so that the date is worked out when a game is created
    //rather than when this module is first imported. As a plain value it was
    //fixed for the lifetime of the page, so a long running one went on
    //stamping yesterday's date after midnight.
    get date() {
      return dateString()
    },
  },
  board: {
    size: 19,
  },
}

//Default board configuration
export const defaultBoardConfig = {

  //Width and height
  size: 19,

  //Grid cut-off
  cutOffTop: 0,
  cutOffBottom: 0,
  cutOffLeft: 0,
  cutOffRight: 0,

  //Flags
  showCoordinates: true,
  showStarPoints: true,
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
    playerModes.SCORE,
    playerModes.SOLVE,
  ],

  //Initial mode
  initialMode: playerModes.REPLAY,

  //Mouse bindings
  mouseBindings: [
    {
      mouseEvent: mouseEvents.WHEEL_UP,
      action: playerActions.GO_TO_PREV_POSITION,
    },
    {
      mouseEvent: mouseEvents.WHEEL_DOWN,
      action: playerActions.GO_TO_NEXT_POSITION,
    },
    {
      mouseEvent: mouseEvents.WHEEL_LEFT,
      action: playerActions.SELECT_PREV_VARIATION,
    },
    {
      mouseEvent: mouseEvents.WHEEL_RIGHT,
      action: playerActions.SELECT_NEXT_VARIATION,
    },
  ],

  //Key bindings
  keyBindings: [],

  //Player configuration
  showLastMove: true,
  showNextMove: false,
  showSolutions: false,
  showVariations: true,
  showVariationMoveNumbers: true,
  showAllMoveNumbers: false,
  showLastMoveNumber: false,
  showSiblingVariations: false,
  rememberVariationPaths: true,
  allowPlayerConfig: true,

  //AI analysis overlay. The ownership heat map is an addition to the candidate
  //markers rather than a display of its own, so it needs both flags: wanting
  //the markers without the heat map is the common case.
  showAnalysis: false,
  showAnalysisOwnership: false,

  //Sounds
  playSounds: true,
  soundVolume: 0.5,
  sounds: {
    move: null,
    capture: null,
  },

  //Board configuration
  showCoordinates: true,
  showStarPoints: true,
  swapColors: false,

  //Number of moves to skip at a time
  numSkipMoves: 10,

  //Auto play delay (in ms)
  autoPlayDelay: 1000,
  autoPlayStartsImmediately: true,

  //Free draw events buffer delay (in ms) and color
  freeDrawEventBufferDelay: 50,
  freeDrawColor: '#2688e4',

  //Apply listeners
  applyElementListeners: true,
  applyDocumentListeners: true,
}

//Default star point locations
export const defaultStarPoints = {
  19: [
    {x: 3, y: 3}, {x: 9, y: 3}, {x: 15, y: 3},
    {x: 3, y: 9}, {x: 9, y: 9}, {x: 15, y: 9},
    {x: 3, y: 15}, {x: 9, y: 15}, {x: 15, y: 15},
  ],
  13: [
    {x: 3, y: 3}, {x: 9, y: 3},
    {x: 3, y: 9}, {x: 9, y: 9},
  ],
  9: [
    {x: 4, y: 4}, {x: 2, y: 2},
    {x: 2, y: 6}, {x: 6, y: 2},
    {x: 6, y: 6},
  ],
  7: [
    {x: 3, y: 3},
  ],
  5: [
    {x: 2, y: 2},
  ],
}

//Colour stops for the analysis gradient, keyed on how much win rate a move
//gives up against the best one available.
//
//The scale keeps its resolution where the moves an engine puts forward
//actually sit, being the first few percent, and only then carries on through
//orange and red into purple. That far end is not for candidates, which are all
//moves the engine itself proposed and so cluster in the green: it is for
//grading a move somebody actually played, which can give up any amount.
//
//The lightness climbs from green to gold, as a gold at a green's lightness
//reads as muddy brown rather than as a colour on the same scale. Hues run down
//through zero into negative numbers, which is how a red carries on into a
//magenta and then a purple rather than doubling back through the whole wheel.
const candidateStops = [
  {loss: 0, hsl: [125, 55, 33]}, //green
  {loss: 0.1, hsl: [48, 85, 42]}, //gold
  {loss: 0.25, hsl: [28, 85, 45]}, //orange
  {loss: 0.5, hsl: [2, 75, 45]}, //red
  {loss: 1, hsl: [-70, 50, 42]}, //purple
]

//Hue, saturation and lightness for an analysis marker
const candidateHsl = (winrateLoss, isBest) => {

  //The best move is the blue spot, and the only blue marker there is
  if (isBest) {
    return [205, 72, 42]
  }

  //Find the stop the loss falls short of. Anything at or beyond the last one
  //has given up everything there was to give up, and holds at purple.
  const loss = Math.min(1, Math.max(0, winrateLoss || 0))
  const next = candidateStops.findIndex(stop => loss <= stop.loss)
  if (next <= 0) {
    return candidateStops[0].hsl
  }

  //Interpolate between that stop and the one before it
  const from = candidateStops[next - 1]
  const to = candidateStops[next]
  const share = (loss - from.loss) / (to.loss - from.loss)
  return from.hsl.map((value, i) => value + ((to.hsl[i] - value) * share))
}

//Build a colour from the above, optionally lightened and made translucent for
//the marker's fill
const candidateColor = (winrateLoss, isBest, lighten = 0, alpha = 1) => {
  const [h, s, l] = candidateHsl(winrateLoss, isBest)
  const hue = ((Math.round(h) % 360) + 360) % 360
  return `hsla(${hue},${Math.round(s)}%,${Math.round(l + lighten)}%,${alpha})`
}

//Default theme
export const defaultTheme = {

  //Board
  board: {
    margin: 0.25, //cells
    backgroundColor: '#e2b768',
    backgroundImage: '',
    backgroundImageScale: 1,
    stoneStyle: stoneStyles.SLATE_SHELL,
  },

  //Coordinates
  coordinates: {

    //Board margin factor when showing coordinates
    margin: 1.75, //cells

    //Vertical coordinates
    //NOTE: size is called with the character and cell size, like any other
    //theme handler. It used to be a function returning a function, which meant
    //overriding it with a plain value like '12px' threw.
    vertical: {
      color: 'rgb(68, 44, 20)',
      font: 'Arial',
      type: 'numbers',
      inverse: true,
      size(ch, cellSize) {
        return Math.floor((cellSize * 0.4) + 3) + 'px'
      },
    },

    //Horizontal coordinates
    horizontal: {
      color: 'rgb(68, 44, 20)',
      font: 'Arial',
      type: 'letters',
      inverse: false,
      size(ch, cellSize) {
        return Math.floor((cellSize * 0.4) + 3) + 'px'
      },
    },
  },

  //Stones
  stone: {

    //Base
    base: {
      radius(cellSize) {
        return Math.floor(cellSize / 2) * 0.97
      },
    },

    //Slate and shell stones
    slateShell: {
      color(cellSize, stoneColor) {
        return (stoneColor === stoneColors.BLACK) ? '#111' : '#cfcfca'
      },
      shadow: true,
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
      shadow: true,
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
      color: 'rgba(30,20,10,.6)',
      scale: 0.97,
      size(cellSize) {
        //NOTE: Globally set on layer, hence no stone color here
        return Math.floor(cellSize / 100)
      },
      blur(cellSize) {
        return cellSize / 14
      },
      offsetX(cellSize) {
        return Math.ceil(cellSize / 18)
      },
      offsetY(cellSize) {
        return Math.ceil(cellSize / 18)
      },
    },

    //Points (modifier style)
    points: {
      shadow: false,
      scale(cellSize, stoneColor, probability) {
        return Math.max(0.25, Math.min(0.5, probability))
      },
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

    //Mark
    mark: {
      scale: 0.7,
      lineCap: 'square',
    },

    //Select
    select: {
      scale: 0.55,
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
        const line = Math.max(1, Math.floor(cellSize / 8))
        const dash = Math.max(1, Math.floor(cellSize / 10))
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

    //Analysis candidate markers
    //
    //NOTE: the fill and the ring colour are both worked out from the win rate
    //the candidate gives up against the best one, which is what makes the
    //gradient a theme concern rather than drawing code. The blue marker is
    //simply the candidate that gives up nothing, not a marker of a different
    //kind.
    candidate: {
      scale: 0.92,

      //The number inside the marker is the points given up against the best
      //candidate, the way the analysis apps show it. Win rate drives the
      //colour, because it already carries the weight of the game's phase,
      //while points are what a player can actually read off the board.
      text(scoreLoss/*, cellSize, index, winrateLoss*/) {
        const points = Math.round((scoreLoss || 0) * 10) / 10
        if (points === 0) {
          return '0.0'
        }
        return `${points > 0 ? '-' : '+'}${Math.abs(points).toFixed(1)}`
      },
      fontSize(text, cellSize) {
        const len = String(text).length
        if (len <= 3) {
          return Math.round(cellSize * 0.44)
        }
        else if (len === 4) {
          return Math.round(cellSize * 0.38)
        }
        return Math.round(cellSize * 0.3)
      },
      textColor: 'rgba(0,0,0,0.8)',

      //Ring, and the lighter fill underneath it. The ring is half transparent,
      //so it settles towards what it sits on rather than outlining the marker
      //against the board.
      color(cellSize, stoneColor, winrateLoss, isBest) {
        return candidateColor(winrateLoss, isBest, 0, 0.5)
      },
      fillColor(cellSize, stoneColor, winrateLoss, isBest) {
        return candidateColor(winrateLoss, isBest, 26, 0.75)
      },

      //NOTE: one weight for every marker. This used to thin out as the
      //candidate gave up more, which read as the markers being drawn at
      //different sizes rather than as a scale, and the colour already says
      //everything the weight was saying.
      lineWidth(cellSize/*, stoneColor, winrateLoss, isBest*/) {
        return Math.max(1, Math.round(cellSize / 20))
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

  //AI analysis
  analysis: {

    //Ownership heat map
    ownership: {

      //Points held less firmly than this are too contested to be worth
      //shading, and shading them all makes the board unreadable
      threshold: 0.15,

      //Colour of whoever holds the point
      color(cellSize, stoneColor) {
        return (stoneColor === stoneColors.BLACK) ? '#000' : '#fff'
      },

      //Both the size of the square and how solid it is track how firmly the
      //point is held, on a scale of 0 to 1
      scale(cellSize, stoneColor, strength) {
        return 0.2 + (strength * 0.4)
      },
      alpha(cellSize, stoneColor, strength) {
        return Math.min(0.6, strength * 0.6)
      },
    },
  },

  //Free draw style
  draw: {
    color: '#2688e4',
    lineWidth: 8,
    lineCap: 'round',
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
        if (width === height && defaultStarPoints[width]) {
          return defaultStarPoints[width]
        }
        return []
      },
    },
  },
}
