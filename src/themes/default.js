import {stoneColors} from '../constants/stone.js'
import {markupTypes} from '../constants/markup.js'

/**
 * Default theme
*/
export default {

  //Board
  board: {

    //Board margin factor
    margin: 0.25,
  },

  //Stones
  stone: {

    //Stone style can be shell, glass, mono, or specify a custom handler service
    style: 'shell',
    shadow: true,
    radius(cellSize) {
      return Math.floor(cellSize / 2) * 0.96
    },

    //Shell stones
    shell: {
      color(stoneColor) {
        if (stoneColor === stoneColors.BLACK) {
          return '#111'
        }
        return '#cfcfca'
      },
      stroke: 'rgba(128,128,150,0.15)',
      types: [
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

    //Mono stones
    mono: {
      lineWidth: 1,
      lineColor() {
        return '#000'
      },
      color(stoneColor) {
        if (stoneColor === stoneColors.BLACK) {
          return '#000'
        }
        return '#fff'
      },
    },

    //Mini stones
    mini: {
      shadow: false,
      scale: 0.5,
      alpha: 1,
    },

    //Captured stones
    captured: {
      shadow: false,
      scale: 1,
      alpha(stoneColor) {
        if (stoneColor === stoneColors.BLACK) {
          return 0.3
        }
        return 0.4
      },
    },

    //Hover stones
    hover: {
      shadow: false,
      scale: 1,
      alpha: 1,
    },
  },

  //Shadows
  shadow: {

    //Shadow gradient colors
    color: 'rgba(40,30,20,0.6)',

    //Shadow size
    size(cellSize) {
      return Math.floor(cellSize / 100)
    },

    //Shadow blur size
    blur(cellSize) {
      return cellSize / 15
    },

    //Shadow offset
    offsetX(cellSize) {
      return Math.ceil(cellSize / 20)
    },
    offsetY(cellSize) {
      return Math.ceil(cellSize / 20)
    },
  },

  //Markup
  markup: {

    //Standard color
    color(stoneColor) {
      if (stoneColor === stoneColors.BLACK) {
        return 'rgba(255,255,255,0.95)'
      }
      return 'rgba(0,0,0,0.95)'
    },

    //Line width
    lineWidth(cellSize) {
      return Math.max(1, Math.floor(cellSize / 16))
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
      font: 'Helvetica',
    },

    //Variation markers
    variation: {
      type: markupTypes.LABEL,
      text(i) {
        return String.fromCharCode(65 + i)
      },
      color(stoneColor) {
        if (stoneColor === stoneColors.WHITE) {
          return 'rgba(255,255,255,0.95)'
        }
        return 'rgba(0,0,0,0.95)'
      },
    },

    //Last move marker
    lastMove: {
      type: markupTypes.CIRCLE,
    },

    //Next move marker
    nextMove: {
      type: markupTypes.CIRCLE,
      scale: 0.9,
      lineDash: '5,10',
      color(stoneColor) {
        if (stoneColor === stoneColors.WHITE) {
          return 'rgba(255,255,255,0.95)'
        }
        return 'rgba(0,0,0,0.95)'
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
      color: 'rgba(60,40,15,.9)',
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
      color: 'rgba(101,69,37,0.5)',
      font: 'Helvetica',
      style: 'bold',
      type: 'numbers',
      inverse: true,
      size() {
        return (ch, cellSize) => Math.floor((cellSize * 0.3) + 3) + 'px'
      },
    },

    //Horizontal coordinates
    horizontal: {
      color: 'rgba(101,69,37,0.5)',
      font: 'Helvetica',
      style: 'bold',
      type: 'letters',
      inverse: false,
      size() {
        return (ch, cellSize) => Math.floor((cellSize * 0.3) + 3) + 'px'
      },
    },
  },
}
