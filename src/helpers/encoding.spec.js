import {describe, it, expect} from 'vitest'
import {decodeData, detectEncoding} from './encoding.js'
import {loadFixtureBytes} from '../../test/fixtures.js'

/**
 * Build bytes from a latin1 string, so that legacy encoded text can be
 * written out here byte for byte. Every escape below is the real encoding of
 * the text named beside it, produced with iconv.
 */
function bytes(str) {
  return Uint8Array.from(str, char => char.charCodeAt(0))
}

//Text in the encodings the readers actually meet, long enough to be worth
//scoring. A few characters on their own are not, see the note in encoding.js.
//이세돌 구단
const eucKr = '\xc0\xcc\xbc\xbc\xb5\xb9\x20\xb1\xb8\xb4\xdc'

//柯洁 九段 中国围棋甲级联赛
const gb2312 =
  '\xbf\xc2\xbd\xe0\x20\xbe\xc5\xb6\xce\x20' +
  '\xd6\xd0\xb9\xfa\xce\xa7\xc6\xe5\xbc\xd7\xbc\xb6\xc1\xaa\xc8\xfc'

//高尾紳路 九段
const shiftJis = '\x8d\x82\x94\xf6\x90\x61\x98\x48\x20\x8b\xe3\x92\x69'

//Пётр Иванов
const cp1251 = '\xcf\xb8\xf2\xf0\x20\xc8\xe2\xe0\xed\xee\xe2'

//Bytes that make no sense under any candidate encoding
const junk = '\xff\xa0'.repeat(16)

describe('encoding helpers', () => {

  describe('decodeData()', () => {

    it('hands a string straight back, untouched', () => {
      const sgf = '(;FF[4]PB[Lee Sedol])'
      expect(decodeData(sgf)).toBe(sgf)
    })

    it('leaves a string a caller decoded badly exactly as it found it', () => {

      //The one guarantee the string path makes: whatever a caller that
      //decoded the file itself passes in comes back unchanged
      const mojibake = '(;FF[4]PB[���])'
      expect(decodeData(mojibake)).toBe(mojibake)
    })

    it('hands anything that is not binary straight back', () => {
      const jgf = {record: {format: 'JGF'}}
      expect(decodeData(jgf)).toBe(jgf)
      expect(decodeData(undefined)).toBeUndefined()
      expect(decodeData(null)).toBeNull()
      expect(decodeData('')).toBe('')
    })

    it('reads a Buffer, an ArrayBuffer, a typed array and a view alike', () => {

      //Every shape a file arrives in, all carrying the same UTF-8 bytes
      const expected = '(;FF[4]PB[이세돌])'
      const source = new TextEncoder().encode(expected)

      expect(decodeData(Buffer.from(source))).toBe(expected)
      expect(decodeData(source)).toBe(expected)
      expect(decodeData(source.buffer.slice(0))).toBe(expected)
      expect(decodeData(new DataView(source.buffer.slice(0)))).toBe(expected)
    })

    it('reads a view that only covers part of its buffer', () => {

      //A subarray shares its buffer with the whole file, so reading the
      //buffer rather than the view's window onto it brings back the rest too
      const source = new TextEncoder().encode('junk(;FF[4]PB[이세돌])')
      expect(decodeData(source.subarray(4))).toBe('(;FF[4]PB[이세돌])')
    })

    it('decodes an empty buffer to an empty string', () => {
      expect(decodeData(new Uint8Array(0))).toBe('')
    })
  })

  describe('detectEncoding()', () => {

    it('reads bytes only, and calls anything else latin1', () => {
      expect(detectEncoding('(;FF[4])')).toBe('latin1')
    })

    describe('a byte order mark', () => {

      it('settles UTF-16, which would otherwise pass for UTF-8', () => {

        //ASCII text encoded as UTF-16LE is a run of interleaved nulls, which
        //is perfectly valid UTF-8. Without the mark it would decode into a
        //string full of them and every reader would make nothing of it.
        const utf16le = bytes('\xff\xfe(\x00;\x00F\x00F\x00[\x004\x00]\x00)\x00')
        expect(detectEncoding(utf16le)).toBe('utf-16le')
        expect(decodeData(utf16le)).toBe('(;FF[4])')

        const utf16be = bytes('\xfe\xff\x00(\x00;\x00F\x00F\x00[\x004\x00]\x00)')
        expect(detectEncoding(utf16be)).toBe('utf-16be')
        expect(decodeData(utf16be)).toBe('(;FF[4])')
      })

      it('is stripped from UTF-8 rather than read as text', () => {
        const source = bytes('\xef\xbb\xbf(;FF[4]PB[Lee Sedol])')
        expect(detectEncoding(source)).toBe('utf-8')
        expect(decodeData(source)).toBe('(;FF[4]PB[Lee Sedol])')
      })
    })

    describe('UTF-8', () => {

      it('is what an ASCII only record is, and is read as such', () => {
        const source = bytes('(;FF[4]PB[Lee Sedol]PW[Ke Jie])')
        expect(detectEncoding(source)).toBe('utf-8')
        expect(decodeData(source)).toBe('(;FF[4]PB[Lee Sedol]PW[Ke Jie])')
      })

      it('validates itself, so needs no guessing and no mark', () => {
        const expected = '(;FF[4]PB[이세돌]PW[柯洁]C[高尾紳路])'
        const source = new TextEncoder().encode(expected)
        expect(detectEncoding(source)).toBe('utf-8')
        expect(decodeData(source)).toBe(expected)
      })
    })

    describe('a declared charset', () => {

      it('is honoured, whatever the bytes would otherwise score as', () => {

        //The same Korean bytes under two declarations. Both decode without
        //complaint and to different text, which is the point: CA is taken
        //as the author's own statement of intent.
        const korean = bytes(`(;FF[4]CA[EUC-KR]PB[${eucKr}])`)
        const japanese = bytes(`(;FF[4]CA[Shift_JIS]PB[${eucKr}])`)

        expect(detectEncoding(korean)).toBe('euc-kr')
        expect(decodeData(korean)).toContain('이세돌 구단')

        expect(detectEncoding(japanese)).toBe('shift_jis')
        expect(decodeData(japanese)).not.toContain('이세돌')
      })

      it('rescues Cyrillic, which the scoring alone does not', () => {

        //Cyrillic in windows-1251 forms valid GBK pairs that score exactly
        //as well as the real thing, so a Russian record is only read right
        //if it says so. See the note in encoding.js.
        const source = bytes(`(;FF[4]CA[windows-1251]PB[${cp1251}])`)
        expect(detectEncoding(source)).toBe('windows-1251')
        expect(decodeData(source)).toContain('Пётр Иванов')
      })

      it('survives being escaped and padded, as SGF allows', () => {
        const source = bytes(`(;FF[4]CA[ EUC\\-KR ]PB[${eucKr}])`)
        expect(detectEncoding(source)).toBe('euc-kr')
        expect(decodeData(source)).toContain('이세돌 구단')
      })

      it('is ignored when it names something nothing can decode', () => {

        //An encoding TextDecoder has never heard of is no help, so the bytes
        //get worked out the long way round instead
        const source = bytes(`(;FF[4]CA[ISO-2022-KR]PB[${eucKr}])`)
        expect(detectEncoding(source)).toBe('euc-kr')
        expect(decodeData(source)).toContain('이세돌 구단')
      })

      it('is not read out of a longer property identifier', () => {

        //MCA[] is its own property, not a CA[] with a letter in front of it,
        //so this record declares nothing and gets scored
        const source = bytes(`(;FF[4]MCA[EUC-KR]PB[${shiftJis}])`)
        expect(detectEncoding(source)).toBe('shift_jis')
        expect(decodeData(source)).toContain('高尾紳路 九段')
      })
    })

    describe('scoring the candidates', () => {

      it('recovers Japanese from a record that declares nothing', () => {
        const source = bytes(`(;FF[4]PB[${shiftJis}])`)
        expect(detectEncoding(source)).toBe('shift_jis')
        expect(decodeData(source)).toContain('高尾紳路 九段')
      })

      it('recovers Korean from a record that declares nothing', () => {
        const source = bytes(`(;FF[4]PB[${eucKr}])`)
        expect(detectEncoding(source)).toBe('euc-kr')
        expect(decodeData(source)).toContain('이세돌 구단')
      })

      it('recovers Chinese from a record that declares nothing', () => {
        const source = bytes(`(;FF[4]PB[${gb2312}])`)
        expect(detectEncoding(source)).toBe('gb18030')
        expect(decodeData(source)).toContain('柯洁 九段')
      })

      it('judges the text and not the ASCII scaffolding around it', () => {

        //A page of moves decodes identically under every candidate, so the
        //handful of Korean bytes still decide the outcome
        const moves = ';B[aa];W[bb]'.repeat(200)
        const source = bytes(`(;FF[4]PB[${eucKr}]${moves})`)
        expect(detectEncoding(source)).toBe('euc-kr')
      })

      it('falls back to whole lines for a record with no properties', () => {

        //GIB and NGF carry no bracketed values at all, and looking only at
        //property values would leave the scorer nothing to look at
        const source = bytes(`GI${gb2312}\nGI${gb2312}\n`)
        expect(detectEncoding(source)).toBe('gb18030')
        expect(decodeData(source)).toContain('柯洁 九段')
      })

      it('reads a record that is one line and nothing else', () => {
        expect(detectEncoding(bytes(gb2312))).toBe('gb18030')
      })
    })

    describe('the last resort', () => {

      it('falls back to latin1 rather than throwing', () => {
        const source = bytes(`(;FF[4]C[${junk}])`)
        expect(detectEncoding(source)).toBe('latin1')
        expect(() => decodeData(source)).not.toThrow()
      })

      it('maps every byte to something, losing none of them', () => {

        //Latin-1 is the only encoding here that cannot fail, which is what
        //makes it the fallback. Every byte comes back as its own code point.
        const source = bytes(junk)
        const decoded = decodeData(source)
        expect(decoded).toHaveLength(source.length)
        expect([...decoded].map(char => char.charCodeAt(0)))
          .toEqual([...source])
      })
    })
  })

  describe('the fixture corpus', () => {

    it.each([
      ['sgf/shift-jis.sgf', 'shift_jis'],
      ['gib/euc-kr.gib', 'euc-kr'],
      ['gib/gb2312.gib', 'gb18030'],
      ['gib/utf8.gib', 'utf-8'],
      ['ngf/gb2312.ngf', 'gb18030'],
      ['ngf/even.ngf', 'utf-8'],
      ['ngf/handicap2.ngf', 'utf-8'],
      ['sgf/ff4_ex.sgf', 'utf-8'],
      ['sgf/pro_game.sgf', 'utf-8'],
    ])('reads %s as %s', (name, encoding) => {
      expect(detectEncoding(loadFixtureBytes(name))).toBe(encoding)
    })

    it('brings back the Korean the EUC-KR Tygem record is written in', () => {

      //The result line reads GAMERESULT=흑 시간승, black winning on time,
      //and the place line names the Tygem server in Korean
      const gib = decodeData(loadFixtureBytes('gib/euc-kr.gib'))
      expect(gib).toContain('\\[GAMERESULT=흑 시간승\\]')
      expect(gib).toContain('\\[GAMEPLACE=타이젬 바둑\\]')
    })

    it('brings back the Chinese the GB2312 Tygem record is written in', () => {

      //GAMEBLACKNAME reads 石下之臣(2段), a name and a rank the GIB reader's
      //own pattern still makes nothing of, and the result reads 白11目胜
      const gib = decodeData(loadFixtureBytes('gib/gb2312.gib'))
      expect(gib).toContain('\\[GAMEBLACKNAME=石下之臣(2段)\\]')
      expect(gib).toContain('\\[GAMERESULT=白11目胜\\]')
    })

    it('brings back the Chinese the GB2312 WBaduk record is written in', () => {
      const ngf = decodeData(loadFixtureBytes('ngf/gb2312.ngf'))
      expect(ngf).toContain('GI韩国十段战')
      expect(ngf).toContain('GI朴承华 初段')
      expect(ngf).toContain('GI李载雄 五段')
    })
  })
})
