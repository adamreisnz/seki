import {appName, appVersion} from './app.js'
import {mouseEvents} from './util.js'
import {gameTypes} from './game.js'
import {playerModes, playerActions} from './player.js'
import {markupTypes} from './markup.js'
import {stoneColors, stoneStyles} from './stone.js'
import {dateString} from '../helpers/util.js'
import {interpolateColorScale, colorLuminance} from '../helpers/color.js'

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

  //The square on the point a stone was just taken off in a simple ko, marking
  //where the player to move may not take it straight back
  showKo: true,

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

//The teal is the "blue spot" analysis tools mark the best move with. It is
//rank, not quality: the engine picks one best move, and only that candidate
//wears it. Point loss cannot stand in for this, as a field of moves can all
//round to giving up nothing while still sitting behind the best one, and
//painting all of them teal would say the engine had no preference.
const bestCandidateColor = '#0e7f8c' //excellent, the blue spot

//Colour anchors for the analysis gradient every other candidate is drawn
//from, keyed on the quality scale the analysis put the move on: 0 for the
//best move there is, 1 for a blunder.
//
//The five colours are the move qualities below the best move — great through
//blunder — and each anchor sits where that quality begins on the scale, so a
//marker's colour agrees with how the same move was graded in the review. The
//grading is what puts a move on the scale, so the two can no longer disagree:
//the bands are exact fifths of it, which also spaces the anchors evenly and
//gives every quality the same visual width. The scale starts at green rather
//than at the excellent band, because that whole band belongs to the best
//move: a runner-up giving up nothing is a great move, not the best one, and
//anything at or below the first anchor reads as that pure green. Between
//anchors the colour interpolates rather than stepping, so a move halfway
//through a band lands halfway between two colours.
const candidateQualityAnchors = [
  {value: 0.2, color: '#3ba03c'}, //great
  {value: 0.4, color: '#8fbe1a'}, //good
  {value: 0.6, color: '#dd8420'}, //inaccuracy
  {value: 0.8, color: '#c8402c'}, //mistake
  {value: 1.0, color: '#8c2f6b'}, //blunder
]

//The same five colours keyed on the points a move gives up against the best
//one available, for an engine that feeds raw losses with no grading behind
//them, and for analyses stored before a quality scale was served. The values
//are the quality thresholds spelt in points at 60 points to the game, the
//same conversion the grading uses; being losses rather than a normalised
//scale they crowd at the good end and crawl at the bad one, which is exactly
//why the quality scale is preferred when there is one.
const candidateAnchors = [
  {value: 0, color: '#3ba03c'}, //great
  {value: 0.6, color: '#8fbe1a'}, //good
  {value: 1.2, color: '#dd8420'}, //inaccuracy
  {value: 3, color: '#c8402c'}, //mistake
  {value: 9, color: '#8c2f6b'}, //blunder
]

//The solid colour for an analysis marker
const candidateColor = (scoreLoss, isBest, qualityScale) => {
  if (isBest) {
    return bestCandidateColor
  }
  if (Number.isFinite(qualityScale)) {
    return interpolateColorScale(candidateQualityAnchors, qualityScale)
  }
  return interpolateColorScale(candidateAnchors, Math.max(0, scoreLoss || 0))
}

//Whether text sits light or dark on a candidate colour. The threshold is
//shared with the review panel, so a marker and the panel entry for the same
//move flip their text together.
const candidateTextColor = (scoreLoss, isBest, qualityScale) => {
  const color = candidateColor(scoreLoss, isBest, qualityScale)
  const luminance = colorLuminance(color)
  return (luminance >= 168) ? '#221c15' : '#fffaf0'
}

//Default theme
export const defaultTheme = {

  //Board
  board: {
    margin: 0.25, //cells
    backgroundColor: '#e2b768',
    backgroundImage: '',
    backgroundImageScale: 1,

    //Optional linear gradient over the background colour, following CSS
    //linear-gradient semantics: an angle in degrees (0 points up, running
    //clockwise) and colour stops as [offset, color] pairs.
    //e.g. {angle: 150, stops: [[0, '#e9bd7c'], [1, '#d4a058']]}
    backgroundGradient: null,
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

    //Gradient stones, drawn as a single radial gradient with colour stops
    //from the theme. The focus point is where the highlight sits, as a
    //fraction of the stone's bounding box, and the gradient runs from there
    //to the farthest corner of that box, like a CSS radial-gradient.
    gradient: {
      shadow: true,
      focus: {x: 0.34, y: 0.28},
      stops(cellSize, stoneColor) {
        if (stoneColor === stoneColors.BLACK) {
          return [[0, '#5c554d'], [0.6, '#201a14'], [1, '#0d0a07']]
        }
        return [[0, '#ffffff'], [0.55, '#efe7d8'], [1, '#cdc0a8']]
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

    //Expected sequence stones (modifier style)
    //
    //NOTE: a move an engine expects but nobody has played. It is drawn as the
    //stone it would be, in the board's own stone style, and only its alpha
    //says it is not there yet. Black needs to fade further than white to read
    //as a ghost, as a dark stone stays dark against the wood long after a
    //pale one has gone to nothing.
    sequence: {
      shadow: false,
      alpha(cellSize, stoneColor) {
        return (stoneColor === stoneColors.BLACK) ? 0.4 : 0.5
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
    //NOTE: the fill and the text colour are both worked out from where the
    //analysis put the candidate on the quality scale — falling back to the
    //points it gives up against the best one when it was put nowhere — and
    //from whether it is the best one, which is what makes the gradient a theme
    //concern rather than drawing code. The quality scale comes last in the
    //handler signatures so that a theme written against the earlier arguments
    //keeps working untouched. The move actually played draws as a rounded
    //square instead of a circle, so shape says "you played here" while colour
    //keeps saying how good it was.
    candidate: {

      //The mock draws a 34px marker at 44px spacing
      scale: 0.77,

      //The number inside the marker is the points given up against the best
      //candidate, the way the analysis apps show it. Colour is quality and
      //text is points: different axes, the same way marker position is engine
      //preference and colour is quality.
      text(scoreLoss/*, cellSize, index, winrateLoss*/) {
        const points = Math.round((scoreLoss || 0) * 10) / 10
        if (points === 0) {
          return '0.0'
        }
        return `${points > 0 ? '-' : '+'}${Math.abs(points).toFixed(1)}`
      },

      //One size whatever the label says; the marker clamps a label that would
      //still overflow. A heavier weight than the default, which only lands on
      //fonts that carry a medium face and falls back to regular elsewhere.
      fontSize(text, cellSize) {
        return Math.round(cellSize * 0.27)
      },
      fontWeight: 500,
      textColor(cellSize, stoneColor, scoreLoss, isBest, qualityScale) {
        return candidateTextColor(scoreLoss, isBest, qualityScale)
      },

      //Solid quality colour under a cream ring. The ring is what separates
      //the marker from the wood and from stones, so it stays opaque.
      color: '#fff9ed',
      fillColor(cellSize, stoneColor, scoreLoss, isBest, qualityScale) {
        return candidateColor(scoreLoss, isBest, qualityScale)
      },
      lineWidth(cellSize) {
        return Math.max(1, cellSize * 0.034)
      },

      //Soft shadow that lifts the marker off the board
      shadowColor: 'rgba(60,35,10,0.35)',
      shadowBlur(cellSize) {
        return cellSize * 0.11
      },
      shadowOffsetY(cellSize) {
        return cellSize * 0.045
      },
    },

    //Expected sequence markers
    //
    //NOTE: these are the follow-up moves of an engine's expected line, drawn
    //as the stone that would be played there, ghosted, with the move's number
    //on top. The stone itself is styled under stone.sequence below, as it is
    //a real stone of whatever style the board uses; what is left here is the
    //number, and by default nothing at all, as the paths this type checks
    //fall through to the move number's own theme. The number is deliberately
    //not faded with the stone under it: it is there to be read.
    sequence: {},

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
