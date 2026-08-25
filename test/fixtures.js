import {readFileSync} from 'node:fs'
import {dirname, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'

//Fixtures are resolved against this file rather than the working directory,
//so a spec reads the same record wherever vitest happens to be run from
const fixturesPath = resolve(dirname(fileURLToPath(import.meta.url)), 'fixtures')

/**
 * Read a fixture record as a UTF-8 string, e.g. loadFixture('gib/utf8.gib')
 *
 * NOTE: several records in the corpus are EUC-KR, GB2312 or Shift_JIS, and
 * forcing them through a UTF-8 decode brings their non ASCII text back as
 * replacement characters. That is what a caller who decodes the file itself
 * hands the readers, and the specs pin it as such. Use loadFixtureBytes to
 * let the reader work the encoding out for itself.
 */
export function loadFixture(name) {
  return readFileSync(resolve(fixturesPath, name), 'utf8')
}

/**
 * Read a fixture record as raw bytes, e.g. loadFixtureBytes('gib/euc-kr.gib')
 *
 * This is what reading a file off disk or off the network actually gives you,
 * and what the encoding detection in src/helpers/encoding.js is there for.
 */
export function loadFixtureBytes(name) {
  return readFileSync(resolve(fixturesPath, name))
}

/**
 * Replay a game's main line from the start, one node at a time
 *
 * Returns the number of moves that were played and, if the game stopped
 * short, the reason the first invalid node gave. Game#goToLastPosition walks
 * the same path but swallows the reason, and a record that stops half way
 * through is exactly what these specs are looking for.
 */
export function replayMainLine(game) {

  //Start from the root position, which applies any handicap setup
  game.goToFirstPosition()

  //Walk forward until the record runs out or a node fails to validate
  let played = 0
  while (game.node.hasChildren()) {
    game.goToNextNode()
    const outcome = game.processCurrentNode()
    if (!outcome.isValid) {
      return {played, failure: outcome.reason}
    }
    played++
  }

  //Reached the end legally
  return {played, failure: null}
}

/**
 * Count every node in a game tree, variations included
 */
export function countNodes(node) {
  return node.children.reduce((total, child) => total + countNodes(child), 1)
}

/**
 * Count the nodes that have more than one child, being the branch points
 */
export function countForks(node) {
  const self = (node.children.length > 1) ? 1 : 0
  return node.children.reduce((total, child) => total + countForks(child), self)
}
