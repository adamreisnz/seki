//Core classes
import {default as SekiPlayer} from './classes/player.js'
import {default as SekiBoard} from './classes/board.js'
import {default as SekiBoardStatic} from './classes/board-static.js'
import {default as SekiTheme} from './classes/theme.js'

//Game related classes
import {default as SekiGame} from './classes/game.js'
import {default as SekiGameNode} from './classes/game-node.js'
import {default as SekiGamePath} from './classes/game-path.js'
import {default as SekiGamePosition} from './classes/game-position.js'
import {default as SekiGameScore} from './classes/game-score.js'
import {default as SekiGameScorer} from './classes/game-scorer.js'

//Base classes for layers, modes and objects
import {default as SekiBoardLayer} from './classes/layers/board-layer.js'
import {default as SekiConverter} from './classes/converters/converter.js'
import {default as SekiPlayerMode} from './classes/modes/player-mode.js'
import {default as SekiGridObject} from './classes/objects/grid-object.js'
import {default as SekiMarkup} from './classes/objects/markup.js'
import {default as SekiStone} from './classes/objects/stone.js'

//Helper classes
import {default as SekiGrid} from './classes/grid.js'
import {default as SekiGridChanges} from './classes/grid-changes.js'
import {default as SekiEventHandler} from './classes/event-handler.js'
import {
  Outcome as SekiOutcome,
  ValidOutcome as SekiValidOutcome,
  ErrorOutcome as SekiErrorOutcome,
} from './classes/outcomes.js'

//Class factories
import {default as SekiBoardLayerFactory} from './classes/board-layer-factory.js'
import {default as SekiMarkupFactory} from './classes/markup-factory.js'
import {default as SekiPlayerModeFactory} from './classes/player-mode-factory.js'
import {default as SekiStoneFactory} from './classes/stone-factory.js'

//Converters
import {default as SekiConvertFromJgf} from './classes/converters/convert-from-jgf.js'
import {default as SekiConvertFromJson} from './classes/converters/convert-from-json.js'
import {default as SekiConvertFromSgf} from './classes/converters/convert-from-sgf.js'
import {default as SekiConvertFromGib} from './classes/converters/convert-from-gib.js'
import {default as SekiConvertToJgf} from './classes/converters/convert-to-jgf.js'
import {default as SekiConvertToJson} from './classes/converters/convert-to-json.js'
import {default as SekiConvertToSgf} from './classes/converters/convert-to-sgf.js'

//Helpers
import * as color from './helpers/color.js'
import * as coordinates from './helpers/coordinates.js'
import * as grid from './helpers/grid.js'
import * as object from './helpers/object.js'
import * as parsing from './helpers/parsing.js'
import * as util from './helpers/util.js'

//Create convenience helpers object
const helpers = {
  color,
  coordinates,
  grid,
  object,
  parsing,
  util,
}

//Constants
import * as app from './constants/app.js'
import * as board from './constants/board.js'
import * as defaults from './constants/defaults.js'
import * as game from './constants/game.js'
import * as markup from './constants/markup.js'
import * as player from './constants/player.js'
import * as score from './constants/score.js'
import * as setup from './constants/setup.js'
import * as stone from './constants/stone.js'
import * as utilConstants from './constants/util.js'

//Extract constants
const {
  appVersion,
  configVersion,
  kifuFormats,
} = app
const {
  boardSides,
  boardLayerTypes,
} = board
const {
  defaultBoardConfig,
  defaultGameInfo,
  defaultPlayerConfig,
  defaultStarPoints,
  defaultTheme,
} = defaults
const {
  gameTypes,
} = game
const {
  markupTypes,
} = markup
const {
  playerModes,
  playerActions,
  editTools,
} = player
const {
  scoreStates,
  scoreTypes,
} = score
const {
  setupTypes,
} = setup
const {
  stoneColors,
  stoneStyles,
  stoneModifierStyles,
} = stone
const {
  kanjiNumbers,
  hangulNumbers,
  keyValues,
  keyCodes,
  mouseEvents,
} = utilConstants

//Export
export {

  //Core classes
  SekiBoard,
  SekiBoardStatic,
  SekiPlayer,
  SekiTheme,

  //Game related classes
  SekiGame,
  SekiGameNode,
  SekiGamePath,
  SekiGamePosition,
  SekiGameScore,
  SekiGameScorer,

  //Base classes for layers, modes and objects
  SekiBoardLayer,
  SekiConverter,
  SekiPlayerMode,
  SekiGridObject,
  SekiMarkup,
  SekiStone,

  //Helper classes
  SekiGrid,
  SekiGridChanges,
  SekiEventHandler,
  SekiOutcome,
  SekiValidOutcome,
  SekiErrorOutcome,

  //Factories
  SekiBoardLayerFactory,
  SekiMarkupFactory,
  SekiPlayerModeFactory,
  SekiStoneFactory,

  //Converters
  SekiConvertFromJgf,
  SekiConvertFromJson,
  SekiConvertFromSgf,
  SekiConvertFromGib,
  SekiConvertToJgf,
  SekiConvertToJson,
  SekiConvertToSgf,

  //Helpers
  helpers,

  //Constants
  appVersion,
  boardLayerTypes,
  boardSides,
  configVersion,
  editTools,
  gameTypes,
  hangulNumbers,
  kanjiNumbers,
  keyCodes,
  keyValues,
  kifuFormats,
  markupTypes,
  mouseEvents,
  playerActions,
  playerModes,
  scoreStates,
  scoreTypes,
  setupTypes,
  stoneColors,
  stoneModifierStyles,
  stoneStyles,

  //Defaults
  defaultBoardConfig,
  defaultGameInfo,
  defaultPlayerConfig,
  defaultStarPoints,
  defaultTheme,
}
