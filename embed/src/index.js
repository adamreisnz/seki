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
const {
  playerModes,
} = constants.player
const {
  boardLayerTypes,
} = constants.board
const {
  markupTypes,
} = constants.markup

//Re-export Seki constants and helpers
export {
  constants,
  helpers,
}

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
function renderControls(element, player) {

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
  element.appendChild(cFirstPos)
  element.appendChild(cSkipBack)
  element.appendChild(cPrevPos)
  element.appendChild(cPlay)
  element.appendChild(cPause)
  element.appendChild(cNextPos)
  element.appendChild(cSkipForward)
  element.appendChild(cLastPos)

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
        .add(boardLayerTypes.MARKUP, x, y, MarkupFactory
          .create(markupTypes.MOVE_NUMBER, board, {number}))
    })
}

//Export static seki board initialiser
export function sekiBoardStatic(element, config = {}) {

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

  //Instantiate static board
  const board = new BoardStatic(config)
  const game = element.dataset.game ? Game.fromData(element.dataset.game) : null

  //Bootstrap board
  board.bootstrap(element)

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

//Export dynamic seki board initialiser
export function sekiBoardDynamic(element, config = {}) {

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

  //Instantiate player
  const player = new Player(config)

  //Bootstrap player
  player.bootstrap(element)

  //Load game info from data attribute
  if (element.dataset.game) {
    player.load(element.dataset.game)
    player.setMode(playerModes.REPLAY)
  }
  else {
    player.setMode(playerModes.EDIT)
  }

  //Return player
  return {player}
}

//Export seki player initialiser
export function sekiPlayer(element, config = {}) {

  //Extend given config with defaults
  config = Object.assign({
    theme: {
      board: {
        backgroundColor: '',
        backgroundImage: '',
      },
    },
  }, config || {})

  //Extend with element data config
  if (element.dataset.config) {
    const json = element.dataset.config.replace(/'/g, '"')
    config = Object.assign(config, JSON.parse(json))
  }

  //Create HTML structure for player
  element.classList.add('seki-player-container')
  element.innerHTML = `
    <div class="seki-player">
      <div class="seki-player-board-and-controls">
        <div class="seki-player-board"></div>
        <div class="seki-controls-container"></div>
      </div>
      <div class="seki-info-container">
        <div class="seki-info-blocks">
          <div class="seki-info-block seki-info-block-half seki-info-block-black">
            <div class="seki-identity">
              <div class="seki-color seki-color-black"></div>
              <div class="seki-name-and-rank">
                <span class="seki-name">Black</span>
                <small></small>
              </div>
            </div>
            <div class="seki-score">
              <span>0 captures</span>
            </div>
          </div>
          <div class="seki-info-block seki-info-block-half seki-info-block-white">
            <div class="seki-identity">
              <div class="seki-color seki-color-white"></div>
              <div class="seki-name-and-rank">
                <span class="seki-name">White</span>
                <small></small>
              </div>
            </div>
            <div class="seki-score">
              <span>0 captures</span>
              <span>+6.5</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `

  //Instantiate player and get board element
  const player = new Player(config)
  const boardElement = element
    .getElementsByClassName('seki-player-board')[0]

  //Bootstrap player onto board element
  player.bootstrap(boardElement)

  //Load game info from data attribute
  if (element.dataset.game) {
    player.load(element.dataset.game)
    player.setMode(playerModes.REPLAY)
  }
  else {
    player.setMode(playerModes.EDIT)
  }

  //Render controls
  const controlsElement = element
    .getElementsByClassName('seki-controls-container')[0]
  renderControls(controlsElement, player)

  //Return player
  return {player}
}
