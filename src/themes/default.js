import {stoneColors, stoneStyles} from '../constants/stone.js'
import {markupTypes} from '../constants/markup.js'

/**
 * Default theme
*/
export default {

  //Board
  board: {
    margin: 0.25,
    stoneStyle: stoneStyles.SLATE_SHELL,
  },

  //Stones
  stone: {

    //Base
    base: {
      radius(stoneColor, cellSize) {
        return Math.floor(cellSize / 2) * 0.96
      },
      shadow: true,
    },

    //Slate and shell stones
    slateShell: {
      color(stoneColor) {
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
      color(stoneColor) {
        return (stoneColor === stoneColors.BLACK) ? '#111' : '#cfcfca'
      },
    },

    //Mono stones
    mono: {
      radius(stoneColor, cellSize) {
        return Math.floor(cellSize / 2)
      },
      color(stoneColor) {
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
      blur(stoneColor, cellSize) {
        return cellSize / 15
      },
      offsetX(stoneColor, cellSize) {
        return Math.ceil(cellSize / 20)
      },
      offsetY(stoneColor, cellSize) {
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
      alpha(stoneColor) {
        return (stoneColor === stoneColors.BLACK) ? 0.3 : 0.4
      },
    },

    //Hover stones (modifier style)
    hover: {
      shadow: true,
      alpha: 1,
      // alpha(stoneColor) {
      //   return (stoneColor === stoneColors.BLACK) ? 0.5 : 0.6
      // },
    },
  },

  //Markup
  markup: {

    //Base
    base: {
      radius(stoneColor, cellSize) {
        if (!cellSize) {
          throw new Error('No cell size!')
        }
        return Math.floor(cellSize / 2)
      },
      color(stoneColor) {
        if (stoneColor === stoneColors.BLACK) {
          return 'rgba(255,255,255,0.95)'
        }
        return 'rgba(0,0,0,0.95)'
      },
      lineWidth(stoneColor, cellSize) {
        return Math.max(1, Math.floor(cellSize / 16))
      },
      font: 'Helvetica',
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

    //Variation markers
    variation: {
      type: markupTypes.LABEL,
      scale: 0.9,
      lineDash(stoneColor, cellSize) {
        const line = Math.max(1, Math.floor(cellSize / 16))
        const dash = Math.max(1, Math.floor(cellSize / 8))
        return [line, dash]
      },
      text(i) {
        return (i + 1) //Numbers
        // return String.fromCharCode(65 + i) //Letters
      },
      color(stoneColor, isSelected) {
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
