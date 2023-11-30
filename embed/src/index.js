import imageWood1 from './assets/images/wood-1.jpg'
import imageBackwardFast from './assets/images/backward-fast.svg'
import imageBackwardSkip from './assets/images/backward-skip.svg'
import imageBackwardStep from './assets/images/backward-step.svg'
import imageForwardFast from './assets/images/forward-fast.svg'
import imageForwardSkip from './assets/images/forward-skip.svg'
import imageForwardStep from './assets/images/forward-step.svg'
import imagePlay from './assets/images/play.svg'
import imagePause from './assets/images/pause.svg'
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
  .seki-player-container {
    position: relative;
    display: flex;
    flex-direction: column;
    height: 100%;
    flex: 1 0 auto;
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
  .seki-board-static canvas {
    cursor: default;
  }
  .seki-button {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 2.25rem;
    margin: 0;
    border: 0;
    border-radius: 4px;
    background: none;
    outline: none;
    transition: all .2s ease;
  }
  .seki-button img {
    width: 24px;
    height: 24px;
  }
  .seki-button:hover {
    transform: scale(1.05);
  }
  .seki-button:hover, .seki-button.isActive {
    background: #f0f0f0;
  }
  .seki-hidden {
    display: none;
  }
  .seki-navigation {
    padding: 0.5rem 0;
    display: flex;
    justify-content: center;
    width: 100%;
    gap: 0.5rem;
  }
  .seki-navigation .seki-button {
    flex: 1;
  }
`)
document.adoptedStyleSheets.push(css)

//Render button
function renderButton(type, icon, title, onClick) {
  const button = document.createElement('button')
  const image = document.createElement('img')
  image.src = icon
  button.classList.add('seki-button')
  button.classList.add(`seki-button-${type}`)
  button.setAttribute('title', title)
  button.addEventListener('click', onClick)
  button.appendChild(image)
  return button
}

//Render navigation
function renderNavigation(element, player) {

  //Create control elements
  const navElement = document.createElement('div')
  navElement.classList.add('seki-navigation')

  //Create buttons
  const cFirstPos = renderButton(
    'first', imageBackwardFast,
    'Go to first position',
    () => player.goToFirstPosition(),
  )
  const cSkipBack = renderButton(
    'back', imageBackwardSkip,
    'Skip backward',
    () => player.goBackNumPositions(),
  )
  const cPrevPos = renderButton(
    'previous', imageBackwardStep,
    'Go back',
    () => player.goToPreviousPosition(),
  )
  const cPlay = renderButton(
    'play', imagePlay,
    'Start auto play',
    () => player.toggleAutoPlay(),
  )
  const cPause = renderButton(
    'pause', imagePause,
    'Pause auto play',
    () => player.toggleAutoPlay(),
  )
  const cNextPos = renderButton(
    'next', imageForwardStep,
    'Go forward',
    () => player.goToNextPosition(),
  )
  const cSkipForward = renderButton(
    'forward', imageForwardSkip,
    'Skip forward',
    () => player.goForwardNumPositions(),
  )
  const cLastPos = renderButton(
    'last', imageForwardFast,
    'Go to last position',
    () => player.goToLastPosition(),
  )

  //Hide pause button
  helpers.util.toggleClass(cPause, 'seki-hidden', true)

  //Append to controls
  navElement.appendChild(cFirstPos)
  navElement.appendChild(cSkipBack)
  navElement.appendChild(cPrevPos)
  navElement.appendChild(cPlay)
  navElement.appendChild(cPause)
  navElement.appendChild(cNextPos)
  navElement.appendChild(cSkipForward)
  navElement.appendChild(cLastPos)

  //Append to parent element
  element.appendChild(navElement)

  //Listener for auto play toggling
  player.on('autoPlayToggle', event => {
    const {isAutoPlaying} = event.detail
    helpers.util.toggleClass(cPlay, 'seki-hidden', isAutoPlaying)
    helpers.util.toggleClass(cPause, 'seki-hidden', !isAutoPlaying)
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
  const containerElement = document.createElement('div')
  const boardElement = document.createElement('div')
  containerElement.classList.add('seki-player-container')
  containerElement.appendChild(boardElement)
  element.appendChild(containerElement)
  // element.appendChild(boardElement)

  //Instantiate player
  const player = new Player(config)

  //Bootstrap player
  player.bootstrap(boardElement)

  //Load game info from data attribute
  if (element.dataset.game) {
    player.load(element.dataset.game)
  }

  //Render navigation
  if (config.showNavigation) {
    renderNavigation(containerElement, player)
  }

  //Return player
  return {player}
}
