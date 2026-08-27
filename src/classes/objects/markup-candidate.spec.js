import {describe, it, expect, vi} from 'vitest'
import MarkupCandidate from './markup-candidate.js'
import Theme from '../theme.js'
import {boardLayerTypes} from '../../constants/board.js'
import {markupTypes} from '../../constants/markup.js'
import {hexToRgb, colorLuminance} from '../../helpers/color.js'

/**
 * A board stand-in with a grid layer that records what it was asked to erase,
 * the same one the markup spec uses
 */
const createBoard = ({stones = {}, cellSize = 44, theme = new Theme()} = {}) => {

  const gridLayer = {
    eraseCell: vi.fn(),
    redrawCell: vi.fn(),
  }

  return {
    gridLayer,
    theme,
    getCellSize: () => cellSize,
    getDisplayColor: color => color,
    getAbsX: x => x * cellSize,
    getAbsY: y => y * cellSize,
    isOnBoard: () => true,
    drawWidth: 400,
    drawHeight: 400,
    get: (layer, x, y) => (
      layer === boardLayerTypes.STONES ? stones[`${x},${y}`] : undefined
    ),
    has: (layer, x, y) => (
      layer === boardLayerTypes.STONES && Boolean(stones[`${x},${y}`])
    ),
    getLayer: () => gridLayer,
  }
}

/**
 * A context that records what it was told to draw with. Fills note the shadow
 * they were drawn under, as the shadow belongs to one shape and not the other.
 */
const createContext = () => {
  const context = {
    translate: vi.fn(),
    setLineDash: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    arc: vi.fn(),
    arcTo: vi.fn(),
    closePath: vi.fn(),
    stroke: vi.fn(),
    fillText: vi.fn(),
    fills: [],
  }
  context.fill = vi.fn(() => context.fills.push({
    fillStyle: context.fillStyle,
    shadowColor: context.shadowColor,
  }))
  return context
}

/**
 * A candidate as it arrives from the API, being one entry of node.analysis
 */
const createCandidate = (board, {
  index = 0,
  score = 0,
  winrate = score / 20,
  qualityScale,
  isBest = index === 0,
  isPlayed = false,
  showText = true,
} = {}) => new MarkupCandidate(board, {
  index,
  qualityScale,
  isBest,
  isPlayed,
  showText,
  loss: {winrate, score},
})

/**
 * The fill colour a given point loss comes out as
 */
const colorFor = (score, rest = {}) => {
  const markup = createCandidate(createBoard(), {index: 1, score, ...rest})
  markup.loadProperties(3, 3)
  return markup.fillColor
}

describe('MarkupCandidate construction', () => {

  it('is a candidate', () => {
    expect(createCandidate(createBoard()).type).toBe(markupTypes.CANDIDATE)
  })

  it('keeps both halves of the loss it was given', () => {
    const markup = createCandidate(createBoard(), {
      index: 2, winrate: 0.031, score: 1.4,
    })
    expect(markup.index).toBe(2)
    expect(markup.winrateLoss).toBe(0.031)
    expect(markup.scoreLoss).toBe(1.4)
    expect(markup.isBest).toBe(false)
    expect(markup.isPlayed).toBe(false)
  })

  it('keeps the grade the analysis gave the move', () => {
    const markup = createCandidate(createBoard(), {
      index: 2, score: 1.4, qualityScale: 0.7,
    })
    expect(markup.qualityScale).toBe(0.7)
  })

  it('survives being handed no loss at all', () => {
    const markup = new MarkupCandidate(createBoard())
    expect(markup.index).toBe(0)
    expect(markup.winrateLoss).toBe(0)
    expect(markup.scoreLoss).toBe(0)
  })

  it('leaves the grade off a move nothing graded', () => {

    //An engine that only reports losses grades nothing, and neither did the
    //analyses stored before the scale existed. Undefined rather than zero,
    //which would read as the best move there is.
    const markup = new MarkupCandidate(createBoard(), {loss: {score: 3.2}})
    expect(markup.qualityScale).toBeUndefined()
  })

  it('survives a loss that only knows its points', () => {

    //A played move the engine never searched carries a loss without a win
    //rate, as there was no search to read one off
    const markup = new MarkupCandidate(createBoard(), {
      loss: {score: 3.2},
      isPlayed: true,
    })
    expect(markup.scoreLoss).toBe(3.2)
    expect(markup.winrateLoss).toBe(0)
    expect(markup.isPlayed).toBe(true)
  })
})

describe('MarkupCandidate colour scale from the quality scale', () => {

  it('lands each quality band on its own colour', () => {

    //The quality scale is the analysis' own grade for the move, 0 for the
    //best there is and 1 for a blunder, and the anchors sit at the band
    //boundaries, so a marker's colour cannot disagree with the verdict the
    //same move was given
    expect(colorFor(0, {qualityScale: 0.2})).toBe('#3ba03c') //great
    expect(colorFor(0, {qualityScale: 0.4})).toBe('#8fbe1a') //good
    expect(colorFor(0, {qualityScale: 0.6})).toBe('#dd8420') //inaccuracy
    expect(colorFor(0, {qualityScale: 0.8})).toBe('#c8402c') //mistake
    expect(colorFor(0, {qualityScale: 1})).toBe('#8c2f6b') //blunder
  })

  it('colours by the grade rather than by the points', () => {

    //This is the whole point of the change: a move can give up next to
    //nothing on the board and still be graded a blunder on win rate, and the
    //marker now says what the review says
    expect(colorFor(1.2, {qualityScale: 1})).toBe('#8c2f6b')
    expect(colorFor(1.2, {qualityScale: 1})).not.toBe(colorFor(1.2))
    expect(colorFor(12, {qualityScale: 0.3}))
      .toBe(colorFor(0, {qualityScale: 0.3}))
  })

  it('gives the whole excellent band to the best move', () => {

    //A runner-up graded anywhere in the excellent band is a great move, not
    //the best one, so it reads as the pure green the scale starts at
    expect(colorFor(0, {qualityScale: 0.05})).toBe('#3ba03c')
    expect(colorFor(0, {qualityScale: 0})).toBe('#3ba03c')
    expect(colorFor(0, {qualityScale: 0.2})).toBe('#3ba03c')
  })

  it('slides between anchors rather than stepping', () => {

    //Halfway through a band is halfway between two colours, which is what
    //the even spacing of the quality scale buys
    const between = colorFor(0, {qualityScale: 0.7})
    expect(between).not.toBe(colorFor(0, {qualityScale: 0.6}))
    expect(between).not.toBe(colorFor(0, {qualityScale: 0.8}))

    //And it reads as between them rather than off on its own: darker than
    //the amber it is leaving and lighter than the red it is heading for,
    //having given up some of both the amber's red and its green
    const [r, g] = hexToRgb(between)
    const [rFrom, gFrom] = hexToRgb('#dd8420')
    const [rTo, gTo] = hexToRgb('#c8402c')
    expect(r).toBeGreaterThan(rTo)
    expect(r).toBeLessThan(rFrom)
    expect(g).toBeGreaterThan(gTo)
    expect(g).toBeLessThan(gFrom)
    expect(colorLuminance(between))
      .toBeGreaterThan(colorLuminance('#c8402c'))
    expect(colorLuminance(between))
      .toBeLessThan(colorLuminance('#dd8420'))
  })

  it('holds at the ends of the scale', () => {

    //Nothing is graded outside 0 to 1, but a scale that runs off its ends
    //quietly is one less thing for a caller to get wrong
    expect(colorFor(0, {qualityScale: 1.4})).toBe('#8c2f6b')
    expect(colorFor(0, {qualityScale: -0.5})).toBe('#3ba03c')
  })

  it('leaves the blue spot to the best move', () => {

    //Rank is what the teal says and the quality scale is quality, so a
    //candidate graded as well as the best one still is not it
    expect(colorFor(0, {index: 1, qualityScale: 0})).toBe('#3ba03c')
    expect(colorFor(9, {index: 0, isBest: true, qualityScale: 1}))
      .toBe('#0e7f8c')
  })

  it('keeps saying what the move gave up in points', () => {

    //Colour is quality and text is points: two different axes, and only the
    //colour moved onto the grade
    const markup = createCandidate(createBoard(), {
      index: 1, score: 1.4, qualityScale: 1,
    })
    markup.loadProperties(3, 3)
    expect(markup.text).toBe('-1.4')
  })
})

describe('MarkupCandidate colour scale from point loss', () => {

  it('falls back to the points when nothing graded the move', () => {

    //An engine feeding raw losses with no grading behind it, and analyses
    //stored before a quality scale was served, both still get a gradient
    expect(colorFor(1.2, {qualityScale: undefined})).toBe('#dd8420')
    expect(colorFor(1.2, {qualityScale: null})).toBe('#dd8420')
    expect(colorFor(3)).toBe('#c8402c')
  })

  it('lands each quality anchor on its own colour', () => {

    //The anchors sit at the point losses where each quality begins, so a
    //marker's colour agrees with how the same move would be graded
    expect(colorFor(0)).toBe('#3ba03c') //great
    expect(colorFor(0.6)).toBe('#8fbe1a') //good
    expect(colorFor(1.2)).toBe('#dd8420') //inaccuracy
    expect(colorFor(3)).toBe('#c8402c') //mistake
    expect(colorFor(9)).toBe('#8c2f6b') //blunder
  })

  it('slides between anchors rather than stepping', () => {

    //A loss between two anchors gets its own colour, not the nearer anchor's
    const between = colorFor(0.3)
    expect(between).not.toBe(colorFor(0))
    expect(between).not.toBe(colorFor(0.6))
  })

  it('holds at plum once a move has given up everything', () => {
    expect(colorFor(14)).toBe(colorFor(9))
    expect(colorFor(80)).toBe(colorFor(9))
  })

  it('paints the best candidate the blue spot', () => {

    //The engine names one best move, and the teal is that rank rather than a
    //quality, so it is the only marker wearing it
    expect(colorFor(0, {index: 0, isBest: true})).toBe('#0e7f8c')
  })

  it('keeps the blue spot off the moves the best one beat', () => {

    //A field of candidates can all round to giving up nothing while still
    //sitting behind the best move: they are great moves, not the best one,
    //so the scale below the blue spot starts at green
    expect(colorFor(0, {index: 3})).toBe('#3ba03c')
    expect(colorFor(0.04, {index: 1})).not.toBe('#0e7f8c')
  })

  it('still slides the near misses apart from each other', () => {

    //Collapsing the excellent band into the best move does not flatten what
    //is behind it: a runner-up that gave up a touch more still reads darker
    expect(colorFor(0.2, {index: 1})).not.toBe(colorFor(0, {index: 2}))
  })

  it('colours a gain the same as giving up nothing', () => {

    //The contract has candidate losses at zero or above, but a negative one
    //is a move that came out better than the best, not off the scale. It is
    //still a move the engine ranked behind the best one, so it is green: a
    //gain does not buy a runner-up the blue spot the way a bare zero did.
    expect(colorFor(-0.4)).toBe('#3ba03c')
    expect(colorFor(-4)).toBe('#3ba03c')
    expect(colorFor(-0.4)).toBe(colorFor(0))
  })

  it('leaves the best move teal even if it reads as a gain', () => {

    //Rank is what the teal says, so the best candidate keeps it whichever
    //side of zero its own loss lands on
    expect(colorFor(-0.4, {index: 0, isBest: true})).toBe('#0e7f8c')
  })

  it('flips its text between light and dark with the colour under it', () => {

    //Every anchor colour is deep enough to want light text; the flip is
    //driven by the luminance of the interpolated colour, so a theme that
    //lightens the scale gets dark text without further work
    const markup = createCandidate(createBoard(), {index: 1, score: 0.6})
    markup.loadProperties(3, 3)
    expect(markup.textColor).toBe('#fffaf0')
  })

  it('rings every candidate in the same cream, at the same weight', () => {

    //The ring is what separates a marker from the wood and from stones, so
    //it does not carry rank and does not vary
    const markers = [0, 0.3, 3, 12].map(score => {
      const markup = createCandidate(createBoard(), {index: 1, score})
      markup.loadProperties(3, 3)
      return markup
    })

    expect(new Set(markers.map(m => m.color)).size).toBe(1)
    expect(new Set(markers.map(m => m.lineWidth)).size).toBe(1)
  })
})

describe('MarkupCandidate point loss', () => {

  const textFor = score => {
    const markup = createCandidate(createBoard(), {index: 1, score})
    markup.loadProperties(3, 3)
    return markup.text
  }

  it('says what the move gives up, to a tenth of a point', () => {
    expect(textFor(0.42)).toBe('-0.4')
    expect(textFor(1.84)).toBe('-1.8')
    expect(textFor(12)).toBe('-12.0')
  })

  it('says nothing was given up when nothing was', () => {
    expect(textFor(0)).toBe('0.0')
    expect(textFor(0.02)).toBe('0.0')
  })

  it('marks a candidate that gains as a gain', () => {

    //The contract has candidate losses at zero or above, but a negative one
    //is a move that came out better than the best, not a bigger loss
    expect(textFor(-0.14)).toBe('+0.1')
  })

  it('keeps one font size whatever the label says', () => {

    //The label is drawn with a maximum width instead, which condenses the
    //rare long number rather than shrinking every marker's text
    const short = createCandidate(createBoard(), {score: 0.4})
    const long = createCandidate(createBoard(), {score: 12.4})

    short.loadProperties(3, 3)
    long.loadProperties(3, 3)

    expect(long.fontSize).toBe(short.fontSize)
  })
})

describe('MarkupCandidate drawing', () => {

  it('lays a cream ring under a solid fill, and labels itself', () => {
    const context = createContext()
    const markup = createCandidate(createBoard(), {index: 2, score: 1.4})

    markup.draw(context, 3, 3)

    expect(context.fills.map(f => f.fillStyle))
      .toEqual([markup.color, markup.fillColor])
    expect(context.fillText)
      .toHaveBeenCalledWith('-1.4', 132, expect.any(Number), expect.any(Number))
  })

  it('drops its shadow from the ring, not the fill on top of it', () => {

    //The ring shape is the whole marker's silhouette, so the shadow falls
    //from marker and ring together, the way it would from one solid object
    const context = createContext()
    const markup = createCandidate(createBoard(), {index: 1, score: 0.5})

    markup.draw(context, 3, 3)

    expect(context.fills[0].shadowColor).toBe(markup.shadowColor)
    expect(context.fills[1].shadowColor).toBe('transparent')
  })

  it('draws a candidate as a circle', () => {
    const context = createContext()
    const markup = createCandidate(createBoard(), {index: 1, score: 0.5})

    markup.draw(context, 3, 3)

    expect(context.arc).toHaveBeenCalled()
    expect(context.arcTo).not.toHaveBeenCalled()
  })

  it('draws the move actually played as a rounded square', () => {

    //Shape says "you played here", so it never collides with what the colour
    //is saying and never reads as a stone
    const context = createContext()
    const markup = createCandidate(createBoard(), {
      index: 3, score: 2.1, isPlayed: true,
    })

    markup.draw(context, 3, 3)

    expect(context.arcTo).toHaveBeenCalled()
    expect(context.arc).not.toHaveBeenCalled()
  })

  it('draws the marker alone when there is no text to show', () => {
    const context = createContext()
    const markup = createCandidate(createBoard(), {showText: false})

    markup.draw(context, 3, 3)

    expect(context.fills).toHaveLength(2)
    expect(context.fillText).not.toHaveBeenCalled()
  })

  it('clears the grid underneath itself', () => {
    const board = createBoard()
    const markup = createCandidate(board)

    markup.draw(createContext(), 3, 3)

    expect(board.gridLayer.eraseCell)
      .toHaveBeenCalledWith(3, 3, markup.radius * 1.1)
  })
})

describe('MarkupCandidate, what the theme can leave off', () => {

  it('draws without a shadow when the theme asks for none', () => {

    //The ring is drawn as a larger shape under the fill so that one shadow
    //falls from both. A theme that wants no shadow gets the same two shapes.
    const theme = new Theme()
    theme.set('markup.candidate.shadowColor', null)
    const context = createContext()

    createCandidate(createBoard({theme})).draw(context, 3, 3)

    //The ring is the fill that carries the shadow, and the marker over it
    //explicitly carries none
    expect(context.fills[0].shadowColor).toBeUndefined()
    expect(context.fills[1].shadowColor).toBe('transparent')
  })

  it('draws the label without a weight when the theme names none', () => {
    const theme = new Theme()
    theme.set('markup.candidate.fontWeight', null)
    const context = createContext()

    createCandidate(createBoard({theme})).draw(context, 3, 3)

    expect(context.font).toMatch(/^\d+px /)
  })

  it('draws the label with the weight the theme names', () => {
    const context = createContext()

    createCandidate(createBoard()).draw(context, 3, 3)

    expect(context.font).toMatch(/^500 \d+px /)
  })
})
