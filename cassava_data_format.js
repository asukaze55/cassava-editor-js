net.asukaze.module((module, require) => {
const { GridData, Range, isNumber } = require('./cassava_grid_data.js');
/** @typedef {import("./cassava_macro.js").ValueType} ValueType */

/** @enum {number} */
const QuoteType = {
  NONE: 0,
  ONLY_IF_NEEDED: 1,
  ONLY_IF_STRING: 2,
  ALWAYS: 3,
  EXPRESSION: 4,
}

class DataFormat {
  /**
   * @param {string=} name
   * @param {string=} separators
   * @param {QuoteType=} quoteType
   * @param {Array<string>=} extensions
   */
  constructor(name = '', separators =',', quoteType = QuoteType.ONLY_IF_NEEDED,
      quoteExpression = '', extensions = []) {
    /** @type {string} */
    this.name = name;
    /** @type {string} */
    this.separators = separators;
    /** @type {QuoteType} */
    this.quoteType = quoteType;
    /** @type {string} */
    this.quoteExpression = quoteExpression;
    /** @type {Array<string>} */
    this.extensions = extensions;
  }

  /**
   * @param {string} data
   * @returns {GridData}
   */
  parse(data) {
    const gridData = new GridData();
    let x = 1;
    let y = 1;
    let current = '';
    let quoted = false;
    for (let i = 0; i < data.length; i++) {
      const c = data[i];
      if (quoted) {
        if (c == '"') {
          if (data[i + 1] == '"') {
            current += '"';
            i++;
          } else {
            quoted = false;
          }
        } else if (c == '\r') {
          current += '\n';
          if (data[i + 1] == '\n') {
            i++;
          }
        } else {
          current += c;
        }
      } else if (c == '"' && this.quoteType != QuoteType.NONE) {
        quoted = true;
      } else if (this.separators.includes(c)) {
        gridData.setCell(x, y, current);
        current = '';
        x++;
      } else if (c == '\r' || c == '\n') {
        gridData.setCell(x, y, current);
        current = '';
        x = 1;
        y++;
        if (c == '\r' && data[i + 1] == '\n') {
          i++;
        }
      } else {
        current += c;
      }
    }
    if (current != '') {
      gridData.setCell(x, y, current);
    }
    return gridData;
  }

  /**
   * @param {GridData} gridData
   * @param {Range} range
   * @param {boolean} endingLineBreak
   * @param {(script: string) => Promise<ValueType?>} runMacro
   * @returns {Promise<string>}
   */
  async stringify(gridData, range, endingLineBreak, runMacro) {
    let result = '';
    for (let y = range.top; y <= range.bottom; y++) {
      for (let x = range.left; x <= range.right; x++) {
        if (x > range.left) {
          result += this.separators[0];
        }
        result += await this.#maybeQuote(gridData.cell(x, y), x, y, runMacro);
      }
      if (endingLineBreak || y < range.bottom) {
        result += '\n';
      }
    }
    return result;
  }

  /**
   * @param {string} cell
   * @param {number} x
   * @param {number} y
   * @param {(script: string) => Promise<ValueType?>} runMacro
   * @returns {Promise<string>}
   */
  async #maybeQuote(cell, x, y, runMacro) {
    switch (this.quoteType) {
      case QuoteType.NONE:
        return cell;
      case QuoteType.ONLY_IF_NEEDED:
        if (Array.from(this.separators + '"\r\n').some(c => cell.includes(c))) {
          return this.#quote(cell);
        } else {
          return cell;
        }
      case QuoteType.ONLY_IF_STRING:
        if (cell == '' || isNumber(cell)) {
          return cell;
        } else {
          return this.#quote(cell);
        }
      case QuoteType.EXPRESSION:
        if (Array.from(this.separators + '"\r\n').some(c => cell.includes(c))) {
          return this.#quote(cell);
        }
        const expressionResult =
            await runMacro(`x=${x};y=${y};return ${this.quoteExpression};`);
        if (expressionResult && String(expressionResult) != "0") {
          return this.#quote(cell);
        } else {
          return cell;
        }
      default:
        return this.#quote(cell);
    }
  }

  /**
   * @param {string} cell
   * @returns {string}
   */
  #quote(cell) {
    return '"' + cell.replaceAll('"', '""') + '"';
  }
}

module.exports = { DataFormat, QuoteType };
});
