'use strict';

function pad(string, length) {
  return string + ' '.repeat(length - string.length);
}

function toString1(pos) {
  return pos.line + ':' + pos.column;
}

function toString2(location) {
  return toString1(location.start) + '-' + toString1(location.end);
}

function log(event, indentLevel) {
  console.log(
    toString2(event.location) + ' '
      + pad(event.type, 10) + ' '
      + '  '.repeat(indentLevel) + event.rule
  );
}

class DefaultTracer {
  constructor() {
    this.indentLevel = 0;
  }

  trace(event) {
    switch (event.type) {
      case 'rule.enter':
        log(event, this.indentLevel++);
        break;

      case 'rule.match':
        log(event, --this.indentLevel);
        break;

      case 'rule.fail':
        log(event, --this.indentLevel);
        break;

      // istanbul ignore next
      default:
        throw new Error('Invalid event type: ' + event.type + '.');
    }
  }
}

module.exports = DefaultTracer;
