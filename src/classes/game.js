import Base from './base.js'
import {ErrorOutcome, ValidOutcome} from './outcomes.js'
import GamePath from './game-path.js'
import GameNode from './game-node.js'
import GamePosition from './game-position.js'
import ConvertFromJgf from './converters/convert-from-jgf.js'
import ConvertFromJson from './converters/convert-from-json.js'
import ConvertFromSgf from './converters/convert-from-sgf.js'
import ConvertFromGib from './converters/convert-from-gib.js'
import ConvertToJgf from './converters/convert-to-jgf.js'
import ConvertToJson from './converters/convert-to-json.js'
import ConvertToSgf from './converters/convert-to-sgf.js'
import {copy, get, set, merge, isObject} from '../helpers/object.js'
import {isValidColor} from '../helpers/color.js'
import {stoneColors} from '../constants/stone.js'
import {handicapPlacements} from '../constants/game.js'
import {kifuFormats} from '../constants/app.js'
import {setupTypes} from '../constants/setup.js'
import {defaultGameInfo} from '../constants/defaults.js'

/**
 * This class represents a game record or a game that is being played/edited.
 * The class traverses the move tree nodes and keeps track of the changes between
 * the previous and new game positions. These changes can then be fed to the
 * board, to add or remove stones and markup. The class also keeps a stack of
 * all board positions in memory and can validate moves to make sure they are
 * not repeating or suicide.
 *
 * - A game position is a snapshot of stones and markup on the board at a point in time
 * - The positions stack is an array of all traversed game positions
 * - The game path tracks which variation was selected at each fork and what move we're at
 * - The current node points at the current node in the game tree
 */
export default class Game extends Base {

  //Positions stack
  positions = []

  /**
   * Constructor
   */
  constructor(info) {

    //Parent constructor
    super()

    //Initialise
    this.init()
    this.initInfo(info)
    this.initPositionStack()
  }

  /**
   * Initialize game
   */
  init() {

    //The rood node and pointer to the current node
    this.path = new GamePath()
    this.root = new GameNode()
    this.node = this.root

    //Record properties
    this.recordVersion = ''
    this.recordCharset = ''
    this.recordGenerator = ''
    this.recordTranscriber = ''

    //Source properties
    this.sourceName = ''
    this.sourceUrl = ''
    this.sourceCopyright = ''

    //Event properties
    this.eventName = ''
    this.eventLocation = ''
    this.eventRound = ''

    //Game properties
    this.gameType = ''
    this.gameName = ''
    this.gameResult = ''
    this.gameDate = ''
    this.gameOpening = ''
    this.gameAnnotator = ''
    this.gameDescription = ''

    //Board properties
    this.boardWidth = 19
    this.boardHeight = 19
    this.boardCutOffLeft = 0
    this.boardCutOffRight = 0
    this.boardCutOffTop = 0
    this.boardCutOffBottom = 0

    //Rules
    this.ruleSet = ''
    this.allowSuicide = false
    this.disallowRepeats = false
    this.komi = 0
    this.handicap = 0
    this.mainTime = 0
    this.overTime = ''

    //Meta data and player settings
    this.meta = {}
    this.settings = {}

    //Players
    this.players = {
      black: {
        name: '',
        team: '',
        rank: '',
      },
      white: {
        name: '',
        team: '',
        rank: '',
      },
    }
  }

  /**
   * Initialise game info
   */
  initInfo(info) {
    this.setInfo(merge(defaultGameInfo, info))
  }

  /**
   * Set game info in bulk
   */
  setInfo(info) {

    //Extract record info
    const recordVersion = get(info, 'record.version')
    const recordCharset = get(info, 'record.charset')
    const recordGenerator = get(info, 'record.generator')
    const recordTranscriber = get(info, 'record.transcriber')

    //Extract source info
    const sourceName = get(info, 'source.name')
    const sourceUrl = get(info, 'source.url')
    const sourceCopyright = get(info, 'source.copyright')

    //Extract event info
    const eventName = get(info, 'event.name')
    const eventLocation = get(info, 'event.location')
    const eventRound = get(info, 'event.round')

    //Extract game info
    const gameType = get(info, 'game.type')
    const gameName = get(info, 'game.name')
    const gameResult = get(info, 'game.result')
    const gameDate = get(info, 'game.date')
    const gameDates = get(info, 'game.dates')
    const gameOpening = get(info, 'game.opening')
    const gameAnnotator = get(info, 'game.annotator')
    const gameDescription = get(info, 'game.description')

    //Extract board info
    const boardSize = get(info, 'board.size')
    const boardWidth = get(info, 'board.width')
    const boardHeight = get(info, 'board.height')
    const boardCutOffLeft = get(info, 'board.cutOffLeft')
    const boardCutOffRight = get(info, 'board.cutOffRight')
    const boardCutOffTop = get(info, 'board.cutOffTop')
    const boardCutOffBottom = get(info, 'board.cutOffBottom')

    //Extract rules
    const ruleSet = get(info, 'rules.ruleSet')
    const allowSuicide = get(info, 'rules.allowSuicide')
    const disallowRepeats = get(info, 'rules.disallowRepeats')
    const komi = get(info, 'rules.komi')
    const handicap = get(info, 'rules.handicap')
    const mainTime = get(info, 'rules.mainTime')
    const overTime = get(info, 'rules.overTime')
    const numberOfPeriods = get(info, 'rules.numberOfPeriods')
    const timePerPeriod = get(info, 'rules.timePerPeriod')

    //Extract players, settings and meta data
    const players = get(info, 'players')
    const settings = get(info, 'settings')
    const meta = get(info, 'meta')

    //Set record info
    if (typeof recordVersion !== 'undefined') {
      this.setRecordVersion(recordVersion)
    }
    if (typeof recordCharset !== 'undefined') {
      this.setRecordCharset(recordCharset)
    }
    if (typeof recordGenerator !== 'undefined') {
      this.setRecordGenerator(recordGenerator)
    }
    if (typeof recordTranscriber !== 'undefined') {
      this.setRecordTranscriber(recordTranscriber)
    }

    //Set source info
    if (typeof sourceName !== 'undefined') {
      this.setSourceName(sourceName)
    }
    if (typeof sourceUrl !== 'undefined') {
      this.setSourceUrl(sourceUrl)
    }
    if (typeof sourceCopyright !== 'undefined') {
      this.setSourceCopyright(sourceCopyright)
    }

    //Set event info
    if (typeof eventName !== 'undefined') {
      this.setEventName(eventName)
    }
    if (typeof eventLocation !== 'undefined') {
      this.setEventLocation(eventLocation)
    }
    if (typeof eventRound !== 'undefined') {
      this.setEventRound(eventRound)
    }

    //Set game info
    if (typeof gameType !== 'undefined') {
      this.setGameType(gameType)
    }
    if (typeof gameName !== 'undefined') {
      this.setGameName(gameName)
    }
    if (typeof gameResult !== 'undefined') {
      this.setGameResult(gameResult)
    }
    if (typeof gameOpening !== 'undefined') {
      this.setGameOpening(gameOpening)
    }
    if (typeof gameAnnotator !== 'undefined') {
      this.setGameAnnotator(gameAnnotator)
    }
    if (typeof gameDescription !== 'undefined') {
      this.setGameDescription(gameDescription)
    }

    //Set rules
    if (typeof ruleSet !== 'undefined') {
      this.setRuleSet(ruleSet)
    }
    if (typeof allowSuicide !== 'undefined') {
      this.setAllowSuicide(allowSuicide)
    }
    if (typeof disallowRepeats !== 'undefined') {
      this.setDisallowRepeats(disallowRepeats)
    }
    if (typeof komi !== 'undefined') {
      this.setKomi(komi)
    }
    if (typeof handicap !== 'undefined') {
      this.setHandicap(handicap)
    }
    if (typeof mainTime !== 'undefined') {
      this.setMainTime(mainTime)
    }
    if (typeof overTime !== 'undefined') {
      this.setOverTime(overTime)
    }
    if (typeof numberOfPeriods !== 'undefined') {
      this.setNumberOfPeriods(numberOfPeriods)
    }
    if (typeof timePerPeriod !== 'undefined') {
      this.setTimePerPeriod(timePerPeriod)
    }

    //Set date
    if (typeof gameDate !== 'undefined') {
      this.setGameDate(gameDate)
    }
    else if (Array.isArray(gameDates) && gameDates.length > 0) {
      this.setGameDate(gameDates[0])
    }

    //Set board size
    if (boardWidth && boardHeight) {
      this.setBoardSize(boardWidth, boardHeight)
    }
    else if (boardSize) {
      this.setBoardSize(boardSize)
    }

    //Set board cut off
    if (
      typeof boardCutOffLeft !== 'undefined' ||
      typeof boardCutOffRight !== 'undefined' ||
      typeof boardCutOffTop !== 'undefined' ||
      typeof boardCutOffBottom !== 'undefined'
    ) {
      this.setBoardCutOff(
        boardCutOffLeft,
        boardCutOffRight,
        boardCutOffTop,
        boardCutOffBottom,
      )
    }

    //Set players
    if (typeof players !== 'undefined') {
      for (const color in players) {
        this.setPlayer(color, players[color])
      }
    }

    //Set meta data and settings
    if (typeof meta !== 'undefined') {
      this.setMeta(meta)
    }
    if (typeof settings !== 'undefined') {
      this.setSettings(settings)
    }

    //Trigger event
    this.triggerEvent('info')
  }

  /**
   * Get game info in bulk
   */
  getInfo() {

    //Initialise
    const info = {}

    //Get info
    const {
      recordVersion,
      recordCharset,
      recordGenerator,
      recordTranscriber,
      sourceName,
      sourceUrl,
      sourceCopyright,
      eventName,
      eventLocation,
      eventRound,
      gameType,
      gameName,
      gameResult,
      gameDate,
      gameDates,
      gameOpening,
      gameAnnotator,
      gameDescription,
      boardSize,
      boardWidth,
      boardHeight,
      boardCutOffLeft,
      boardCutOffRight,
      boardCutOffTop,
      boardCutOffBottom,
      ruleSet,
      allowSuicide,
      disallowRepeats,
      komi,
      handicap,
      mainTime,
      overTime,
      players,
      settings,
      meta,
    } = this

    //Set on info
    set(info, 'record.version', recordVersion)
    set(info, 'record.charset', recordCharset)
    set(info, 'record.generator', recordGenerator)
    set(info, 'record.transcriber', recordTranscriber)

    //Extract source info
    set(info, 'source.name', sourceName)
    set(info, 'source.url', sourceUrl)
    set(info, 'source.copyright', sourceCopyright)

    //Extract event info
    set(info, 'event.name', eventName)
    set(info, 'event.location', eventLocation)
    set(info, 'event.round', eventRound)

    //Extract game info
    set(info, 'game.type', gameType)
    set(info, 'game.name', gameName)
    set(info, 'game.result', gameResult)
    set(info, 'game.date', gameDate)
    set(info, 'game.dates', gameDates)
    set(info, 'game.opening', gameOpening)
    set(info, 'game.annotator', gameAnnotator)
    set(info, 'game.description', gameDescription)

    //Extract board info
    set(info, 'board.size', boardSize)
    set(info, 'board.width', boardWidth)
    set(info, 'board.height', boardHeight)
    set(info, 'board.cutOffLeft', boardCutOffLeft)
    set(info, 'board.cutOffRight', boardCutOffRight)
    set(info, 'board.cutOffTop', boardCutOffTop)
    set(info, 'board.cutOffBottom', boardCutOffBottom)

    //Extract rules
    set(info, 'rules.ruleSet', ruleSet)
    set(info, 'rules.allowSuicide', allowSuicide)
    set(info, 'rules.disallowRepeats', disallowRepeats)
    set(info, 'rules.komi', komi)
    set(info, 'rules.handicap', handicap)
    set(info, 'rules.mainTime', mainTime)
    set(info, 'rules.overTime', overTime)

    //Extract players, settings and meta data
    set(info, 'players', players)
    set(info, 'settings', settings)
    set(info, 'meta', meta)

    //Return info
    return info
  }

  /**
   * Reset game (but preserve info)
   */
  reset() {
    this.init()
    this.initPositionStack()
  }

  /**
   * Clone this game
   */
  clone() {

    //Create new kifu object and get properties
    const clone = new Game()
    const props = Object.getOwnPropertyNames(this)

    //Copy all properties
    for (const prop of props) {
      clone[prop] = JSON.parse(JSON.stringify(this[prop]))
    }

    //Return clone
    return clone
  }

  /**************************************************************************
   * Game info getters and setters
   ***/

  /**
   * Set/get record version
   */
  setRecordVersion(recordVersion = '') {
    this.recordVersion = recordVersion
  }
  getRecordVersion() {
    return this.recordVersion
  }

  /**
   * Set/get record char set
   */
  setRecordCharset(recordCharset = '') {
    this.recordCharset = recordCharset
  }
  getRecordCharset() {
    return this.recordCharset
  }

  /**
   * Set/get record generator
   */
  setRecordGenerator(recordGenerator = '') {
    this.recordGenerator = recordGenerator
  }
  getRecordGenerator() {
    return this.recordGenerator
  }

  /**
   * Set/get record transcriber
   */
  setRecordTranscriber(recordTranscriber = '') {
    this.recordTranscriber = recordTranscriber
  }
  getRecordTranscriber() {
    return this.recordTranscriber
  }

  /**
   * Set/get source name
   */
  setSourceName(sourceName = '') {
    this.sourceName = sourceName
  }
  getSourceName() {
    return this.sourceName
  }

  /**
   * Set/get source URL
   */
  setSourceUrl(sourceUrl = '') {
    this.sourceUrl = sourceUrl
  }
  getSourceUrl() {
    return this.sourceUrl
  }

  /**
   * Set/get source copyright
   */
  setSourceCopyright(sourceCopyright = '') {
    this.sourceCopyright = sourceCopyright
  }
  getSourceCopyright() {
    return this.sourceCopyright
  }

  /**
   * Set/get event name
   */
  setEventName(eventName = '') {
    this.eventName = eventName
  }
  getEventName() {
    return this.eventName
  }

  /**
   * Set/get event location
   */
  setEventLocation(eventLocation = '') {
    this.eventLocation = eventLocation
  }
  getEventLocation() {
    return this.eventLocation
  }

  /**
   * Set/get event round
   */
  setEventRound(eventRound = '') {
    this.eventRound = eventRound
  }
  getEventRound() {
    return this.eventRound
  }

  /**
   * Set/get game type
   */
  setGameType(gameType = '') {
    this.gameType = gameType
  }
  getGameType() {
    return this.gameType
  }

  /**
   * Set/get game name
   */
  setGameName(gameName = '') {
    this.gameName = gameName
  }
  getGameName() {
    return this.gameName
  }

  /**
   * Set/get game result
   */
  setGameResult(gameResult = '') {
    const match = gameResult
      .toUpperCase()
      .match(/^((B|W)\+([0-9]+(\.[0-9]+)?|R|T|F))/)
    this.gameResult = match ? match[1] : '?'
  }
  getGameResult() {
    return this.gameResult
  }

  /**
   * Set/get game date
   */
  setGameDate(gameDate = '') {
    const match = gameDate
      .match(/^(([0-9]{4})(-[0-9]{2})?(-[0-9]{2})?)/)
    this.gameDate = match ? match[1] : '?'
  }
  getGameDate() {
    return this.gameDate
  }

  /**
   * Set/get game opening
   */
  setGameOpening(gameOpening = '') {
    this.gameOpening = gameOpening
  }
  getGameOpening() {
    return this.gameOpening
  }

  /**
   * Set/get game annotator
   */
  setGameAnnotator(gameAnnotator = '') {
    this.gameAnnotator = gameAnnotator
  }
  getGameAnnotator() {
    return this.gameAnnotator
  }

  /**
   * Set/get game description
   */
  setGameDescription(gameDescription = '') {
    this.gameDescription = gameDescription
  }
  getGameDescription() {
    return this.gameDescription
  }

  /**
   * Set/get the board size
   */
  setBoardSize(width = 0, height = 0) {
    width = parseInt(width)
    if (isNaN(width)) {
      width = 0
    }
    height = parseInt(height)
    if (isNaN(height)) {
      height = 0
    }
    if (width && height && width !== height) {
      this.boardWidth = width
      this.boardHeight = height
    }
    else if (width) {
      this.boardWidth = this.boardHeight = width
    }
  }
  getBoardSize() {
    const {boardWidth: width, boardHeight: height} = this
    return {width, height}
  }

  /**
   * Set the board cut off
   */
  setBoardCutOff(left = 0, right = 0, top = 0, bottom = 0) {
    left = parseInt(left)
    right = parseInt(right)
    top = parseInt(top)
    bottom = parseInt(bottom)
    this.boardCutOffLeft = isNaN(left) ? 0 : left
    this.boardCutOffRight = isNaN(right) ? 0 : right
    this.boardCutOffTop = isNaN(top) ? 0 : top
    this.boardCutOffBottom = isNaN(bottom) ? 0 : bottom
  }
  getBoardCutOff() {
    const {
      boardCutOffLeft: cutOffLeft,
      boardCutOffRight: cutOffRight,
      boardCutOffTop: cutOffTop,
      boardCutOffBottom: cutOffBottom,
    } = this
    return {cutOffLeft, cutOffRight, cutOffTop, cutOffBottom}
  }

  /**
   * Get combined board config for Board class
   */
  getBoardConfig() {

    //Get config
    const {
      boardWidth: width,
      boardHeight: height,
      boardCutOffLeft: cutOffLeft,
      boardCutOffRight: cutOffRight,
      boardCutOffTop: cutOffTop,
      boardCutOffBottom: cutOffBottom,
    } = this

    //Return combined config
    return {
      width,
      height,
      cutOffLeft,
      cutOffRight,
      cutOffTop,
      cutOffBottom,
    }
  }

  /**
   * Set/get ruleset
   */
  setRuleSet(ruleSet = '') {
    this.ruleSet = ruleSet
  }
  getRuleSet() {
    return this.ruleSet
  }

  /**
   * Set/get allow suicide
   */
  setAllowSuicide(allowSuicide = false) {
    this.allowSuicide = Boolean(allowSuicide)
  }
  getAllowSuicide() {
    return this.allowSuicide
  }

  /**
   * Set/get disallow repeats
   */
  setDisallowRepeats(disallowRepeats = false) {
    this.disallowRepeats = Boolean(disallowRepeats)
  }
  getDisallowRepeats() {
    return this.disallowRepeats
  }

  /**
   * Set/get komi
   */
  setKomi(komi = 0) {
    komi = parseFloat(komi)
    if (isNaN(komi)) {
      komi = 0
    }
    this.komi = komi
  }
  getKomi() {
    return this.komi
  }

  /**
   * Set/get handicap
   */
  setHandicap(handicap = 0) {
    handicap = parseInt(handicap)
    if (isNaN(handicap)) {
      handicap = 0
    }
    this.handicap = handicap
  }
  getHandicap() {
    return this.handicap
  }

  /**
   * Set/get main time
   */
  setMainTime(mainTime = 0) {
    mainTime = parseFloat(mainTime)
    if (isNaN(mainTime)) {
      mainTime = 0
    }
    this.mainTime = mainTime
  }
  getMainTime() {
    return this.mainTime
  }

  /**
   * Set/get over time
   */
  setOverTime(overTime = '') {
    this.overTime = overTime
    const match = overTime.match(/([0-9]+)x([0-9.]+)/)
    if (match) {
      this.setNumberOfPeriods(match[1])
      this.setTimePerPeriod(match[2])
    }
  }
  getOverTime() {
    if (this.overTime) {
      return this.overTime
    }
    if (this.numberOfPeriods && this.timePerPeriod) {
      return `${this.numberOfPeriods}x${this.timePerPeriod} byo-yomi`
    }
  }

  /**
   * Set/get number of periods
   */
  setNumberOfPeriods(numberOfPeriods) {
    numberOfPeriods = parseInt(numberOfPeriods)
    if (isNaN(numberOfPeriods)) {
      numberOfPeriods = 0
    }
    this.numberOfPeriods = numberOfPeriods
  }
  getNumberOfPeriods() {
    return this.numberOfPeriods
  }

  /**
   * Set/get time per period
   */
  setTimePerPeriod(timePerPeriod) {
    timePerPeriod = parseFloat(timePerPeriod)
    if (isNaN(timePerPeriod)) {
      timePerPeriod = 0
    }
    this.timePerPeriod = timePerPeriod
  }
  getTimePerPeriod() {
    return this.timePerPeriod
  }

  /**
   * Set/get meta data
   */
  setMeta(meta = {}) {
    if (isObject(meta)) {
      this.meta = copy(meta)
    }
  }
  getMeta() {
    return this.meta
  }

  /**
   * Set/get player settings
   */
  setSettings(settings = {}) {
    if (isObject(settings)) {
      this.settings = copy(settings)
    }
  }
  getSettings() {
    return this.settings
  }

  /**
   * Set/get players
   */
  setPlayers(players = {}) {
    this.players = copy(players)
  }
  getPlayers() {
    return this.players
  }

  /**
   * Set/get player of a specific color
   */
  setPlayer(color, info) {
    if (isObject(info)) {
      this.players[color] = copy(info)
    }
  }
  getPlayer(color) {
    return this.players[color]
  }
  updatePlayer(color, info) {
    if (isObject(info)) {
      for (const key in info) {
        this.players[color][key] = info[key]
      }
    }
  }

  /**************************************************************************
   * Turn and capture count
   ***/

  /**
   * Get the player turn for this position
   */
  getTurn() {
    const {position} = this
    if (position) {
      return position.getTurn()
    }
    return stoneColors.BLACK
  }

  /**
   * Set the player turn for the current position
   */
  setTurn(color) {
    const {position} = this
    if (position) {
      position.setTurn(color)
      this.triggerEvent('positionChange', {position})
    }
  }

  /**
   * Switch the player turn for the current position
   */
  switchTurn() {
    const {position} = this
    if (position) {
      position.switchTurn()
      this.triggerEvent('positionChange', {position})
    }
  }

  /**
   * Get the total capture count up to the current position
   */
  getCaptureCount() {

    //Initialize
    const {positions} = this
    const captures = {}
    const colors = [
      stoneColors.BLACK,
      stoneColors.WHITE,
    ]

    //Loop all positions
    for (const position of positions) {
      for (const color of colors) {
        captures[color] ??= 0
        captures[color] += position.getCaptureCount(color)
      }
    }

    //Return
    return captures
  }

  /**
   * Get time left
   */
  getTimeLeft(color) {

    //Get node
    let {node} = this

    //Root node? Return main time
    if (node.isRoot()) {
      return this.getMainTime()
    }

    //Not a move node
    if (!node.isMove()) {
      return
    }

    //Check previous node if it's not this player's turn
    if (node.getMoveColor() !== color) {
      node = node.getPreviousMove()
      if (!node) {
        return this.getMainTime()
      }
    }

    //Return time left
    return node.move.timeLeft
  }

  /**
   * Get periods left
   */
  getPeriodsLeft(color) {

    //Get node
    let {node} = this
    if (!node.isMove()) {
      return
    }

    //Check previous node if it's not this player's turn
    if (node.getMoveColor() !== color) {
      node = node.getPreviousMove()
      if (!node) {
        return
      }
    }

    //Return info
    return node.move.periodsLeft
  }

  /**
   * Place default handicap stones
   */
  placeDefaultHandicapStones() {

    //Get handicap
    const {handicap} = this
    if (handicap < 2) {
      return
    }

    //Get size
    const {width, height} = this.getBoardSize()
    if (width !== height) {
      return
    }

    //Check if handicap position is available
    if (!handicapPlacements[width] || !handicapPlacements[width][handicap]) {
      return
    }

    //Add stones
    for (const {x, y} of handicapPlacements[width][handicap]) {
      this.addStone(x, y, stoneColors.BLACK)
    }

    //Set white to play
    this.setTurn(stoneColors.WHITE)
  }

  /*****************************************************************************
   * Position handling
   ***/

  /**
   * Getter returns the last position from the stack
   */
  get position() {
    const {positions} = this
    return positions[positions.length - 1]
  }

  /**
   * Setter adds a new position to the stack
   */
  set position(newPosition) {
    const {positions} = this
    positions[positions.length] = newPosition
  }

  /**
   * Initialise the position stack
   */
  initPositionStack() {

    //Create new blank game position
    const {positions} = this
    const {width, height} = this.getBoardSize()
    const position = new GamePosition(width, height)

    //Debug
    this.debug(`initialising position stack at ${width}x${height}`)

    //Clear positions stack push the position
    positions.length = 0
    positions.push(position)
  }

  /**
   * Add position to stack
   */
  addPositionToStack(newPosition) {
    this.positions.push(newPosition)
  }

  /**
   * Remove last position from stack
   */
  removeLastPositionFromStack() {
    if (this.positions.length > 0) {
      return this.positions.pop()
    }
  }

  /**
   * Replace the current position in the stack
   */
  replaceLastPositionInStack(newPosition) {
    if (newPosition) {
      this.positions.pop()
      this.positions.push(newPosition)
    }
  }

  /**
   * Clear the position stack
   */
  clearPositionStack() {
    this.positions = []
  }

  /**
   * Check if a given position is repeating within this game
   */
  isRepeatingPosition(checkPosition) {

    //Get data
    const {positions, disallowRepeats} = this
    let stop

    //Check all positions?
    if (disallowRepeats) {
      stop = 0
    }

    //Otherwise check for ko only (last two positions)
    else if ((positions.length - 2) >= 0) {
      stop = positions.length - 2
    }

    //Not checking for repeating positions
    else {
      return false
    }

    //Loop positions to check
    for (let i = positions.length - 2; i >= stop; i--) {
      if (checkPosition.isSameAs(positions[i])) {
        return true
      }
    }

    //Not repeating
    return false
  }

  /*****************************************************************************
   * Node and position handling
   ***/

  /**
   * Get the current node
   */
  getCurrentNode() {
    return this.node
  }

  /**
   * Check if a node is the current node
   */
  isCurrentNode(node) {
    return this.node === node
  }

  /**
   * Set root node
   */
  setRootNode(root) {
    this.root = root
  }

  /**
   * Get root node
   */
  getRootNode() {
    return this.root
  }

  /**
   * Check if a node is the root node
   */
  isRootNode(node) {
    return this.root === node
  }

  /**
   * Get the current game position
   */
  getPosition() {
    return this.position
  }

  /**
   * Get the game path
   */
  getPath() {
    return this.path
  }

  /**
   * Find a node by name
   */
  findNodeByName(name) {
    return this.root.findNodeByName(name)
  }

  /**************************************************************************
   * Move number and named node handling
   ***/

  /**
   * Get path index of current node
   */
  getCurrentPathIndex() {
    return this.node.getPathIndex()
  }

  /**
   * Set current path index
   */
  setCurrentPathIndex(i) {
    return this.node.setPathIndex(i)
  }

  /**
   * Reset current path index
   */
  resetCurrentPathIndex() {
    return this.node.setPathIndex(0)
  }

  /**
   * Get current move number
   */
  getCurrentMoveNumber() {
    this.node.getMoveNumber()
  }

  /**
   * Get current node name
   */
  getCurrentNodeName() {
    return this.node.name
  }

  /**
   * Get the number of moves in the main branch
   */
  getTotalNumberOfMoves() {
    let node = this.root
    let m = 0
    while (node) {
      if (node.isMove()) {
        m++
      }
      node = node.getPathNode()
    }
    return m
  }

  /**
   * Get node for a certain move number
   */
  findNodeForMoveNumber(number) {
    let node = this.root
    let m = 0
    while (node) {
      if (node.isMove()) {
        m++
        if (m === number) {
          return node
        }
      }
      node = node.getPathNode()
    }
  }

  /**
   * Find named node
   */
  findNamedNode(name) {
    return this.root.findNamedNode(name)
  }

  /**
   * Get game path to a given move number
   */
  getPathToMoveNumber(number) {
    const path = new GamePath()
    path.setMove(number)
    return path
  }

  /**
   * Get path to named node
   */
  getPathToNamedNode(name) {
    const {root} = this
    const path = new GamePath()
    const node = root.findNamedNode(name, path)
    return node ? path : null
  }

  /**
   * Get path to a specific node
   */
  getPathToNode(target) {
    const {root} = this
    const path = new GamePath()
    const node = root.findNode(target, path)
    return node ? path : null
  }

  /*****************************************************************************
   * Coordinate checkers
   ***/

  /**
   * Check if coordinates are valid
   *
   * NOTE: This checks against game info, as opposed to an actual board object,
   * because this class can be used independently of the board class.
   */
  isValidCoordinate(x, y) {
    const {width, height} = this.getBoardSize()
    return (x >= 0 && y >= 0 && x < width && y < height)
  }

  /**
   * Check if given coordinates are one of the next child node coordinates
   */
  isMoveVariation(x, y) {
    this.node.isMoveVariation(x, y)
  }

  /**
   * Get move variation index
   */
  getMoveVariationIndex(x, y) {
    return this.node.getMoveVariationIndex(x, y)
  }

  /**************************************************************************
   * Move and setup placement validation
   ***/

  /**
   * Wrapper for validateMove() returning a boolean and catching any errors
   */
  isValidMove(x, y, color) {
    const position = this.position.clone()
    const [isValid] = this.validateMove(position, x, y, color)
    return isValid
  }

  /**
   * Check if a move is valid against a given position
   */
  validateMove(position, x, y, color) {

    //Get data
    const {allowSuicide} = this

    //Check coordinates validity
    if (!this.isValidCoordinate(x, y)) {
      return new ErrorOutcome(`Position (${x},${y}) is out of bounds`)
    }

    //Something already here?
    if (position.stones.has(x, y)) {
      return new ErrorOutcome(`Position (${x},${y}) already has a stone`)
    }

    //Set color of move to make
    if (typeof color === 'undefined') {
      color = position.getTurn()
    }

    //Place the new stone
    position.stones.set(x, y, color)

    //Capture adjacent stones if possible
    const hadCaptures = position.captureAdjacent(x, y)

    //No captures occurred? Check if the move we're making is a suicide move
    if (!hadCaptures) {
      if (!position.hasLiberties(x, y)) {
        if (allowSuicide) {
          position.captureGroup(x, y)
        }
        else {
          return new ErrorOutcome(`Move on (${x},${y}) is suicide`)
        }
      }
    }

    //Check position stack for repeating moves
    if (this.isRepeatingPosition(position)) {
      return new ErrorOutcome(`Move on (${x},${y}) creates a repeating position`)
    }

    //Switch turn
    position.switchTurn()
    return new ValidOutcome()
  }

  /**
   * Check if a setup placement is valid.
   */
  validateSetupPlacement(x, y, color, newPosition) {

    //Get data
    const {position} = this

    //Check coordinates validity
    if (!this.isValidCoordinate(x, y)) {
      return [null, `Position (${x},${y}) is out of bounds`]
    }

    //Create position
    newPosition = newPosition || position.clone()
    newPosition.stones.set(x, y, color)

    //Capture adjacent stones if possible
    const hadCaptures = newPosition.captureAdjacent(x, y)

    //No captures occurred? Check if the move we're making is a suicide move
    if (!hadCaptures) {

      //No liberties for the group we've just created? Capture it
      if (!newPosition.hasLiberties(x, y)) {
        newPosition.captureGroup(x, y)
      }
    }

    //Return position
    return [newPosition]
  }

  /*****************************************************************************
   * Markup and setup stones handling
   ***/

  /**
   * Get markup on coordinates
   */
  getMarkup(x, y) {
    const {position} = this
    return position.markup.get(x, y)
  }

  /**
   * Check if there is markup at the given coordinate for the current position
   */
  hasMarkup(x, y, type) {
    const {position} = this
    if (typeof type === 'undefined') {
      return position.markup.has(x, y)
    }
    return position.markup.is(x, y, {type})
  }

  /**
   * Check if we have markup in a given area
   */
  hasMarkupInArea(area) {
    return area.some(({x, y}) => {
      return this.hasMarkup(x, y)
    })
  }

  /**
   * Add markup
   */
  addMarkup(x, y, markup) {

    //No markup here
    if (this.hasMarkup(x, y, markup)) {
      this.debug(`already has markup of type ${markup.type} on (${x},${y})`)
      return
    }

    //Add
    const {position, node} = this
    position.markup.set(x, y, markup)
    node.addMarkup(x, y, markup)
  }

  /**
   * Remove markup
   */
  removeMarkup(x, y) {

    //No markup here
    if (!this.hasMarkup(x, y)) {
      this.debug(`no markup present on (${x},${y})`)
      return
    }

    //Remove
    const {position, node} = this
    node.removeMarkup(x, y)
    position.markup.delete(x, y)
  }

  /**
   * Remove markup from area
   */
  removeMarkupFromArea(area) {
    for (const {x, y} of area) {
      if (this.hasMarkup(x, y)) {
        this.removeMarkup(x, y)
      }
    }
  }

  /**
   * Remove all markup from position
   */
  removeAllMarkup() {

    //Remove all markup
    const {position, node} = this
    node.removeAllMarkupInstructions()
    position.markup.clear()
  }

  /**
   * Get stone on coordinates
   */
  getStone(x, y) {
    const {position} = this
    return position.stones.get(x, y)
  }

  /**
   * Check if there is a stone at given coordinates
   */
  hasStone(x, y, color) {
    const {position} = this
    if (typeof color === 'undefined') {
      return position.stones.has(x, y)
    }
    return position.stones.is(x, y, {color})
  }

  /**
   * Check if we have one or more stones in a given area
   */
  hasStonesInArea(area) {
    return area.some(({x, y}) => this.hasStone(x, y))
  }

  /**
   * Add a stone
   */
  addStone(x, y, color) {

    //Validate color
    if (!isValidColor(color)) {
      this.warn(`invalid color ${color}`)
      return
    }

    //Already have stone of this color
    if (this.hasStone(x, y, color)) {
      this.debug(`already has stone of color ${color} on (${x},${y})`)
      return
    }

    //Debug
    this.debug(`adding ${color} stone at (${x},${y})`)

    //Get data and validate placement
    const {position, node} = this
    const [newPosition, reason] = this.validateSetupPlacement(x, y, color)

    //Invalid placement
    if (!newPosition) {
      this.warn(reason)
      return
    }

    //Add to node as a setup instruction
    const newNodeIndex = node.addSetup(x, y, {type: color})

    //Replace the position if a new node was created
    if (typeof newNodeIndex !== 'undefined') {
      this.debug(`new node was created with index ${newNodeIndex}`)
      this.handleNewSetupNodeCreation(newNodeIndex)
      this.replaceLastPositionInStack(newPosition)
      this.triggerEvent('positionChange', {position})
      return
    }

    //Just set stone on current position
    position.stones.set(x, y, color)
    this.triggerEvent('positionChange', {position})
  }

  /**
   * Remove a stone
   */
  removeStone(x, y) {

    //No stone on this position
    if (!this.hasStone(x, y)) {
      this.debug(`no stone present on (${x},${y})`)
      return
    }

    //Debug
    this.debug(`removing stone from (${x},${y})`)

    //Get data
    const {position, node} = this

    //Check if stone is present in setup instructions
    //If so, just remove it from the setup
    if (node.hasSetup(x, y)) {
      node.removeSetup(x, y)
      position.stones.delete(x, y)
      return
    }

    //Not present, so it was added on the board previously,
    //either by another setup instruction or by a move
    //We have to clear it using a new setup instruction and
    //this also creates a new position
    const newPosition = position.clone()
    newPosition.stones.delete(x, y)

    //Add setup instruction
    const newNodeIndex = node.addSetup(x, y, {type: setupTypes.CLEAR})

    //Replace current position
    this.handleNewSetupNodeCreation(newNodeIndex)
    this.replaceLastPositionInStack(newPosition)
    this.triggerEvent('positionChange', {position})
  }

  /**
   * Remove stones from area
   */
  removeStonesFromArea(area) {
    for (const {x, y} of area) {
      if (this.hasStone(x, y)) {
        this.removeStone(x, y)
      }
    }
  }

  /**
   * Helper to handle the creation of a new setup node
   */
  handleNewSetupNodeCreation(i) {

    //Nothing to do
    if (typeof i === 'undefined') {
      return
    }

    //Advance path to the added node index
    this.node = this.node.getChild(i)
    this.path.advance(i)

    //Clone our position
    const position = this.position.clone()
    this.addPositionToStack(position)
  }

  /*****************************************************************************
   * Playing a move or passing
   ***/

  /**
   * Play a move
   */
  playMove(x, y) {

    //Get color
    const color = this.position.getTurn()

    //Already have a variation here? Just advance position
    if (this.node.hasMoveVariation(x, y)) {
      const i = this.node.getMoveVariationIndex(x, y)
      return this.goToNextPosition(i)
    }

    //Validate move and get new position
    const newPosition = this.position.clone()
    const outcome = this.validateMove(newPosition, x, y, color)

    //Invalid move
    if (!outcome.isValid) {
      this.warn(outcome.reason)
      return outcome
    }

    //Create new move node
    const node = new GameNode({
      move: {x, y, color},
    })

    //Append it to the current node, remember the variation, and change the pointer
    const parent = this.node
    const i = node.appendToParent(parent)
    parent.setPathIndex(i)

    //Advance path to the added node index
    this.node = node
    this.path.advance(i)

    //Valid move
    this.addPositionToStack(newPosition)
    return new ValidOutcome()
  }

  /**
   * Pass move
   */
  passMove() {

    //Get color
    const color = this.position.getTurn()

    //Initialize new position and switch the turn
    const newPosition = this.position.clone()
    newPosition.switchTurn()

    //Create new move node
    const node = new GameNode({
      move: {
        color,
        pass: true,
      },
    })

    //Append it to the current node, remember the path
    const parent = this.node
    const i = node.appendToParent(parent)
    parent.setPathIndex(i)

    //Advance path to the added node index
    this.node = node
    this.path.advance(i)

    //Add new position to stack
    this.addPositionToStack(newPosition)
    return new ValidOutcome()
  }

  /*****************************************************************************
   * Game tree navigation
   ***/

  /**
   * Check if there is a next position
   */
  hasNextPosition() {
    const {node} = this
    return node.hasChildren()
  }

  /**
   * Check if there is a previous position
   */
  hasPreviousPosition() {
    const {root, node} = this
    return (root !== node)
  }

  /**
   * Is at first position
   */
  isAtFirstPosition() {
    return !this.hasPreviousPosition()
  }

  /**
   * Is at last position
   */
  isAtLastPosition() {
    return !this.hasNextPosition()
  }

  /**
   * Go to the next position
   */
  goToNextPosition(i) {
    if (this.goToNextNode(i)) {
      return this.processCurrentNode()
    }
    return new ErrorOutcome(`No next position`)
  }

  /**
   * Go to the previous position
   */
  goToPreviousPosition() {
    if (this.goToPreviousNode()) {
      return new ValidOutcome()
    }
    return new ErrorOutcome(`No previous position`)
  }

  /**
   * Go to the last position
   */
  goToLastPosition() {
    while (this.goToNextNode()) {
      this.processCurrentNode()
    }
  }

  /**
   * Go to the first position
   */
  goToFirstPosition() {
    this.goToFirstNode()
    this.processCurrentNode()
  }

  /**
   * Go to specific move number
   */
  goToMoveNumber(number) {

    //Already here
    if (this.getCurrentMoveNumber() === number) {
      return
    }

    //Get path to the named node
    const path = this.getPathToMoveNumber(name)
    this.goToPath(path)
  }

  /**
   * Go to specific named node
   */
  goToNamedNode(name) {

    //Already here
    if (this.getCurrentNodeName() === name) {
      return
    }

    //Get path to the named node
    const path = this.getPathToNamedNode(name)
    this.goToPath(path)
  }

  /**
   * Go to specific target node
   */
  goToNode(target) {

    //Already here
    if (this.node === target) {
      return
    }

    //Get path to the named node
    const path = this.getPathToNode(target)
    this.goToPath(path)
  }

  /**
   * Go to position indicated by given path
   */
  goToPath(path) {

    //No path or already here?
    if (!path || this.path.isSameAs(path)) {
      return
    }

    //Go to the first position
    this.goToFirstPosition()

    //Loop path
    const n = path.getMoveNumber()
    for (let m = 0; m < n; m++) {

      //Try going to the next node
      const i = path.indexAtMove(m)
      if (!this.goToNextNode(i)) {
        break
      }

      //Execute node and break if invalid
      const outcome = this.processCurrentNode()
      if (!outcome.isValid) {
        break
      }
    }
  }

  /**
   * Go to the next fork
   */
  goToNextFork() {
    while (this.goToNextNode()) {
      const outcome = this.processCurrentNode()
      if (!outcome.isValid) {
        break
      }
      if (this.node.hasMultipleChildren()) {
        break
      }
    }
  }

  /**
   * Go to the previous fork
   */
  goToPreviousFork() {
    while (this.goToPreviousNode()) {
      if (this.node.hasMultipleChildren()) {
        break
      }
    }
  }

  /**
   * Go to the next move with comments
   */
  goToNextComment() {
    while (this.goToNextNode()) {
      const outcome = this.processCurrentNode()
      if (!outcome.isValid) {
        break
      }
      if (this.node.hasComments()) {
        break
      }
    }
  }

  /**
   * Go to the previous move with comments
   */
  goToPreviousComment() {
    while (this.goToPreviousNode()) {
      if (this.node.hasComments()) {
        break
      }
    }
  }

  /**
   * Go forward a number of positions
   */
  goForwardNumPositions(num) {
    for (let i = 0; i < num; i++) {
      if (!this.goToNextPosition()) {
        return
      }
    }
  }

  /**
   * Go backward a number of positions
   */
  goBackNumPositions(num) {
    for (let i = 0; i < num; i++) {
      if (!this.goToPreviousPosition()) {
        return
      }
    }
  }

  /*****************************************************************************
   * Node navigation helpers
   ***/

  /**
   * Select next variation
   */
  selectNextVariation() {
    this.node.incrementPathIndex()
  }

  /**
   * Select previous variation
   */
  selectPreviousVariation() {
    this.node.decrementPathIndex()
  }

  /**
   * Go to the next node
   */
  goToNextNode(i) {

    //Get data
    const {node} = this

    //Check if we have children
    if (!node.hasChildren()) {
      return false
    }

    //Validate index
    if (!node.isValidPathIndex(i)) {
      i = 0
    }

    //Advance path and set pointer of current node
    //TODO create helper for this as it's repeated often
    this.path.advance(i)
    this.node = node.getChild(i)
    return true
  }

  /**
   * Go to the previous node
   */
  goToPreviousNode() {

    //Get data
    const {node} = this

    //No parent node?
    if (!node.hasParent()) {
      return false
    }

    //Retreat path and set pointer to current node
    this.path.retreat()
    this.node = node.getParent()

    //Remove last position from stack
    this.removeLastPositionFromStack()
    return true
  }

  /**
   * Go to the first node
   */
  goToFirstNode() {

    //Reset path and point to root
    this.path.reset()
    this.node = this.root

    //Determine initial turn based on handicap
    //Can be overwritten by game record instructions
    const handicap = this.getHandicap()
    const turn = (handicap > 1) ?
      stoneColors.WHITE :
      stoneColors.BLACK

    //Set turn
    this.setTurn(turn)
    this.initPositionStack()
  }

  /**
   * Execute the current node
   */
  processCurrentNode(revertPositionOnFail = true) {

    //Get data
    const {node, position} = this

    //Make this node the path node on its parent
    node.setAsParentPathNode()

    //Initialize new position
    const newPosition = position.clone()

    //Pass move
    if (node.isPassMove()) {
      newPosition.switchTurn()
    }

    //Play move
    if (node.isPlayMove()) {
      const {x, y, color} = node.move
      const outcome = this.validateMove(newPosition, x, y, color)

      //New position is not valid
      if (!outcome.isValid) {

        //Revert position on failure?
        if (revertPositionOnFail) {
          this.goToPreviousNode()
        }

        //Return failure reason
        this.warn(outcome.reason)
        return outcome
      }
    }

    //Handle turn instructions
    if (node.hasTurnIndicator()) {
      newPosition.setTurn(node.turn)
    }

    //Handle setup instructions
    if (node.hasSetupInstructions()) {
      for (const setup of node.setup) {
        const {type, coords} = setup
        for (const coord of coords) {
          const {x, y} = coord
          if (type === setupTypes.CLEAR) {
            newPosition.stones.delete(x, y)
          }
          else {
            newPosition.stones.set(x, y, type)
          }
        }
      }
    }

    //Handle markup
    if (node.hasMarkupInstructions()) {
      for (const markup of node.markup) {
        const {type, coords} = markup
        for (const coord of coords) {
          const {x, y, text} = coord
          newPosition.markup.set(x, y, {type, text})
        }
      }
    }

    //Add position to stack
    this.addPositionToStack(newPosition)
    return new ValidOutcome()
  }

  /**************************************************************************
   * Conversion helpers to convert this game into different formats
   ***/

  /**
   * Convert to JGF
   */
  toJgf() {
    const converter = new ConvertToJgf()
    return converter.convert(this)
  }

  /**
   * Convert to JGF JSON
   */
  toJson() {
    const converter = new ConvertToJson()
    return converter.convert(this)
  }

  /**
   * Convert to SGF
   */
  toSgf() {
    const converter = new ConvertToSgf()
    return converter.convert(this)
  }

  /**
   * Convert file to given format
   */
  toData(format) {

    //Use appropriate converter
    switch (format) {
      case kifuFormats.SGF:
        return this.toSgf()
      case kifuFormats.JGF:
        return this.toJgf()
      case kifuFormats.JSON:
        return this.toJson()
      default:
        throw new Error(`Unsupported data format`)
    }
  }

  /**
   * Generate file name from game info
   */
  getFileName() {

    //Get info
    const date = this.getGameDate()
    const {black, white} = this.getPlayers()
    const numMoves = this.getTotalNumberOfMoves()

    //Parse players
    const playerInfo = [black, white]
      .map(player => {
        const {name, rank} = player
        if (rank) {
          return `${name} [${rank}]`
        }
        return name
      })
      .join(' vs ')

    //Return filename
    return `${date} ${numMoves > 0 ? `- ${numMoves}` : ''} - ${playerInfo}`
  }

  /**************************************************************************
   * Static helpers to create game instances from different formats
   ***/

  /**
   * Load from SGF data
   */
  static fromJson(json) {

    //Create converter
    const converter = new ConvertFromJson()
    const game = converter.convert(json)
    if (!game) {
      throw new Error(`Unable to parse JSON data`)
    }

    //Return game
    return game
  }

  /**
   * Load from JGF data
   */
  static fromJgf(jgf) {

    //Create converter
    const converter = new ConvertFromJgf()
    const game = converter.convert(jgf)
    if (!game) {
      throw new Error(`Unable to parse JGF data`)
    }

    //Return game
    return game
  }

  /**
   * Load from SGF data
   */
  static fromSgf(sgf) {

    //Create converter
    const converter = new ConvertFromSgf()
    const game = converter.convert(sgf)
    if (!game) {
      throw new Error(`Unable to parse SGF data`)
    }

    //Return game
    return game
  }

  /**
   * Load from GIB data
   */
  static fromGib(gib) {

    //Create converter
    const converter = new ConvertFromGib()
    const game = converter.convert(gib)
    if (!game) {
      throw new Error(`Unable to parse GIB data`)
    }

    //Return game
    return game
  }

  /**
   * Detect format
   */
  static detectFormat(data) {

    //No data, can't do much
    if (!data) {
      throw new Error(`No data`)
    }

    //Object given? Probably a JGF object
    if (typeof data === 'object') {
      return kifuFormats.JGF
    }

    //String given, could be stringified JGF, an SGF or GIB file
    if (typeof data === 'string') {
      const c = data.charAt(0)
      if (c === '(') {
        return kifuFormats.SGF
      }
      else if (c === '{' || c === '[') {
        return kifuFormats.JSON
      }
      else if (c === '\\') {
        return kifuFormats.GIB
      }
    }

    //Unknown
    throw new Error(`Unknown data format`)
  }

  /**
   * Load from an unknown/generic data source
   * This will try to auto detect the data format
   */
  static fromData(data) {

    //Detect format
    const format = this.detectFormat(data)

    //Use appropriate parser
    switch (format) {
      case kifuFormats.JGF:
        return this.fromJgf(data)
      case kifuFormats.SGF:
        return this.fromSgf(data)
      case kifuFormats.JSON:
        return this.fromJson(data)
      case kifuFormats.GIB:
        return this.fromGib(data)
      default:
        throw new Error(`Unsupported data format`)
    }
  }
}
