
/**
 * Encoding detection for game records
 *
 * Records written by Japanese, Korean and Chinese software predate UTF-8
 * being a given, and a Shift_JIS or EUC-KR file read as UTF-8 loses every
 * player name, comment and result to replacement characters. This helper
 * takes the raw bytes and works out what they are, so the converters can go
 * on dealing in strings.
 *
 * The approach is a dependency free port of Sabaki's src/tokenize.js (MIT,
 * Copyright © 2015-2020 Yichuan Shen), whose reasoning the comments below
 * carry over. Where Sabaki uses iconv-lite and jschardet, this uses the
 * TextDecoder that Node and every browser already ship, which natively
 * supports every encoding that matters here. jschardet has no dependency
 * free equivalent and is skipped, going straight to the coherence scorer
 * that exists precisely because jschardet gets short kifu wrong.
 */

//Latin-1 is spelled out by hand rather than handed to TextDecoder, because
//the WHATWG encoding standard maps every latin1 label onto windows-1252,
//which rewrites the 0x80-0x9F range. What is wanted here is the identity
//mapping, where the code point is the byte, so that a decoded string can be
//scanned for ASCII markers and turned back into the exact bytes it came from.
const latin1 = 'latin1'

//Encodings tried, in priority order, when the charset can't be read from a
//CA[] property and the bytes aren't valid UTF-8. Covers the common CJK and
//Cyrillic legacy encodings. gb18030 is listed before euc-kr so that pure-Han
//(Chinese) text isn't mistaken for a spurious hangul decode.
//
//NOTE: guessing from a handful of bytes is guesswork, and this scores no
//better than Sabaki does. A few Chinese characters on their own decode as
//clean hangul under euc-kr, which the language marker below then rewards, and
//Cyrillic in windows-1251 forms valid GBK pairs that score exactly as well as
//the real thing. Both come right once a record carries a line or two of text
//rather than a word, and a record that declares its own charset never gets
//this far. Anything better than this needs a frequency model, which is the
//dependency this deliberately does without.
const recoveryCandidates = [
  'shift_jis',
  'gb18030',
  'big5',
  'euc-jp',
  'euc-kr',
  'windows-1251',
  'koi8-r',
]

//Byte order marks, which are the strongest statement a file can make about
//its own encoding and, unlike CA[], can be read without decoding anything
//first. UTF-16 has to be caught here in particular: ASCII text encoded as
//UTF-16LE is a run of interleaved null bytes, which is perfectly valid UTF-8
//and would otherwise sail through as a string full of nulls.
const byteOrderMarks = [
  {bytes: [0xef, 0xbb, 0xbf], encoding: 'utf-8'},
  {bytes: [0xff, 0xfe], encoding: 'utf-16le'},
  {bytes: [0xfe, 0xff], encoding: 'utf-16be'},
]

//The value of a CA property, being everything between [ and ], where a
//backslash escapes whatever follows it.
//
//NOTE: Sabaki tokenises the whole file and takes the first CA property it
//meets at the top level. A regex can in principle be fooled by the literal
//text "CA[" inside another property's value appearing before the real one,
//which no record in practice contains, and \b keeps it from matching the
//tail of a longer identifier such as ABCA[.
const regexCharsetProperty = /\bCA\s*\[((?:[^\\\]]|\\[\s\S])*)\]/

//Any property value, used to pull the human readable text out of an SGF
const regexPropertyValue = /[A-Za-z]+\[((?:[^\\\]]|\\[\s\S])*)\]/g

//Chunk size for the latin1 decode. String.fromCharCode is applied to the
//bytes, and a whole file at once overruns the argument limit.
const chunkSize = 8192

/**
 * Decode record data into a string
 *
 * Accepts a Buffer, ArrayBuffer or typed array and decodes it using the
 * encoding detected from its own bytes. Anything else, a string in
 * particular, is handed straight back untouched.
 */
export function decodeData(data) {

  //Not binary data, nothing to do
  const bytes = toBytes(data)
  if (!bytes) {
    return data
  }

  //Detect and decode
  return decodeBytes(bytes, detectEncoding(bytes))
}

/**
 * Detect the encoding of a record's bytes
 *
 * Always returns something decodable, never throws
 */
export function detectEncoding(data) {

  //Not binary data, nothing to detect
  const bytes = toBytes(data)
  if (!bytes) {
    return latin1
  }

  //A byte order mark is unambiguous and needs no decoding to read
  const marked = findByteOrderMark(bytes)
  if (marked) {
    return marked
  }

  //A declared charset wins, being the author's own statement of intent. The
  //decoder's own name for it is returned rather than the record's spelling,
  //so that the same encoding is always reported the same way.
  const declared = findDeclaredCharset(bytes)
  const declaredDecoder = declared ? createDecoder(declared) : null
  if (declaredDecoder) {
    return declaredDecoder.encoding
  }

  //UTF-8 is self validating: valid UTF-8 bytes are almost never anything else
  if (isValidUtf8(bytes)) {
    return 'utf-8'
  }

  //Score candidate decodes of the record's own text and take the best
  const recovered = recoverEncoding(bytes)
  if (recovered) {
    return recovered
  }

  //Never throw: latin1 maps every byte to a character
  return latin1
}

/**
 * Normalise input into a Uint8Array, or null if it isn't binary data
 */
function toBytes(data) {

  //Uint8Array, which is what a Node Buffer is
  if (data instanceof Uint8Array) {
    return data
  }

  //Raw buffer
  if (data instanceof ArrayBuffer) {
    return new Uint8Array(data)
  }

  //Some other view onto a buffer, a DataView or a wider typed array. Its own
  //offset and length are used, or the view's window onto the buffer is lost.
  if (ArrayBuffer.isView(data)) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
  }

  //Not binary
  return null
}

/**
 * Decode bytes using the given encoding
 */
function decodeBytes(bytes, encoding) {

  //Latin-1 is ours to do, see above
  if (encoding === latin1) {
    return decodeLatin1(bytes)
  }

  //Non fatal, so that a stray byte yields a replacement character rather than
  //taking the whole record with it
  const decoder = createDecoder(encoding)
  return decoder ? decoder.decode(bytes) : decodeLatin1(bytes)
}

/**
 * Decode bytes as latin1, mapping each byte to the code point of that value
 */
function decodeLatin1(bytes) {
  let str = ''
  for (let i = 0; i < bytes.length; i += chunkSize) {
    str += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize))
  }
  return str
}

/**
 * Turn a latin1 decoded string back into the bytes it came from
 */
function encodeLatin1(str) {
  return Uint8Array.from(str, char => char.charCodeAt(0))
}

/**
 * Create a decoder for an encoding label, or null if it isn't supported
 */
function createDecoder(encoding) {
  try {
    return new TextDecoder(encoding)
  }
  catch {

    //TextDecoder throws a RangeError on a label it doesn't know
    return null
  }
}

/**
 * Find the encoding a byte order mark declares, if there is one
 */
function findByteOrderMark(bytes) {
  for (const {bytes: mark, encoding} of byteOrderMarks) {
    if (mark.every((byte, i) => bytes[i] === byte)) {
      return encoding
    }
  }
  return null
}

/**
 * Find the value of the first CA property, read losslessly
 *
 * Latin-1 preserves every byte, and both CA and its value are ASCII in any
 * encoding worth naming, so the property can be read before we know what the
 * rest of the file is.
 */
function findDeclaredCharset(bytes) {
  const match = decodeLatin1(bytes).match(regexCharsetProperty)
  if (!match) {
    return null
  }
  return unescapeValue(match[1]).trim()
}

/**
 * Undo SGF's backslash escaping
 */
function unescapeValue(str) {
  return str.replace(/\\([\s\S])/g, '$1')
}

/**
 * Whether the bytes are valid UTF-8
 */
function isValidUtf8(bytes) {
  try {
    new TextDecoder('utf-8', {fatal: true}).decode(bytes)
    return true
  }
  catch {
    return false
  }
}

/**
 * The bytes of the record's human readable text
 *
 * An SGF carries its text in property values, and the ASCII scaffolding
 * around them decodes identically whatever the encoding, so it only dilutes
 * the score. GIB and NGF have no properties to speak of, so those fall back
 * to whole lines instead. Either way the retained chunks keep their bytes
 * adjacent, which matters for encodings whose trail bytes fall in the ASCII
 * range: strip the ASCII out from between them and a Shift_JIS pair loses
 * its second half.
 */
function sampleBytes(bytes) {

  //Read losslessly, so that a chunk can be handed back as the exact bytes it
  //came from
  const contents = decodeLatin1(bytes)

  //Property values first, then whole lines. NOTE: matchAll leaves the regex's
  //own lastIndex alone, so a global regex is safe to share here.
  const values = [...contents.matchAll(regexPropertyValue)].map(m => m[1])

  //Back to bytes
  return encodeLatin1(
    joinHighBytes(values) || joinHighBytes(contents.split(/\r?\n/)) || ''
  )
}

/**
 * Join the chunks that carry non ASCII bytes, or null if none of them do
 */
function joinHighBytes(chunks) {
  const kept = chunks.filter(hasHighBytes)
  return kept.length > 0 ? kept.join('') : null
}

/**
 * Whether a latin1 decoded string contains any non ASCII byte
 */
function hasHighBytes(str) {
  for (let i = 0; i < str.length; i++) {
    if (str.charCodeAt(i) >= 0x80) {
      return true
    }
  }
  return false
}

/**
 * Classify a code point into a script bucket
 *
 * Split so that kana (Japanese) and hangul (Korean) can serve as script
 * locked language markers.
 */
function classify(codePoint) {
  const c = codePoint
  if (c === 0xfffd) {
    return 'repl'
  }
  if (c >= 0x3040 && c <= 0x30ff) {
    return 'kana'
  }
  if (c >= 0xac00 && c <= 0xd7a3) {
    return 'hangul'
  }
  if (c >= 0x3400 && c <= 0x9fff) {
    return 'han'
  }
  if (c >= 0x0400 && c <= 0x04ff) {
    return 'cyrillic'
  }
  if (c >= 0x00c0 && c <= 0x024f) {
    return 'latin'
  }
  if ((c >= 0x3000 && c <= 0x303f) || (c >= 0xff00 && c <= 0xffef)) {
    return 'punct'
  }
  return 'junk'
}

/**
 * Score a candidate decode, higher being more plausible
 *
 * Rewards meaningful characters, penalises replacement, control and rare
 * symbol junk, and treats kana (Japanese) and pure hangul (Korean) as strong
 * language markers, since a wrong CJK decode rarely produces them cleanly.
 */
function scoreDecoding(str) {

  //Count the non ASCII code points by bucket
  const counts = {
    kana: 0,
    hangul: 0,
    han: 0,
    cyrillic: 0,
    latin: 0,
    punct: 0,
    junk: 0,
    repl: 0,
  }
  let high = 0
  for (const char of str) {
    const c = char.codePointAt(0)
    if (c < 0x80) {
      continue
    }
    high++
    counts[classify(c)]++
  }

  //Nothing to go on
  if (high === 0) {
    return -1
  }

  //Weigh signal against noise
  const meaningful =
    counts.kana + counts.hangul + counts.han + counts.cyrillic + counts.latin
  const noise = 2 * counts.repl + counts.junk + 0.6 * counts.punct
  let score = (meaningful - noise) / high

  //Language markers
  if (counts.kana > 0) {
    score += 0.5
  }
  if (counts.hangul > 0 && counts.han === 0) {
    score += 0.4
  }

  //Return score
  return score
}

/**
 * Recover an encoding by scoring candidate decodes of the record's own text
 */
function recoverEncoding(bytes) {

  //Nothing readable to judge on
  const sample = sampleBytes(bytes)
  if (sample.length === 0) {
    return null
  }

  //Score each candidate, first past the post on a tie
  let best = null
  for (const encoding of recoveryCandidates) {
    const decoder = createDecoder(encoding)
    if (!decoder) {
      continue
    }
    const score = scoreDecoding(decoder.decode(sample))
    if (best === null || score > best.score) {
      best = {encoding, score}
    }
  }

  //Only worth taking if it made positive sense of the text
  return (best !== null && best.score > 0) ? best.encoding : null
}
