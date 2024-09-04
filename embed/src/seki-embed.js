import {
  SekiPlayer,
  SekiGame,
  SekiBoardStatic,
  SekiMarkupFactory,
  helpers,
  playerModes,
  playerActions,
  boardLayerTypes,
  stoneColors,
  markupTypes,
  keyValues
} from '../../src/index.js'

//Get helpers
const {
  util: {toggleClass},
} = helpers

//Code source location (images not loading correctly otherwise)
const baseUrl = `https://sekiplayer.com`

//Regexes
const regexSgf = /\(;[A-Za-z0-9[\]]*FF\[[1-4]\](.*)\)/
const regexOgsUrl = /https:\/\/online-go\.com\/game\/([0-9]+)/
const {regexEventUrl} = helpers.parsing

//Generate captures string
const capturesString = (count) => `${count} capture${count === 1 ? '' : 's'}`

//Generate event string
const eventString = (...parts) => parts.filter(Boolean).join(', ')

//Extract event string and link
const eventStringAndLink = (...parts) => {
  const str = eventString(...parts)
  const match = str.match(regexEventUrl)
  if (match) {
    return [str.replace(regexEventUrl, ''), match[2]]
  }
  return [str, null]
}

//Show all move numbers for a static board
const showAllMoveNumbers = (game, board) => {
  game.node
    .getAllMoveNodes()
    .forEach((node, i) => {
      const {x, y} = node.move
      const number = i + 1
      board
        .add(boardLayerTypes.MARKUP, x, y, SekiMarkupFactory
          .create(markupTypes.MOVE_NUMBER, board, {number}))
    })
}

//Append notice
const appendNotice = (element, text = 'Generated using') => {
  const notice = document.createElement('div')
  notice.classList.add('seki-notice')
  notice.innerHTML = `${text} the <a href="https://sekigoplayer.com">Seki Go Player</a>`
  element.appendChild(notice)
}

//Parse URL
const parseUrl = url => {
  if (url) {
    const match = url.match(regexOgsUrl)
    if (match) {
      return `https://online-go.com/api/v1/games/${match[1]}/sgf`
    }
  }
  return url
}

//Parse content loaded from URL
const parseUrlContent = content => {
  if (content) {
    const match = content.match(regexSgf)
    if (match) {
      return match[0]
    }
  }
  return content
}

/**
 * Parse time
 */
const parseTime = (time = 0) => {
  time = Math.floor(time)
  if (time >= 24 * 3600) {
    const days = String(Math.floor(time / (24 * 3600)))
    return (days === '1') ? `1 day` : `${days} days`
  }
  else if (time >= 3600) {
    const hours = String(Math.floor(time / 3600)).padStart(2, '0')
    const minutes = String(Math.floor((time % 3600) / 60)).padStart(2, '0')
    const seconds = String(time % 60).padStart(2, '0')
    return `${hours}:${minutes}:${seconds}`
  }
  else if (time >= 60) {
    const minutes = String(Math.floor(time / 60)).padStart(2, '0')
    const seconds = String(time % 60).padStart(2, '0')
    return `${minutes}:${seconds}`
  }
  else {
    const seconds = String(time).padStart(2, '0')
    return `00:${seconds}`
  }
}

//Load game from data attributes
const loadGame = async(dataset) => {
  if (dataset.game) {
    const data = dataset.game
    return SekiGame.fromData(data)
  }
  else if (dataset.gameUrl) {
    const url = parseUrl(dataset.gameUrl)
    const file = await fetch(url)
    const raw = await file.text()
    const data = parseUrlContent(raw)
    return SekiGame.fromData(data)
  }
  return null
}

//Load game into player
const loadGameIntoPlayer = async(player, dataset) => {
  const game = await loadGame(dataset)
  if (game) {
    player.loadGame(game)
    player.setMode(playerModes.REPLAY)
  }
  else {
    player.setMode(playerModes.EDIT)
  }
}

//Export static seki board initialiser
export async function sekiBoardStatic(element, config = {}) {

  //Extend given config with defaults
  config = Object.assign({
    theme: {
      board: {
        backgroundImage: 'images/wood-1.jpg',
      },
    },
  }, config || {})

  //Extend with element data config
  if (element.dataset.config) {
    const json = element.dataset.config.replace(/'/g, '"')
    config = Object.assign(config, JSON.parse(json))
  }

  //Instantiate static board
  const board = new SekiBoardStatic(config)
  const game = await loadGame(element.dataset)

  //Bootstrap board
  board.bootstrap(element)

  //Append notice
  if (config.showNotice) {
    appendNotice(element)
  }

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
export async function sekiBoardDynamic(element, config = {}) {

  //Extend given config with defaults
  config = Object.assign({
    theme: {
      board: {
        backgroundImage: 'images/wood-1.jpg',
      },
    },
  }, config || {})

  //Extend with element data config
  if (element.dataset.config) {
    const json = element.dataset.config.replace(/'/g, '"')
    config = Object.assign(config, JSON.parse(json))
  }

  //Instantiate player
  const player = new SekiPlayer(config)

  //Bootstrap player
  player.bootstrap(element)

  //Append notice
  if (config.showNotice) {
    appendNotice(element)
  }

  //Load game into player
  await loadGameIntoPlayer(player, element.dataset)

  //Return player
  return {player}
}

//Export seki player initialiser
export async function sekiPlayer(element, config = {}) {

  //Extend given config with defaults
  config = Object.assign({
    theme: {
      board: {
        backgroundColor: '',
        backgroundImage: '',
      },
    },
    availableModes: [
      playerModes.REPLAY,
      playerModes.EDIT,
    ],
    keyBindings: [
      {
        key: keyValues.ARROW_LEFT,
        action: playerActions.GO_TO_PREV_POSITION,
      },
      {
        key: keyValues.ARROW_RIGHT,
        action: playerActions.GO_TO_NEXT_POSITION,
      },
      {
        key: keyValues.ARROW_UP,
        action: playerActions.SELECT_PREV_VARIATION,
      },
      {
        key: keyValues.ARROW_DOWN,
        action: playerActions.SELECT_NEXT_VARIATION,
      },
      {
        key: keyValues.ARROW_LEFT,
        shiftKey: true,
        action: playerActions.GO_BACK_NUM_POSITIONS,
      },
      {
        key: keyValues.ARROW_RIGHT,
        shiftKey: true,
        action: playerActions.GO_FORWARD_NUM_POSITIONS,
      },
      {
        key: keyValues.ARROW_LEFT,
        metaKey: true,
        action: playerActions.GO_TO_FIRST_POSITION,
      },
      {
        key: keyValues.ARROW_RIGHT,
        metaKey: true,
        action: playerActions.GO_TO_LAST_POSITION,
      },
      {
        key: keyValues.ARROW_LEFT,
        altKey: true,
        action: playerActions.GO_TO_PREV_FORK,
      },
      {
        key: keyValues.ARROW_RIGHT,
        altKey: true,
        action: playerActions.GO_TO_NEXT_FORK,
      },
      {
        key: keyValues.ARROW_LEFT,
        altKey: true,
        shiftKey: true,
        action: playerActions.GO_TO_PREV_COMMENT,
      },
      {
        key: keyValues.ARROW_RIGHT,
        altKey: true,
        shiftKey: true,
        action: playerActions.GO_TO_NEXT_COMMENT,
      },
      {
        key: keyValues.SPACE,
        action: playerActions.TOGGLE_AUTO_PLAY,
      },
      {
        key: 'C',
        action: playerActions.TOGGLE_COORDINATES,
      },
    ],
  }, config || {})

  //Extend with element data config
  if (element.dataset.config) {
    const json = element.dataset.config.replace(/'/g, '"')
    config = Object.assign(config, JSON.parse(json))
  }

  //Create HTML structure for player
  element.classList.add('seki-player-container')
  element.innerHTML = `
    <div class="seki-player-wrapper">
      <div class="seki-player-board-and-controls">
        <div class="seki-player-board"></div>
        <div class="seki-controls">
          <button class="seki-button seki-button-first" title="Go to first position">
            <img src="${baseUrl}/images/backward-fast.svg" />
          </button>
          <button class="seki-button seki-button-back" title="Skip backward">
            <img src="${baseUrl}/images/backward-skip.svg" />
          </button>
          <button class="seki-button seki-button-previous" title="Go back">
            <img src="${baseUrl}/images/backward-step.svg" />
          </button>
          <button class="seki-button seki-button-play" title="Start auto play">
            <img src="${baseUrl}/images/play.svg" />
          </button>
          <button class="seki-button seki-button-pause seki-hidden" title="Pause auto play">
            <img src="${baseUrl}/images/pause.svg" />
          </button>
          <button class="seki-button seki-button-next" title="Go forward">
            <img src="${baseUrl}/images/forward-step.svg" />
          </button>
          <button class="seki-button seki-button-forward" title="Skip forward">
            <img src="${baseUrl}/images/forward-skip.svg" />
          </button>
          <button class="seki-button seki-button-last" title="Go to last position">
            <img src="${baseUrl}/images/forward-fast.svg" />
          </button>
        </div>
      </div>
      <div class="seki-info-container">
        <div class="seki-info-players">
          <div class="seki-info-block seki-info-block-black">
            <div class="seki-identity-and-time">
              <div class="seki-identity">
                <div class="seki-color seki-color-black"></div>
                <div class="seki-name-and-rank">
                  <span class="seki-name seki-name-black">Black</span>
                  <span class="seki-rank seki-rank-black"></span>
                </div>
              </div>
              <div class="seki-time seki-time-black"></div>
            </div>
            <div class="seki-score">
              <span class="seki-captures-black">0 captures</span>
            </div>
          </div>
          <div class="seki-info-block seki-info-block-white">
            <div class="seki-identity-and-time">
              <div class="seki-identity">
                <div class="seki-color seki-color-white"></div>
                <div class="seki-name-and-rank">
                  <span class="seki-name seki-name-white">White</span>
                  <span class="seki-rank seki-rank-white"></span>
                </div>
              </div>
              <div class="seki-time seki-time-white"></div>
            </div>
            <div class="seki-score">
              <span class="seki-captures-white">0 captures</span>
              <span class="seki-komi"></span>
            </div>
          </div>
        </div>
        <div class="seki-info-game-details">
          <div class="seki-info-block">
            <div class="seki-info-group seki-info-group-name">
              <label class="seki-label">game</label>
              <div class="seki-game-name"></div>
            </div>
            <div class="seki-info-group seki-info-group-date">
              <label class="seki-label">played on</label>
              <div class="seki-game-date"></div>
            </div>
            <div class="seki-info-group seki-info-group-event">
              <label class="seki-label">played at</label>
              <div class="seki-event-without-link">
                <span class="seki-event"></span>
              </div>
              <div class="seki-event-with-link seki-hidden">
                <a class="seki-event seki-event-link seki-link" target="_blank" href="#"></a>
              </div>
            </div>
            <div class="seki-info-group seki-info-group-result">
              <label class="seki-label">result</label>
              <a class="seki-link seki-result-toggle">Show result</a>
              <div class="seki-game-result seki-hidden"></div>
            </div>
          </div>
        </div>
        <div class="seki-info-comments">
          <div class="seki-info-block">
            <textarea class="seki-comments" readonly></textarea>
          </div>
        </div>
      </div>
    </div>
  `

  //Append notice
  appendNotice(element, `Powered by`)

  //Helper to find elements by class name within this player instance
  const findElements = (className) => {
    return Array.from(element.getElementsByClassName(`seki-${className}`))
  }

  //Helper to set text content of an element by class name
  const setText = (className, text) => {
    findElements(className).forEach(el => el.textContent = text)
  }

  //Helper to set attribute of element by classname
  const setAttr = (className, attr, value) => {
    findElements(className).forEach(el => el.setAttribute(attr, value))
  }

  //Apply click handler
  const onClick = (className, fn) => {
    findElements(className).forEach(el => el.addEventListener('click', fn))
  }

  //Helper to toggle an element hidden
  const toggleHidden = (className, val) => {
    findElements(className).forEach(el => toggleClass(el, 'seki-hidden', val))
  }

  //Show result
  const showResult = () => {
    toggleHidden('result-toggle', true)
    toggleHidden('game-result', false)
  }

  //Instantiate player and get board element
  const player = new SekiPlayer(config)
  const boardElement = element
    .getElementsByClassName('seki-player-board')[0]

  //Bootstrap player onto board element
  player.bootstrap(boardElement)

  //Path change handler
  const onPathChange = () => {

    //Get data
    const {game} = player
    const {black, white} = game.getCaptureCount()
    const node = game.getCurrentNode()
    const blackTimeLeft = game.getTimeLeft(stoneColors.BLACK)
    const whiteTimeLeft = game.getTimeLeft(stoneColors.WHITE)
    const blackPeriodsLeft = game.getPeriodsLeft(stoneColors.BLACK)
    const whitePeriodsLeft = game.getPeriodsLeft(stoneColors.WHITE)

    //Show result
    if (node.isMainPath() && !node.hasChildren()) {
      showResult()
    }

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
    setText('captures-black', capturesString(black))
    setText('captures-white', capturesString(white))

    //Set time left
    if (blackTimeLeft && blackPeriodsLeft) {
      setText('time-black', `${blackPeriodsLeft} x ${blackTimeLeft}s`)
    }
    else if (blackTimeLeft) {
      setText('time-black', parseTime(blackTimeLeft))
    }
    else {
      setText('time-black', '')
    }
    if (whiteTimeLeft && whitePeriodsLeft) {
      setText('time-white', `${whitePeriodsLeft} x ${whiteTimeLeft}s`)
    }
    else if (whiteTimeLeft) {
      setText('time-white', parseTime(whiteTimeLeft))
    }
    else {
      setText('time-white', '')
    }
  }

  //Game load handler
  const onGameLoad = () => {

    //Get data
    const {game} = player
    const {black, white} = game.getPlayers()
    const komi = game.getKomi()
    const result = game.getGameResult()
    const name = game.getGameName()
    const date = game.getGameDate()

    //Clear comments
    setText('comments', '')

    //Set player information
    setText('name-black', black.name || 'Black')
    setText('name-white', white.name || 'White')
    setText('rank-black', black.rank || '')
    setText('rank-white', white.rank || '')
    setText('komi', komi ? `+${komi}` : '')

    //Set game information
    setText('game-result', result || '')
    setText('game-name', name || '')
    setText('game-date', date || '')

    //Set event details
    const [eventStr, eventLink] = eventStringAndLink(
      game.getEventName(),
      game.getEventLocation(),
      game.getEventRound()
    )
    setText('event', eventStr || '')
    setAttr('event-link', 'href', eventLink || '#')
    toggleHidden('event-without-link', !!eventLink)
    toggleHidden('event-with-link', !eventLink)

    //Hide info groups with no content
    toggleHidden('info-group-name', !name)
    toggleHidden('info-group-date', !date)
    toggleHidden('info-group-event', !eventStr)
    toggleHidden('info-group-result', !result)

    //Call path change handler as well to load comments etc.
    onPathChange()
  }

  //On auto play toggle
  const onAutoPlayToggle = event => {
    const {isAutoPlaying} = event.detail
    toggleHidden('button-play', isAutoPlaying)
    toggleHidden('button-pause', !isAutoPlaying)
  }

  //Apply handlers
  player.on('gameLoad', onGameLoad)
  player.on('pathChange', onPathChange)
  player.on('autoPlayToggle', onAutoPlayToggle)

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
  onClick('result-toggle', () => showResult())

  //Show result right away
  if (config.showResult) {
    showResult()
  }

  //Load game into player
  await loadGameIntoPlayer(player, element.dataset)

  //Return player
  return {player}
}

//Auto bootstrap all seki boards and players
export function bootstrap() {
  Array
    .from(document.getElementsByClassName('seki-board-static'))
    .forEach(el => sekiBoardStatic(el))
  Array
    .from(document.getElementsByClassName('seki-board-dynamic'))
    .forEach(el => sekiBoardDynamic(el))
  Array
    .from(document.getElementsByClassName('seki-player'))
    .forEach(el => sekiPlayer(el))
}
