//Core classes
import Player from './classes/player.js'
import Board from './classes/board.js'
import BoardStatic from './classes/board-static.js'
import Theme from './classes/theme.js'

//Game related classes
import Game from './classes/game.js'
import GameNode from './classes/game-node.js'
import GamePath from './classes/game-path.js'
import GamePosition from './classes/game-position.js'
import GameScore from './classes/game-score.js'
import GameScorer from './classes/game-scorer.js'

//Base classes for layers, modes and objects
import BoardLayer from './classes/layers/board-layer.js'
import Converter from './classes/converters/converter.js'
import PlayerMode from './classes/modes/player-mode.js'
import GridObject from './classes/objects/grid-object.js'
import Markup from './classes/objects/markup.js'
import Stone from './classes/objects/stone.js'

//Helper classes
import Grid from './classes/grid.js'
import GridChanges from './classes/grid-changes.js'
import EventHandler from './classes/event-handler.js'
import {Outcome, ValidOutcome, ErrorOutcome} from './classes/outcomes.js'

//Class factories
import BoardLayerFactory from './classes/board-layer-factory.js'
import MarkupFactory from './classes/markup-factory.js'
import PlayerModeFactory from './classes/player-mode-factory.js'
import StoneFactory from './classes/stone-factory.js'

//Helpers
import * as color from './helpers/color.js'
import * as coordinates from './helpers/coordinates.js'
import * as grid from './helpers/grid.js'
import * as object from './helpers/object.js'
import * as util from './helpers/util.js'

//Create convenience helpers object
const helpers = {
  color,
  coordinates,
  grid,
  object,
  util,
}

//Constants
import * as app from './constants/app.js'
import * as board from './constants/board.js'
import * as defaults from './constants/defaults.js'
import * as game from './constants/game.js'
import * as jgf from './constants/jgf.js'
import * as markup from './constants/markup.js'
import * as player from './constants/player.js'
import * as score from './constants/score.js'
import * as setup from './constants/setup.js'
import * as sgf from './constants/sgf.js'
import * as stone from './constants/stone.js'
import * as utilConstants from './constants/util.js'

//Create convenience constants object
const constants = {
  app,
  board,
  defaults,
  game,
  jgf,
  markup,
  player,
  score,
  setup,
  sgf,
  stone,
  util: utilConstants,
}

//Export
export {

  //Core classes
  Board,
  BoardStatic,
  Player,
  Theme,

  //Game related classes
  Game,
  GameNode,
  GamePath,
  GamePosition,
  GameScore,
  GameScorer,

  //Base classes for layers, modes and objects
  BoardLayer,
  Converter,
  PlayerMode,
  GridObject,
  Markup,
  Stone,

  //Helper classes
  Grid,
  GridChanges,
  EventHandler,
  Outcome,
  ValidOutcome,
  ErrorOutcome,

  //Factories
  BoardLayerFactory,
  MarkupFactory,
  PlayerModeFactory,
  StoneFactory,

  //Helpers and constants
  helpers,
  constants,
}
