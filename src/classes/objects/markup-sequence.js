import MarkupMoveNumber from './markup-move-number.js'
import StoneFactory from '../stone-factory.js'
import {markupTypes} from '../../constants/markup.js'
import {stoneModifierStyles} from '../../constants/stone.js'

/**
 * Expected sequence markup
 *
 * One of these is drawn per move of the follow-up an engine expects from the
 * current position: the stone that would be played there, ghosted, with the
 * move's number on top of it. The sequence comes from a derived analysis,
 * being the remainder of a candidate's expected line beyond the moves the
 * user already entered, so the numbering carries on from the moves on the
 * board rather than starting over.
 *
 * The stone is a real one — whatever style the board is set to, in the colour
 * of the player expected to play it — drawn through the same modifier style
 * mechanism that fades captured stones and territory. Only its alpha says it
 * has not been played: an expectation should look like the move it is, not
 * like a marker standing in for one. The number on top is drawn at full
 * strength and exactly as a move number is, because that is what it is; a
 * faded number on a faded stone is unreadable, and the point of the number is
 * to be read.
 */
export default class MarkupSequence extends MarkupMoveNumber {

  //Type
  type = markupTypes.SEQUENCE

  /**
   * Constructor
   */
  constructor(board, data = {}) {
    super(board, data)

    //The colour of the expected move, which is both the stone drawn and what
    //the number colours itself against. Fixed by the markup rather than read
    //off the board, the same way variation markup does it.
    this.displayColor = data.color
  }

  /**
   * Get theme paths to check
   *
   * NOTE: a move number's theme sits between this type's own and the base, so
   * the number is drawn exactly as a move number unless a theme says
   * otherwise about sequences specifically.
   */
  getThemePaths(prop) {
    return [
      `markup.${markupTypes.SEQUENCE}.${prop}`,
      `markup.${markupTypes.MOVE_NUMBER}.${prop}`,
      `markup.base.${prop}`,
    ]
  }

  /**
   * Create the ghosted stone this mark is drawn on
   */
  createGhostStone() {
    const {board, displayColor} = this
    const style = board.theme.get('board.stoneStyle')
    const stone = StoneFactory.create(style, displayColor, board)
    return StoneFactory.createCopy(stone, stoneModifierStyles.SEQUENCE)
  }

  /**
   * Draw
   */
  draw(context, x, y) {

    //The stone goes down first, ghosted by its modifier style
    this.createGhostStone().draw(context, x, y)

    //Then the number on top of it, which the parent draws at full strength
    super.draw(context, x, y)
  }
}
