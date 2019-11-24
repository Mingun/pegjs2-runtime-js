"use strict";

let SyntaxError = require("./syntax-error");

function buildStructuredError(expected, found, location) {
  return new SyntaxError(
    SyntaxError.buildMessage(expected, found, location),
    expected,
    found,
    location
  );
}

class ParserState {
  /**
   * Creates parser state from specified input, source and initial position data.
   *
   * @param {string} input Chunk of data to parse. Actually any string-like object
   * @param {*} source Any object, that will be available as `source` property of any `location()`.
   *        For example, it can be file path from which `input` was read
   * @param {number} offset Global offset, that corresponding to the first character in the `input`
   * @param {number} line Global line, that corresponding to the first character in the `input`
   * @param {number} column Global column, that corresponding to the first character in the `input`
   */
  constructor(input, source, offset = 0, line = 1, column = 1) {
    this.input = input;
    this._source = source;
    this._offset = offset;
    this._mark = offset;
    this._expected = [];
    this._cache = [{ line, column }];
  }

  /**
   * @returns {number} Current offset in input sequence (counting from 0)
   */
  offset() { return this._mark; }

  /**
   * In actions returns start and end offset in `this.input` that corresponds to matched sequence.
   * In predicates both numbers referred to the current offset
   *
   * @returns {Array<number>} 2-element array with boundaries of matched sequence
   */
  range() { return [this._mark, this._offset]; }

  location() { return this._computeLocation(this._mark, this._offset); }

  text() { return this.input.substring(this._mark, this._offset); }

  expected(description, location) {
    throw buildStructuredError(
      [{ type: 'user', description }],
      this.text(),
      location !== undefined ? location : this.location()
    );
  }

  /**
   * Throws `SyntaxError` with specified message and location
   *
   * @param {String} message Error message that describes situation
   * @param {Location?} location If defined, error location will be set to this value,
   *        otherwise current (==`this.location()`) is used
   *
   * @throws {SyntaxError} Error that specify that parse failed
   */
  error(message, location) {
    throw new SyntaxError(
      message, null, null,
      location !== undefined ? location : this.location()
    );
  }

  /**
   * Creates error from current parse state.
   *
   * @returns {SyntaxError} Error that will be thrown
   */
  buildError() {
    let expected = this._expected[0];
    let failPos  = expected.offset;

    return buildStructuredError(
      expected.variants,
      failPos < this.input.length ? this.input.charAt(failPos) : null,
      failPos < this.input.length
        ? this._computeLocation(failPos, failPos + 1)
        : this._computeLocation(failPos, failPos)
    );
  }

  /**
   * Performs parsing of specified rule
   *
   * @param {Function} ruleParseFunc No-argument function that parses part of grammar
   */
  parse(ruleParseFunc) {
    this._begin();
    let result = ruleParseFunc();
    if (result !== ParserState.FAILED) {
      if (this._offset === this.input.length) {
        return result;
      }
      if (this._offset < this.input.length) {
        this._expect({ type: 'end' });
      }
    }

    throw this.buildError();
  }

  matchAny() {
    let off = this._offset;
    if (this.input.length > off) {
      ++this._offset;
      return this.input.charAt(off);
    }
    return ParserState.FAILED;
  }

  matchClass(regexp) {
    let off = this._offset;
    let chr = this.input.charAt(off);
    if (regexp.test(chr)) {
      ++this._offset;
      return chr;
    }
    return ParserState.FAILED;
  }

  matchChar(char, charCode) {
    if (this.input.charCodeAt(this._offset) === charCode) {
      ++this._offset;
      return char;
    }
    return ParserState.FAILED;
  }

  matchLiteral(literal) {
    let len = literal.length;
    let txt = this.input.substr(this._offset, len);
    if (txt === literal) {
      this._offset += len;
      return literal;
    }
    return ParserState.FAILED;
  }

  matchLiteralIC(literal) {
    let len = literal.length;
    let txt = this.input.substr(this._offset, len);
    if (txt.toLowerCase() === literal) {
      this._offset += len;
      return txt;
    }
    return ParserState.FAILED;
  }

  //{ Internal API
  _computeLocation(startPos, endPos) {
    let startPosDetails = this._computePosDetails(startPos);
    let endPosDetails   = this._computePosDetails(endPos);

    return {
      source: this._source,
      start: {
        offset: startPos,
        line:   startPosDetails.line,
        column: startPosDetails.column
      },
      end: {
        offset: endPos,
        line:   endPosDetails.line,
        column: endPosDetails.column
      }
    };
  }

  _computePosDetails(pos) {
    let details = this._cache[pos];

    if (details) {
      return details;
    }

    let p = pos;
    do {
      --p;
      details = this._cache[p];
    } while (!details);

    details = {
      line:   details.line,
      column: details.column
    };

    while (p < pos) {
      if (this.input.charCodeAt(p) === 10) {
        details.line++;
        details.column = 1;
      } else {
        details.column++;
      }

      p++;
    }

    this._cache[pos] = details;

    return details;
  }

  _begin() {
    this._expected.push({ offset: this._offset, variants: [] });
  }

  _end(invert) {
    let expected = this._expected.pop();
    let top = this._expected[this._expected.length - 1];
    let variants = expected.variants;

    if (top.offset !== expected.offset) { return; }

    if (invert) {
      variants = variants.map(e => {
        return e.type === 'not' ? e.expected : { type: 'not', expected: e };
      });
    }

    top.variants.push(...variants);
  }

  /**
   * Register new expectation for current offset.
   *
   * @param {Expectation} expected Description of expected data at current position
   */
  _expect(expected) {
    let top = this._expected[this._expected.length - 1];

    if (this._offset < top.offset) { return; }

    if (this._offset > top.offset) {
      top.offset = this._offset;
      top.variants = [];
    }

    top.variants.push(expected);
  }
  //}
}

ParserState.FAILED = {}

module.exports = ParserState;
