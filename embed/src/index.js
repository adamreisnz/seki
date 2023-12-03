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

//Get helpers
const {
  toggleClass,
} = helpers.util

//Re-export Seki constants and helpers
export {
  constants,
  helpers,
}

//Generate captures string
const capturesString = (count) => `${count} capture${count === 1 ? '' : 's'}`

//Show all move numbers for a static board
const showAllMoveNumbers = (game, board) => {
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
        <div class="seki-controls">
          <button class="seki-button seki-button-first" title="Go to first position">
            <img src="${imageBackwardFast}" />
          </button>
          <button class="seki-button seki-button-back" title="Skip backward">
            <img src="${imageBackwardSkip}" />
          </button>
          <button class="seki-button seki-button-previous" title="Go back">
            <img src="${imageBackwardStep}" />
          </button>
          <button class="seki-button seki-button-play" title="Start auto play">
            <img src="${imagePlay}" />
          </button>
          <button class="seki-button seki-button-pause seki-hidden" title="Pause auto play">
            <img src="${imagePause}" />
          </button>
          <button class="seki-button seki-button-next" title="Go forward">
            <img src="${imageForwardStep}" />
          </button>
          <button class="seki-button seki-button-forward" title="Skip forward">
            <img src="${imageForwardSkip}" />
          </button>
          <button class="seki-button seki-button-last" title="Go to last position">
            <img src="${imageForwardFast}" />
          </button>
        </div>
      </div>
      <div class="seki-info-container">
        <div class="seki-info-players">
          <div class="seki-info-block seki-info-block-black">
            <div class="seki-identity">
              <div class="seki-color seki-color-black"></div>
              <div class="seki-name-and-rank">
                <span class="seki-name seki-name-black">Black</span>
                <small class="seki-small seki-rank-black"></small>
              </div>
            </div>
            <div class="seki-score">
              <span class="seki-captures-black">0 captures</span>
            </div>
          </div>
          <div class="seki-info-block seki-info-block-white">
            <div class="seki-identity">
              <div class="seki-color seki-color-white"></div>
              <div class="seki-name-and-rank">
                <span class="seki-name seki-name-white">White</span>
                <small class="seki-small seki-rank-white"></small>
              </div>
            </div>
            <div class="seki-score">
              <span class="seki-captures-white">0 captures</span>
              <span class="seki-komi"></span>
            </div>
          </div>
        </div>
        <div class="seki-info-game-details">
          <div class="seki-info-block">
            <div class="seki-info-group">
              <label class="seki-label">game</label>
              <div class="seki-game-name"></div>
            </div>
            <div class="seki-info-group">
              <label class="seki-label">date</label>
              <div class="seki-game-date"></div>
            </div>
            <div class="seki-info-group">
              <label class="seki-label">event</label>
              <div class="seki-event"></div>
            </div>
            <div class="seki-info-group">
              <label class="seki-label">result</label>
              <a class="seki-link seki-result-toggle">show</a>
              <div class="seki-game-result seki-hidden"></div>
            </div>
          </div>
        </div>
        <div class="seki-info-comments">
          <div class="seki-info-block seki-comments"></div>
        </div>
      </div>
    </div>
  `

  //Helper to find elements by class name within this player instance
  const findElements = (className) => {
    return Array.from(element.getElementsByClassName(`seki-${className}`))
  }

  //Helper to set text content of an element by class name
  const setText = (className, text) => {
    findElements(className).forEach(el => el.textContent = text)
  }

  //Apply click handler
  const onClick = (className, fn) => {
    findElements(className).forEach(el => el.addEventListener('click', fn))
  }

  //Helper to toggle an element hidden
  const toggleHidden = (className, val) => {
    findElements(className).forEach(el => toggleClass(el, 'seki-hidden', val))
  }

  //Instantiate player and get board element
  const player = new Player(config)
  const boardElement = element
    .getElementsByClassName('seki-player-board')[0]

  //Bootstrap player onto board element
  player.bootstrap(boardElement)

  //Game load handler
  player.on('gameLoad', () => {
    const {game} = player
    const {black, white} = game.getPlayers()
    const komi = game.getKomi()
    const result = game.getGameResult()
    const name = game.getGameName()
    const date = game.getGameDate()
    const eventName = game.getEventName()
    const eventLocation = game.getEventLocation()
    const eventRound = game.getEventRound()
    setText('comments', '')
    setText('name-black', black.name || 'Black')
    setText('name-white', white.name || 'White')
    setText('rank-black', black.rank || '')
    setText('rank-white', white.rank || '')
    setText('komi', komi ? `+${komi}` : '')
    setText('game-result', result || '')
    setText('game-name', name || '')
    setText('game-date', date || '')
    setText('event', '')
    if (eventName || eventLocation || eventRound) {
      const parts = [
        eventName,
        eventLocation,
        eventRound,
      ].filter(p => !!p)
      if (parts.length > 0) {
        setText('event', parts.join(', '))
      }
    }
  })

  //Path change handler
  player.on('pathChange', () => {

    //Get data
    const {game} = player
    const {black, white} = game.getCaptureCount()
    const node = game.getCurrentNode()

    //Set comments
    if (node.hasComments()) {
      const comments = node
        .getComments()
        .join('\n\n')
      setText('comments', comments)
    }
    else {
      setText('comments', '')
    }

    //Set captures
    setText(element, 'captures-black', capturesString(black))
    setText(element, 'captures-white', capturesString(white))
  })

  //Auto play toggle handler
  player.on('autoPlayToggle', event => {
    const {isAutoPlaying} = event.detail
    toggleHidden('button-play', isAutoPlaying)
    toggleHidden('button-pause', !isAutoPlaying)
  })

  //Bind click handlers for controls
  onClick('button-first', () => player.goToFirstPosition())
  onClick('button-back', () => player.goBackNumPositions())
  onClick('button-previous', () => player.goToPreviousPosition())
  onClick('button-play', () => player.toggleAutoPlay())
  onClick('button-pause', () => player.toggleAutoPlay())
  onClick('button-next', () => player.goToNextPosition())
  onClick('button-forward', () => player.goForwardNumPositions())
  onClick('button-last', () => player.goToLastPosition())

  //Bind click handler for result toggle
  onClick('result-toggle', () => {
    toggleHidden('result-toggle', true)
    toggleHidden('game-result', false)
  })

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
