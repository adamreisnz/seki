//Classes
import Player from './classes/player.js'
import Board from './classes/board.js'
import Theme from './classes/theme.js'
import Grid from './classes/grid.js'
import StoneFactory from './classes/stone-factory.js'
import MarkupFactory from './classes/markup-factory.js'

//Constants
import * as board from './constants/board.js'
import * as stone from './constants/stone.js'
import * as markup from './constants/markup.js'
import * as player from './constants/player.js'

//Expose on window
window.seki = {
  classes: {
    Player,
    Board,
    Theme,
    Grid,
    StoneFactory,
    MarkupFactory,
  },
  constants: {
    board,
    stone,
    markup,
    player,
  },
}
