import imageWood1 from './assets/images/wood-1.jpg'
import {
  Player,
  Game,
  BoardStatic,
  MarkupFactory,
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
  .seki-navigation {
    background: #f3cf89;
  }
  .seki-button {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 0;
    line-height: 1rem;
    vertical-align: middle;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 1rem;
    color: #513518;
    transition: all .2s ease;
    outline: none;

    width: 2.5rem;
    height: 2.5rem;
    margin: 0;
    padding: 0.125rem;
    border-radius: 8px;
    background: #f3cf89;
  }
  .seki-button:hover {
    transform: scale(1.05);
  }
  .seki-button:hover, .seki-button.isActive {
    color: #513518;
    background: #fff1d5;
  }
`)
document.adoptedStyleSheets.push(css)

//Render button
function renderButton(content, title, onClick) {
  const button = document.createElement('button')
  button.classList.add('seki-button')
  button.textContent = content
  button.setAttribute('title', title)
  button.addEventListener('click', onClick)
  return button
}

//Render navigation
function renderNavigation(element, player) {

  //Create control elements
  const navElement = document.createElement('div')
  navElement.classList.add('seki-navigation')

  //Create buttons
  const cFirstPos = renderButton(
    '|<<', 'Go to first position',
    () => player.goToFirstPosition(),
  )
  const cSkipBack = renderButton(
    '<<', 'Skip backward',
    () => player.goBackNumPositions(),
  )
  const cPrevPos = renderButton(
    '<', 'Go back',
    () => player.goToPreviousPosition(),
  )
  const cAutoPlay = renderButton(
    '▶', 'Toggle auto play',
    () => player.toggleAutoPlay(),
  )
  const cNextPos = renderButton(
    '>', 'Go forward',
    () => player.goToNextPosition(),
  )
  const cSkipForward = renderButton(
    '>>', 'Skip forward',
    () => player.goForwardNumPositions(),
  )
  const cLastPos = renderButton(
    '>>|', 'Go to last position',
    () => player.goToLastPosition(),
  )

  //Append to controls
  navElement.appendChild(cFirstPos)
  navElement.appendChild(cSkipBack)
  navElement.appendChild(cPrevPos)
  navElement.appendChild(cAutoPlay)
  navElement.appendChild(cNextPos)
  navElement.appendChild(cSkipForward)
  navElement.appendChild(cLastPos)

  //Append to parent element
  element.appendChild(navElement)

  //Listener for auto play toggling
  player.on('autoPlayToggle', event => {
    const {isAutoPlaying} = event.detail
    if (isAutoPlaying) {
      cAutoPlay.textContent = '◼'
    }
    else {
      cAutoPlay.textContent = '▶'
    }
  })
}

//Helper to show all move numbers for a static board
function showAllMoveNumbers(game, board) {
  game.node
    .getAllMoveNodes()
    .forEach((node, i) => {
      const {x, y} = node.move
      const number = i + 1
      board
        .add(constants.board.boardLayerTypes.MARKUP, x, y, MarkupFactory
          .create(constants.markup.markupTypes.MOVE_NUMBER, board, {number}))
    })
}

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
  const game = element.dataset.game ? Game.fromData(element.dataset.game) : null

  //Bootstrap board
  board.bootstrap(boardElement)

  //Load game info from data attribute (always go to last position)
  if (game) {
    game.goToFirstPosition()
    game.goToLastPosition()
    const position = game.getPosition()
    board.loadConfigFromGame(game)
    board.updatePosition(position)

    //Show all move numbers
    if (config.showAllMoveNumbers) {
      setTimeout(() => {
        showAllMoveNumbers(game, board)
      })
    }
  }

  //Return board
  return {board, game}
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

  //Render navigation
  if (config.showNavigation) {
    renderNavigation(element, player)
  }

  //Return player
  return {player}
}
