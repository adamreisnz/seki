import Base from './base.js'
import {ErrorOutcome, ValidOutcome} from './outcomes.js'
import GamePath from './game-path.js'
import GameNode from './game-node.js'
import GamePosition from './game-position.js'
import ConvertFromJgf from './converters/convert-from-jgf.js'
import ConvertFromSgf from './converters/convert-from-sgf.js'
import ConvertFromGib from './converters/convert-from-gib.js'
import ConvertFromNgf from './converters/convert-from-ngf.js'
import ConvertToJgf from './converters/convert-to-jgf.js'
import ConvertToSgf from './converters/convert-to-sgf.js'
import GameTransformer from './game-transformer.js'
import {copy, get, set, merge, isObject} from '../helpers/object.js'
import {parseTime, parseKomi, parseHandicap, parseEvent, parseResult} from '../helpers/parsing.js'
import {dateString} from '../helpers/util.js'
import {isValidColor, colorToNumeric} from '../helpers/color.js'
import {decodeData} from '../helpers/encoding.js'
import {stoneColors} from '../constants/stone.js'
import {handicapPlacements} from '../constants/game.js'
import {kifuFormats} from '../constants/app.js'
import {setupTypes} from '../constants/setup.js'
import {defaultGameInfo} from '../constants/defaults.js'

//An NGF move line, e.g. PMABBREER, used to recognise the format. NGF has no
//header marker of its own, so a move line is the only thing about it that
//can't plausibly turn up in a file of another format.
const regexNgfMove = /^PM[A-Z]{2}[BW][A-Z]{4}\s*$/im

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
    this.ruleset = ''
    this.allowSuicide = false
    this.disallowRepeats = false
    this.komi = 0
    this.handicap = 0
    this.time = 0
    this.overtime = ''
    this.numberOfPeriods = 0
    this.timePerPeriod = 0

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
    const ruleset = get(info, 'rules.ruleset')
    const allowSuicide = get(info, 'rules.allowSuicide')
    const disallowRepeats = get(info, 'rules.disallowRepeats')
    const komi = get(info, 'rules.komi')
    const handicap = get(info, 'rules.handicap')
    const time = get(info, 'rules.time')
    const overtime = get(info, 'rules.overtime')
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
    if (typeof ruleset !== 'undefined') {
      this.setRuleset(ruleset)
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
    if (typeof time !== 'undefined') {
      this.setTime(time)
    }
    if (typeof overtime !== 'undefined') {
      this.setOvertime(overtime)
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
        boardCutOffBottom
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
      ruleset,
      allowSuicide,
      disallowRepeats,
      komi,
      handicap,
      time,
      overtime,
      numberOfPeriods,
      timePerPeriod,
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
    set(info, 'rules.ruleset', ruleset)
    set(info, 'rules.allowSuicide', allowSuicide)
    set(info, 'rules.disallowRepeats', disallowRepeats)
    set(info, 'rules.komi', komi)
    set(info, 'rules.handicap', handicap)
    set(info, 'rules.time', time)
    set(info, 'rules.overtime', overtime)

    //NOTE: these two are read back in by setInfo and are carried by both the
    //SGF (TC/TT) and JGF formats, so leaving them out here meant a record with
    //byo-yomi periods lost them on every save and reload
    set(info, 'rules.numberOfPeriods', numberOfPeriods)
    set(info, 'rules.timePerPeriod', timePerPeriod)

    //Extract players, settings and meta data
    set(info, 'players', players)
    set(info, 'settings', settings)
    set(info, 'meta', meta)

    //Return info
    return info
  }

  /**
   * Reset game (but preserve info)
   *
   * NOTE: init() wipes the game info along with everything else, so the info
   * has to be captured and put back. Without that this cleared the board size,
   * players, komi and handicap as well, which is not what a reset of the game
   * tree is meant to do.
   */
  reset() {
    const info = this.getInfo()
    this.init()
    this.setInfo(info)
    this.initPositionStack()
  }

  /**************************************************************************
   * Game info getters and setters
   ***/

  /**
   * Set/get record version
   */
  setRecordVersion(recordVersion = '') {
    this.recordVersion = recordVersion
    this.triggerEvent('info', {recordVersion})
  }
  getRecordVersion() {
    return this.recordVersion
  }

  /**
   * Set/get record char set
   */
  setRecordCharset(recordCharset = '') {
    this.recordCharset = recordCharset
    this.triggerEvent('info', {recordCharset})
  }
  getRecordCharset() {
    return this.recordCharset
  }

  /**
   * Set/get record generator
   */
  setRecordGenerator(recordGenerator = '') {
    this.recordGenerator = recordGenerator
    this.triggerEvent('info', {recordGenerator})
  }
  getRecordGenerator() {
    return this.recordGenerator
  }

  /**
   * Set/get record transcriber
   */
  setRecordTranscriber(recordTranscriber = '') {
    this.recordTranscriber = recordTranscriber
    this.triggerEvent('info', {recordTranscriber})
  }
  getRecordTranscriber() {
    return this.recordTranscriber
  }

  /**
   * Set/get source name
   */
  setSourceName(sourceName = '') {
    if (sourceName) {
      const regexUrl = /(:\s|,\s|\sat\s)?(https?:\/\/(.*?(?=\s|$)))/
      const match = sourceName.match(regexUrl)
      if (match) {
        sourceName = sourceName.replace(regexUrl, '')
        this.setSourceUrl(match[2])
      }
    }
    this.sourceName = sourceName
    this.triggerEvent('info', {sourceName})
  }
  getSourceName() {
    return this.sourceName
  }

  /**
   * Set/get source URL
   */
  setSourceUrl(sourceUrl = '') {
    this.sourceUrl = sourceUrl
    this.triggerEvent('info', {sourceUrl})
  }
  getSourceUrl() {
    return this.sourceUrl
  }

  /**
   * Set/get source copyright
   */
  setSourceCopyright(sourceCopyright = '') {
    this.sourceCopyright = sourceCopyright
    this.triggerEvent('info', {sourceCopyright})
  }
  getSourceCopyright() {
    return this.sourceCopyright
  }

  /**
   * Set/get event name
   */
  setEventName(name = '') {

    //Check for URL presence
    const [eventName, eventLocation] = parseEvent(name)
    if (eventName && eventLocation) {
      this.eventName = eventName
      this.eventLocation = eventLocation
      this.triggerEvent('info', {eventName, eventLocation})
    }

    //Set as given
    else {
      this.eventName = eventName
      this.triggerEvent('info', {eventName})
    }
  }
  getEventName() {
    return this.eventName
  }

  /**
   * Set/get event location
   */
  setEventLocation(location = '') {

    //Check for URL presence
    const [eventName, eventLocation] = parseEvent(location)
    if (eventName && eventLocation) {
      this.eventName = eventName
      this.eventLocation = eventLocation
      this.triggerEvent('info', {eventName, eventLocation})
    }

    //Set as given
    else {
      this.eventLocation = location
      this.triggerEvent('info', {eventLocation: location})
    }
  }
  getEventLocation() {
    return this.eventLocation
  }

  /**
   * Set/get event round
   */
  setEventRound(eventRound = '') {
    this.eventRound = eventRound
    this.triggerEvent('info', {eventRound})
  }
  getEventRound() {
    return this.eventRound
  }

  /**
   * Set/get game type
   */
  setGameType(gameType = '') {
    this.gameType = gameType
    this.triggerEvent('info', {gameType})
  }
  getGameType() {
    return this.gameType
  }

  /**
   * Set/get game name
   */
  setGameName(gameName = '') {
    this.gameName = gameName
    this.triggerEvent('info', {gameName})
  }
  getGameName() {
    return this.gameName
  }

  /**
   * Set/get game result
   */
  setGameResult(gameResult = '') {
    this.gameResult = parseResult(gameResult)
    this.triggerEvent('info', {gameResult: this.gameResult})
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
    this.gameDate = match ? match[1] : ''
    this.triggerEvent('info', {gameDate: this.gameDate})
  }
  getGameDate() {
    return this.gameDate
  }

  /**
   * Date the game today
   *
   * NOTE: a game starts undated, because the only thing that knows a record's
   * date is the record. Anything starting a game here and now says so itself,
   * with this. It is worked out when called rather than up front, so a page
   * left open across midnight doesn't go on stamping yesterday.
   */
  setCurrentDate() {
    this.setGameDate(dateString())
  }

  /**
   * Set/get game opening
   */
  setGameOpening(gameOpening = '') {
    this.gameOpening = gameOpening
    this.triggerEvent('info', {gameOpening})
  }
  getGameOpening() {
    return this.gameOpening
  }

  /**
   * Set/get game annotator
   */
  setGameAnnotator(gameAnnotator = '') {
    this.gameAnnotator = gameAnnotator
    this.triggerEvent('info', {gameAnnotator})
  }
  getGameAnnotator() {
    return this.gameAnnotator
  }

  /**
   * Set/get game description
   */
  setGameDescription(gameDescription = '') {
    this.gameDescription = gameDescription
    this.triggerEvent('info', {gameDescription})
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
    this.triggerEvent('info', {
      boardWidth: this.boardWidth,
      boardHeight: this.boardHeight,
    })
  }
  getBoardSize() {
    const {boardWidth: width, boardHeight: height} = this
    return {width, height}
  }

  /**
   * Set the board cut off
   */
  setBoardCutOff(left = 0, right = 0, top = 0, bottom = 0) {

    //A cut off hides lines, so it can never be negative. A negative value
    //grows the grid past the board it was cut from and shifts every
    //coordinate along with it, so treat it as no cut off at all.
    const toCutOff = value => {
      const cutOff = parseInt(value)
      return (isNaN(cutOff) || cutOff < 0) ? 0 : cutOff
    }

    //Set on game
    this.boardCutOffLeft = toCutOff(left)
    this.boardCutOffRight = toCutOff(right)
    this.boardCutOffTop = toCutOff(top)
    this.boardCutOffBottom = toCutOff(bottom)
    this.triggerEvent('info', {
      boardCutOffLeft: this.boardCutOffLeft,
      boardCutOffRight: this.boardCutOffRight,
      boardCutOffTop: this.boardCutOffTop,
      boardCutOffBottom: this.boardCutOffBottom,
    })
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
  setRuleset(ruleset = '') {
    this.ruleset = ruleset
    this.triggerEvent('info', {ruleset})
  }
  getRuleset() {
    return this.ruleset
  }

  /**
   * Set/get allow suicide
   */
  setAllowSuicide(allowSuicide = false) {
    this.allowSuicide = Boolean(allowSuicide)
    this.triggerEvent('info', {allowSuicide: this.allowSuicide})
  }
  getAllowSuicide() {
    return this.allowSuicide
  }

  /**
   * Set/get disallow repeats
   */
  setDisallowRepeats(disallowRepeats = false) {
    this.disallowRepeats = Boolean(disallowRepeats)
    this.triggerEvent('info', {disallowRepeats: this.disallowRepeats})
  }
  getDisallowRepeats() {
    return this.disallowRepeats
  }

  /**
   * Set/get komi
   */
  setKomi(komi) {
    this.komi = parseKomi(komi)
    this.triggerEvent('info', {komi: this.komi})
  }
  getKomi() {
    return this.komi
  }

  /**
   * Set/get handicap
   */
  setHandicap(handicap) {
    this.handicap = parseHandicap(handicap)
    this.triggerEvent('info', {handicap: this.handicap})
  }
  getHandicap() {
    return this.handicap
  }

  /**
   * Set/get main time
   */
  setTime(time = 0) {
    this.time = parseTime(time)
    this.triggerEvent('info', {time: this.time})
  }
  getTime() {
    return this.time
  }

  /**
   * Set/get over time
   */
  setOvertime(overtime = '') {
    this.overtime = overtime ? String(overtime) : ''
    this.triggerEvent('info', {overtime: this.overtime})
    const match = this.overtime.match(/([0-9]+)x([0-9.]+)/)
    if (match) {
      this.setNumberOfPeriods(match[1])
      this.setTimePerPeriod(match[2])
    }
  }
  getOvertime() {
    if (this.overtime) {
      return this.overtime
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
   * Set/get player of a specific color
   */
  setPlayer(color, info) {
    if (isObject(info)) {
      const {name, rank, team} = info
      this.players[color] = {
        name,
        rank,
        team,
      }
      this.triggerEvent('info', {players: this.players})
    }
  }
  updatePlayer(color, info) {
    if (isObject(info)) {
      for (const key in info) {
        this.players[color][key] = info[key]
      }
      this.triggerEvent('info', {players: this.players})
    }
  }
  getPlayer(color) {
    return this.players[color]
  }

  /**
   * Get all players
   */
  getPlayers() {
    return this.players
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
      this.debug(`setting turn to ${color}`)
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
      this.debug(`switching turn`)
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

  /**************************************************************************
   * Ko point
   ***/

  /**
   * Get the ko point for the current position, if any
   *
   * Returns the coordinates of the point a stone was just taken off in a
   * simple ko, along with the color that may not play there, or null when the
   * current position has no ko in it.
   *
   * NOTE: this is information about the position, not the authority on what is
   * legal in it. That remains the repeat scan in isRepeatingPosition(), which
   * catches the same recapture and, with disallowRepeats set, a good deal more
   * besides. What this adds is the one thing the scan cannot say: where.
   */
  getKoPoint() {
    const {position} = this
    return position ? position.getKoPoint() : null
  }

  /**
   * Check if the current position has a ko point
   */
  hasKoPoint() {
    const {position} = this
    return position ? position.hasKoPoint() : false
  }

  /**
   * Check if the given coordinates are the ko point of the current position,
   * optionally for a specific color
   */
  isKoPoint(x, y, color) {
    const {position} = this
    return position ? position.isKoPoint(x, y, color) : false
  }

  /**
   * Get time left
   */
  getTimeLeft(color) {

    //Get node
    let {node} = this

    //Root node? Return main time
    if (node.isRoot()) {
      return this.getTime()
    }

    //Not a move node
    if (!node.isMove()) {
      return
    }

    //Check previous node if it's not this player's turn
    if (node.getMoveColor() !== color) {
      node = node.getPreviousMove()
      if (!node) {
        return this.getTime()
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

    //Debug
    this.debug(`placing ${handicap} handicap stones`)

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
   *
   * NOTE: this also rewinds to the first position. The current node, path and
   * position stack all describe the tree that was just replaced, so leaving
   * them alone pointed the game at a node that is no longer part of it. That
   * made a freshly converted game report no next position at all, and left the
   * position stack sized for the previous board.
   *
   * Rewinding reads the board size and handicap off the game info, so set the
   * info before the root node, the way the converters do.
   */
  setRootNode(root) {
    this.root = root
    this.goToFirstPosition()
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
   * Get position matrix
   */
  getPositionMatrix() {
    return this.position.stones.toMatrix(colorToNumeric)
  }

  /**
   * Get the game path
   */
  getPath() {
    return this.path
  }

  /**
   * Get the game path as a plain object
   */
  getPathObject() {
    return this.path.toObject()
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
    this.node.setPathIndex(i)
  }

  /**
   * Reset current path index
   */
  resetCurrentPathIndex() {

    //The choice to forget is the one recorded at the move we're on, being the
    //step from here to the next node, which is the same thing the path index
    //below is reset to. The choices that got us here are left alone, as the
    //path still has to describe where we are. NOTE: this used to call
    //forgetPathChoice() with no arguments, which looked up path[undefined].
    const moveNo = this.path.getMoveNumber()

    //Reset
    this.node.setPathIndex(0)
    this.path.forgetPathChoice(moveNo)
  }

  /**
   * Get current move number
   */
  getCurrentMoveNumber() {
    return this.node.getMoveNumber()
  }

  /**
   * Get current move color
   */
  getCurrentMoveColor() {
    return this.node.getMoveColor()
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

    //Move zero, or anything before it, is the start of the game
    if (number <= 0) {
      return new GamePath()
    }

    //Clamp to what the game actually has, so asking for more moves than there
    //are still gets you as far as it goes
    const total = this.getTotalNumberOfMoves()
    const node = this.findNodeForMoveNumber(Math.min(number, total))

    //NOTE: this used to build a path whose length was the move number itself.
    //A path counts nodes, not moves, so any node in the line that isn't a move
    //(a setup node, or one carrying only markup or a comment) put every move
    //number after it out by one.
    return node ? this.getPathToNode(node) : null
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

  /**
   * Find the node a given path leads to, without navigating to it
   *
   * This is the inverse of getPathToNode, and is what allows a path received
   * from another instance of the same game to be resolved back into a node.
   */
  findNodeForPath(path) {

    //No path given
    if (!path) {
      return null
    }

    //Not an instance of a GamePath
    if (!(path instanceof GamePath)) {
      path = GamePath.fromObject(path)
    }

    //Walk the tree, following the child index chosen at each step
    let node = this.root
    const n = path.getMoveNumber()
    for (let m = 0; m < n; m++) {
      node = node.getChild(path.indexAtMove(m))
      if (!node) {
        return null
      }
    }

    //Found
    return node
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
    return this.node.hasMoveVariation(x, y)
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
    const {isValid} = this.validateMove(position, x, y, color)
    return isValid
  }

  /**
   * Describe what a move would do, without playing it
   *
   * Answers the questions a hover hint wants answered about a point: whether
   * the move is a pass, whether it lands on a stone, whether it takes stones
   * off, whether it is suicide, and whether it is the ko point. The facts are
   * carried in the outcome's payload, and the outcome itself says whether the
   * move would be allowed, so a caller that only wants a yes or no can read
   * isValid and ignore the rest.
   *
   * NOTE: the verdict is validateMove()'s, deliberately, rather than worked
   * out from the facts below. The rules include the repeat scan, which no
   * amount of looking at a single move can reproduce, and a check that
   * disagreed with the one the game actually enforces would be worse than no
   * check at all. The facts and the verdict are therefore gathered separately,
   * each from the code that owns it.
   */
  analyzeMove(x, y, color) {

    //Get data
    const {position} = this

    //No point on the board to play on describes a pass, which is always valid
    if (!this.isValidCoordinate(x, y)) {
      return new ValidOutcome({
        pass: true,
        overwrite: false,
        capturing: false,
        suicide: false,
        ko: false,
      })
    }

    //Set color of move to make
    if (typeof color === 'undefined') {
      color = position.getTurn()
    }

    //These two can be read straight off the position as it stands
    const overwrite = position.stones.has(x, y)
    const ko = position.isKoPoint(x, y, color)

    //The rest needs the move played out, which happens on a copy so that the
    //position the game is on is left exactly as it was
    let capturing = false
    let suicide = false
    if (!overwrite) {
      const testPosition = position.clone()
      testPosition.stones.set(x, y, color)
      capturing = testPosition.captureAdjacent(x, y)
      suicide = !capturing && !testPosition.hasLiberties(x, y)
    }

    //Ask the rules themselves whether this is allowed
    const payload = {pass: false, overwrite, capturing, suicide, ko}
    const outcome = this.validateMove(position.clone(), x, y, color)

    //Hand back the facts either way
    if (outcome.isValid) {
      return new ValidOutcome(payload)
    }
    return new ErrorOutcome(outcome.reason, payload)
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

    //A setup stone is not a move, so it cannot create a ko no matter what
    //shape it leaves behind. The capture above goes through the same code a
    //move does, which will have worked one out, so take it back off again.
    newPosition.clearKoPoint()

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

    //Already have markup of this type here. NOTE: this used to hand the whole
    //markup object to hasMarkup() where a type is expected, so the check
    //compared a type against an object and never matched.
    if (this.hasMarkup(x, y, markup.type)) {
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

    //NOTE: the stones grid holds bare color values, not objects, so this
    //compares the value directly rather than going through Grid#is, which
    //only does a keyed comparison for object values
    return (position.stones.get(x, y) === color)
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
    const {node} = this
    const [newPosition, reason] = this.validateSetupPlacement(x, y, color)

    //Invalid placement
    if (!newPosition) {
      this.warn(reason)
      return
    }

    //Add to node as a setup instruction
    const newNodeIndex = node.addSetup(x, y, {type: color})

    //Replace the position if a new node was created. NOTE: the event carries
    //this.position rather than the one captured before the change, which is
    //the position the stone was just added to and no longer on the stack.
    if (typeof newNodeIndex !== 'undefined') {
      this.debug(`new node was created with index ${newNodeIndex}`)
      this.handleNewSetupNodeCreation(newNodeIndex)
      this.replaceLastPositionInStack(newPosition)
      this.triggerEvent('positionChange', {position: this.position})
      return
    }

    //Just set stone on current position
    this.position.stones.set(x, y, color)
    this.triggerEvent('positionChange', {position: this.position})
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
    //NOTE: this branch used to return without an event, so removing a stone
    //that was placed by the current node left it drawn on the board
    if (node.hasSetup(x, y)) {
      node.removeSetup(x, y)
      position.stones.delete(x, y)
      this.triggerEvent('positionChange', {position})
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
    this.triggerEvent('positionChange', {position: this.position})
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
   * Add line to position (does not trigger a board redraw, to allow the line
   * to be drawn on the board simultaneously in real time)
   */
  addLine(...args) {
    this.node.addLine(...args)
    this.position.addLine(...args)
  }

  /**
   * Has lines check
   */
  hasLines() {
    return this.position.hasLines()
  }

  /**
   * Get lines
   */
  getLines() {
    return this.position.getLines()
  }

  /**
   * Remove all lines
   */
  removeAllLines() {
    this.node.removeLines()
    this.position.removeLines()
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

    //Already have a variation here?
    if (this.node.hasMoveVariation(x, y)) {

      //Get variation node
      const i = this.node.getMoveVariationIndex(x, y)
      const child = this.node.getChild(i)

      //If this was the same color as current color, just go to the variation
      if (color === child.getMoveColor()) {
        return this.goToNextPosition(i)
      }
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

  /**
   * Get comments from current node
   */
  getComments() {
    return this.node.getComments()
  }

  /**
   * Set comments in current node
   */
  setComments(comments) {
    this.node.setComments(comments)
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

    //NOTE: the outcome has to be checked here, like every other loop that
    //walks forward does. Processing a node that fails puts us back on the node
    //we came from, so without this the loop steps onto the same broken node
    //again and again and never returns.
    while (this.goToNextNode()) {
      const outcome = this.processCurrentNode()
      if (!outcome.isValid) {
        break
      }
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
   * Go to next variation (if there is one)
   */
  goToNextVariation() {
    const next = this.node.getNextSibling()
    if (next) {
      this.goToNode(next)
    }
  }

  /**
   * Go to previous variation (if there is one)
   */
  goToPreviousVariation() {
    const previous = this.node.getPreviousSibling()
    if (previous) {
      this.goToNode(previous)
    }
  }

  /**
   * Go to specific move number
   */
  goToMoveNumber(number) {

    //Resolve the path and navigate. NOTE: matching move numbers is not proof
    //of already being there, as a setup node sitting after move n carries move
    //number n as well, while the node to be on is the move itself. goToPath()
    //recognises an unchanged path, so it is the no-op check.
    const path = this.getPathToMoveNumber(number)
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

    //No path
    if (!path) {
      return
    }

    //Not an instance of a GamePath
    if (!(path instanceof GamePath)) {
      path = GamePath.fromObject(path)
    }

    //No path or already here?
    if (this.path.isSameAs(path)) {
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
   * Get the nodes carrying commentary on the current path
   *
   * The commentary of the line currently displayed, root to end, in the order
   * it reads. This is the list form of what goToNextComment() steps through,
   * for showing a game's commentary as a whole rather than one note at a time.
   *
   * Notes on other variations are deliberately absent: they belong to a line
   * that isn't being shown, and mixing them in loses the move order that makes
   * the rest of the list meaningful. Navigate onto a variation and its notes
   * are part of the list in their turn.
   */
  getCommentedNodes() {
    return this.root
      .getPathNodes()
      .filter(node => node.hasComments())
  }

  /**
   * Go forward a number of positions
   */
  goForwardNumPositions(num) {
    for (let i = 0; i < num; i++) {
      const {isValid} = this.goToNextPosition()
      if (!isValid) {
        return
      }
    }
  }

  /**
   * Go backward a number of positions
   */
  goBackNumPositions(num) {
    for (let i = 0; i < num; i++) {
      const {isValid} = this.goToPreviousPosition()
      if (!isValid) {
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
   * Make a node the main variation
   */
  makeMainVariation(node) {

    //Must be a variation branch
    if (!node.isVariationBranch()) {
      throw new Error('Node is not a variation branch')
    }

    //Traverse from node to root, moving each node to index 0 at every junction.
    //This ensures the entire path from root to node becomes the main variation,
    //even in deeply nested or multi-level variation trees.
    const traverse = current => {
      if (!current.parent) {
        return
      }
      current.moveToIndex(0)
      traverse(current.parent)
    }
    traverse(node)
  }

  /**
   * Remove a node
   */
  removeNode(node) {

    //Warn when trying to remove root node
    if (node.isRoot()) {
      throw new Error('Cannot remove root node')
    }

    //Check whether we're standing anywhere inside the branch about to be
    //removed, which has to happen before it is detached, as afterwards it no
    //longer connects to the tree at all. NOTE: this used to only check for the
    //node itself, so removing an ancestor of the current node left the game
    //pointing into a subtree that was no longer part of the game.
    const isOnRemovedBranch = this.isNodeOnPathToCurrentNode(node)

    //Detach node from parent
    const parent = node.detachFromParent()
    if (!parent) {
      throw new Error('Node has no parent')
    }

    //Go to the parent node if the node we were on has just been removed
    if (isOnRemovedBranch) {
      this.goToNode(parent)
    }
  }

  /**
   * Check if a given node is the current node, or an ancestor of it
   */
  isNodeOnPathToCurrentNode(target) {
    let node = this.node
    while (node) {
      if (node === target) {
        return true
      }
      node = node.getParent()
    }
    return false
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

    //Reset the position stack first, then set the turn on the fresh position.
    //NOTE: the other way around, initPositionStack throws away the position
    //that was just given a turn and replaces it with a blank one, so the turn
    //ends up back at black on a handicap game.
    this.initPositionStack()
    this.setTurn(turn)
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

        //Step back to the node we came from. NOTE: this used to go through
        //goToPreviousNode(), which also pops a position off the stack. No
        //position was ever pushed for this node, so what came off was the one
        //belonging to the node being stepped back to, leaving the game showing
        //a position one step behind the node it was on.
        if (revertPositionOnFail && node.hasParent()) {
          this.path.retreat()
          this.node = node.getParent()
        }

        //Return failure reason
        this.warn(outcome.reason)
        return outcome
      }
    }

    //Handle turn instructions
    if (node.hasTurnInstructions()) {
      newPosition.setTurn(node.turn)
    }

    //Handle setup instructions
    if (node.hasSetupInstructions()) {
      for (const setup of node.setup) {
        const {type, coords} = setup
        for (const coord of coords) {
          const {x, y} = coord
          if (type === setupTypes.CLEAR) {
            newPosition.removeStone(x, y)
          }
          else {
            newPosition.setStone(x, y, type)
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
          newPosition.setMarkup(x, y, {type, text})
        }
      }
    }

    //Lines
    if (node.hasLines()) {
      newPosition.setLines(node.lines)
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
      default:
        throw new Error(`Unsupported data format`)
    }
  }

  /**************************************************************************
   * Transformations
   ***/

  /**
   * Transform this game record
   *
   * Returns a new game, rotated, mirrored and/or colour inverted, leaving this
   * one exactly as it was. That matches how GamePosition#clone() and the
   * converters behave, and it is what makes generating a set of records out of
   * one — the eight symmetries of a problem, say — a matter of asking for each
   * of them in turn.
   *
   * The transformation is a string of operations applied left to right: 'r'
   * for a quarter turn clockwise, 'f' for a mirror left to right, and 'i' to
   * swap the stone colours. The named ones are in constants/transformation.js,
   * and boardSymmetries there is the set of eight.
   */
  transform(transformation) {
    const transformer = new GameTransformer()
    return transformer.transform(this, transformation)
  }

  /**************************************************************************
   * Static helpers to create game instances from different formats
   ***/

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
   * Load from NGF data
   */
  static fromNgf(ngf) {

    //Create converter
    const converter = new ConvertFromNgf()
    const game = converter.convert(ngf)
    if (!game) {
      throw new Error(`Unable to parse NGF data`)
    }

    //Return game
    return game
  }

  /**
   * Detect format
   */
  static detectFormat(data) {

    //Decode binary data first. The bytes of a record are an object as far as
    //typeof is concerned, so this has to happen before anything is read into
    //the checks below. A string passes through untouched.
    data = decodeData(data)

    //No data, can't do much
    if (!data) {
      throw new Error(`No data`)
    }

    //Object given? Probably a JGF object
    if (typeof data === 'object') {
      return kifuFormats.JGF
    }

    //String given, could be stringified JGF, an SGF, GIB or NGF file. NOTE:
    //files routinely start with a byte order mark or a blank line, and looking
    //at the very first character of the raw string rejected every one of them.
    if (typeof data === 'string') {
      const c = data.trim().charAt(0)
      if (c === '(') {
        return kifuFormats.SGF
      }
      else if (c === '{' || c === '[') {
        return kifuFormats.JGF
      }
      else if (c === '\\') {
        return kifuFormats.GIB
      }

      //NGF opens with a free text title rather than any marker of its own, so
      //it is recognised by its move lines instead
      else if (regexNgfMove.test(data)) {
        return kifuFormats.NGF
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

    //Decode binary data once, rather than leaving both the format detection
    //and the converter to do it
    data = decodeData(data)

    //Detect format
    const format = this.detectFormat(data)

    //Use appropriate parser
    switch (format) {
      case kifuFormats.SGF:
        return this.fromSgf(data)
      case kifuFormats.JGF:
        return this.fromJgf(data)
      case kifuFormats.GIB:
        return this.fromGib(data)
      case kifuFormats.NGF:
        return this.fromNgf(data)
      default:
        throw new Error(`Unsupported data format`)
    }
  }
}
