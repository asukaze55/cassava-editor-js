net.asukaze.module((module, require) => {

/**
 * @param {string} replaceText
 * @param {Array<string>} match
 * @returns {string}
 */
function stringForReplace(replaceText, match) {
  let result = '';
  for (let i = 0; i < replaceText.length; i++) {
    const nextChar = replaceText[i + 1];
    if (replaceText[i] == '$' && nextChar >= '0'
        && nextChar <= '9') {
      const group = parseInt(nextChar, 10);
      if (group < match.length - 2) {
        result += match[group];
        i++;
        continue;
      }
    }
    if (replaceText[i] == '\\') {
      if (nextChar == 'n') {
        result += '\n';
        i++;
        continue;
      } else if (nextChar == 't') {
        result += '\t';
        i++;
        continue;
      } else if(nextChar == '\\') {
        result += '\\';
        i++;
        continue;
      } else if (nextChar == '$') {
        result += '\\';
        i++;
        continue;
      }
    }
    result += replaceText[i];
  }
  return result;
}

/**
 * @param {string} findText
 * @param {boolean} ignoreCase
 * @param {boolean} wholeCell
 * @param {boolean} isRegex
 * @returns {(value: string) => boolean}
 */
function createFinder(findText, ignoreCase, wholeCell, isRegex) {
  if (isRegex) {
    const regexp = new RegExp(
        wholeCell ? '^' + findText + '$' : findText,
        ignoreCase ? 'is' : 's');
    return value => value.search(regexp) >= 0;
  } else if (wholeCell && ignoreCase) {
    const lowerFindText = findText.toLowerCase();
    return value =>
        (value.toLowerCase() == lowerFindText);
  } else if (wholeCell) {
    return value => (value == findText);
  } else if (ignoreCase) {
    const lowerFindText = findText.toLowerCase();
    return value =>
        value.toLowerCase().includes(lowerFindText);
  } else {
    return value => value.includes(findText);
  }
}

/**
 * @param {string} findText
 * @param {string} replaceText
 * @param {boolean} ignoreCase
 * @param {boolean} wholeCell
 * @param {boolean} isRegex
 * @returns {(value: string) => string}
 */
function createReplacer(findText, replaceText, ignoreCase, wholeCell, isRegex) {
  if (isRegex) {
    const regexp = new RegExp(
        wholeCell ? '^' + findText + '$' : findText,
        ignoreCase ? 'gis' : 'gs');
    return value =>
        value.replaceAll(regexp, (...p) =>
            p[0] ? stringForReplace(replaceText, p)
                 : '');
  } else if (wholeCell) {
    const finder = createFinder(findText, ignoreCase, wholeCell, isRegex);
    return value => finder(value) ? replaceText : value;
  } else if (ignoreCase) {
    const lowerFindText = findText.toLowerCase();
    return value => {
      const lowerValue = value.toLowerCase();
      let result = '';
      let index = 0;
      while (true) {
        const p =
            lowerValue.indexOf(lowerFindText, index);
        if (p < 0) {
          return result + value.substring(index);
        }
        result +=
            value.substring(index, p) + replaceText;
        index = p + lowerFindText.length;
      }
    }
  } else {
    return value =>
        value.replaceAll(findText, replaceText);
  }
}

/**
 * @param {string} c
 * @returns {number}
 */
function asc(c) {
  return c.codePointAt(0);
}

/**
 * @param {number} c
 * @returns {string}
 */
function chr(c) {
  return String.fromCodePoint(Math.floor(c));
}

/**
 * @param {string} value
 * @returns {string}
 */
function toHankakuAlphabet(value) {
  const d = asc('Ａ') - asc('A');
  let result = '';
  for (const c of value) {
    if (c == '　') {
      result += ' ';
    } else if (c == '’') {
      result += "'";
    } else if (c == '”') {
      result += '"';
    } else if (c == '￥') {
      result += '\\';
    } else if (c >= '！' && c <= '～') {
      result += chr(asc(c) - d);
    } else {
      result += c;
    }
  }
  return result;
}

/**
 * @param {string} value
 * @returns {string}
 */
function toZenkakuAlphabet(value) {
  const d = asc('Ａ') - asc('A');
  let result = '';
  for (const c of value) {
    if (c == ' ') {
      result += '　';
    } else if (c == "'") {
      result += '’';
    } else if (c == '"') {
      result += '”';
    } else if (c == '\\') {
      result += '￥';
    } else if (c >= '!' && c <= '~') {
      result += chr(asc(c) + d);
    } else {
      result += c;
    }
  }
  return result;
}

/**
 * @param {string} value
 * @returns {string}
 */
function toHankakuKana(value) {
  let result = '';
  for (const c of value) {
    if (c == '　') {
      result += ' ';
    } else if (c == 'ワ') {
      result += 'ﾜ';
    } else if (c == 'ヲ') {
      result += 'ｦ';
    } else if (c == 'ン') {
      result += 'ﾝ';
    } else if (c == 'ヴ') {
      result += 'ｳﾞ';
    } else if (c == '゛') {
      result += 'ﾞ';
    } else if (c == '゜') {
      result += 'ﾟ';
    } else if (c == 'ー') {
      result += 'ｰ';
    } else if (c == '。') {
      result += '｡';
    } else if (c == '「') {
      result += '｢';
    } else if (c == '」') {
      result += '｣';
    } else if (c == '、') {
      result += '､';
    } else if (c == '・') {
      result += '･';
    } else if (c < 'ァ' || c > 'ロ') {
      result += c;
    } else if (c == 'ッ') {
      result += 'ｯ';
    } else if (c >= 'ァ' && c <= 'オ') {
      const x = asc(c) - asc('ァ');
      result += (x % 2)
          ? chr(asc('ｱ') + (x / 2))
          : chr(asc('ｧ') + (x / 2));
    } else if (c >= 'カ' && c <= 'ヂ') {
      const x = asc(c) - asc('カ');
      result += chr(asc('ｶ') + (x / 2));
      if (x % 2) {
        result += 'ﾞ';
      }
    } else if (c >= 'ツ' && c <= 'ド') {
      const x = asc(c) - asc('ツ');
      result += chr(asc('ﾂ') + (x / 2));
      if (x % 2) {
        result += 'ﾞ';
      }
    } else if (c >= 'ナ' && c <= 'ノ') {
      result += chr(asc('ﾅ') + asc(c) - asc('ナ'));
    } else if (c >= 'ハ' && c <= 'ポ') {
      const x = asc(c) - asc('ハ');
      result += chr(asc('ﾊ') + (x / 3));
      if ((x % 3) == 1) {
        result += 'ﾞ';
      } else if ((x % 3) == 2) {
        result += 'ﾟ';
      }
    } else if (c >= 'マ' && c <= 'モ') {
      result += chr(asc('ﾏ') + asc(c) - asc('マ'));
    } else if (c >= 'ャ' && c <= 'ヨ') {
      const x = asc(c) - asc('ャ');
      result += (x % 2)
          ? chr(asc('ﾔ') + (x / 2))
          : chr(asc('ｬ') + (x / 2));
    } else if (c >= 'ラ' && c <= 'ロ') {
      result += chr(asc('ﾗ') + asc(c) - asc('ラ'));
    } else {
      result += c;
    }
  }
  return result;
}

/**
 * @param {string} value
 * @returns {string}
 */
function toZenkakuKana(value) {
  let result = '';
  for (let i = 0; i < value.length; i++) {
    const c = value[i];
    if (c == ' ') {
      result += '　';
    } else if (c < '｡' || c > 'ﾟ') {
      result += c;
    } else if (c >= 'ｱ' && c <= 'ｵ') {
      if (c == 'ｳ' && value[i + 1] == 'ﾞ') {
        result += 'ヴ';
        i++;
      } else {
        result += chr(asc('ア')
                      + (asc(c) - asc('ｱ')) * 2);
      }
    } else if (c >= 'ｶ' && c <= 'ﾁ') {
      let x = 0;
      if (value[i + 1] == 'ﾞ') {
        x = 1;
        i++;
      }
      result += chr(asc('カ')
                    + (asc(c) - asc('ｶ')) * 2 + x);
    } else if (c >= 'ﾂ' && c <= 'ﾄ') {
      let x = 0;
      if (value[i + 1] == 'ﾞ') {
        x = 1;
        i++;
      }
      result += chr(asc('ツ')
                    + (asc(c) - asc('ﾂ')) * 2 + x);
    } else if (c >= 'ﾅ' && c <= 'ﾉ') {
      result += chr(asc('ナ') + asc(c) - asc('ﾅ'));
    } else if (c >= 'ﾊ' && c <= 'ﾎ') {
      let x = 0;
      if (value[i + 1] == 'ﾞ') {
        x = 1;
        i++;
      } else if (value[i + 1] == 'ﾟ') {
        x = 2;
        i++;
      }
      result += chr(asc('ハ')
                    + (asc(c) - asc('ﾊ')) * 3 + x);
    } else if (c >= 'ﾏ' && c <= 'ﾓ') {
      result += chr(asc('マ') + asc(c) - asc('ﾏ'));
    } else if (c >= 'ﾔ' && c <= 'ﾖ') {
      result += chr(asc('ヤ')
                    + (asc(c) - asc('ﾔ')) * 2);
    } else if (c >= 'ﾗ' && c <= 'ﾛ') {
      result += chr(asc('ラ') + asc(c) - asc('ﾗ'));
    } else if (c == 'ﾜ') {
      result += 'ワ';
    } else if (c == 'ｦ') {
      result += 'ヲ';
    } else if (c == 'ﾝ') {
      result += 'ン';
    } else if (c >= 'ｧ' && c <= 'ｫ') {
      result += chr(asc('ァ')
                    + (asc(c) - asc('ｧ')) * 2);
    } else if (c >= 'ｬ' && c <= 'ｮ') {
      result += chr(asc('ャ')
                    + (asc(c) - asc('ｬ')) * 2);
    } else if (c == 'ｯ') {
      result += 'ッ';
    } else if (c == 'ｰ') {
      result += 'ー';
    } else if (c == 'ﾞ') {
      result += '゛';
    } else if (c == 'ﾟ') {
      result += '゜';
    } else if (c == '｡') {
      result += '。';
    } else if (c == '｢') {
      result += '「';
    } else if (c == '｣') {
      result += '」';
    } else if (c == '､') {
      result += '、';
    } else if (c == '･') {
      result += '・';
    } else {
      result += c;
    }
  }
  return result;
}

module.exports = { createFinder, createReplacer, toHankakuAlphabet, toHankakuKana, toZenkakuAlphabet, toZenkakuKana };
});
