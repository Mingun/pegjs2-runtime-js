"use strict";

const DESCRIBE_EXPECTATION_FNS = {
  literal(expectation) {
    return '"' + literalEscape(expectation.text) + '"';
  },

  class(expectation) {
    let escapedParts = expectation.parts.map(function(part) {
      return Array.isArray(part)
        ? classEscape(part[0]) + "-" + classEscape(part[1])
        : classEscape(part);
    });

    return "[" + (expectation.inverted ? "^" : "") + escapedParts + "]";
  },

  any() {
    return "any character";
  },

  end() {
    return "end of input";
  },

  rule(expectation) {
    return expectation.description;
  },

  user(expectation) {
    return expectation.description;
  },

  not(expectation) {
    return "not " + describeExpectation(expectation.expected);
  }
};

function hex(ch) {
  return ch.charCodeAt(0).toString(16).toUpperCase();
}

function literalEscape(s) {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/"/g,  '\\"')
    .replace(/\0/g, "\\0")
    .replace(/\t/g, "\\t")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/[\x00-\x0F]/g,          function(ch) { return "\\x0" + hex(ch); })
    .replace(/[\x10-\x1F\x7F-\x9F]/g, function(ch) { return "\\x"  + hex(ch); });
}

function classEscape(s) {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/\]/g, "\\]")
    .replace(/\^/g, "\\^")
    .replace(/-/g,  "\\-")
    .replace(/\0/g, "\\0")
    .replace(/\t/g, "\\t")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/[\x00-\x0F]/g,          function(ch) { return "\\x0" + hex(ch); })
    .replace(/[\x10-\x1F\x7F-\x9F]/g, function(ch) { return "\\x"  + hex(ch); });
}

function describeExpectation(expectation) {
  return DESCRIBE_EXPECTATION_FNS[expectation.type](expectation);
}

function describeExpected(expected) {
  let descriptions = expected.map(describeExpectation);

  descriptions.sort();

  if (descriptions.length > 0) {
    let j = 1;
    for (let i = 1; i < descriptions.length; i++) {
      if (descriptions[i - 1] !== descriptions[i]) {
        descriptions[j] = descriptions[i];
        j++;
      }
    }
    descriptions.length = j;
  }

  switch (descriptions.length) {
    case 1:
      return descriptions[0];

    case 2:
      return descriptions[0] + " or " + descriptions[1];

    default:
      return descriptions.slice(0, -1).join(", ")
        + ", or "
        + descriptions[descriptions.length - 1];
  }
}

function describeFound(found) {
  return found ? '"' + literalEscape(found) + '"' : "end of input";
}

class SyntaxError extends Error {
  constructor(message, expected, found, location) {
    super(message);
    this.name = this.constructor.name;
    this.location = location;
    this.expected = expected;
    this.found = found;

    // istanbul ignore next
    if (typeof Error.captureStackTrace === "function") {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  static buildMessage(expected, found) {
    return "Expected " + describeExpected(expected) + " but " + describeFound(found) + " found.";
  }
}

module.exports = SyntaxError;
