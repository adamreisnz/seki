import imageWood1 from './assets/images/wood-1.jpg'
import {
  Player,
  Game,
  BoardStatic,
  constants,
  helpers,
} from '../../src/index.js'

//Get constants
// const {
//   playerModes,
//   playerActions,
//   editTools,
// } = constants.player
// const {
//   stoneColors,
// } = constants.stone

//Re-export Seki constants and helpers
export {
  constants,
  helpers,
}

//Apply core Seki CSS to document
const css = new CSSStyleSheet()
css.replaceSync(`
  .seki-player {
    width: 100%;
    height: 100%;
  }
  .seki-board-container {
    position: relative;
    display: flex;
    height: 100%;
    flex: 1 0 auto;
  }
  .seki-board {
    visibility: hidden;
    left: 0;
    top: 0;
    min-width: 50px;
    min-height: 50px;
    box-sizing: content-box;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
  }
  .seki-board-canvas-container {
    position: relative;
    width: 100%;
    height: 100%;
  }
  .seki-board-canvas-container canvas {
    position: absolute;
    max-width: 100%;
    max-height: 100%;
    cursor: pointer;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
  }
  .seki-board-static canvas,
  .seki-player-mode-static .seki-board canvas {
    cursor: default;
  }
`)
document.adoptedStyleSheets.push(css)

//Export static seki board initialiser
export function sekiBoard(element, config = {}) {

  //Extend given config with defaults
  config = Object.assign({
    theme: {
      board: {
        backgroundImage: imageWood1,
      },
    },
  }, config || {})

  //Extend with element data config
  if (element.dataset.config) {
    const json = element.dataset.config.replace(/'/g, '"')
    config = Object.assign(config, JSON.parse(json))
  }

  //Create player and board elements
  const boardElement = document.createElement('div')
  element.appendChild(boardElement)

  //Instantiate static board
  const board = new BoardStatic(config)

  //Bootstrap board
  board.bootstrap(boardElement)

  //Load game info from data attribute (always go to last position)
  if (element.dataset.game) {
    const game = Game.fromData(element.dataset.game)
    game.goToFirstPosition()
    const position = game.getPosition()

    board.loadConfigFromGame(game)
    board.updatePosition(position)
  }

  //Return board
  return board
}

//Export seki player initialiser
export function sekiPlayer(element, config = {}) {

  //Extend given config with defaults
  config = Object.assign({
    theme: {
      board: {
        backgroundImage: imageWood1,
      },
    },
  }, config || {})

  //Extend with element data config
  if (element.dataset.config) {
    const json = element.dataset.config.replace(/'/g, '"')
    config = Object.assign(config, JSON.parse(json))
  }

  //Create player and board elements
  const playerElement = document.createElement('div')
  const boardElement = document.createElement('div')
  playerElement.appendChild(boardElement)
  element.appendChild(playerElement)

  //Instantiate player
  const player = new Player(config)

  //Bootstrap player
  player.bootstrap(playerElement)

  //Load game info from data attribute
  if (element.dataset.game) {
    player.load(element.dataset.game)
  }

  //Return player
  return player
}
